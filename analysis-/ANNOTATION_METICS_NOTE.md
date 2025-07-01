# Inter-Annotator Agreement (IAA) for Chat Disentanglement

This document outlines the plan for calculating and displaying inter-annotator agreement metrics within the annotation tool, focusing on the "one-to-one" accuracy for chat disentanglement tasks.

## 1. Core Concept: Measuring Agreement

The primary goal is to evaluate the consistency among different annotators for a given task. In the context of chat disentanglement, this means measuring how similarly different annotators grouped messages into conversational threads.

We will focus on the agreement **per Sala (Chat Room)**, which is the fundamental unit of annotation.

## 2. The "One-to-One" Agreement Metric

As discussed, we will implement a specific metric known as **"one-to-one accuracy"** or **"one-to-one overlap"**. This metric is designed to find the best possible mapping between the thread labels of two annotators and calculate the percentage of messages that fall into the optimally matched threads.

### Python Implementation Reference

The calculation will be based on the following logic, which uses the Hungarian algorithm (`linear_sum_assignment`) to solve the assignment problem.

```python
def one_to_one_accuracy(annot1, annot2):
    """
    Computes the one-to-one accuracy metric for two lists of annotations.
    This metric finds the optimal matching between thread labels from two annotators
    and calculates the percentage of messages that align based on this matching.

    Parameters:
    annot1: A list of thread identifiers (e.g., integers) from the first annotator.
    annot2: A list of thread identifiers from the second annotator. Must be the same length as annot1.

    Returns:
    A float representing the accuracy score (0-100).
    """
    from scipy.optimize import linear_sum_assignment
    import numpy as np

    # Ensure annotations are of the same length
    assert len(annot1) == len(annot2), "Annotation lists must have the same length."

    # Create a contingency matrix to store the overlap between thread labels
    unique_labels1 = sorted(list(set(annot1)))
    unique_labels2 = sorted(list(set(annot2)))
    
    label_map1 = {label: i for i, label in enumerate(unique_labels1)}
    label_map2 = {label: i for i, label in enumerate(unique_labels2)}

    # Initialize a zero matrix for counting overlaps
    overlap_matrix = np.zeros((len(unique_labels1), len(unique_labels2)), dtype=int)

    # Populate the overlap matrix
    for i in range(len(annot1)):
        idx1 = label_map1[annot1[i]]
        idx2 = label_map2[annot2[i]]
        overlap_matrix[idx1, idx2] += 1

    # Apply the Hungarian algorithm to find the optimal matching.
    # We negate the matrix because the algorithm finds the minimum cost assignment,
    # and we want to maximize the overlap.
    row_ind, col_ind = linear_sum_assignment(-overlap_matrix)

    # Calculate total overlap by summing the values at the optimal matching positions
    total_overlap = overlap_matrix[row_ind, col_ind].sum()

    # Calculate one-to-one accuracy as the percentage of the total messages
    accuracy = (total_overlap / len(annot1)) * 100 if len(annot1) > 0 else 0

    return accuracy
```

### Pre-requisites for Calculation

To ensure the validity of the metric, the following conditions must be met:
- **Completeness**: The metric can only be calculated after **all** annotators assigned to a chat room have annotated **all** messages.
- **Equal Length**: The lists of annotations being compared must be identical in size. There can be no `null` or undefined annotations for any message.

## 3. UI/UX: Displaying the Metrics

The agreement scores will be integrated directly into the application's views.

### 3.1. View Per Sala (Chat Room) - **Highest Priority**

This is the most critical view for analyzing annotation quality.

- **Pairwise Agreement Table (`Tabela de Pares`)**: For each chat room, we will display a matrix or table that shows the one-to-one agreement score for every possible pair of annotators.

**Example Layout:**

|             | Annotator A | Annotator B | Annotator C |
|-------------|:-----------:|:-----------:|:-----------:|
| **Annotator A** |      -      |    85.2%    |    81.7%    |
| **Annotator B** |      -      |      -      |    89.5%    |
| **Annotator C** |      -      |      -      |      -      |

- **Additional Stats**: This view can also include other simple metrics, such as the total number of messages annotated.

### 3.2. View Per Projeto (Project Dashboard)

At a higher level, the project dashboard cards can be enhanced with aggregate metrics that provide a quick overview of annotation progress and quality.

- **Metrics for Project Cards**:
    - Average agreement score across all rooms in the project.
    - Number of fully annotated rooms vs. total rooms.
    - A summary of annotator activity.

This allows project managers to quickly assess the status of a project without needing to drill down into every single chat room.

## 4. Future Consideration: Data Management

As a side note for future development, we should consider enhancing the application's data management capabilities. This includes:

- **Data Import**: The ability to import datasets (like raw chat logs) into the application.
- **Data Repository**: These imported datasets would be stored and available to be associated with new or existing annotation projects.

This would evolve the application from a pure annotation tool into a more comprehensive platform for managing datasets, but it is **not** a priority for the current development cycle.