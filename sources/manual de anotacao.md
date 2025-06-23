# Introduction

As online interactions continue to expand, group communication through chats, forums, and social networks becomes increasingly complex. In chat rooms, where users may engage in multiple simultaneous conversations, distinguishing between these conversations poses a significant challenge. This issue, referred to as disentanglement - also known as "thread identification" (Khan et al. 2002), "thread detection" (Shen et al. 2006), or "thread extraction" (Adams and Martell 2008) - has been the focus of several research efforts. The purpose of this manual is to assist annotators in identifying and separating entangled text streams from online conversations to clarify which interactions belong to which thread, a task that presents challenges in various contexts.

# Task Identification

The task assigned to the annotators involves reading interactions in a chat room, turn by turn, and identifying which thread each turn belongs to.

- **Turn**: consists of a set of sentences sent by the same participant to the same addressee in a chat room.
- **Chat room**: a series of turns exchanged by two or more participants.
- **Thread or conversation**: refers to a group of interconnected turns that share reply relations or(and) the same topic. In other words, a thread is a discussion where the participants are all responding and paying attention to each other. It should be clear that the turns in a conversation are connected and flow together.

# Annotation Environment and Data

As mentioned in the previous section, the data will be sent and named according to the room label. The annotators will receive an Excel file for each room. The file contains the following columns:

- **user_id**: consists of the ID of the user who sent the turn.
- **turn_id**: represents a unique ID for the sent turn.
- **turn_text**: consists of a text, containing one or more sentences sent by the user.
- **reply_to_turn**: also called reply-mark. This column indicates which turn the current turn explicitly replies to.
- **thread**: a column that should be filled in by the annotator through the identification of the threads.

The data provided to the annotators is part of a project in which high school students were brought together in a virtual environment to discuss broad themes affecting society today, such as racism, vaccination, and others. At the beginning of each debate, students are shown a video explaining the main topic of the conversation. A moderator then interacts with the students, asking questions to guide the discussion.

Below is an example:

# Annotation Guidelines

Once the Excel file is received, the annotators should read the conversation turn by turn and assign each turn a (thread) number. Turns that are related by topic should have the same number, indicating that the conversation continued along the same thread. The result of the annotation will be an Excel spreadsheet with the 'thread' column fully completed.

Here are some annotation guidelines:

- **Threads start at 0**: The label assigned to threads will be numeric, starting at 0. The annotator is free to increment this number if they notice a new topic emerging in the conversation.
- Throughout the conversation, the moderator introduces questions that may either continue a previously discussed thread or open a new one. Additionally, some of the moderator's messages are only meant to encourage students to engage in conversation. When this happens, these messages should be classified as a meta-thread and grouped into a single thread from the beginning to the end of the conversation.
- Annotators should aim to be as general as possible, trying to group the maximum number of turns into a single thread. However, while students are encouraged to stick to a main topic, the conversation may branch out into subtopics. The annotator has the freedom to create a new thread if they recognize a subtopic emerging.
- There are some turns in which spelling and grammar errors are present. Annotators should not infer what the participants in the conversation are trying to say. In cases where the annotator cannot understand what is being said due to language errors or cannot identify a connection between the current turn and previous ones, they should create a new thread.
- As described in the previous section, chat rooms have a feature called 'reply_to_turn.' Annotators should always consider this relationship between turns. Before assigning a thread number to a turn, the annotator must check whether the turn is explicitly replying to another turn and if they share the same topic or reply relation. If so, both turns should be placed in the same thread. However, there are cases where, even with an explicit reply marker, the turns do not share the same topic. In such cases, the annotator should create a new thread for the current turn being analyzed.
- The annotator should use the 'user_id' to track messages sent in sequence by the same user. It is common for users to send a group of turns in succession, interrupted by other turns, but still referring to the same thread. Therefore, observing whether the same user has sent previous turns is an effective way to understand the thread.
- There are instances of turn flooding behavior. Some users send content like "...." or sequences of unrelated emoticons to the ongoing conversations. In such cases, whenever a turn is completely unrelated to anything previously discussed, the annotator should assign a new thread.
- Expressions like "Concordo", "sim," "Claro" or "Supostamente" should always be linked to the thread that immediately precedes the turn, unless there's a 'reply_to_turn' event. In the case of a 'reply_to_turn', these affirmative messages should follow the thread of the turn they are responding to.

In general, when an annotator is annotating a turn, they must follow the order of features below to assign a thread to that turn:

1. **reply_to_turn**: If there is a reply marker, check whether the current turn shares the same topic or has a reply relationship with the turn referenced by the reply marker.
2. **user_id**: Determine if the same user has sent previous turns and which threads they participated in.
3. **turn_text**: Read the content of the message and check if it relates to previous threads.

If, after analyzing the three features above, it is not possible to connect a turn to previous ones, the annotator is free to create a new thread.
