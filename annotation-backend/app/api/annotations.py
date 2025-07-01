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
    # Get all annotations for this user with annotator information
    annotations = db.query(
        Annotation,
        User.email.label('annotator_email')
    ).join(
        User, Annotation.annotator_id == User.id
    ).filter(
        Annotation.project_id == project_id,
        Annotation.annotator_id == current_user.id
    ).all()
    
    # Convert to list of dictionaries with annotator email
    result = []
    for annotation, annotator_email in annotations:
        annotation_dict = annotation.__dict__
        annotation_dict['annotator_email'] = annotator_email
        result.append(annotation_dict)
    
    return result

@message_annotation_router.get("/", response_model=List[AnnotationSchema])
def get_message_annotations(
    project_id: int,
    message_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    _: None = Depends(verify_project_access)
):
    """
    Get annotations for a specific message.
    PHASE 1 SECURITY: Annotators see only their own annotations, admins see all.
    """
    # Access check handled by dependency
    
    # Verify message exists and belongs to project
    message = db.query(ChatMessage).filter(
        ChatMessage.id == message_id,
        ChatMessage.chat_room.has(project_id=project_id)
    ).first()
    
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    # PILLAR 1: Isolate annotations based on user role
    query = db.query(
        Annotation,
        User.email.label('annotator_email')
    ).join(
        User, Annotation.annotator_id == User.id
    ).filter(
        Annotation.message_id == message_id
    )
    
    # If not admin, filter to only show user's own annotations
    if not current_user.is_admin:
        query = query.filter(Annotation.annotator_id == current_user.id)
    
    annotations = query.all()
    
    # Convert to list of dictionaries with annotator email
    result = []
    for annotation, annotator_email in annotations:
        annotation_dict = annotation.__dict__
        annotation_dict['annotator_email'] = annotator_email
        result.append(annotation_dict)
    
    return result

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
    
    # Add annotator email to the response
    annotation_dict = db_annotation.__dict__
    annotation_dict['annotator_email'] = current_user.email
    
    return annotation_dict

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