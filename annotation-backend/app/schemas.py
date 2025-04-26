from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# Base Models
class UserBase(BaseModel):
    email: EmailStr

class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ChatMessageBase(BaseModel):
    turn_id: str
    user_id: str
    turn_text: str
    reply_to_turn: Optional[str] = None

class AnnotationBase(BaseModel):
    thread_id: str

# Create Request Models
class UserCreate(UserBase):
    password: str
    is_admin: Optional[bool] = False

class ProjectCreate(ProjectBase):
    pass

class ChatMessageCreate(ChatMessageBase):
    project_id: int

class AnnotationCreate(AnnotationBase):
    message_id: int

# Response Models
class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Project(ProjectBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class ChatMessage(ChatMessageBase):
    id: int
    project_id: int
    created_at: datetime

    class Config:
        from_attributes = True

class Annotation(AnnotationBase):
    id: int
    message_id: int
    annotator_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Authentication Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

# Project List Response
class ProjectList(BaseModel):
    projects: List[Project]

# Message List Response
class MessageList(BaseModel):
    messages: List[ChatMessage]

# Annotation List Response
class AnnotationList(BaseModel):
    annotations: List[Annotation] 