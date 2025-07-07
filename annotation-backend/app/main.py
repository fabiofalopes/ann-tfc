from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging
import uvicorn
from sqlalchemy import select

from .config import get_settings
from .database import engine, Base, SessionLocal
from .models import User
from .api import auth, admin, projects, message_annotation_router, project_annotation_router
from .auth import get_password_hash

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

settings = get_settings()

def create_first_admin():
    """Create the first admin user if it doesn't exist."""
    db = SessionLocal()
    try:
        # Check if admin exists
        admin = db.query(User).filter(User.email == settings.FIRST_ADMIN_EMAIL).first()
        if not admin:
            # Create admin user
            hashed_password = get_password_hash(settings.FIRST_ADMIN_PASSWORD)
            admin = User(
                email=settings.FIRST_ADMIN_EMAIL,
                hashed_password=hashed_password,
                is_admin=True
            )
            db.add(admin)
            db.commit()
            db.refresh(admin)
    except Exception as e:
        logger.error(f"Error creating first admin: {e}")
        db.rollback()
        raise
    finally:
        db.close()

# Create tables
def init_db():
    Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Annotation Backend",
    description="Backend for the annotation system",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.dynamic_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(projects.router, prefix="/projects", tags=["projects"])
app.include_router(message_annotation_router, tags=["annotations"])
app.include_router(project_annotation_router, tags=["annotations"])

@app.on_event("startup")
def startup_event():
    """Initialize database and create first admin on startup."""
    # init_db()  # Removed: Schema managed by Alembic migrations
    create_first_admin()

@app.get("/")
def root():
    """Root endpoint that returns API information."""
    return {
        "name": "Annotation Backend",
        "version": "1.0.0",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True) 