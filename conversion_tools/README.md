# Annotated Chatroom Import Tool

A simple CLI tool to import complete annotated chatrooms from CSV files into the annotation system.

## Overview

This tool imports CSV files that contain both chat messages and thread annotations. Each CSV file represents a complete annotated chatroom by a single annotator.

## Installation

```bash
cd conversion_tools
pip install -r requirements.txt
```

## Usage

### Basic Usage

```bash
python import_annotated_chatroom.py \
    --csv-file "annotated_csvs/VAC_R10-joao.csv" \
    --annotator-email "joao@study.com" \
    --project-id 1
```

### Full Options

```bash
python import_annotated_chatroom.py \
    --csv-file "annotated_csvs/VAC_R10-joao.csv" \
    --annotator-email "joao@study.com" \
    --annotator-name "João Silva" \
    --project-id 1 \
    --chatroom-name "VAC_R10 Vaccination Debate - João" \
    --api-base-url "http://localhost:8000" \
    --admin-email "admin@example.com" \
    --admin-password "password"
```

### Environment Variables

You can set admin credentials as environment variables:

```bash
export ADMIN_EMAIL="admin@example.com"
export ADMIN_PASSWORD="your_password"

python import_annotated_chatroom.py \
    --csv-file "annotated_csvs/VAC_R10-joao.csv" \
    --annotator-email "joao@study.com" \
    --project-id 1
```

## CSV Format

The tool expects CSV files with these columns:

- `user_id`: ID of the chat participant
- `turn_id`: Unique identifier for each message
- `turn_text`: The actual message text
- `reply_to_turn`: ID of the message being replied to (optional)
- `thread` (or `Thread_*`): Thread annotation (the tool auto-detects column name)

### Example CSV Structure

```csv
user_id;turn_id;turn_text;reply_to_turn;thread
1280;VAC_R10_001;Olá! Sou o moderador...;;0
1969;VAC_R10_002;Na minha opinião a vacinação...;;0
1953;VAC_R10_003;Na minha opinião eu não acho...;;0
```

## What the Tool Does

1. **Reads the CSV file** and detects the thread column automatically
2. **Authenticates** with the backend API using admin credentials
3. **Creates the annotator user** if it doesn't exist
4. **Imports the chatroom** with all messages via existing API
5. **Imports the annotations** linking messages to threads
6. **Reports statistics** and results

## Example Output

```
🚀 Starting annotated chatroom import...
   CSV file: annotated_csvs/VAC_R10-joao.csv
   Annotator: João Silva (joao@study.com)
   Project ID: 1
   Chatroom name: VAC_R10-joao - João Silva's Annotations
   API URL: http://localhost:8000

📁 Reading CSV file: annotated_csvs/VAC_R10-joao.csv
✅ CSV file validated: 160 messages found
✅ Thread column detected: 'thread'
📊 Statistics:
   - Total messages: 160
   - Annotated messages: 156 (97.5%)
   - Unique threads: 8
   - Thread distribution: 0(98), 1(12), 2(8), 3(15), 4(3), 5(18), 6(1), 7(1)
✅ Authenticated as admin@example.com
✅ User created: joao@study.com (ID: 15)
✅ Chatroom imported: "VAC_R10-joao - João Silva's Annotations" (ID: 42)
✅ Annotations imported: 156 annotations successfully processed

🎯 Import completed successfully!
   Chatroom ID: 42
   User ID: 15
   Total messages: 160
   Total annotations: 156
   Import time: 3.2 seconds

✨ Success! You can now view the imported chatroom in the web interface:
   http://localhost:3000/admin/projects/1
```

## Multiple Annotators Workflow

To import the same chat annotated by different people:

```bash
# Create a project first (via web UI or API)

# Import João's annotations
python import_annotated_chatroom.py \
    --csv-file "annotated_csvs/VAC_R10-joao.csv" \
    --annotator-email "joao@study.com" \
    --project-id 1

# Import Zuil's annotations
python import_annotated_chatroom.py \
    --csv-file "annotated_csvs/VAC_R10-zuil.csv" \
    --annotator-email "zuil@study.com" \
    --project-id 1

# Result: 2 chatrooms in the same project for IAA analysis
```

## Troubleshooting

### Common Issues

1. **Authentication failed**: Check admin email/password
2. **CSV parsing error**: Ensure proper delimiter (`;` or `,`)
3. **No thread column found**: Check column names (should be `thread`, `Thread_*`, etc.)
4. **User creation failed**: Email might already exist with different name

### Getting Help

Run with `--help` to see all options:

```bash
python import_annotated_chatroom.py --help
```

# Conversion Tools

This directory contains tools for importing annotated chatroom data into the annotation system.

## 🚀 Quick Start - Batch Import (Recommended)

For importing multiple CSV files representing the same chatroom annotated by different people:

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Place your CSV files in annotated_csvs/ folder
# Example: VAC_R10-joao.csv, VAC_R10-zuil.csv

# 3. Test what will be imported (dry run)
python batch_import_annotated_chatrooms.py --dry-run

# 4. Import everything
python batch_import_annotated_chatrooms.py
```

## Tools Overview

### 🎯 batch_import_annotated_chatrooms.py (NEW)
**Perfect for IAA (Inter-Annotator Agreement) studies**

**What it does:**
- Scans a folder and groups CSV files by base name
- Creates ONE chatroom per group (no duplicates!)
- Imports all annotators' annotations to the same chatroom
- Automatically creates users and assigns them to projects

**Example:**
```
annotated_csvs/
├── VAC_R10-joao.csv    # Same chatroom, different annotations
└── VAC_R10-zuil.csv    # Same chatroom, different annotations

Result: 1 chatroom "VAC_R10 - IAA Study" with 2 annotation sets
```

**Configuration (edit the script):**
```python
API_BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com" 
ADMIN_PASSWORD = "admin"
PROJECT_ID = 5
ANNOTATED_CSVS_FOLDER = "annotated_csvs"
```

**Usage:**
```bash
# Validate files without importing
python batch_import_annotated_chatrooms.py --dry-run

# Import everything
python batch_import_annotated_chatrooms.py

# Custom settings
python batch_import_annotated_chatrooms.py --project-id 3 --folder my_csvs/
```

### 📝 import_annotated_chatroom.py (Individual Import)
For importing single annotated chatroom files one at a time.

**Usage:**
```bash
python import_annotated_chatroom.py VAC_R10-joao.csv --annotator-name "João" --annotator-email "joao@research.pt"
```

## CSV File Format

Your CSV files should have this structure:

```csv
user_id;turn_id;turn_text;reply_to_turn;thread
1280;VAC_R10_001;Hello everyone!;;0
1969;VAC_R10_002;Hi there!;;0  
1952;VAC_R10_003;Good morning;VAC_R10_001;1
```

**Required columns:**
- `user_id`: Participant ID
- `turn_id`: Unique message ID  
- `turn_text`: Message content
- `reply_to_turn`: ID of message being replied to (empty if not a reply)

**Thread column (any name starting with "thread"):**
- `thread`, `Thread_annotator`, `thread_id`, etc.
- Contains thread/conversation IDs assigned by the annotator

## Workflow

### For IAA Studies (Multiple Annotators, Same Chatroom)

1. **Prepare files**: Name them `CHATROOM-ANNOTATOR.csv`
   - `VAC_R10-joao.csv`
   - `VAC_R10-zuil.csv`
   - `VAC_R10-maria.csv`

2. **Place in folder**: Put all files in `annotated_csvs/`

3. **Test**: `python batch_import_annotated_chatrooms.py --dry-run`

4. **Import**: `python batch_import_annotated_chatrooms.py`

**Result**: One chatroom with multiple annotation sets for comparison!

### For Individual Imports

Use `import_annotated_chatroom.py` for one-off imports or different chatrooms.

## Requirements

```txt
pandas>=1.5.0
requests>=2.28.0
click>=8.0.0
```

Install with: `pip install -r requirements.txt`

## Backend Requirements

- Backend must be running on `http://localhost:8000`
- Admin credentials required
- Target project must exist
- Users will be created automatically

## Troubleshooting

**"No CSV files found"**: Check that files are in the correct folder and end with `.csv`

**"Different message structure"**: Files in the same group must have identical messages (same `user_id`, `turn_id`, `turn_text`, `reply_to_turn`)

**"No thread column found"**: Ensure your CSV has a column starting with "thread"

**"Authentication failed"**: Check admin credentials in configuration

**"Project not found"**: Verify project ID exists using `--list-projects` flag

## Examples

### Batch Import Output
```
📁 Found 4 CSV files in annotated_csvs
📊 Grouped into 2 chatrooms:
   VAC_R10: 2 annotators (VAC_R10-joao.csv, VAC_R10-zuil.csv)
   COVID_R5: 2 annotators (COVID_R5-ana.csv, COVID_R5-pedro.csv)

✅ Chatroom imported: "VAC_R10 - IAA Study" (ID: 8)
✅ Annotations imported: 160 from joao
✅ Annotations imported: 160 from zuil

🎯 Batch import completed!
   Chatrooms created: 2
   Total annotators: 4  
   Total annotations: 640
```

This setup is **perfect for research** where you need to:
- Compare annotations between multiple people
- Calculate inter-annotator agreement
- Analyze annotation consistency
- Study conversation threading approaches 