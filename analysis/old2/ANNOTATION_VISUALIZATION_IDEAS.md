# Annotation Metrics Visualization Plan

This document outlines a plan for visualizing inter-annotator agreement (IAA) metrics within the application. The goal is to provide clear, scannable, and actionable insights for both project administrators and annotators.

The visualization strategy is broken down into two main views:
1.  **Annotation Analysis Page (Per Chat Room)**: A detailed view focusing on the agreement for a single, completed chat room.
2.  **Admin Project Page (Project Dashboard)**: A high-level dashboard summarizing the health and progress of an entire annotation project.

---

## 1. Annotation Analysis Page (Per Chat Room)

This page is the primary tool for a deep dive into the annotation quality of a specific chat room. It allows managers to identify exactly where and between whom disagreements are occurring.

### 1.1. Pairwise Agreement Heatmap

This is the central visualization on this page. It directly addresses the "Pairwise Agreement Table" proposed in the initial notes by providing a more intuitive, graphical representation.

**Description:**
A matrix where both rows and columns represent the annotators who worked on the chat room. The color of the cell at the intersection of `Annotator A` and `Annotator B` represents the "one-to-one accuracy" score between them.

**Key Features:**
*   **Color Scale:** Use a clear and intuitive color gradient. For example, from red (low agreement, e.g., < 60%) through yellow (moderate agreement) to green (high agreement, e.g., > 85%). This makes it easy to spot problematic pairs at a glance.
*   **Symmetry:** The matrix is symmetric (Agreement(A,B) = Agreement(B,A)).
*   **Diagonal:** The diagonal should be a neutral color or blank, as an annotator always has perfect agreement with themselves.
*   **Tooltips:** On hovering over a cell, a tooltip should display the exact agreement percentage (e.g., "85.2%").

**Example Layout:**

```
      Annotator A   Annotator B   Annotator C
  A   ███████████   ███████████   ███████████
  B   ███████████   ███████████   ███████████
  C   ███████████   ███████████   ███████████
(Colors represent agreement scores)
```

### 1.2. Chat Room Statistics

A simple table providing context for the heatmap.

| Metric                        | Value     |
| ----------------------------- | --------- |
| Chat Room Name                | `CR_101`  |
| Total Messages                | 154       |
| Number of Annotators          | 3         |
| Average Agreement             | 85.5%     |
| Threads by Annotator A        | 12        |
| Threads by Annotator B        | 14        |
| Threads by Annotator C        | 13        |

---

## 2. Admin Project Page (Project Dashboard)

This dashboard provides a high-level overview of the entire project, allowing a manager to monitor overall progress and quality without needing to inspect every single chat room.

### 2.1. High-Level KPIs

A set of prominent "cards" at the top of the page showing the most critical project metrics.

*   **Project Completion:** A circular progress bar or simple text showing "35 / 50 Rooms Annotated".
*   **Overall Agreement:** The average "one-to-one" accuracy score across all fully annotated rooms in the project.
*   **Active Annotators:** The number of annotators who have contributed to the project.

### 2.2. Annotator Performance Leaderboard

A table or bar chart that ranks annotators based on key metrics. This helps identify both top performers and those who might need additional guidance.

**Table View:**

| Annotator     | Rooms Completed | Avg. Agreement w/ Others |
| ------------- | --------------- | ------------------------ |
| Annotator B   | 28              | 89.1%                    |
| Annotator A   | 25              | 84.5%                    |
| Annotator C   | 22              | 82.3%                    |

### 2.3. Agreement Quality Over Time

A line chart that shows how the average agreement score has trended as the project has progressed.

*   **X-Axis:** Time (e.g., by week or by batch of 10 completed rooms).
*   **Y-Axis:** Average agreement score.
*   **Insight:** This chart can reveal if annotators are becoming more consistent over time, indicating that they are learning the annotation guidelines more effectively. An upward trend is a sign of a healthy project.

### 2.4. Chat Room Status List

An interactive and sortable table listing all chat rooms in the project. This is the main tool for navigating to the detailed analysis pages.

| Chat Room     | Status      | # Annotators | Avg. Agreement | Actions           |
| ------------- | ----------- | ------------ | -------------- | ----------------- |
| `CR_101`      | Annotated   | 3            | 85.5%          | `View Analysis`   |
| `CR_102`      | Annotated   | 3            | **61.2%**      | `View Analysis`   |
| `CR_103`      | In Progress | 2            | N/A            | `View Progress`   |
| `CR_104`      | Not Started | 0            | N/A            | `Assign`          |

**Key Features:**
*   **Conditional Formatting:** Highlight low agreement scores in red to draw immediate attention.
*   **Click-to-Drill-Down:** The `View Analysis` button should navigate directly to the **Annotation Analysis Page** for that specific chat room. 