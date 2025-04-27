from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime

from ..database import get_db
from ..auth import get_current_user
from ..dependencies import verify_project_access
from ..models import User, Annotation, ChatMessage, Project, ProjectAssignment
from ..schemas import Annotation as AnnotationSchema, AnnotationCreate, AnnotationList

# Router for message-specific annotations
message_annotation_router = APIRouter(
    prefix="/projects/{project_id}/messages/{message_id}/annotations", 
    tags=["annotations"]
)

# Router for project-level annotations (e.g., get all my annotations)
project_annotation_router = APIRouter(
    prefix="/projects/{project_id}/annotations", # Changed prefix
    tags=["annotations"]
)

@project_annotation_router.get("/my", response_model=List[AnnotationSchema]) # Changed path to /my
def get_my_annotations(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_project_access)
):
    """Get all annotations made by the current user in a specific project"""
    # Verify project exists (optional, access check implies existence)
    # project = db.query(Project).filter(Project.id == project_id).first()
    # if not project:
    #     raise HTTPException(status_code=404, detail="Project not found")
    
    # The access check is now handled by the dependency
    # if not current_user.is_admin:
    #     pass 

    annotations = db.query(Annotation).filter(
        Annotation.project_id == project_id,
        Annotation.annotator_id == current_user.id
    ).all()
    
    return annotations

@message_annotation_router.get("/", response_model=List[AnnotationSchema])
def get_message_annotations(
    project_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_project_access)
):
    """Get all annotations for a specific message"""
    # Access check handled by dependency
    
    # Verify message exists and belongs to project
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.chat_room.has(project_id=project_id)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get all annotations for this message
    annotations = db.query(Annotation).filter(
        Annotation.message_id == message_id
    ).all()
    
    return annotations

@message_annotation_router.post("/", response_model=AnnotationSchema)
def create_annotation(
    project_id: int,
    message_id: int,
    annotation: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_project_access)
):
    """Create a new annotation for a message"""
    # Access check handled by dependency

    # Verify message exists and belongs to project
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.chat_room.has(project_id=project_id)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Check if user has already annotated this message
    existing_annotation = db.query(Annotation).filter(
        Annotation.message_id == message_id,
        Annotation.annotator_id == current_user.id
    ).first()
    
    if existing_annotation:
        raise HTTPException(
            status_code=400,
            detail="You have already annotated this message"
        )
    
    # Create new annotation
    db_annotation = Annotation(
        message_id=message_id,
        annotator_id=current_user.id,
        project_id=project_id,
        thread_id=annotation.thread_id,
        created_at=datetime.utcnow()
    )
    
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    
    return db_annotation

@message_annotation_router.delete("/{annotation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_annotation(
    project_id: int,
    message_id: int,
    annotation_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_project_access)
):
    """Delete an annotation"""
    # Access check handled by dependency

    # Verify message exists and belongs to project
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.chat_room.has(project_id=project_id)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # Get the annotation
    annotation = db.query(Annotation).filter(
        Annotation.id == annotation_id,
        Annotation.message_id == message_id,
        Annotation.project_id == project_id
    ).first()
    
    if not annotation:
        raise HTTPException(status_code=404, detail="Annotation not found")
    
    # Check if user is the owner of the annotation or admin
    if annotation.annotator_id != current_user.id and not current_user.is_admin:
        raise HTTPException(
            status_code=403,
            detail="Not enough permissions to delete this annotation"
        )
    
    db.delete(annotation)
    db.commit()
    
    return None 