#!/bin/sh

# Wait for the database to be ready
sleep 3

# Run database migrations
alembic upgrade head

# Start the FastAPI application
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload 