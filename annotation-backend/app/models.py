from sqlalchemy import Column, Integer, String, Text, ForeignKey, Boolean, DateTime, UniqueConstraint, Index
from sqlalchemy.orm import relationship, declarative_base, Mapped, mapped_column
from sqlalchemy.sql import func
from datetime import datetime

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String, unique=True)
    hashed_password: Mapped[str] = mapped_column(String)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    project_assignments = relationship("ProjectAssignment", back_populates="user", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="annotator", cascade="all, delete-orphan")

class Project(Base):
    __tablename__ = "projects"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_rooms = relationship("ChatRoom", back_populates="project", cascade="all, delete-orphan")
    assignments = relationship("ProjectAssignment", back_populates="project", cascade="all, delete-orphan")
    annotations = relationship("Annotation", back_populates="project", cascade="all, delete-orphan")

class ProjectAssignment(Base):
    __tablename__ = "project_assignments"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    
    # Relationships
    user = relationship("User", back_populates="project_assignments")
    project = relationship("Project", back_populates="assignments")
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'project_id', name='uix_user_project'),
    )

class ChatRoom(Base):
    __tablename__ = "chat_rooms"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    project = relationship("Project", back_populates="chat_rooms")
    messages = relationship("ChatMessage", back_populates="chat_room", cascade="all, delete-orphan")

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    turn_id: Mapped[str] = mapped_column(String, nullable=False)
    user_id: Mapped[str] = mapped_column(String, nullable=False)
    turn_text: Mapped[str] = mapped_column(Text, nullable=False)
    reply_to_turn: Mapped[str] = mapped_column(String, nullable=True)
    chat_room_id: Mapped[int] = mapped_column(ForeignKey("chat_rooms.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    chat_room = relationship("ChatRoom", back_populates="messages")
    annotations = relationship("Annotation", back_populates="message", cascade="all, delete-orphan")
    
    # Indexes and constraints
    __table_args__ = (
        Index('ix_chat_messages_chatroom_turn', 'chat_room_id', 'turn_id'),
        Index('ix_chat_messages_chatroom_reply', 'chat_room_id', 'reply_to_turn'),
        UniqueConstraint('chat_room_id', 'turn_id', name='uix_chatroom_turn'),
    )

class Annotation(Base):
    __tablename__ = "annotations"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    message_id: Mapped[int] = mapped_column(ForeignKey("chat_messages.id", ondelete="CASCADE"))
    annotator_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"))
    thread_id: Mapped[str] = mapped_column(String)  # Thread identifier
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    message = relationship("ChatMessage", back_populates="annotations")
    annotator = relationship("User", back_populates="annotations")
    project = relationship("Project", back_populates="annotations")
    
    # Indexes and constraints
    __table_args__ = (
        Index('ix_annotations_message_annotator', 'message_id', 'annotator_id'),
        Index('ix_annotations_thread', 'thread_id'),
        UniqueConstraint('message_id', 'annotator_id', name='uix_message_annotator'),
    ) 