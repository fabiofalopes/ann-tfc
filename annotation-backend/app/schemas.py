from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

# User Schemas
class UserBase(BaseModel):
    email: EmailStr

class UserCreate(UserBase):
    password: str
    is_admin: bool = False

class User(UserBase):
    id: int
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Project Schemas
class ProjectBase(BaseModel):
    name: str
    description: Optional[str] = None

class ProjectCreate(ProjectBase):
    pass

class Project(ProjectBase):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class ProjectList(BaseModel):
    projects: List[Project]

# Chat Room Schemas
class ChatRoomBase(BaseModel):
    name: str
    description: Optional[str] = None

class ChatRoomCreate(ChatRoomBase):
    project_id: int

class ChatRoom(ChatRoomBase):
    id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ChatRoomList(BaseModel):
    chat_rooms: List[ChatRoom]

# Message Schemas
class ChatMessageBase(BaseModel):
    turn_id: str
    user_id: str
    turn_text: str
    reply_to_turn: Optional[str] = None

class ChatMessageCreate(ChatMessageBase):
    pass

class ChatMessage(ChatMessageBase):
    id: int
    chat_room_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class MessageList(BaseModel):
    messages: List[ChatMessage]

# Annotation Schemas
class AnnotationBase(BaseModel):
    message_id: int
    thread_id: str = Field(..., min_length=1, max_length=50)

class AnnotationCreate(AnnotationBase):
    pass

class Annotation(AnnotationBase):
    id: int
    annotator_id: int
    project_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class AnnotationList(BaseModel):
    annotations: List[Annotation]

# Authentication Schemas
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class CSVImportResponse(BaseModel):
    message: str = "Import completed"
    total_messages: int
    imported_count: int
    skipped_count: int
    errors: List[str] = []
    warnings: List[str] = []

# New schema for combined chat room creation and import
class ChatRoomImportResponse(BaseModel):
    chat_room: ChatRoom  # Details of the created chat room
    import_details: CSVImportResponse # Import statistics 