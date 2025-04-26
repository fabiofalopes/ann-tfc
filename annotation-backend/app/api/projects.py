from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from sqlalchemy import select

from ..database import get_db
from ..models import User, Project, ProjectAssignment, ChatMessage
from ..schemas import Project as ProjectSchema, ProjectCreate, User as UserSchema, ProjectList, MessageList
from ..auth import get_current_user, get_current_admin_user

router = APIRouter()

@router.post("/", response_model=ProjectSchema, status_code=status.HTTP_201_CREATED)
async def create_project(
    project: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create projects"
        )
    
    # Create project
    try:
        db_project = Project(**project.model_dump())
        db.add(db_project)
        db.commit()
        db.refresh(db_project)
        return db_project
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create project: {str(e)}"
        )

@router.get("/", response_model=ProjectList)
async def list_user_projects(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all projects assigned to the current user"""
    try:
        if current_user.is_admin:
            # Admins can see all projects
            projects = db.query(Project).all()
        else:
            # Regular users only see assigned projects
            projects = (
                db.query(Project)
                .join(ProjectAssignment)
                .filter(ProjectAssignment.user_id == current_user.id)
                .all()
            )
        
        return ProjectList(projects=projects)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list projects: {str(e)}"
        )

@router.get("/{project_id}", response_model=ProjectSchema)
async def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a specific project if the user has access"""
    try:
        # First check if project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check access
        if not current_user.is_admin:
            assignment = (
                db.query(ProjectAssignment)
                .filter(
                    ProjectAssignment.project_id == project_id,
                    ProjectAssignment.user_id == current_user.id
                )
                .first()
            )
            
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this project"
                )
        
        return project
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project: {str(e)}"
        )

@router.post("/{project_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def assign_user_to_project(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Assign a user to a project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can assign users to projects"
        )
    
    try:
        # Check if project exists
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Check if assignment already exists
        assignment = (
            db.query(ProjectAssignment)
            .filter(
                ProjectAssignment.project_id == project_id,
                ProjectAssignment.user_id == user_id
            )
            .first()
        )
        
        if assignment:
            return  # Already assigned
        
        # Create assignment
        assignment = ProjectAssignment(project_id=project_id, user_id=user_id)
        db.add(assignment)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign user to project: {str(e)}"
        )

@router.delete("/{project_id}/assign/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_user_from_project(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Remove a user from a project (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove users from projects"
        )
    
    try:
        # Find assignment
        assignment = (
            db.query(ProjectAssignment)
            .filter(
                ProjectAssignment.project_id == project_id,
                ProjectAssignment.user_id == user_id
            )
            .first()
        )
        
        if assignment:
            db.delete(assignment)
            db.commit()
            
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove user from project: {str(e)}"
        )

@router.get("/{project_id}/users", response_model=List[UserSchema])
async def get_project_users(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all users assigned to a project"""
    try:
        # First check if project exists and user has access
        project = db.query(Project).filter(Project.id == project_id).first()
        
        if not project:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Project not found"
            )
        
        # Check access if not admin
        if not current_user.is_admin:
            assignment = (
                db.query(ProjectAssignment)
                .filter(
                    ProjectAssignment.project_id == project_id,
                    ProjectAssignment.user_id == current_user.id
                )
                .first()
            )
            
            if not assignment:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Not authorized to access this project"
                )
        
        # Get all users assigned to the project
        users = (
            db.query(User)
            .join(ProjectAssignment)
            .filter(ProjectAssignment.project_id == project_id)
            .all()
        )
        
        return users
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project users: {str(e)}"
        )

@router.get("/{project_id}/messages", response_model=MessageList)
async def get_project_messages(
    project_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all messages for a project"""
    try:
        # Check if project exists and user has access
        project = (
            db.query(Project)
            .filter(
                Project.id == project_id,
                (
                    Project.assignments.any(user_id=current_user.id) |
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
        
        # Get messages
        messages = (
            db.query(ChatMessage)
            .filter(ChatMessage.project_id == project_id)
            .order_by(ChatMessage.created_at)
            .all()
        )
        
        return MessageList(messages=messages)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get project messages: {str(e)}"
        ) 