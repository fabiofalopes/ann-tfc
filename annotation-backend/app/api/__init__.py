from fastapi import APIRouter
from . import auth, admin, projects
from .annotations import message_annotation_router, project_annotation_router

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(admin.router, prefix="/admin", tags=["admin"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects", "chat rooms"])
api_router.include_router(message_annotation_router, tags=["annotations"])
api_router.include_router(project_annotation_router, tags=["annotations"])

__all__ = [
    "auth", 
    "admin", 
    "projects", 
    "message_annotation_router",
    "project_annotation_router",
] 