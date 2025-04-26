# Annotation System Integration Plan: Annotation UI + Simplified Backend

## 1. Introduction & Background

This document outlines the plan to integrate the existing React-based `Annotation UI` frontend with a **simplified** FastAPI backend.

**Context:**
- **`Annotation UI` (`annotation_ui/`)**: A functional prototype React application specifically designed and proven for **chat disentanglement annotation**. It allows users to load chat messages (from CSV), view them, and assign thread IDs to messages. It currently relies on a minimal Express.js server (`annotation_ui/server.js`) that directly reads from and writes to CSV files in the `annotation_ui/files/` directory. This UI represents the **core required functionality**.
- **`Annotation Backend Copy` (`annotation-backend-copy/`)**: A separate FastAPI backend initially developed with broader goals for a more generic annotation platform. While functional, it incorporates complex abstractions (e.g., generic `DataContainer`, `DataItem` models, polymorphic relationships, intricate metadata handling seen in `app/models.py` and `app/schemas.py`) that make it unsuitable and overly complex for directly supporting the specific needs of the existing `Annotation UI`. It does, however, contain potentially reusable components like a robust authentication system (`app/auth.py`, `app/api/auth.py`) and a foundation for database interaction using SQLAlchemy/Alembic.

**Goal:**
Replace the simple, file-based `annotation_ui/server.js` with a **streamlined FastAPI backend** derived by **aggressively trimming `annotation-backend-copy`**. This new backend will provide database persistence (using SQLite initially for simplicity), user authentication, and basic admin controls, while strictly adhering to the data structures and workflow required by the `Annotation UI` for chat disentanglement. The primary objective is to **leverage the existing, working `Annotation UI`** with minimal frontend changes beyond adapting to the new API and authentication, powered by a stable, database-backed API.

## 2. Guiding Principles & Strategy

- **Simplicity First:** Prioritize removing complexity. The backend should **only** contain features strictly necessary to support the `Annotation UI`'s chat disentanglement task.
- **Reuse, Don't Reinvent (Where Appropriate):** Leverage stable components from `annotation-backend-copy`, primarily **authentication** and the basic **FastAPI/SQLAlchemy/Alembic setup**.
- **Trim Aggressively:** Start with `annotation-backend-copy` and **remove** all non-essential code: generic abstractions (`DataContainer`, `DataItem`), unused models/schemas/endpoints, complex import logic, potentially irrelevant tests initially.
- **Functional Equivalence:** The new backend API should provide database-backed endpoints that achieve the *same user-facing goals* as the original `server.js` operations (e.g., allow importing data, list accessible tasks/projects, retrieve task data, save annotations), but the API design itself should be improved.
- **Semantic API Design:** Design the new FastAPI endpoints logically based on the database models (Users, Projects, Messages, Annotations) and REST principles (e.g., using `/projects`, `/users`, `/annotations`). **Do not** simply replicate the old file-based endpoint names (`/workspace-files`, `/copy-to-files`, `/save-csv`).
- **Direct Data Mapping:** The database schema should directly reflect the data needed for chat disentanglement (Users, Projects, Messages/Turns with specific fields like `turn_id`, `user_id`, `turn_text`, `reply_to_turn`, and Annotations linking messages to threads and annotators), mirroring the structure implied by the original CSVs and `server.js` logic, rather than using generic JSON blobs or complex metadata structures found in `annotation-backend-copy`.
- **Focus on Chat Disentanglement:** All development should be centered around supporting this specific annotation task as implemented in the `Annotation UI`.
- **Acknowledge Frontend Adaptation:** Recognize that the frontend `Annotation UI` **will require modifications** to its API service layer to interact with the new, semantically designed FastAPI endpoints.

## 3. Backend Simplification (Trimming `annotation-backend-copy`)

**Process:**

1.  **Setup:** Consider creating a new directory (`annotation-backend-simplified`) and copying only essential structural files/folders from `annotation-backend-copy` OR work directly in `annotation-backend-copy` and aggressively delete/refactor.
2.  **Identify Core Components to Keep/Adapt:**
    *   FastAPI App Setup: `app/main.py` (simplify middleware, router includes).
    *   Database Config: `app/database.py` (configure for SQLite initially).
    *   Settings: `app/config.py` (keep JWT secret, DB URL, prune others).
    *   Authentication Logic: `app/auth.py` (likely usable as-is).
    *   Authentication Router: `app/api/auth.py` (keep `/token`, adapt user endpoints).
    *   Base Models/Schemas: Basic structure for `User`, `Project`, `ProjectAssignment` from `app/models.py`, `app/schemas.py` (strip complexity).
    *   Migrations: `alembic/` directory and `alembic.ini` (will need regeneration).
    *   Potentially useful scripts: `generate_erd.py` (if desired).
3.  **Identify Components to Remove/Heavily Simplify:**
    *   Generic Models/Schemas: `DataContainer`, `DataItem`, `ImportedData` and their complex relationships/metadata handling/polymorphism in `app/models.py` and `app/schemas.py`.
    *   Complex Annotation Models: Simplify `Annotation`, `ThreadAnnotation` in `app/models.py` and `app/schemas.py` to directly store thread info, removing polymorphism and generic `data` fields.
    *   Unused API Routers: Remove routers related to generic data (`data.py`, `generic_data.py` if they exist and are not needed).
    *   Complex Import Logic: Remove generic field mapping (`MapField`) and complex import request schemas (`CSVImportRequest`, `ChatCSVImportRequest`) from `app/schemas.py` and associated logic in `app/api/import_data.py`. Replace with a simpler CSV parser targeting the new `ChatMessage` model.
    *   Irrelevant Tests: Temporarily ignore or remove tests associated with the removed abstractions/features. Focus on testing the core simplified functionality later.
4.  **Define Simplified Database Schema (`app/models.py`):**
    *   `User`: Keep core fields (`id`, `email`, `hashed_password`, `is_admin`, `is_active`). Relationship to `ProjectAssignment`.
    *   `Project`: Keep core fields (`id`, `name`, `description`). Add `creation_date`. Remove generic `type` or complex `meta_data`. Relationship to `ChatMessage` and `ProjectAssignment`.
    *   `ProjectAssignment`: Simple join table (`user_id`, `project_id`).
    *   `ChatMessage`: **New/Heavily Simplified Model.** Fields should directly reflect CSV columns: `id`, `project_id` (FK), `turn_id` (original string ID), `user_id` (original speaker string ID), `turn_text`, `reply_to_turn` (original string ID). Relationship to `Annotation`. **NO** inheritance from `DataItem`, **NO** storing core fields in `meta_data`.
    *   `Annotation`: **New/Heavily Simplified Model.** Fields: `id`, `chat_message_id` (FK), `annotator_user_id` (FK to `User`), `thread_id` (string). **NO** polymorphism, **NO** generic `data` field.
5.  **Define Simplified API Schemas (`app/schemas.py`):** Create corresponding Pydantic schemas (`Base`, `Create`, `Read`) for the simplified models above. Remove all schemas related to `DataContainer`, `DataItem`, complex imports, etc.
6.  **Implement Simplified API Endpoints (`app/api/`):** Refactor existing or create new endpoints focusing on the target functionality, using semantic naming:
    *   **Auth (`auth.py`):**
        *   `POST /token`: Login (keep existing).
        *   `GET /users/me`: Get current user details.
        *   *(Optional: Add user creation endpoint accessible only by admin)*.
    *   **Projects (`projects.py`):**
        *   `GET /projects`: List projects accessible to the current user (Admin sees all, Annotator sees assigned). Functionally replaces listing files.
        *   `POST /projects`: Create project (Admin only).
        *   `GET /projects/{project_id}/messages`: Get all `ChatMessage`s for a project. Functionally replaces reading a specific file.
        *   `POST /projects/{project_id}/assign`: Assign user to project (Admin only).
        *   *(Optional: `DELETE /projects/{project_id}` (Admin only), `PUT /projects/{project_id}` (Admin only)).*
    *   **Annotations (`annotations.py` or similar, maybe merged into `projects.py`):**
        *   `POST /projects/{project_id}/annotations`: Receive and save annotations (list of message IDs + thread IDs) for a project. Functionally replaces saving the CSV file. Logic updates/creates `Annotation` records.
    *   **Admin (`admin.py`):**
        *   `POST /import/csv`: Upload a CSV, parse it (using standard `csv` or `pandas`), create `ChatMessage` records for a specified project (Admin only). Functionally replaces copying the file. Needs robust parsing and error handling for the expected chat format.
        *   `GET /admin/users`: List all users (Admin only).
        *   *(Optional: User management endpoints - activate/deactivate, grant admin).*
7.  **Migrations:** After models are simplified, regenerate Alembic migrations (`alembic revision --autogenerate`, `alembic upgrade head`).

## 4. Frontend Integration (`annotation_ui`)

**Process:**

1.  **Remove `server.js`:** Delete the file and remove Express/related dependencies (`papaparse`, `multer`) from `package.json`. Update any related npm scripts.
2.  **Implement API Service Layer:** Create/refactor a module (e.g., `src/services/api.js`) using `axios` or `fetch`.
    *   Configure base URL for the new FastAPI backend (use environment variables `REACT_APP_API_BASE_URL`).
    *   **Adapt API Calls:** Implement functions to call the **new FastAPI endpoints** (`/projects`, `/projects/{id}/messages`, `/projects/{id}/annotations`, etc.). Update request/response handling to match the new API structure.
    *   Integrate JWT token handling: Store token on login, send `Authorization: Bearer <token>` header on authenticated requests, handle token expiration/refresh if necessary.
3.  **Integrate Authentication Flow:**
    *   Use React Context or state management (Zustand, Redux) for auth state (`isAuthenticated`, `user {email, isAdmin}`, `token`).
    *   Create Login page/component calling `POST /token`. On success, store token (e.g., localStorage) and user details in global state.
    *   Implement Logout functionality (clear token, reset state).
    *   Protect routes/components, redirecting unauthenticated users to Login.
4.  **Implement Role-Based Rendering:**
    *   Fetch user details (including `is_admin` flag) after login using `GET /users/me`.
    *   Conditionally render UI elements based on the `user.isAdmin` state:
        *   **Admin:** Sees standard annotation views PLUS dedicated sections/routes for "Project Management" (creating projects, assigning users), "User Management" (listing/managing users), and "Import Data".
        *   **Annotator:** Sees only the project list (filtered to their assigned projects) and the core chat disentanglement annotation view for selected projects. Admin-specific menu items/buttons/routes are hidden.
5.  **Refactor Components:**
    *   **Project List:** Fetch data from `GET /projects`. Display projects based on user role (all for admin, assigned for annotator).
    *   **Chat View:** Fetch data from `GET /projects/{project_id}/messages`. Adapt to the structure returned by the new endpoint (list of `ChatMessage` objects).
    *   **Annotation Saving:** Send annotations via `POST /projects/{project_id}/annotations` with the required payload (e.g., `[{chat_message_id: 123, thread_id: "A"}, ...]`).
    *   **Admin Components:** Create/adapt components for Project Management, User Management, and Data Import, using the corresponding Admin API endpoints.

## 5. "Do Nots" / Anti-Goals

- **Do Not Re-introduce Complexity:** Avoid adding back generic layers, complex relationships, or features not strictly required by the `Annotation UI`.
- **Do Not Create Generic Abstractions:** Stick to concrete models (`ChatMessage`, `Annotation`) tailored to the task. Avoid patterns like the `DataItem`/`meta_data` found in `annotation-backend-copy`.
- **Do Not Replicate Old API Names:** Design new endpoints semantically (e.g., `/projects`), don't just copy names from `server.js` (`/workspace-files`).
- **Do Not Over-Develop:** Focus solely on supporting the *current* functionality of `Annotation UI`. New features are out of scope for this integration phase.
- **Do Not Discard Reusable Code Blindly:** While trimming is key, carefully evaluate components like auth before removing them. Reuse where it aligns with the simplification goal.
- **Do Not Make Extensive Frontend UI Changes:** Adapt the frontend to the new API and auth, implement role-based views, but avoid significant redesigns or feature additions to the core annotation interface.

## 6. Development Workflow

1.  **Backend First:** Perform the simplification/trimming of `annotation-backend-copy` as described in Section 3.
2.  **Backend Unit/API Testing:** Ensure core endpoints (auth, project retrieval, annotation saving, import) function correctly with the simplified models.
3.  **Frontend Integration:** Perform the steps in Section 4, adapting API calls as needed.
4.  **End-to-End Testing:** Thoroughly test the complete flow: Login -> Project Selection -> Annotation -> Saving -> Admin Functions (Import, User/Project Management).

## 7. Next Steps

1.  Begin Phase 1: **Backend Simplification**. Decide whether to work in place or create a new `annotation-backend-simplified` directory.
2.  Start by removing unused files/folders and simplifying `app/models.py` and `app/schemas.py` according to the plan.
3.  Adapt `app/database.py` and `app/config.py`.
4.  Regenerate initial Alembic migrations.
5.  Verify the core Authentication (`app/auth.py`, `app/api/auth.py`) remains functional.

---

This revised plan provides more context and specific guidance on the trimming process, component reuse, UI requirements, and pitfalls to avoid, while clarifying the API design approach. 