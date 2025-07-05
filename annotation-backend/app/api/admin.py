from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List
import pandas as pd
import io
import os
import json

from .. import crud, models, schemas
from ..dependencies import get_db
from ..auth import get_current_admin_user, get_password_hash
from ..utils.csv_utils import import_chat_messages, validate_csv_format, import_annotations_from_csv, validate_annotations_csv_format

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

@router.get("/projects/{project_id}", response_model=schemas.Project)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """Get a specific project (admin only)"""
    project = crud.get_project(db, project_id)
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found"
        )
    return project

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

# PHASE 2: ANNOTATION IMPORT ENDPOINT

@router.post("/chat-rooms/{chat_room_id}/import-annotations", response_model=schemas.AnnotationImportResponse)
async def import_annotations_for_chat_room(
    chat_room_id: int,
    user_id: int = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """
    Import annotations from CSV and assign them to a specific user (admin only).
    PHASE 2: This implements the attributed import functionality from the action plan.
    
    Args:
        chat_room_id: ID of the chat room to import annotations for
        user_id: ID of the user to whom these annotations belong
        file: CSV file containing turn_id and thread_id columns
    """
    # Validate chat room exists
    chat_room = crud.get_chat_room(db, chat_room_id)
    if not chat_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # Validate user exists
    user = crud.get_user(db, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a CSV"
        )
    
    # Save uploaded file temporarily
    temp_file_path = f"uploads/annotations_{file.filename}"
    try:
        contents = await file.read()
        os.makedirs("uploads", exist_ok=True)
        with open(temp_file_path, "wb") as f:
            f.write(contents)
        
        # Validate CSV format for annotations
        validate_annotations_csv_format(temp_file_path)
        
        # Import annotations from CSV
        annotations_data = import_annotations_from_csv(temp_file_path)
        
        # Import annotations to database with attribution
        imported_count, skipped_count, errors = crud.import_annotations_for_chat_room(
            db=db,
            chat_room_id=chat_room_id,
            annotator_id=user_id,
            project_id=chat_room.project_id,
            annotations_data=annotations_data
        )
        
        return schemas.AnnotationImportResponse(
            chat_room_id=chat_room_id,
            annotator_id=user_id,
            annotator_email=user.email,
            total_annotations=len(annotations_data),
            imported_count=imported_count,
            skipped_count=skipped_count,
            errors=errors
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Error processing annotation CSV file: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# PHASE 3: AGGREGATED ANNOTATIONS FOR ANALYSIS

@router.get("/chat-rooms/{chat_room_id}/aggregated-annotations", response_model=schemas.AggregatedAnnotationsResponse)
async def get_aggregated_annotations(
    chat_room_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """
    Get aggregated annotations for a chat room (admin only).
    PHASE 3: This provides the foundation for IAA analysis by showing all annotations
    organized by message, making concordance and discordance immediately visible.
    """
    # Validate chat room exists
    chat_room = crud.get_chat_room(db, chat_room_id)
    if not chat_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # Get aggregated data
    aggregated_data = crud.get_aggregated_annotations_for_chat_room(db, chat_room_id)
    
    # Calculate statistics
    total_messages = len(aggregated_data)
    annotated_messages = len([msg for msg in aggregated_data if msg["annotations"]])
    
    # Get unique annotators
    all_annotators = set()
    for message in aggregated_data:
        for annotation in message["annotations"]:
            all_annotators.add(annotation["annotator_email"])
    
    annotators = sorted(list(all_annotators))
    
    return schemas.AggregatedAnnotationsResponse(
        chat_room_id=chat_room_id,
        messages=aggregated_data,
        total_messages=total_messages,
        annotated_messages=annotated_messages,
        total_annotators=len(annotators),
        annotators=annotators
    )

# PHASE 4: BATCH ANNOTATION IMPORT ENDPOINT

@router.post("/chat-rooms/{chat_room_id}/import-batch-annotations", response_model=schemas.BatchAnnotationImportResponse)
async def import_batch_annotations(
    chat_room_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """
    Import batch annotations from JSON file (admin only).
    PHASE 4: This implements the batch import functionality for multiple annotators.
    
    This endpoint accepts a JSON file containing structured batch annotation data
    with multiple annotators and their annotations. It will:
    1. Validate the JSON structure against the expected schema
    2. Create users if they don't exist (based on email)
    3. Import all annotations for each annotator
    4. Return detailed statistics about the import operation
    
    Args:
        chat_room_id: ID of the chat room to import annotations for
        file: JSON file containing batch annotation data
    
    Returns:
        BatchAnnotationImportResponse with detailed import statistics
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith('.json'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File must be a JSON file"
        )
    
    # Validate chat room exists
    chat_room = crud.get_chat_room(db, chat_room_id)
    if not chat_room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Chat room not found"
        )
    
    # Save uploaded file temporarily
    temp_file_path = f"uploads/batch_annotations_{file.filename}"
    try:
        contents = await file.read()
        os.makedirs("uploads", exist_ok=True)
        with open(temp_file_path, "wb") as f:
            f.write(contents)
        
        # Parse and validate JSON
        try:
            with open(temp_file_path, 'r', encoding='utf-8') as f:
                json_data = json.load(f)
        except json.JSONDecodeError as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid JSON format: {str(e)}"
            )
        
        # Validate against Pydantic schema
        try:
            batch_data = schemas.BatchAnnotationImport(**json_data)
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid batch annotation format: {str(e)}"
            )
        
        # Validate that the batch metadata matches the requested chat room
        if batch_data.batch_metadata.chat_room_id != chat_room_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Chat room ID mismatch: JSON contains {batch_data.batch_metadata.chat_room_id}, but endpoint expects {chat_room_id}"
            )
        
        # Validate that the project matches
        if batch_data.batch_metadata.project_id != chat_room.project_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Project ID mismatch: JSON contains {batch_data.batch_metadata.project_id}, but chat room belongs to project {chat_room.project_id}"
            )
        
        # Import batch annotations
        result = crud.import_batch_annotations_for_chat_room(
            db=db,
            chat_room_id=chat_room_id,
            project_id=chat_room.project_id,
            batch_data=batch_data
        )
        
        return result
        
    except HTTPException:
        # Re-raise HTTP exceptions
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing batch annotation file: {str(e)}"
        )
    finally:
        # Clean up temporary file
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

# PHASE 5: INTER-ANNOTATOR AGREEMENT (IAA) ENDPOINT

@router.get(
    "/chat-rooms/{chat_room_id}/iaa",
    response_model=schemas.ChatRoomIAA,
    summary="Get Inter-Annotator Agreement for a Chat Room",
)
async def get_iaa_for_chat_room(
    chat_room_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """
    Calculates and returns the one-to-one agreement analysis for a specific chat room.
    
    This endpoint is restricted to admin users and will only return results
    if the chat room has been fully annotated by all assigned annotators.
    
    The analysis includes:
    - Pairwise accuracy scores between all annotator pairs
    - Chat room metadata (name, message count, annotator count)
    - Completeness status
    
    Args:
        chat_room_id: ID of the chat room to analyze
    
    Returns:
        ChatRoomIAA: Complete IAA analysis with pairwise accuracy scores
    
    Raises:
        HTTPException: 
            - 404 if chat room not found
            - 400 if chat room is not fully annotated or has insufficient data
    """
    analysis = crud.get_chat_room_iaa_analysis(db=db, chat_room_id=chat_room_id)
    return analysis
