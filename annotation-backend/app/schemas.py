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
    annotator_email: str
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

# PHASE 2: ANNOTATION IMPORT SCHEMAS

class AnnotationImportResponse(BaseModel):
    message: str = "Annotation import completed"
    chat_room_id: int
    annotator_id: int
    annotator_email: str
    total_annotations: int
    imported_count: int
    skipped_count: int
    errors: List[str] = []

# PHASE 3: AGGREGATED ANNOTATION ANALYSIS SCHEMAS

class AnnotationDetail(BaseModel):
    annotator_id: int
    annotator_email: str
    thread_id: str

class AggregatedMessageAnnotations(BaseModel):
    message_id: int
    message_text: str
    turn_id: str
    user_id: str
    annotations: List[AnnotationDetail]

class AggregatedAnnotationsResponse(BaseModel):
    chat_room_id: int
    messages: List[AggregatedMessageAnnotations]
    total_messages: int
    annotated_messages: int
    total_annotators: int
    annotators: List[str]  # List of annotator emails

# PHASE 4: BATCH ANNOTATION IMPORT SCHEMAS

class BatchAnnotationItem(BaseModel):
    turn_id: str
    thread_id: str

class BatchAnnotatorMetadata(BaseModel):
    tool_used: Optional[str] = None
    source_file: Optional[str] = None
    total_annotations: Optional[int] = None
    experience_level: Optional[str] = None
    notes: Optional[str] = None

class BatchAnnotator(BaseModel):
    annotator_email: EmailStr
    annotator_name: str
    annotator_metadata: Optional[BatchAnnotatorMetadata] = None
    annotations: List[BatchAnnotationItem]

class BatchMetadata(BaseModel):
    project_id: int
    chat_room_id: int
    import_description: Optional[str] = None
    import_timestamp: str
    created_by: Optional[str] = None
    source_files: Optional[List[str]] = None

class BatchAnnotationImport(BaseModel):
    batch_metadata: BatchMetadata
    annotators: List[BatchAnnotator]

class BatchAnnotationResult(BaseModel):
    annotator_email: str
    annotator_name: str
    user_id: int
    imported_count: int
    skipped_count: int
    errors: List[str] = []

class BatchAnnotationImportResponse(BaseModel):
    message: str = "Batch annotation import completed"
    chat_room_id: int
    total_annotators: int
    total_annotations_processed: int
    total_imported: int
    total_skipped: int
    results: List[BatchAnnotationResult]
    global_errors: List[str] = []

# PHASE 5: INTER-ANNOTATOR AGREEMENT (IAA) SCHEMAS

class PairwiseAccuracy(BaseModel):
    """Represents the one-to-one accuracy score between two annotators."""
    annotator_1_id: int
    annotator_2_id: int
    annotator_1_email: str
    annotator_2_email: str
    accuracy: float

class AnnotatorInfo(BaseModel):
    """Information about an annotator."""
    id: int
    email: str

class ChatRoomIAA(BaseModel):
    """Holds the complete IAA analysis for a single chat room."""
    chat_room_id: int
    chat_room_name: str
    message_count: int
    
    # New fields for clarity and partial analysis support
    analysis_status: str  # "Complete", "Partial", "NotEnoughData"
    
    total_annotators_assigned: int
    completed_annotators: List[AnnotatorInfo]
    pending_annotators: List[AnnotatorInfo]
    
    # Calculation is now based on completed_annotators
    pairwise_accuracies: List[PairwiseAccuracy] 