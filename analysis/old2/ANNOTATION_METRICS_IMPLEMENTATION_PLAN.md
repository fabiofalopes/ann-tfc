# Annotation Metrics & Analysis: Technical Implementation Plan

## 1. Introduction & Core Concepts

This document provides a detailed technical specification for implementing inter-annotator agreement (IAA) metrics within the annotation tool. It expands upon the initial plan by incorporating refined requirements and providing a deeper integration with the existing codebase.

The primary goal is to **move all metric calculation logic to the backend**, refactoring the `AnnotationAnalysisPage` to be a pure presentation component, and to implement the **"one-to-one accuracy"** metric as specified by the project supervisor. All analysis will be performed at the **Chat Room** level, which is the fundamental unit of annotation.

---

## 2. Backend Implementation: The "Analysis" Module

The backend will be the single source of truth for all annotation analytics. This involves adding a new dependency, creating new data schemas, and implementing new CRUD functions and API endpoints.

### 2.1. New Dependency

The Hungarian algorithm, which is essential for the one-to-one accuracy metric, is available in the `scipy` library.

- **File:** `annotation-backend/requirements.txt`
- **Action:** Add the following line:
  ```
  scipy
  ```

### 2.2. New Pydantic Schemas

New schemas are required to define the data structure for the API responses.

- **File:** `annotation-backend/app/schemas.py`
- **Action:** Add the following schemas.

```python
# In annotation-backend/app/schemas.py
from typing import Dict, List, Optional # Ensure these are imported

# ... existing schemas ...

# For the pairwise accuracy table in the analysis view
class PairwiseAccuracy(BaseModel):
    annotator1_email: str
    annotator2_email: str
    # Accuracy is a float between 0.0 and 1.0, representing the percentage
    accuracy: float 

# The main response body for the chat room analysis endpoint
class ChatRoomAnalysis(BaseModel):
    completeness_status: str
    total_messages: int
    # A summary of progress, mapping annotator email to their annotation count
    annotators_summary: Dict[str, int] 
    pairwise_accuracies: List[PairwiseAccuracy]

# For adding aggregate stats to the main project list view
class ProjectSummary(Project): # Extends the base Project schema
    num_chat_rooms: int
    num_completed_rooms: int
    average_agreement: Optional[float] = None
```

### 2.3. CRUD Layer (`crud.py`)

We need two new CRUD functions. One to fetch data for the detailed per-room analysis, and another to calculate the project-level summary.

- **File:** `annotation-backend/app/crud.py`
- **Action:** Add the following functions.

```python
# In annotation-backend/app/crud.py

# ... add to existing imports ...
from itertools import combinations
import numpy as np
from scipy.optimize import linear_sum_assignment

def get_annotations_for_analysis(db: Session, chat_room_id: int) -> List[dict]:
    """
    Fetches all annotations for a given chat room and organizes them by annotator.
    This is the data source for the one-to-one accuracy metric.

    Returns: A list of dictionaries, one for each annotator, containing their
             full, ordered list of thread_id annotations for the chat room.
    """
    # Step 1: Get all messages in the chat room, ordered by ID.
    # This standard ordering is CRITICAL for the accuracy algorithm, as it ensures
    # the annotation lists from different annotators are directly comparable.
    messages = db.query(models.ChatMessage.id).filter(
        models.ChatMessage.chat_room_id == chat_room_id
    ).order_by(models.ChatMessage.id).all()
    message_ids = [m.id for m in messages]

    if not message_ids:
        return []

    # Step 2: Get all annotators assigned to this chat room's project.
    chat_room = db.query(models.ChatRoom).filter(models.ChatRoom.id == chat_room_id).one()
    project_assignments = db.query(models.ProjectAssignment).filter(
        models.ProjectAssignment.project_id == chat_room.project_id
    ).all()
    annotator_ids = [pa.user_id for pa in project_assignments]

    if not annotator_ids:
        return []

    # Step 3: Fetch all relevant annotations and create a lookup map for efficiency.
    annotations = db.query(models.Annotation).filter(
        models.Annotation.message_id.in_(message_ids),
        models.Annotation.annotator_id.in_(annotator_ids)
    ).all()
    annotation_map = {(ann.message_id, ann.annotator_id): ann.thread_id for ann in annotations}

    # Step 4: Build the final structure, ensuring a value (or None) for every message for every annotator.
    analysis_data = []
    annotators = db.query(models.User).filter(models.User.id.in_(annotator_ids)).all()
    
    for annotator in annotators:
        # For each annotator, create their list of annotations in the correct order.
        # If an annotation is missing for a message, use None. This is key for the completeness check.
        annotation_list = [annotation_map.get((msg_id, annotator.id)) for msg_id in message_ids]
        
        analysis_data.append({
            "annotator_id": annotator.id,
            "annotator_email": annotator.email,
            "annotations": annotation_list
        })

    return analysis_data

def _calculate_one_to_one_accuracy(annot1: list, annot2: list) -> float:
    """
    Computes the one-to-one accuracy metric using the Hungarian algorithm.
    This implementation is robust to string-based thread IDs.
    """
    if len(annot1) != len(annot2) or not annot1:
        return 0.0

    # Map all unique string labels from both annotators to a unified integer space.
    # This is necessary because the algorithm operates on a numerical matrix.
    all_labels = sorted(list(set(annot1) | set(annot2)))
    label_to_int = {label: i for i, label in enumerate(all_labels)}
    
    # Create a cost matrix. The value at [i, j] will be the number of times
    # label_i (from annot1) was paired with label_j (from annot2).
    # The matrix is square, covering all possible labels from both annotators.
    overlap_matrix = np.zeros((len(all_labels), len(all_labels)), dtype=int)
    for a1, a2 in zip(annot1, annot2):
        overlap_matrix[label_to_int[a1], label_to_int[a2]] += 1

    # Apply the Hungarian algorithm. We negate the matrix because the algorithm
    # finds a minimum-cost assignment, and we want to MAXIMIZE the overlap.
    row_ind, col_ind = linear_sum_assignment(-overlap_matrix)
    max_overlap = overlap_matrix[row_ind, col_ind].sum()

    # Accuracy is the fraction of messages that are in the optimally matched threads.
    accuracy = max_overlap / len(annot1)
    return accuracy

def get_project_summaries(db: Session) -> List[dict]:
    """
    Calculates and returns summary statistics for all projects.
    This is an expensive operation and should be used only on admin dashboards.
    """
    projects = db.query(models.Project).all()
    summaries = []

    for project in projects:
        summary = {
            "id": project.id,
            "name": project.name,
            "description": project.description,
            "created_at": project.created_at,
            "updated_at": project.updated_at,
            "num_chat_rooms": 0,
            "num_completed_rooms": 0,
            "average_agreement": None
        }
        
        chat_rooms = project.chat_rooms
        summary["num_chat_rooms"] = len(chat_rooms)
        
        if not chat_rooms:
            summaries.append(summary)
            continue

        total_agreements = []
        completed_rooms = 0
        for room in chat_rooms:
            analysis_data = get_annotations_for_analysis(db, room.id)
            if not analysis_data or len(analysis_data) < 2:
                continue

            total_messages = len(analysis_data[0]['annotations'])
            is_complete = all(
                len([ann for ann in data['annotations'] if ann is not None]) == total_messages 
                for data in analysis_data
            )

            if is_complete:
                completed_rooms += 1
                for (d1, d2) in combinations(analysis_data, 2):
                    accuracy = _calculate_one_to_one_accuracy(d1['annotations'], d2['annotations'])
                    total_agreements.append(accuracy)

        summary["num_completed_rooms"] = completed_rooms
        if total_agreements:
            summary["average_agreement"] = sum(total_agreements) / len(total_agreements)
        
        summaries.append(summary)
        
    return summaries
```

### 2.4. API Layer (`api/admin.py`)

We will add the new, dedicated analysis endpoint and modify the existing projects endpoint to include summary data.

- **File:** `annotation-backend/app/api/admin.py`
- **Action:** Add the new endpoint and modify the project list endpoint.

```python
# In annotation-backend/app/api/admin.py

# ... existing imports ...
from itertools import combinations
import numpy as np
from scipy.optimize import linear_sum_assignment


# MODIFY this endpoint to return the new summary schema
@router.get("/projects", response_model=List[schemas.ProjectSummary])
async def list_all_projects(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """List all projects with summary statistics (admin only)"""
    return crud.get_project_summaries(db)


# ADD this new endpoint for detailed chat room analysis
@router.get("/chat-rooms/{chat_room_id}/analysis", response_model=schemas.ChatRoomAnalysis)
def get_chat_room_analysis(
    chat_room_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_admin_user)
):
    """
    Provides a complete analysis of a chat room's annotations,
    including completeness checks and pairwise one-to-one accuracy.
    """
    analysis_data = crud.get_annotations_for_analysis(db, chat_room_id)
    
    if not analysis_data:
        raise HTTPException(status_code=404, detail="No annotations or chat room not found.")

    total_messages = len(analysis_data[0]['annotations']) if analysis_data else 0
    
    # 1. Completeness Check
    annotators_summary = {}
    is_fully_annotated = True
    for data in analysis_data:
        count = len([ann for ann in data["annotations"] if ann is not None])
        annotators_summary[data["annotator_email"]] = count
        if count < total_messages:
            is_fully_annotated = False
    
    status = "Complete" if is_fully_annotated else "Incomplete: One or more annotators have not finished."

    # 2. Pairwise Accuracy Calculation
    pairwise_accuracies = []
    # The metric is only valid if the room is fully annotated by at least 2 people.
    if is_fully_annotated and len(analysis_data) >= 2:
        for (annot1_data, annot2_data) in combinations(analysis_data, 2):
            accuracy = crud._calculate_one_to_one_accuracy(
                annot1_data['annotations'],
                annot2_data['annotations']
            )
            pairwise_accuracies.append({
                "annotator1_email": annot1_data['annotator_email'],
                "annotator2_email": annot2_data['annotator_email'],
                "accuracy": accuracy
            })
            
    return {
        "completeness_status": status,
        "total_messages": total_messages,
        "annotators_summary": annotators_summary,
        "pairwise_accuracies": pairwise_accuracies
    }
```

---

## 3. Frontend Implementation: Refactoring for Pure Presentation

The frontend will be refactored to consume the new backend endpoints. All client-side calculation logic will be removed.

### 3.1. API Utility (`utils/api.js`)

- **File:** `annotation_ui/src/utils/api.js`
- **Action:** Replace `getAggregatedAnnotations` with `getChatRoomAnalysis`.

```javascript
// In annotation_ui/src/utils/api.js, inside the 'annotations' object:

// REMOVE the entire getAggregatedAnnotations function.

// ADD the new function:
getChatRoomAnalysis: async (chatRoomId) => {
    const response = await api.get(`/admin/chat-rooms/${chatRoomId}/analysis`);
    return response.data;
},
```

### 3.2. Annotation Analysis Page (`AnnotationAnalysisPage.js`)

This component will be completely overhauled to be a "dumb" component that simply renders the data from the new analysis endpoint.

- **File:** `annotation_ui/src/components/AnnotationAnalysisPage.js`
- **Action:** Replace the entire component with the code below.

```javascript
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { annotations as annotationsApi } from '../utils/api';
import './AnnotationAnalysisPage.css';

const AnnotationAnalysisPage = () => {
    const { projectId, roomId } = useParams();
    const navigate = useNavigate();
    const [analysis, setAnalysis] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAnalysis = async () => {
            try {
                const data = await annotationsApi.getChatRoomAnalysis(roomId);
                setAnalysis(data);
            } catch (err) {
                setError('Failed to load analysis data. The chat room may not have enough annotations.');
            } finally {
                setLoading(false);
            }
        };
        fetchAnalysis();
    }, [roomId]);

    const renderPairwiseTable = () => {
        if (!analysis || analysis.pairwise_accuracies.length === 0) {
            return (
                <p>
                    Pairwise accuracy is not available. This requires at least two annotators 
                    to have fully completed their annotations for this chat room.
                </p>
            );
        }

        // Create the matrix structure for the table
        const annotators = Object.keys(analysis.annotators_summary).sort();
        const accuracyMap = analysis.pairwise_accuracies.reduce((acc, pair) => {
            const key1 = `${pair.annotator1_email}|${pair.annotator2_email}`;
            const key2 = `${pair.annotator2_email}|${pair.annotator1_email}`;
            acc[key1] = acc[key2] = (pair.accuracy * 100).toFixed(1) + '%';
            return acc;
        }, {});

        return (
            <table className="pairwise-table">
                <thead>
                    <tr>
                        <th></th>
                        {annotators.map(email => <th key={email}>{email}</th>)}
                    </tr>
                </thead>
                <tbody>
                    {annotators.map((rowEmail, rowIndex) => (
                        <tr key={rowEmail}>
                            <th>{rowEmail}</th>
                            {annotators.map((colEmail, colIndex) => {
                                if (rowIndex === colIndex) return <td key={colEmail}>-</td>;
                                const key = `${rowEmail}|${colEmail}`;
                                // Only show upper triangle of matrix
                                return <td key={colEmail}>{colIndex > rowIndex ? (accuracyMap[key] || 'N/A') : ''}</td>;
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    if (loading) return <div className="loading">Loading Analysis...</div>;
    if (error) return <div className="error">{error}</div>;
    if (!analysis) return <div>No analysis data available.</div>;

    return (
        <div className="annotation-analysis-page">
            <button onClick={() => navigate(`/admin/projects/${projectId}`)} className="back-button">
                ← Back to Project
            </button>
            <h1>Annotation Analysis</h1>
            
            <div className="summary-card">
                <h2>Overall Status</h2>
                <p><strong>Total Messages:</strong> {analysis.total_messages}</p>
                <p><strong>Completeness:</strong> <span className={analysis.completeness_status === 'Complete' ? 'status-complete' : 'status-incomplete'}>{analysis.completeness_status}</span></p>
            </div>

            <div className="summary-card">
                <h2>Annotator Progress</h2>
                <ul className="progress-list">
                    {Object.entries(analysis.annotators_summary).map(([email, count]) => (
                        <li key={email}>
                            <span className="email">{email}:</span>
                            <span className="count">{count} / {analysis.total_messages} annotated</span>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="summary-card">
                <h2>Pairwise One-to-One Accuracy</h2>
                {renderPairwiseTable()}
            </div>
        </div>
    );
};

export default AnnotationAnalysisPage;
```

### 3.3. Admin Dashboard (`AdminDashboard.js`)

- **File:** `annotation_ui/src/components/AdminDashboard.js`
- **Action:** Update the table to display the new summary metrics from the modified `/admin/projects` endpoint.

```javascript
// In annotation_ui/src/components/AdminDashboard.js

// ... inside the component, modify the projects table JSX ...

// Change the table header:
<thead>
  <tr>
    <th>Name</th>
    <th>Chat Rooms</th>
    <th>Completed</th>
    <th>Avg. Agreement</th>
    <th>Created At</th>
  </tr>
</thead>

// Change the table body:
<tbody>
  {projects.map(project => (
    <tr key={project.id} onClick={() => handleProjectClick(project.id)} className="project-row">
      <td>{project.name}</td>
      <td>{project.num_chat_rooms}</td>
      <td>{project.num_completed_rooms}</td>
      <td>
        {project.average_agreement !== null 
          ? `${(project.average_agreement * 100).toFixed(1)}%`
          : 'N/A'
        }
      </td>
      <td>{new Date(project.created_at).toLocaleDateString()}</td>
    </tr>
  ))}
</tbody>

```

---

## 4. Future Considerations

The feature request for a central data repository where raw data (like chat rooms) can be imported once and then attached to multiple projects remains a valid but lower-priority goal. This would mark a shift from a simple annotation tool to a more comprehensive data management platform and should be addressed in a future development cycle after the core analysis features are validated. 