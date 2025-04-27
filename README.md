# Annotation Tool

A full-stack application for managing and annotating projects.

## Prerequisites

- Docker
- Docker Compose

## Setup

1. Clone the repository
2. Create a `.env` file in the root directory with the following content:
   ```
   REACT_APP_API_URL=http://localhost:8000
   ```

3. Build and start the services:
   ```bash
   docker-compose up --build
   ```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Services

### Backend (FastAPI)
- Port: 8000
- API documentation: http://localhost:8000/docs
- Handles authentication, project management, and annotations

### Frontend (React)
- Port: 3000
- User interface for managing projects and annotations
- Communicates with the backend API

## Development

To run the services in development mode:

```bash
# Backend
cd annotation-backend
uvicorn main:app --reload

# Frontend
cd annotation_ui
npm start
```

## Features

- User authentication (admin and regular users)
- Project management
- CSV file import
- Message annotation
- Tag management
 