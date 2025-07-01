# Gemini Agent Development Context

This document provides the development context, philosophy, and architectural guidelines for an AI agent working on this project. The project consists of a FastAPI backend and a React frontend.

---

## Backend Development Guidelines (Python/FastAPI)

You are an expert in Python and FastAPI, focused on building simple, clear, and maintainable APIs.

### Core Philosophy

- **Simplicity and Clarity**: The primary goal is to maintain a simple and clear codebase. Avoid over-engineering. New features or changes should be easy to understand and implement.
- **Pragmatism over Dogma**: While we follow best practices, we prioritize what makes the code easier to read, test, and maintain for this specific project.
- **Code is for Humans**: Write code that is readable and self-explanatory. Use descriptive names for variables and functions.

### Project Structure

Our backend follows a clear, feature-oriented structure. When adding or modifying code, adhere to this organization:

- `main.py`: The entry point of the application. It initializes the FastAPI app and includes the API routers.
- `app/api/`: Contains all API endpoints, organized into routers by domain (e.g., `projects.py`, `users.py`).
- `app/crud.py`: Holds all the business logic and database operations (Create, Read, Update, Delete). This is the bridge between the API layer and the database.
- `app/models.py`: Defines the SQLAlchemy database models.
- `app/schemas.py`: Contains the Pydantic models used for data validation, serialization, and API request/response shapes.
- `app/database.py`: Manages the database connection and session.
- `app/dependencies.py`: Includes FastAPI dependency injection functions, such as getting the current user.

### Coding Guidelines

#### General
- **Type Hinting**: Use type hints for all function signatures. This is crucial for static analysis and editor support.
- **Pydantic Everywhere**: Use Pydantic models (`schemas.py`) for all API inputs and outputs. Do not use raw dictionaries.
- **Configuration**: All configuration should be managed via `pydantic-settings` in `config.py`. Avoid hardcoding values.
- **Dependencies**: Manage dependencies in `requirements.txt`.

#### FastAPI
- **Synchronous Operations**: Our current database setup (`psycopg2`) is synchronous. Therefore, standard `def` functions should be used for route handlers and CRUD operations that interact with the database.
- **Dependency Injection**: Use FastAPI's dependency injection system (`Depends`) for accessing shared resources like database sessions and authenticated user information. See `dependencies.py` for examples.
- **Routers**: Group related endpoints into `APIRouter` instances within the `app/api/` directory.

#### Error Handling
- **Use HTTPException for Client Errors**: For expected errors that the client can handle (e.g., item not found, invalid input), raise `HTTPException` with a clear detail message and appropriate status code.
- **Early Returns / Guard Clauses**: Check for errors, invalid data, or failed preconditions at the beginning of your functions and return early. This keeps the main logic clean and avoids nested `if` statements.

```python
# Good: Early return
def get_project(project_id: int, db: Session):
    if project_id <= 0:
        raise HTTPException(status_code=400, detail="Invalid project ID")
    
    project = db.query(models.Project).filter(models.Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    return project
```

### Future Improvements
While the current setup prioritizes simplicity, we aim to make targeted improvements. A key area for future work is performance.

- **Asynchronous Database Operations**: The next major performance enhancement will be to migrate from `psycopg2-binary` to an async driver like `asyncpg` and refactor database operations in `crud.py` and `database.py` to be fully asynchronous (`async def`). 

---

## Frontend Development Guidelines (React)

You are an expert in React, modern JavaScript (ES6+), and building intuitive, high-performance user interfaces.

### Core Philosophy

- **User-Centric Design**: The primary user is the annotator. The interface must be fast, responsive, and efficient to minimize friction and maximize productivity.
- **Strict Separation of Concerns**: The React application is a **pure client**. Its sole responsibility is to render the user interface and delegate all business logic, data processing, and authentication to the backend through API calls. **Under no circumstances should backend logic be implemented in the frontend.** This is the most important rule of this project.
- **Component-Based Architecture**: We build the UI from small, reusable, and single-responsibility components. This makes the codebase easier to understand, test, and maintain.
- **Declarative Code**: Embrace React's declarative nature. Describe what the UI should look like for a given state, and let React handle the updates.

### The Golden Rule: The Frontend is a Pure Client

This is the most critical architectural principle. The React codebase must remain strictly a "presentation layer." Any deviation from this rule is considered an error.

-   **NO Business Logic in React**: The frontend **must not** contain any business logic. This includes data calculations, permission checks, or business rule enforcement. All such logic resides exclusively in the FastAPI backend.
-   **All Operations are API Calls**: Any action that creates, reads, updates, or deletes data, or requires a business decision, **must** be handled by making a call to the backend via the `api.js` utility. The frontend's job is to make the request, manage the UI state (e.g., loading, error), and display the result.

**Example of what NOT to do:**

**BAD: Implementing filtering logic or permission checks in the frontend.**
```javascript
// AVOID THIS PATTERN AT ALL COSTS! THIS IS WRONG.
function ProjectList({ allProjects, userRole }) {
    // DO NOT DO THIS. The backend is responsible for filtering projects.
    const visibleProjects = allProjects.filter(p => {
        if (userRole === 'admin') return true; // Business logic in the frontend!
        return p.is_public === true; // Business logic in the frontend!
    });

    return (
        // ... renders visibleProjects
    );
}
```

**CORRECT: Delegating all logic to the backend via an API call.**
```javascript
// CORRECT PATTERN: The component is "dumb" and only calls the API.
function ProjectList() {
    const [projects, setProjects] = useState([]);

    useEffect(() => {
        const fetchProjects = async () => {
            // The backend handles the logic of what projects to return
            // for the currently authenticated user. The frontend doesn't know the rules.
            const userProjects = await api.getProjectsForCurrentUser();
            setProjects(userProjects);
        };
        fetchProjects();
    }, []);

    return (
        // ... renders projects
    );
}
```

### Project Structure

Our frontend is organized to separate concerns and promote scalability. When adding or modifying files, adhere to this structure:

- `src/components/`: This is the core directory for all React components.
    - **Page Components**: Components that represent an entire page or view (e.g., `AdminDashboard.js`, `AnnotatorChatRoomPage.js`). These components are responsible for fetching data and managing the state for their specific view.
    - **UI Components**: Smaller, reusable, presentational components (e.g., `MessageBubble.js`, `ProjectList.js`). They receive data and callbacks via props and should not contain business logic or fetch data themselves.
- `src/utils/`: Contains application-wide utility functions.
    - `api.js`: The central hub for all communication with the backend API. It uses `axios` and includes interceptors to handle authentication (JWT access and refresh tokens).
- `src/App.js`: The root component. Its primary responsibilities are setting up routing and global contexts. **It must not manage state or logic for specific pages.**

### Architecture and Data Flow

#### The Golden Rule: No More "God Components"
The most critical architectural principle is to **decentralize data fetching and state management**. The old pattern of managing page-specific state in `App.js` is forbidden.

- **Data Belongs to the Page**: Each page-level component (e.g., `AdminDashboard.js`) is responsible for fetching and managing its own data by calling the appropriate functions in `api.js`.

```javascript
// Good: Page component fetching its own data
function AnnotatorProjectPage({ projectId }) {
    const [project, setProject] = useState(null);
    const [chatRooms, setChatRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchProjectData = async () => {
            try {
                // Parallel fetching for efficiency
                const [projectDetails, chatRoomList] = await Promise.all([
                    api.getProject(projectId),
                    api.getChatRoomsForProject(projectId)
                ]);
                setProject(projectDetails);
                setChatRooms(chatRoomList);
            } catch (error) {
                console.error("Failed to fetch project data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProjectData();
    }, [projectId]); // Re-fetch if projectId changes

    if (isLoading) return <p>Loading...</p>;

    // ... render project and chat rooms
}
```

### Coding Guidelines

#### State Management
- **Local State**: For state that is only used within a single component (e.g., form inputs, toggles), always use the `useState` hook.
- **Shared & Global State**: For state that needs to be shared across multiple components (e.g., current user, authentication status, theme), use the `useContext` hook. Create dedicated providers for each distinct context (e.g., `AuthContext`, `UserContext`).

#### API Communication
- **Use `api.js`**: All backend requests must go through the `api.js` module to ensure consistent handling of authentication and errors.
- **Efficient Data Fetching**: Design API calls to be efficient. Avoid "N+1 query" problems by fetching data in batches. If a view requires multiple related pieces of data, the backend should ideally provide a single endpoint to deliver that data in one network request.

#### Components
- **Functional Components & Hooks**: All new components must be functional components. Use hooks for state and side effects. Class components are not permitted.
- **Props**: Use clear and descriptive prop names. If a component accepts many props, consider passing them as a single object for better readability.
- **Styling**: Each component should have its own corresponding CSS file (`ComponentName.css`). Use a consistent naming convention for CSS classes (e.g., BEM) to prevent style collisions.
