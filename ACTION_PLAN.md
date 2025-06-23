# Comprehensive Action Plan

This document outlines the detailed steps and priorities required to complete the TFC project, based on the findings in `ANALISE_ESTADO_ATUAL.md`. It serves as a strategic roadmap for the final development sprint.

## Guiding Principles

- **Focus on Core Functionality First**: Prioritize the end-to-end workflow for the annotator. Everything else is secondary.
- **Incremental and Testable Sprints**: Each task should result in a measurable improvement and, ideally, be manually testable.
- **Adherence to Architecture**: All new code must strictly follow the established backend (layered, synchronous) and frontend (pure client, decentralized state) architectural rules.

---

## Core Architectural Pillar: Role-Based Segregation

A critical requirement for this application is the clear separation of capabilities between different user roles, primarily **Admin** and **Annotator**.

-   **Admin**: Admins have full control over the system. They can create, update, and delete projects, manage user accounts, assign annotators to projects, and view overall progress statistics. Their interface is designed for management and oversight.
-   **Annotator (User)**: Annotators have a focused, streamlined experience. They can only view and work on projects they have been explicitly assigned to. Their interface is optimized for the core task of annotation, minimizing distractions.

This distinction must be enforced at both the **backend** (API permissions) and **frontend** (UI rendering and routing) levels.

---

## Phase 1: Unblocking Frontend & Core Workflow (Priority: Blocker)

This phase is critical. Its goal is to refactor the frontend's architecture to enable parallel development and implement the basic, non-negotiable user flow for an annotator.

### **Task 1.1: Backend - High-Performance Annotation Endpoint**
*   **Goal**: Create a single endpoint to fetch all annotations for a chat room, eliminating the N+1 query problem that currently plagues the frontend.
*   **Files to Modify**: `annotation-backend/app/crud.py`, `annotation-backend/app/api/projects.py`, `annotation-backend/app/schemas.py`.
*   **Action Steps**:
    1.  **CRUD Logic**: In `crud.py`, implement `get_annotations_for_chat_room(db: Session, chat_room_id: int)`. This function must efficiently query all annotations associated with a given room.
    2.  **API Endpoint**: In `projects.py` (or a more appropriate router), create a new `GET` endpoint, e.g., `/api/v1/chat-rooms/{chat_room_id}/annotations`.
    3.  **Response Schema**: In `schemas.py`, ensure there's a schema that can represent a list of `Annotation` objects, e.g., `List[schemas.Annotation]`.
    4.  **Permissions**: The endpoint must verify that the requesting user has the correct role (`annotator`) and is assigned to the project containing the chat room. Future admin-related endpoints will check for the `admin` role.

### **Task 1.2: Frontend - Establish Role-Based Page Ownership**
*   **Goal**: Remove all page-specific state and data logic from `App.js`, empowering each role-specific page component to manage its own lifecycle.
*   **Files to Modify**: `annotation_ui/src/App.js`.
*   **Files to Create/Refactor**: `AdminDashboard.js`, `AnnotatorDashboard.js`, `AnnotatorProjectPage.js`, `AnnotatorChatRoomPage.js`.
*   **Action Steps**:
    1.  **Simplify `App.js`**: Remove all state related to annotation (`messages`, `tags`, etc.) and corresponding handler functions. `App.js`'s only roles are routing and providing global context.
    2.  **Create `AnnotatorDashboard.js`**: This component will be the annotator's landing page. It is responsible for fetching and displaying the list of projects assigned to the current user via an API call.
    3.  **Create `AdminDashboard.js`**: This new page will be the admin's central hub. It is responsible for fetching and displaying all projects and users, and providing entry points for administrative actions (e.g., a "Create New Project" button).
    4.  **Create `AnnotatorProjectPage.js`**: This component will display the chat rooms available within a specific project. It takes a `projectId` from the URL, fetches the corresponding chat rooms, and lists them.
    5.  **Update Routing**: In `App.js`, configure routes to point to these new page components (e.g., `/dashboard` -> `AnnotatorDashboard`, `/admin` -> `AdminDashboard`, `/projects/:projectId` -> `AnnotatorProjectPage`).

### **Task 1.3: Frontend - Implement the Annotator's Core Navigation Flow**
*   **Goal**: Ensure an annotator can log in and navigate seamlessly to the annotation interface.
*   **Files to Modify**: `AnnotatorDashboard.js`, `AnnotatorProjectPage.js`.
*   **Action Steps**:
    1.  **Link Projects to Pages**: In `AnnotatorDashboard`, each project listed should be a `Link` from `react-router-dom` pointing to its `AnnotatorProjectPage` (e.g., `/projects/1`).
    2.  **Link Chat Rooms to Annotation UI**: In `AnnotatorProjectPage`, each chat room listed should be a `Link` pointing to the `AnnotatorChatRoomPage` (e.g., `/projects/1/chat-rooms/1`).
    3.  **Data Fetching**: The `AnnotatorChatRoomPage` is now responsible for fetching its own data (messages for the given room).

### **Task 1.4: Frontend - Implement Role-Aware Routing and UI**
*   **Goal**: Ensure the application dynamically adapts its UI and navigation based on the logged-in user's role.
*   **Files to Modify**: `annotation_ui/src/App.js`, `annotation_ui/src/components/ProtectedRoute.js`, and a new `AuthContext.js`.
*   **Action Steps**:
    1.  **Auth Context**: Create a global `AuthContext` to store the current user's information, including their role. This removes prop-drilling and provides a single source of truth for user state.
    2.  **Role-Based Routing**: Enhance `ProtectedRoute.js` to accept a `requiredRole` prop. It will now check not only for authentication but also if the user's role matches the required role for the route.
    3.  **Dynamic Navigation**: The main navigation menu should consume the `AuthContext` and render different links based on the user's role (e.g., show "Admin" link for admins).
    4.  **Login Redirect**: After login, the application should redirect users to their respective dashboards (`/admin` or `/dashboard`) based on their role.

---

## Phase 2: Admin Functionality & Project Management (Priority: High)

This phase runs in parallel with the annotator-focused work and delivers the core features for system administration.

### **Task 2.1: Backend - Core Admin CRUD for Projects**
*   **Goal**: Create the API endpoints required for an admin to manage projects.
*   **Files to Modify**: `annotation-backend/app/api/admin.py`, `annotation-backend/app/crud.py`, `annotation-backend/app/schemas.py`.
*   **Action Steps**:
    1.  **Admin Router**: Use the existing (or create a new) `admin.py` router for all admin-specific endpoints. Protect the entire router to only allow admin users.
    2.  **CRUD for Projects**: Implement `create_project`, `update_project_details`, and `delete_project` in `crud.py`.
    3.  **API Endpoints**: Expose the CRUD operations via `POST /admin/projects`, `PUT /admin/projects/{project_id}`, and `DELETE /admin/projects/{project_id}` endpoints.
    4.  **Schemas**: Define `ProjectCreate` and `ProjectUpdate` schemas in `schemas.py`.

### **Task 2.2: Backend - User Management Endpoints**
*   **Goal**: Allow admins to assign and unassign annotators from projects.
*   **Files to Modify**: `annotation-backend/app/api/admin.py`, `annotation-backend/app/crud.py`.
*   **Action Steps**:
    1.  **CRUD Logic**: Implement `assign_user_to_project(db: Session, user_id: int, project_id: int)` and `remove_user_from_project(...)` in `crud.py`. These will manage the association table records.
    2.  **API Endpoints**: Create `POST /admin/projects/{project_id}/users` and `DELETE /admin/projects/{project_id}/users/{user_id}`.
    3.  **Helper Endpoints**: It's useful to have endpoints to list all users (`GET /admin/users`) and list users assigned to a project (`GET /admin/projects/{project_id}/users`).

### **Task 2.3: Frontend - Implement the Admin Dashboard UI**
*   **Goal**: Build the interface for the `AdminDashboard.js` component.
*   **Files to Develop**: `annotation_ui/src/components/AdminDashboard.js`.
*   **Files to Modify**: `annotation_ui/src/utils/api.js`.
*   **Action Steps**:
    1.  **API Functions**: Add functions to `api.js` for all the new admin endpoints (`createProject`, `assignUser`, etc.).
    2.  **Project List**: Display a list of all projects with options to "Edit" or "Delete".
    3.  **Create Project UI**: Implement a form (e.g., in a modal) for creating a new project.
    4.  **User Management UI**: On a project detail view for admins, display a list of assigned users and a mechanism to add/remove other users.

---

## Phase 3: Building the Core Annotation Experience (Priority: High)

With the architecture fixed and admin functionality underway, this phase focuses on building the main tool the annotator will use.

### **Task 3.1: Frontend - Optimize `AnnotatorChatRoomPage` with Batch Loading**
*   **Goal**: Integrate the new backend endpoint to ensure the annotation page loads instantly.
*   **Files to Modify**: `annotation_ui/src/utils/api.js`, `annotation_ui/src/components/AnnotatorChatRoomPage.js`.
*   **Action Steps**:
    1.  **API Utility**: In `api.js`, add a new function `getAnnotationsForChatRoom(chatRoomId)` that calls the endpoint from Task 1.1.
    2.  **Parallel Fetching**: In `AnnotatorChatRoomPage.js`, use `useEffect` and `Promise.all` to fetch both the chat messages and all annotations for the room in parallel when the component mounts.
    3.  **State Hydration**: Store both messages and the complete list of annotations in the component's state. The UI will then render the annotations from this local state, avoiding any further API calls for individual annotations.

### **Task 3.2: Frontend - Design the Annotation Split-View**
*   **Goal**: Implement the primary UI for annotation, featuring a clear separation between messages and threads.
*   **File to Develop**: `AnnotatorChatRoomPage.js`.
*   **Action Steps**:
    1.  **Layout**: Create a two-column layout.
        *   **Left Column**: A scrollable list of all messages in the chat room (`MessageList`).
        *   **Right Column**: A dedicated area to manage and visualize the annotation threads (`ThreadMenu`).
    2.  **State Management**: Use `useState` to manage the UI's state, including the currently selected message(s) and the active thread being edited.
    3.  **Interaction Logic**: Implement the core logic for an annotator to create, update, and delete annotations by interacting with the UI. A message click could select it, and a button in the right panel could assign it to a thread.

### **Task 3.3: Frontend - Implement Intuitive Message Grouping**
*   **Goal**: Create a fluid, user-friendly mechanism for assigning messages to threads.
*   **File to Develop**: `AnnotatorChatRoomPage.js`.
*   **Action Steps (Choose one path)**:
    *   **Path A: Drag-and-Drop (Preferred)**:
        1.  Integrate a library like `dnd-kit`.
        2.  Make each message in the left column a draggable source.
        3.  Make each thread in the right column a droppable target.
        4.  The `onDrop` event will trigger the API call to save the annotation.
    *   **Path B: Click-to-Assign (Fallback)**:
        1.  Allow users to select messages with checkboxes.
        2.  Display "Add to this thread" buttons on each thread in the right panel.
        3.  Clicking the button assigns the checked messages to that thread and triggers the API call.

---

## Phase 4: Validation and Refinement (Priority: Medium)

Focus on quality, reliability, and UX improvements.

### **Task 4.1: Backend - Implement Automated Testing**
*   **Goal**: Build a safety net to ensure backend stability.
*   **Tools**: `pytest`, FastAPI's `TestClient`.
*   **Action Steps**:
    1.  **Test Environment**: Configure a separate test database.
    2.  **CRUD Tests**: Write unit tests for business logic in `crud.py`, including admin and annotator-specific logic.
    3.  **API Tests**: Write integration tests for all major endpoints, covering success cases, authentication/authorization failures for different roles, and invalid input.

### **Task 4.2: Frontend - Enhance the Annotation UX**
*   **Goal**: Make the annotation process faster and more intuitive.
*   **File to Modify**: `AnnotatorChatRoomPage.js`.
*   **Action Steps**:
    1.  **Real-time Feedback**: Visually indicate which thread a message will be added to during a drag-and-drop operation.
    2.  **Keyboard Shortcuts**: Implement shortcuts for critical actions (e.g., `Ctrl+N` for a new thread, arrow keys for message navigation).

### **Task 4.3: Data - Progress & Results Visualization for Admins**
*   **Goal**: Provide a way for admins to see the output and progress of the annotation work.
*   **Files**: Create a new admin/results page component within the admin dashboard.
*   **Action Steps**:
    1.  **Backend Logic**: Create a backend endpoint (`GET /admin/projects/{project_id}/stats`) that can provide statistics for a project (e.g., percentage of messages annotated, number of threads created).
    2.  **Frontend View**: Develop a simple view within the admin dashboard that consumes this data and presents it in a clear table or with basic charts.

---

## Phase 5: Final Polish (Priority: Low)

Nice-to-have features to be completed if time permits.

- **Task 5.1: Frontend - Component Testing**: Write unit tests for key React components using `React Testing Library`.
- **Task 5.2: Backend - Structured Logging**: Integrate `loguru` for structured, informative logs for key events and errors.
- **Task 5.3: Frontend - Global State with `useContext`**: Refactor the app to use a global `AuthContext` for managing user authentication state, removing prop-drilling. 