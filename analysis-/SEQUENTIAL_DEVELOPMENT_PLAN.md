# Focused Development Plan: Inter-Annotator Agreement (IAA) Metrics

**Project Status:** The core application is stable, and the `conversion_tools` for data importation are complete. We can now proceed with implementing the primary value-add feature: annotation metrics.

## 1. Core Vision & Philosophy

This plan outlines the sequential steps to implement Inter-Annotator Agreement (IAA) metrics. It is guided by two core principles:

1.  **Backend First:** We will fully implement, test, and validate the backend API for IAA metrics before any frontend work begins. This ensures our API is robust, and the frontend's role remains that of a pure consumer, as per our project's architectural rules.
2.  **Focus on Core Requirements:** Our initial and primary focus is the **"one-to-one accuracy"** metric, as specified in the `ANNOTATION_METRICS_NOTE.md`. Other metrics (e.g., Cohen's Kappa) are out of scope for this development phase.

---

## 2. The "Validate as We Build" Testing Strategy

To ensure stability and correctness, every backend development step will be immediately validated. We will centralize our testing efforts into a single, evolving script.

**Methodology:**

1.  **Create a Test Script:** We will create a new file: `annotation-backend/api_tests.py`.
2.  **Purpose:** This script will be our single source of truth for testing API endpoints. It will handle the authentication flow (login, get token) and make authenticated requests to the endpoints we are developing.
3.  **Structure:** It will contain simple, dedicated functions for each test case (e.g., `test_login()`, `test_get_iaa_for_chatroom()`). We can run specific tests by calling the desired function within a `if __name__ == "__main__":` block. This script will serve as a living document and troubleshooting record.

This approach is simpler than managing repeated `curl` commands and more organized, as it keeps all test logic and credentials in one manageable place.

---

## Phase 1: Backend - IAA Metrics API (CRITICAL PRIORITY)

Our goal is to create a secure endpoint that calculates and returns the one-to-one agreement for a given chat room.

### Step 1.1: Add Dependencies

**File to Edit:** `annotation-backend/requirements.txt`

**Task:**
- Add the necessary libraries for scientific computing. The `scipy` library is essential for the Hungarian algorithm used in the one-to-one accuracy calculation.

```
# ... existing dependencies
scipy
numpy
```

**Validation:**
- After adding the dependencies, rebuild and run the backend Docker container to ensure it starts without errors.
- `cd annotation-backend && docker-compose up --build`
- Check the logs for any import errors.

### Step 1.2: Define API Schemas

**File to Edit:** `annotation-backend/app/schemas.py`

**Task:**
- Create the Pydantic models that will define the structure of the API response. These schemas ensure our API outputs are consistent and validated.

```python
# ... existing code ...

class PairwiseAccuracy(BaseModel):
    """Represents the one-to-one accuracy score between two annotators."""
    annotator_1_id: int
    annotator_2_id: int
    annotator_1_email: str
    annotator_2_email: str
    accuracy: float

class ChatRoomIAA(BaseModel):
    """Holds the complete IAA analysis for a single chat room."""
    chat_room_id: int
    chat_room_name: str
    is_fully_annotated: bool
    message_count: int
    annotator_count: int
    pairwise_accuracies: List[PairwiseAccuracy]

# ... existing code ...
```

**Validation:**
- No direct validation is needed here, but syntax errors will be caught when the application is run in the next steps.

### Step 1.3: Implement IAA Calculation Logic

**File to Edit:** `annotation-backend/app/crud.py`

**Task:**
- Implement the core business logic for the IAA calculation. This involves fetching annotations and processing them using the one-to-one accuracy algorithm.

**New Functions:**

1.  **`_calculate_one_to_one_accuracy(...)`**: A private helper function that contains the exact Python code from `ANNOTATION_METRICS_NOTE.md` to perform the calculation using `scipy.optimize.linear_sum_assignment`.
2.  **`get_chat_room_iaa_analysis(...)`**: The main public function. It will:
    -   Take a `chat_room_id` and a database session `db` as input.
    -   Verify that the chat room is fully annotated by all its assigned annotators. If not, it should raise an appropriate `HTTPException`.
    -   Fetch all message annotations for that room, organized by annotator.
    -   Generate all possible pairs of annotators (e.g., (A, B), (A, C), (B, C)).
    -   For each pair, call `_calculate_one_to_one_accuracy` to get the score.
    -   Assemble the final result into the `schemas.ChatRoomIAA` Pydantic model.

**Validation:**
- This logic will be tested via the API endpoint in the next step. Direct unit testing can be added later if desired, but for now, we will rely on integration testing through the API.

### Step 1.4: Create the API Endpoint

**File to Edit:** We will use the existing `annotation-backend/app/api/admin.py` for this new admin-focused endpoint.

**Task:**
- Create a new, protected API endpoint that exposes the IAA calculation functionality.

```python
# In annotation-backend/app/api/admin.py

# ... existing imports
from .. import crud, schemas
from ..dependencies import get_current_active_admin_user

# ... existing router

@router.get(
    "/chat-rooms/{chat_room_id}/iaa",
    response_model=schemas.ChatRoomIAA,
    summary="Get Inter-Annotator Agreement for a Chat Room",
    dependencies=[Depends(get_current_active_admin_user)],
)
def get_iaa_for_chat_room(
    chat_room_id: int,
    db: Session = Depends(get_db)
):
    """
    Calculates and returns the one-to-one agreement analysis for a specific chat room.

    This endpoint is restricted to admin users and will only return results
    if the chat room has been fully annotated by all assigned annotators.
    """
    analysis = crud.get_chat_room_iaa_analysis(db=db, chat_room_id=chat_room_id)
    if not analysis:
        raise HTTPException(
            status_code=404,
            detail="Analysis could not be performed. Ensure the chat room exists and is fully annotated."
        )
    return analysis
```
*Self-correction: The original plan put the endpoint in `annotations.py`. It's better suited for `admin.py` as this is an administrative/analytical function.*

**Validation:**
- Using the `api_tests.py` script, add a new test function that:
    1.  Logs in as an admin user.
    2.  Calls the `GET /api/v1/admin/chat-rooms/{chat_room_id}/iaa` endpoint for a chat room known to be fully annotated.
    3.  Asserts that the response status code is 200.
    4.  Prints the JSON response to verify the accuracy scores are calculated correctly.
    5.  Tests the endpoint against a non-existent or incomplete chat room and asserts a 4xx status code.

---

## Phase 1.5: Backend Validation (Completed)

Before proceeding, it's important to confirm the success of Phase 1.

**Status: COMPLETE**

-   **Dependencies:** `scipy` and `numpy` were successfully added to `requirements.txt`, and the Docker container builds and runs without issues.
-   **Schemas:** `PairwiseAccuracy` and `ChatRoomIAA` Pydantic models were correctly defined in `schemas.py`.
-   **Business Logic:** The core IAA calculation logic, including `_calculate_one_to_one_accuracy` and `get_chat_room_iaa_analysis`, was implemented in `crud.py`.
-   **API Endpoint:** The protected admin endpoint `GET /admin/chat-rooms/{chat_room_id}/iaa` was created in `admin.py`.
-   **Validation Script:** A comprehensive test script, `api_tests.py`, was created to perform automated validation.
-   **End-to-End Testing:** The test script successfully authenticated, called the endpoint, and confirmed it works as expected for both valid and invalid cases. The backend is stable and ready to serve the frontend.

---

## Phase 2: Frontend - Refined IAA Visualization & Analysis (REVISED)

This phase is now revised based on new feedback and a clearer vision for the user interface, as outlined in `ANNOTATION_VISUALIZATION_IDEAS.md`. We will discard the previous frontend implementation for concordance/discordance and build a new, cleaner interface that directly consumes the validated backend endpoint.

**Core Philosophy:** The frontend's only job is to **request, receive, and visualize** the analysis data from the backend. All complex calculations are handled by the server.

### Step 2.1: Enhance Backend for Partial Analysis (CRITICAL)

**File to Edit:** `annotation-backend/app/crud.py` and `annotation-backend/app/schemas.py`

**Task:**
The current backend `get_chat_room_iaa_analysis` function fails if a room is not annotated by *all* assigned users. This needs to be changed to support partial analysis.

1.  **Modify `get_chat_room_iaa_analysis` in `crud.py`:**
    *   The function should **no longer raise an `HTTPException`** if the room is not fully annotated.
    *   Instead, it must identify the subset of annotators who **have** completed annotating all messages.
    *   If this subset contains 2 or more annotators, it should calculate the pairwise IAA for **only that completed subset**.
    *   If fewer than 2 annotators have completed the work, it should return a clear status but no accuracy scores.

2.  **Update `schemas.ChatRoomIAA` in `schemas.py`:**
    *   The schema must be enhanced to provide the necessary context to the frontend.

    ```python
    # In annotation-backend/app/schemas.py

    class AnnotatorInfo(BaseModel):
        id: int
        email: str

    class ChatRoomIAA(BaseModel):
        """Holds the complete IAA analysis for a single chat room."""
        chat_room_id: int
        chat_room_name: str
        message_count: int
        
        # New fields for clarity
        analysis_status: str # e.g., "Complete", "Partial", "NotEnoughData"
        
        total_annotators_assigned: int
        completed_annotators: List[AnnotatorInfo]
        pending_annotators: List[AnnotatorInfo]
        
        # Calculation is now based on completed_annotators
        pairwise_accuracies: List[PairwiseAccuracy]
    ```

**Validation:**
-   Update `api_tests.py` to test scenarios with partially annotated rooms and verify the API returns the correct subset of results and a `Partial` status.

### Step 2.2: Refactor Admin Project Page

**File to Edit:** `annotation_ui/src/components/AdminProjectPage.js`

**Task:**
-   **Remove Annotation Import UI:** Delete the modal and all related state (`showImportModal`, `selectedChatRoom`, `handleImportAnnotations`, etc.). The frontend will no longer be responsible for this.
-   **Implement Chat Room Status List:** Transform the existing list of chat rooms into a more informative, interactive table as described in `ANNOTATION_VISUALIZATION_IDEAS.md`.

| Chat Room Name | Status | # Annotators | Avg. Agreement | Actions |
| :--- | :--- | :--- | :--- | :--- |
| `CR_101` | `Annotated` | `3 / 3` | `85.5%` | `View Analysis` |
| `CR_102` | `In Progress` | `2 / 3` | `N/A` | `(Analysis Unavailable)` |

-   The `View Analysis` button will navigate the user to the dedicated analysis page: `/projects/{projectId}/analysis/{roomId}`.
-   This button should be disabled if analysis is not possible (e.g., fewer than 2 annotators have completed annotations).

### Step 2.3: Create New Annotation Analysis Page

**File to Create:** `annotation_ui/src/components/AnnotationAnalysisPage.js` (Overwrite existing)
**File to Create:** `annotation_ui/src/components/IAAMatrix.js` and `.css`

**Task:**
-   This page will be built from scratch to be a pure visualization component.
-   On page load, it will call a new API function `api.getChatRoomIAA(roomId)`.
-   It will display the results using two main components:

1.  **`IAAStatus` Component:**
    *   A prominent banner at the top that clearly displays the `analysis_status`.
    *   If status is `Partial`, it must list the annotators whose work is complete and those who are still `Pending`.

2.  **`IAAMatrix` Component (`IAAMatrix.js`):**
    *   This component will receive the `pairwise_accuracies` and `completed_annotators` as props.
    *   It will render a heatmap/matrix as described in the visualization plan.
    *   The matrix will only include the annotators who have completed the work.
    *   It will use a color scale (red to green) to represent agreement scores.
    *   Tooltips will show the exact percentage on hover.

3.  **`ChatRoomStatistics` Component:**
    *   A simple table displaying key metadata from the API response: `chat_room_name`, `message_count`, and the annotator counts (`completed / total`).

**Validation:**
-   Manually test the full flow:
    1.  Navigate from the Admin Dashboard to the `AdminProjectPage`.
    2.  Verify the chat room list is clear and informative.
    3.  Click `View Analysis`.
    4.  Verify the `AnnotationAnalysisPage` correctly displays the heatmap, stats, and status (both for fully and partially completed rooms).
---
## Next Steps

1.  **Begin with Phase 2, Step 2.1:** Enhance the backend to support partial analysis.
2.  **Proceed sequentially through the revised plan,** ensuring each step is validated before moving to the next.
3.  **Leverage the `ANNOTATION_VISUALIZATION_IDEAS.md`** as the design document for all new UI components.

This sequential plan provides a clear path from your current stable state to a fully featured annotation metrics platform. The ordering prioritizes critical backend functionality first, followed by user-facing visualizations, and finally enhancements and optimizations. 