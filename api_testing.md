# API Testing Documentation

This document tracks the testing of the annotation backend API endpoints.

## Test Flow
1. Authentication (Admin User)
2. Project Management
   - Create Projects
   - List Projects
3. User Management
   - Create Users
   - Add Users to Projects
4. Data Import
   - Import data from uploads folder

## Test Results

### 1. Authentication
- Status: Success
- Endpoint: `/api/v1/auth/token`
- Method: POST
- Curl Command:
  ```bash
  curl -X POST "http://localhost:8000/api/v1/auth/token" \
       -H "Content-Type: application/x-www-form-urlencoded" \
       -d "username=admin@example.com&password=admin"
  ```
- Response: Returns a JWT token for authentication

### 2. Project Management
- Status: Success
- Endpoints:
  - Create Project: `/api/v1/projects`
    ```bash
    curl -X POST "http://localhost:8000/api/v1/projects" \
         -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6MTc0NTY5NjM0N30._qOII3sqPCmlQXNwmQ2lsw1Y7irS944qGtMnaaFO7kg" \
         -H "Content-Type: application/json" \
         -d '{"name": "Test Project", "description": "A test project for API testing"}'
    ```
  - List Projects: `/api/v1/projects`
    ```bash
    curl -X GET "http://localhost:8000/api/v1/projects" \
         -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbkBleGFtcGxlLmNvbSIsImV4cCI6MTc0NTY5NjM0N30._qOII3sqPCmlQXNwmQ2lsw1Y7irS944qGtMnaaFO7kg"
    ```

### 3. User Management
- Status: Pending
- Endpoints:
  - Create User: `/api/v1/auth/register`
  - Add User to Project: `/api/v1/projects/{project_id}/assign/{user_id}`

### 4. Data Import
- Status: Pending
- Endpoint: `/api/v1/admin/import/csv/{project_id}`
- Source: `/uploads` directory

## Notes
- All curl commands and responses will be documented here
- Success/failure status will be updated for each test
- Any issues encountered will be noted with their resolution 