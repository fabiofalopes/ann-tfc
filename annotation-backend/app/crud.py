from sqlalchemy.orm import Session
from typing import List, Optional
from . import models, schemas

# User CRUD operations
def get_user(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()

def get_users(db: Session, skip: int = 0, limit: int = 100) -> List[models.User]:
    return db.query(models.User).offset(skip).limit(limit).all()

def create_user(db: Session, user: schemas.UserCreate, hashed_password: str) -> models.User:
    db_user = models.User(
        email=user.email,
        hashed_password=hashed_password,
        is_admin=user.is_admin
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

# Project CRUD operations
def get_project(db: Session, project_id: int) -> Optional[models.Project]:
    return db.query(models.Project).filter(models.Project.id == project_id).first()

def get_projects(db: Session, skip: int = 0, limit: int = 100) -> List[models.Project]:
    return db.query(models.Project).offset(skip).limit(limit).all()

def create_project(db: Session, project: schemas.ProjectCreate) -> models.Project:
    db_project = models.Project(
        name=project.name,
        description=project.description
    )
    db.add(db_project)
    db.commit()
    db.refresh(db_project)
    return db_project

# ChatRoom CRUD operations
def get_chat_room(db: Session, chat_room_id: int) -> Optional[models.ChatRoom]:
    return db.query(models.ChatRoom).filter(models.ChatRoom.id == chat_room_id).first()

def get_chat_rooms_by_project(db: Session, project_id: int, skip: int = 0, limit: int = 100) -> List[models.ChatRoom]:
    return db.query(models.ChatRoom).filter(models.ChatRoom.project_id == project_id).offset(skip).limit(limit).all()

def create_chat_room(db: Session, chat_room: schemas.ChatRoomCreate) -> models.ChatRoom:
    db_chat_room = models.ChatRoom(
        name=chat_room.name,
        description=chat_room.description,
        project_id=chat_room.project_id
    )
    db.add(db_chat_room)
    db.commit()
    db.refresh(db_chat_room)
    return db_chat_room

# ChatMessage CRUD operations
def get_chat_message(db: Session, message_id: int) -> Optional[models.ChatMessage]:
    return db.query(models.ChatMessage).filter(models.ChatMessage.id == message_id).first()

def get_chat_messages_by_room(db: Session, chat_room_id: int, skip: int = 0, limit: int = 100) -> List[models.ChatMessage]:
    return db.query(models.ChatMessage).filter(models.ChatMessage.chat_room_id == chat_room_id).offset(skip).limit(limit).all()

def create_chat_message(db: Session, message: schemas.ChatMessageCreate, chat_room_id: int) -> models.ChatMessage:
    db_message = models.ChatMessage(
        turn_id=message.turn_id,
        user_id=message.user_id,
        turn_text=message.turn_text,
        reply_to_turn=message.reply_to_turn,
        chat_room_id=chat_room_id
    )
    db.add(db_message)
    db.commit()
    db.refresh(db_message)
    return db_message

def get_chat_message_by_turn_id(db: Session, chat_room_id: int, turn_id: str) -> Optional[models.ChatMessage]:
    """Get a chat message by its turn_id within a specific chat room."""
    return db.query(models.ChatMessage).filter(
        models.ChatMessage.chat_room_id == chat_room_id,
        models.ChatMessage.turn_id == turn_id
    ).first()

# Annotation CRUD operations
def get_annotation(db: Session, annotation_id: int) -> Optional[models.Annotation]:
    return db.query(models.Annotation).filter(models.Annotation.id == annotation_id).first()

def get_annotations_by_message(db: Session, message_id: int) -> List[models.Annotation]:
    return db.query(models.Annotation).filter(models.Annotation.message_id == message_id).all()

def get_annotations_by_annotator(db: Session, annotator_id: int) -> List[models.Annotation]:
    return db.query(models.Annotation).filter(models.Annotation.annotator_id == annotator_id).all()

def create_annotation(db: Session, annotation: schemas.AnnotationCreate) -> models.Annotation:
    db_annotation = models.Annotation(
        message_id=annotation.message_id,
        annotator_id=annotation.annotator_id,
        project_id=annotation.project_id,
        thread_id=annotation.thread_id
    )
    db.add(db_annotation)
    db.commit()
    db.refresh(db_annotation)
    return db_annotation

# ProjectAssignment CRUD operations
def get_project_assignment(db: Session, assignment_id: int) -> Optional[models.ProjectAssignment]:
    return db.query(models.ProjectAssignment).filter(models.ProjectAssignment.id == assignment_id).first()

def get_project_assignments_by_user(db: Session, user_id: int) -> List[models.ProjectAssignment]:
    return db.query(models.ProjectAssignment).filter(models.ProjectAssignment.user_id == user_id).all()

def get_project_assignments_by_project(db: Session, project_id: int) -> List[models.ProjectAssignment]:
    return db.query(models.ProjectAssignment).filter(models.ProjectAssignment.project_id == project_id).all()

# Removed create_project_assignment function as it's unused and caused an import error
# Assignment creation is handled directly in the admin endpoint. 