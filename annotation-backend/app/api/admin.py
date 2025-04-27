from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import os

from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_admin_user, get_password_hash
from ..utils.csv_utils import import_chat_messages, validate_csv_format

router = APIRouter()

@router.get("/users", response_model=List[schemas.User])
async def list_users(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """List all users (admin only)"""
    return crud.get_users(db)

@router.post("/users", response_model=schemas.User)
async def create_user(
    user_data: schemas.UserCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """Create a new user (admin only)"""
    # Check if user exists
    existing_user = crud.get_user_by_email(db, user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user with hashed password
    hashed_password = get_password_hash(user_data.password)
    new_user = crud.create_user(db, user_data, hashed_password)
    return new_user

@router.get("/projects", response_model=List[schemas.Project])
async def list_all_projects(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """List all projects (admin only)"""
    return crud.get_projects(db)

@router.post("/projects", response_model=schemas.Project)
async def create_project(
    project_data: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """Create a new project (admin only)"""
    return crud.create_project(db, project_data)

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    crud.delete_user(db, user)

@router.delete("/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """Delete a project (admin only)"""
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    
    crud.delete_project(db, project)

@router.post("/projects/{project_id}/import-chat-room-csv", response_model=schemas.ChatRoomImportResponse)
async def create_chat_room_and_import_csv(
    project_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """Create a new chat room from a CSV filename and import its content (admin only)"""
    # Check project exists
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )

    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV and have a filename"
        )

    # Create chat room using filename (remove extension)
    chat_room_name = os.path.splitext(file.filename)[0]
    chat_room_create_schema = schemas.ChatRoomCreate(name=chat_room_name, project_id=project_id)
    
    try:
        new_chat_room = crud.create_chat_room(db, chat_room=chat_room_create_schema)
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating chat room '{chat_room_name}': {str(e)}"
        )
    
    # Save uploaded file temporarily
    temp_file_path = f"uploads/{file.filename}"
    try:
        contents = await file.read()
        os.makedirs("uploads", exist_ok=True)
        with open(temp_file_path, "wb") as f:
            f.write(contents)
        
        # Validate CSV format first
        validate_csv_format(temp_file_path)
        
        # Import messages using our simple utility
        messages = import_chat_messages(temp_file_path)
        
        # Import messages to database
        imported_count = 0
        skipped_count = 0
        errors = []
        warnings = []
        
        for message in messages:
            try:
                # Create message schema
                message_schema = schemas.ChatMessageCreate(
                    turn_id=message['turn_id'],
                    user_id=message['user_id'],
                    turn_text=message['turn_text'],
                    reply_to_turn=message.get('reply_to_turn')
                )
                
                # Check for existing message
                existing = crud.get_chat_message_by_turn_id(db, new_chat_room.id, message['turn_id'])
                if existing:
                    skipped_count += 1
                    warnings.append(f"Message with turn_id {message['turn_id']} already exists")
                    continue
                
                # Create message
                crud.create_chat_message(db, message=message_schema, chat_room_id=new_chat_room.id)
                imported_count += 1
                
            except Exception as e:
                errors.append(f"Error importing message {message.get('turn_id', 'unknown')}: {str(e)}")
                skipped_count += 1
        
        # Commit all changes
        db.commit()
        
        return schemas.ChatRoomImportResponse(
            chat_room=new_chat_room,
            import_details=schemas.CSVImportResponse(
                total_messages=len(messages),
                imported_count=imported_count,
                skipped_count=skipped_count,
                errors=errors,
                warnings=warnings
            )
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing CSV file: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# --- Remove or comment out old endpoints --- 

# @router.post("/projects/{project_id}/chat-rooms", response_model=schemas.ChatRoom)
# async def create_chat_room(...): ... # Keep implementation commented for reference if needed

# @router.post("/chat-rooms/{chat_room_id}/import-csv", response_model=schemas.CSVImportResponse)
# async def import_chat_csv(...): ... # Keep implementation commented for reference if needed

# Existing delete endpoints etc remain unchanged
@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_admin_user)
):
    """Delete a user (admin only)"""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    crud.delete_user(db, user)
