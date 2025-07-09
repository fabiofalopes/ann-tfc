
# Implementation Plan: Annotation Platform Enhancements

This document outlines the development plan to address the feedback and requirements from the recent project meeting. The tasks are categorized into critical priorities and UI/UX improvements, with a detailed breakdown of the required changes in the backend and frontend.

---

## 1. Critical Tasks and High-Priority Fixes

### 1.1. Export Annotated Data

**Objective:** Create a feature for administrators to export all annotated data from a chat room into a structured JSON file.

**Affected Areas:**
*   **Backend:** `annotation-backend/app/api/admin.py`, `annotation-backend/app/crud.py`
*   **Frontend:** `annotation_ui/src/components/AdminProjectPage.js`, `annotation_ui/src/utils/api.js`

**Implementation Plan:**

1.  **Backend (FastAPI):**
    *   **Define JSON Structure:** Finalize a clear JSON schema for the export. It should be a single object containing chat room details, a list of all its messages (turns), and for each message, a list of all its annotations (tags).
        ```json
        {
          "project_id": 1,
          "chat_room_id": 123,
          "exported_at": "2024-07-09T10:00:00Z",
          "messages": [
            {
              "id": 1,
              "turn_id": "TURN_001",
              "turn_text": "Hello, how are you?",
              "annotations": [
                {
                  "id": 1,
                  "thread_id": "GREETING",
                  "annotator_email": "annotator1@example.com"
                },
                {
                  "id": 2,
                  "thread_id": "QUESTION",
                  "annotator_email": "annotator2@example.com"
                }
              ]
            }
          ]
        }
        ```
    *   **Create CRUD Function:** In `crud.py`, implement a new function `export_chat_room_data(db: Session, chat_room_id: int)`. This function will perform the necessary database queries to fetch all messages and their associated annotations for the given `chat_room_id` and structure the data according to the defined JSON format.
    *   **Create API Endpoint:** In `admin.py`, create a new endpoint, e.g., `GET /api/v1/admin/chat-rooms/{chat_room_id}/export`. This endpoint will be protected and only accessible to admin users. It will call the new `crud.export_chat_room_data` function and return the data as a downloadable JSON file using FastAPI's `JSONResponse` with appropriate `Content-Disposition` headers.

2.  **Frontend (React):**
    *   **Update API Utility:** In `utils/api.js`, add a new function `exportChatRoom(chatRoomId)` that makes a `GET` request to the new backend endpoint. This function should handle the file download trigger in the browser.
    *   **Add Export Button:** In the `AdminProjectPage.js` component, add an "Export to JSON" button next to each chat room in the list.
    *   **Implement On-Click Handler:** The button's `onClick` handler will call the `api.exportChatRoom(chatRoomId)` function, initiating the download. It should also handle loading and error states during the export process.

---

### 1.2. Critical Bug Fix: Non-Scrollable Tag Menu

**Objective:** Fix the bug where the tag menu on a message is not scrollable, making it impossible to see all tags if the list is long.

**Affected Areas:**
*   **Frontend:** The component responsible for displaying messages (likely `annotation_ui/src/components/MessageBubble.js`) and its corresponding CSS file (`MessageBubble.css`).

**Implementation Plan:**

1.  **Locate the Component & Style:**
    *   The primary candidate for inspection is `MessageBubble.js`. The issue is described as a menu that appears on *hover*. I will need to investigate the JSX and associated CSS in `MessageBubble.css` to find the container that renders the list of annotations/tags on hover.
    *   If the logic is not in `MessageBubble.js`, I will inspect its parent components, such as `MessageList.js` and `AnnotatorChatRoomPage.js`.

2.  **Apply CSS Fix:**
    *   Once the correct CSS class for the tag menu/container is identified, I will apply the following CSS rules to it:
        ```css
        .the-tag-menu-class {
            max-height: 200px; /* Or any suitable height */
            overflow-y: auto;  /* Enables vertical scrollbar when content overflows */
        }
        ```
    *   This will ensure that if the number of tags exceeds the maximum height of the container, a scrollbar will appear, making all tags accessible.

---

## 2. UI/UX Improvements

### 2.1. Annotator's View Enhancements

**Objective:** Improve the usability and consistency of the annotator's interface.

**Affected Areas:**
*   **Frontend:** `AnnotatorProjectPage.js`, `AnnotatorDashboard.js`, and a global search across `annotation_ui/src/`.

**Implementation Plan:**

1.  **Add "Back" Button to Project View:**
    *   In `AnnotatorProjectPage.js`, import the `useNavigate` hook from `react-router-dom`.
    *   Add a button with a clear label like "Back to Projects".
    *   The button's `onClick` handler will call `navigate(-1)` to return the user to the previous page (the project list).

2.  **Improve Annotator Dashboard Consistency:**
    *   **Analysis:** Review the layout, component usage (e.g., `ProjectCard`), and styling of `AdminDashboard.js` and `AdminDashboard.css`.
    *   **Refactor:** Apply a similar structure and styles to `AnnotatorDashboard.js`. This will involve reusing components and CSS classes from the admin view to create a cohesive look and feel.

3.  **Standardize Terminology: "Messages" -> "Turns"**
    *   **Action:** Perform a case-insensitive search for "Message" and "Messages" across the entire `annotation_ui/src/` directory.
    *   **Execution:** Carefully replace all user-facing instances of this term with "Turn" or "Turns" respectively. This applies to button labels, table headers, component text, and variable names that are directly reflected in the UI. A list of files to modify will be generated before making changes.

---

### 2.2. "My Annotations" View Improvements

**Objective:** Reorganize the page layout, clarify metrics, and improve the user interface.

**Affected Areas:**
*   **Frontend:** `MyAnnotationsPage.js` and its CSS.
*   **Backend:** The API endpoint and CRUD function that provide data for this page.

**Implementation Plan:**

1.  **Reorganize Page Layout:**
    *   In `MyAnnotationsPage.js`, locate the JSX rendering the "Chat Rooms" and "Total Annotations" sections.
    *   Reorder these elements in the code so that the "Chat Rooms" section appears before the "Total Annotations" section.

2.  **Clarify Annotation Metrics:**
    *   **Backend First:** The calculation logic must reside on the backend.
    *   **Identify Endpoint:** Find the API endpoint that `MyAnnotationsPage.js` calls to fetch its data.
    *   **Update CRUD Logic:** Modify the corresponding function in `crud.py`. It must be updated to calculate the metrics as specified: `(number of turns the user has annotated) / (total number of turns available for that user)`. This requires querying the `annotations` and `messages` tables. The endpoint should return these two numbers clearly.
    *   **Update Frontend:** The `MyAnnotationsPage.js` component will be updated to simply display the pre-calculated metrics received from the API, removing any calculation logic from the frontend.

3.  **Implement Collapsible Chat Room Cards:**
    *   In `MyAnnotationsPage.js`, for each chat room card, introduce a new state variable using the `useState` hook (e.g., `const [isExpanded, setIsExpanded] = useState(false);`).
    *   Add a button to the card's header to toggle this state.
    *   Use the state to conditionally render the detailed content of the card, allowing users to expand and collapse each one.

---

### 2.3. Admin's View Verification and Refinements

**Objective:** Verify the correctness of the Inter-Annotator Agreement (IAA) calculations and ensure the view is clear and accurate.

**Affected Areas:**
*   **Backend:** `admin.py`, `crud.py`
*   **Frontend:** `AnnotationAnalysisPage.js`, `IAAMatrix.js`

**Implementation Plan:**

1.  **Verify IAA Matrix Logic:**
    *   **Backend:** Examine the CRUD function responsible for calculating the IAA matrix data.
    *   **Requirement:** The function must filter annotators to include **only those who have completed the annotation task** for the given item. A status field on the user/project assignment level will be used for this filtering.
    *   **Frontend:** The `IAAMatrix.js` component should be reviewed to ensure it correctly visualizes the data. It should clearly indicate which annotators are included in the calculation, perhaps with a visual cue or a separate list.

2.  **Verify Total Average Agreement Calculation:**
    *   **Backend:** Locate the function in `crud.py` that computes the total average agreement score.
    *   **Implement Guard Clause:** Add a check at the beginning of this function to ensure that calculations are only performed if **at least two annotators have completed the task**. If this condition is not met, the function should return a null or clearly identifiable "not enough data" response.
    *   **Frontend Handling:** The component that displays this score (likely `AnnotationAnalysisPage.js` or `AdminDashboard.js`) must be updated to handle the "not enough data" case gracefully, showing an informative message to the administrator. 