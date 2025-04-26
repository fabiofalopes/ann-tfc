from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from pydantic import BaseModel, Field
from datetime import datetime

from ..database import get_db
from ..models import User, Project, ChatMessage, Annotation
from ..schemas import Annotation as AnnotationSchema, AnnotationCreate, AnnotationList
from ..auth import get_current_user

router = APIRouter()

class BatchAnnotationRequest(BaseModel):
    message_id: int
    thread_id: str = Field(..., min_length=1, max_length=50)

class BatchAnnotationResponse(BaseModel):
    message: str
    total_annotations: int
    created_annotations: int
    updated_annotations: int
    errors: List[str] = []

@router.post("/messages/{message_id}", response_model=AnnotationSchema)
def create_annotation(
    message_id: int,
    annotation: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a thread annotation for a chat message"""
    # Check if message exists and user has access
    message = (
        db.query(ChatMessage)
        .join(Project)
        .filter(
            ChatMessage.id == message_id,
            (
                (Project.assignments.any(user_id=current_user.id)) |
                (current_user.is_admin == True)
            )
        )
        .first()
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or access denied"
        )
    
    # Check if annotation already exists
    existing_annotation = (
        db.query(Annotation)
        .filter(
            Annotation.message_id == message_id,
            Annotation.annotator_id == current_user.id
        )
        .first()
    )
    
    if existing_annotation:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already annotated this message"
        )
    
    # Create the annotation
    db_annotation = Annotation(
        message_id=message_id,
        annotator_id=current_user.id,
        thread_id=annotation.thread_id,
        created_at=datetime.utcnow()
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation

@router.post("/projects/{project_id}/batch", response_model=BatchAnnotationResponse)
def create_batch_annotations(
    project_id: int,
    annotations: List[BatchAnnotationRequest],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create or update multiple annotations for a project"""
    # Check if project exists and user has access
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            (
                (Project.assignments.any(user_id=current_user.id)) |
                (current_user.is_admin == True)
            )
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    errors = []
    created_count = 0
    updated_count = 0
    
    for annotation in annotations:
        try:
            # Check if message exists in the project
            message = (
                db.query(ChatMessage)
                .filter(
                    ChatMessage.id == annotation.message_id,
                    ChatMessage.project_id == project_id
                )
                .first()
            )
            
            if not message:
                errors.append(f"Message {annotation.message_id} not found in project")
                continue
            
            # Check for existing annotation
            existing_annotation = (
                db.query(Annotation)
                .filter(
                    Annotation.message_id == annotation.message_id,
                    Annotation.annotator_id == current_user.id
                )
                .first()
            )
            
            if existing_annotation:
                # Update existing annotation
                existing_annotation.thread_id = annotation.thread_id
                existing_annotation.updated_at = datetime.utcnow()
                updated_count += 1
            else:
                # Create new annotation
                db_annotation = Annotation(
                    message_id=annotation.message_id,
                    annotator_id=current_user.id,
                    thread_id=annotation.thread_id,
                    created_at=datetime.utcnow()
                )
                db.add(db_annotation)
                created_count += 1
        
        except Exception as e:
            errors.append(f"Error processing message {annotation.message_id}: {str(e)}")
    
    db.commit()
    
    return BatchAnnotationResponse(
        message="Batch annotation completed",
        total_annotations=len(annotations),
        created_annotations=created_count,
        updated_annotations=updated_count,
        errors=errors
    )

@router.get("/messages/{message_id}", response_model=List[AnnotationSchema])
def get_message_annotations(
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all annotations for a specific chat message"""
    # Check if message exists and user has access
    message = (
        db.query(ChatMessage)
        .join(Project)
        .filter(
            ChatMessage.id == message_id,
            (
                (Project.assignments.any(user_id=current_user.id)) |
                (current_user.is_admin == True)
            )
        )
        .first()
    )
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found or access denied"
        )
    
    # Get annotations
    annotations = (
        db.query(Annotation)
        .filter(Annotation.message_id == message_id)
        .all()
    )
    
    return annotations

@router.get("/projects/{project_id}", response_model=AnnotationList)
def get_project_annotations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all annotations for a project"""
    # Check if project exists and user has access
    project = (
        db.query(Project)
        .filter(
            Project.id == project_id,
            (
                (Project.assignments.any(user_id=current_user.id)) |
                (current_user.is_admin == True)
            )
        )
        .first()
    )
    
    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Project not found or access denied"
        )
    
    # Get annotations
    annotations = (
        db.query(Annotation)
        .join(ChatMessage)
        .filter(ChatMessage.project_id == project_id)
        .all()
    )
    
    return AnnotationList(annotations=annotations)

@router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete an annotation (only by owner or admin)"""
    # Find annotation and check permissions
    annotation = (
        db.query(Annotation)
        .filter(Annotation.id == annotation_id)
        .first()
    )
    
    if not annotation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Annotation not found"
        )
    
    # Check if user is admin or owner
    if not current_user.is_admin and annotation.annotator_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only delete your own annotations"
        )
    
    # Delete annotation
    db.delete(annotation)
    db.commit() 