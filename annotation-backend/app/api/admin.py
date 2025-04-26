from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List
import pandas as pd
import io
from pydantic import BaseModel
from io import BytesIO
import csv

from ..database import get_db
from ..models import User, Project, ChatMessage
from ..schemas import UserCreate, User as UserSchema, ProjectCreate, Project as ProjectSchema
from ..auth import get_current_admin_user, get_password_hash

router = APIRouter()


@router.get("/users", response_model=List[UserSchema])
async def list_users(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """List all users (admin only)"""
    users = db.query(User).all()
    return users


@router.post("/users", response_model=UserSchema)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """Create a new user (admin only)"""
    # Check if user exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_admin=user_data.is_admin
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user


@router.get("/projects", response_model=List[ProjectSchema])
async def list_all_projects(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """List all projects (admin only)"""
    projects = db.query(Project).all()
    return projects


@router.post("/projects", response_model=ProjectSchema)
async def create_project(
    project_data: ProjectCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """Create a new project (admin only)"""
    new_project = Project(**project_data.model_dump())
    db.add(new_project)
    db.commit()
    db.refresh(new_project)
    return new_project


@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()


@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_admin_user)
):
    """Delete a project (admin only)"""
    project = db.query(Project).filter(Project.id == project_id).first()
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    db.delete(project)
    db.commit()


class CSVImportResponse(BaseModel):
    message: str
    total_messages: int
    imported_messages: int
    errors: List[str] = []

@router.post("/import/csv/{project_id}", response_model=CSVImportResponse)
async def import_chat_csv(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """
    Import chat messages from a CSV file.
    The first 4 columns MUST be in this order:
    1. user_id: The user ID (required)
    2. turn_id: Message ID in format VAC_R10_XXX (required)
    3. turn_text: The actual message content (required)
    4. reply_to_turn: ID of message being replied to (optional)
    
    Any columns after these 4 are ignored completely.
    For reply_to_turn, only valid turn_ids are used, everything else is treated as empty.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can import chat messages",
        )

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found",
        )

    try:
        # Read only the first 4 columns from CSV, skip header row
        content = await file.read()
        df = pd.read_csv(
            BytesIO(content),
            usecols=[0, 1, 2, 3],  # Only read first 4 columns
            names=['user_id', 'turn_id', 'turn_text', 'reply_to_turn'],  # Force column names
            skiprows=1  # Skip header row since we're forcing column names
        )

        messages_to_create = []
        errors = []
        total_messages = len(df)
        imported_messages = 0

        # First pass: collect valid turn_ids from this file
        valid_turn_ids = set(
            str(turn_id).strip() 
            for turn_id in df['turn_id'] 
            if pd.notna(turn_id)
        )

        # Process each row
        for idx, row in df.iterrows():
            try:
                # Skip if any required field is missing or empty
                if (pd.isna(row['user_id']) or pd.isna(row['turn_id']) or pd.isna(row['turn_text']) or
                    str(row['user_id']).strip() == '' or str(row['turn_id']).strip() == '' or str(row['turn_text']).strip() == ''):
                    errors.append(f"Row {idx + 2}: Missing required value (user_id, turn_id, or turn_text)")  # +2 because we skipped header and idx is 0-based
                    continue

                # Clean up the values
                user_id = str(row['user_id']).strip()
                turn_id = str(row['turn_id']).strip()
                turn_text = str(row['turn_text']).strip()
                
                # Handle reply_to_turn - only use it if it's a valid turn_id, silently ignore everything else
                reply_to_turn = None
                if pd.notna(row['reply_to_turn']):
                    reply_value = str(row['reply_to_turn']).strip()
                    if reply_value in valid_turn_ids:
                        reply_to_turn = reply_value

                # Create message
                message = ChatMessage(
                    project_id=project_id,
                    user_id=user_id,
                    turn_id=turn_id,
                    turn_text=turn_text,
                    reply_to_turn=reply_to_turn
                )
                messages_to_create.append(message)
                imported_messages += 1

            except Exception as e:
                errors.append(f"Row {idx + 2}: {str(e)}")  # +2 because we skipped header and idx is 0-based

        # Bulk insert messages
        if messages_to_create:
            db.bulk_save_objects(messages_to_create)
            db.commit()

        return CSVImportResponse(
            message="Import completed",
            total_messages=total_messages,
            imported_messages=imported_messages,
            errors=errors
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing CSV file: {str(e)}"
        ) 