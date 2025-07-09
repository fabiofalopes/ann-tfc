# Excel (.xlsx) Parsing Tool Implementation Plan

## Executive Summary

This document outlines the comprehensive plan for creating an Excel (.xlsx) parsing tool that will:
- Parse Excel files with multiple tabs containing chat disentanglement annotations
- Extract chat room data and annotations from each tab
- Automatically create users based on tab names
- Import data into the existing annotation API
- Support batch processing of multiple Excel files

## Current State Analysis

### Database Schema (Existing)
- **User**: id, email, hashed_password, is_admin, created_at
- **Project**: id, name, description, created_at, updated_at
- **ChatRoom**: id, name, description, project_id, created_at, updated_at
- **ChatMessage**: id, turn_id, user_id, turn_text, reply_to_turn, chat_room_id, created_at, updated_at
- **Annotation**: id, message_id, annotator_id, project_id, thread_id, created_at, updated_at

### Current API Endpoints (Relevant)
- **Admin endpoints**: `/admin/users`, `/admin/projects`, `/admin/chat-rooms/{chat_room_id}/import-batch-annotations`
- **Project endpoints**: `/projects/{project_id}/chat-rooms`, `/projects/{project_id}/chat-rooms/{room_id}/messages`
- **Authentication**: JWT-based with admin/user roles

### Excel File Structure (Target)
- **Multiple tabs per file**: Each tab = same chat room + different annotator
- **Consistent format**: UserID, TurnID, TurnText, ReplyToTurn, ThreadAnnotation
- **Tab naming**: Format like "thread_[annotator_name]" or similar
- **Batch processing**: Multiple .xlsx files in a directory

## Implementation Plan

### Phase 1: Core Excel Parser Development

#### 1.1 Excel Parser Library (`excel_parser.py`)

**Purpose**: Core library for parsing Excel files with multiple tabs

**Key Functions**:
```python
class ExcelChatRoomParser:
    def __init__(self, excel_file_path: str)
    def get_sheet_names(self) -> List[str]
    def parse_sheet(self, sheet_name: str) -> Dict[str, Any]
    def extract_annotator_from_sheet_name(self, sheet_name: str) -> str
    def validate_sheet_format(self, sheet_data: pd.DataFrame) -> bool
    def get_chat_room_data(self, sheet_name: str) -> Dict[str, Any]
    def get_annotations_data(self, sheet_name: str) -> List[Dict[str, Any]]
```

**Dependencies**:
- `pandas` for Excel reading
- `openpyxl` for Excel file handling
- `pathlib` for file path operations

**Implementation Details**:
- Use `pd.read_excel()` with `sheet_name=None` to read all sheets
- Validate required columns: `user_id`, `turn_id`, `turn_text`, `reply_to_turn`, `thread`
- Extract annotator name from sheet name using regex patterns
- Handle multiple naming conventions: `thread_[name]`, `[name]_annotations`, etc.

#### 1.2 Data Transformation Layer (`data_transformer.py`)

**Purpose**: Transform Excel data into API-compatible format

**Key Functions**:
```python
class ChatRoomDataTransformer:
    def excel_to_chat_room_schema(self, excel_data: Dict) -> schemas.ChatRoomCreate
    def excel_to_chat_messages_schema(self, excel_data: Dict) -> List[schemas.ChatMessage]
    def excel_to_annotations_schema(self, excel_data: Dict, annotator_id: int) -> List[schemas.AnnotationCreate]
    def generate_user_email(self, annotator_name: str) -> str
    def create_chat_room_name(self, base_name: str, annotators: List[str]) -> str
```

**Implementation Details**:
- Convert Excel row data to Pydantic schemas
- Generate unique chat room names: `"{base_name} - Multi-Annotator Study"`
- Create user emails: `"{name.lower()}@research.pt"`
- Handle data type conversions and validation

### Phase 2: API Integration Layer

#### 2.1 API Client (`api_client.py`)

**Purpose**: Interface with the existing annotation API

**Key Functions**:
```python
class AnnotationAPIClient:
    def __init__(self, base_url: str, admin_email: str, admin_password: str)
    def authenticate(self) -> str
    def create_or_get_user(self, email: str, name: str) -> int
    def assign_user_to_project(self, project_id: int, user_id: int) -> None
    def create_chat_room(self, project_id: int, chat_room_data: Dict) -> int
    def import_chat_messages(self, chat_room_id: int, messages: List[Dict]) -> Dict
    def import_annotations(self, chat_room_id: int, annotator_id: int, annotations: List[Dict]) -> Dict
```

**Implementation Details**:
- Use `requests` library for HTTP communication
- Implement JWT token management with refresh logic
- Handle API errors and retry logic
- Support batch operations for efficiency

#### 2.2 Batch Import Manager (`batch_import_manager.py`)

**Purpose**: Orchestrate the complete import process

**Key Functions**:
```python
class BatchExcelImportManager:
    def __init__(self, api_client: AnnotationAPIClient)
    def process_excel_file(self, file_path: str, project_id: int) -> Dict
    def process_directory(self, directory_path: str, project_id: int) -> Dict
    def group_files_by_chat_room(self, file_paths: List[str]) -> Dict[str, List[str]]
    def import_single_excel(self, file_path: str, project_id: int) -> Dict
    def generate_import_report(self, results: List[Dict]) -> str
```

**Implementation Details**:
- Group Excel files by chat room base name
- Create single chat room per group with multiple annotators
- Handle user creation and project assignment
- Generate detailed import reports

### Phase 3: Enhanced Script Development

#### 3.1 Main Script (`import_excel_annotations.py`)

**Purpose**: Command-line interface for Excel import

**Features**:
- Support for single file or directory processing
- Configurable project assignment
- Dry-run mode for validation
- Progress reporting and logging
- Error handling and recovery

**Command Line Options**:
```bash
python import_excel_annotations.py \
    --excel-file "path/to/file.xlsx" \
    --project-id 1 \
    --api-url "http://localhost:8000" \
    --admin-email "admin@example.com" \
    --admin-password "password" \
    --dry-run

python import_excel_annotations.py \
    --directory "path/to/excel/files" \
    --project-id 1 \
    --batch-mode \
    --create-users \
    --output-report "import_report.json"
```

#### 3.2 Configuration Management (`config.py`)

**Purpose**: Centralized configuration handling

**Configuration Options**:
```python
@dataclass
class ImportConfig:
    api_base_url: str = "http://localhost:8000"
    admin_email: str = "admin@example.com"
    admin_password: str = "password"
    default_project_id: int = 1
    default_email_domain: str = "research.pt"
    annotator_name_patterns: List[str] = ["thread_(.+)", "(.+)_annotations", "(.+)"]
    required_columns: List[str] = ["user_id", "turn_id", "turn_text", "reply_to_turn", "thread"]
    batch_size: int = 100
    max_retries: int = 3
    timeout: int = 30
```

### Phase 4: API Enhancements

#### 4.1 New API Endpoints

**Batch Excel Import Endpoint**:
```python
@router.post("/admin/import-excel-batch")
async def import_excel_batch(
    project_id: int,
    files: List[UploadFile],
    create_users: bool = True,
    assign_to_project: bool = True,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Import multiple Excel files with chat room annotations"""
```

**Excel Validation Endpoint**:
```python
@router.post("/admin/validate-excel")
async def validate_excel_format(
    file: UploadFile,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    """Validate Excel file format before import"""
```

#### 4.2 Enhanced Schemas

**New Pydantic Models**:
```python
class ExcelImportRequest(BaseModel):
    project_id: int
    create_users: bool = True
    assign_to_project: bool = True
    email_domain: str = "research.pt"

class ExcelImportResponse(BaseModel):
    total_files: int
    processed_files: int
    chat_rooms_created: int
    users_created: int
    annotations_imported: int
    errors: List[str]
    processing_time: float

class ExcelValidationResponse(BaseModel):
    is_valid: bool
    sheet_count: int
    sheet_names: List[str]
    detected_annotators: List[str]
    validation_errors: List[str]
```

### Phase 5: Error Handling and Validation

#### 5.1 Validation Layer

**File Validation**:
- Check if file is valid Excel (.xlsx) format
- Verify required columns exist in all sheets
- Validate data types and ranges
- Check for duplicate turn_ids within chat rooms

**Data Validation**:
- Ensure chat room consistency across tabs
- Validate annotation thread IDs
- Check for missing or malformed data
- Verify user ID consistency

#### 5.2 Error Recovery

**Graceful Degradation**:
- Continue processing other files if one fails
- Skip invalid sheets while processing valid ones
- Provide detailed error reporting
- Support partial imports with rollback options

### Phase 6: Performance Optimization

#### 6.1 Batch Processing

**Optimizations**:
- Process multiple Excel files in parallel
- Batch API calls for efficiency
- Use database transactions for consistency
- Implement progress tracking

#### 6.2 Memory Management

**Strategies**:
- Stream large Excel files instead of loading entirely
- Process sheets one at a time
- Clear memory between file processing
- Use generators for large datasets

### Phase 7: Testing and Documentation

#### 7.1 Test Suite

**Unit Tests**:
- Excel parser functionality
- Data transformation accuracy
- API client operations
- Error handling scenarios

**Integration Tests**:
- End-to-end import workflows
- API endpoint functionality
- Database consistency
- Performance benchmarks

#### 7.2 Documentation

**User Documentation**:
- Installation and setup guide
- Usage examples and tutorials
- Configuration reference
- Troubleshooting guide

**Developer Documentation**:
- API reference
- Code architecture overview
- Extension guidelines
- Contributing guide

## Implementation Timeline

### Week 1: Foundation
- [ ] Core Excel parser development
- [ ] Data transformation layer
- [ ] Basic API client implementation

### Week 2: Integration
- [ ] Batch import manager
- [ ] Command-line interface
- [ ] Configuration management

### Week 3: Enhancement
- [ ] API endpoint enhancements
- [ ] Error handling and validation
- [ ] Performance optimizations

### Week 4: Testing & Polish
- [ ] Comprehensive testing
- [ ] Documentation completion
- [ ] Performance tuning
- [ ] Bug fixes and refinements

## File Structure

```
conversion_tools/
├── excel_import/
│   ├── __init__.py
│   ├── excel_parser.py          # Core Excel parsing
│   ├── data_transformer.py      # Data transformation
│   ├── api_client.py            # API integration
│   ├── batch_import_manager.py  # Batch processing
│   ├── config.py                # Configuration
│   └── utils.py                 # Utility functions
├── import_excel_annotations.py  # Main script
├── requirements.txt             # Dependencies
├── config.yaml                  # Configuration file
├── tests/                       # Test suite
│   ├── test_excel_parser.py
│   ├── test_data_transformer.py
│   ├── test_api_client.py
│   └── test_integration.py
└── docs/                        # Documentation
    ├── installation.md
    ├── usage.md
    └── api_reference.md
```

## Dependencies

### Python Libraries
```text
pandas>=1.5.0
openpyxl>=3.0.0
requests>=2.28.0
click>=8.0.0
pydantic>=1.10.0
pyyaml>=6.0
tqdm>=4.64.0
```

### System Requirements
- Python 3.8+
- Memory: 2GB+ for large Excel files
- Disk: Sufficient space for temporary files

## Configuration Example

```yaml
# config.yaml
api:
  base_url: "http://localhost:8000"
  admin_email: "admin@example.com"
  admin_password: "password"
  timeout: 30
  max_retries: 3

import:
  default_project_id: 1
  default_email_domain: "research.pt"
  batch_size: 100
  create_users: true
  assign_to_project: true

parsing:
  annotator_name_patterns:
    - "thread_(.+)"
    - "(.+)_annotations"
    - "(.+)"
  required_columns:
    - "user_id"
    - "turn_id"
    - "turn_text"
    - "reply_to_turn"
    - "thread"

logging:
  level: "INFO"
  file: "import.log"
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
```

## Usage Examples

### Single File Import
```bash
python import_excel_annotations.py \
    --excel-file "uploads/Archive/AMO_R01.xlsx" \
    --project-id 1 \
    --create-users \
    --output-report "import_report.json"
```

### Batch Directory Import
```bash
python import_excel_annotations.py \
    --directory "uploads/Archive" \
    --project-id 1 \
    --batch-mode \
    --parallel \
    --max-workers 4
```

### Validation Only
```bash
python import_excel_annotations.py \
    --excel-file "uploads/Archive/AMO_R01.xlsx" \
    --validate-only \
    --verbose
```

## API Changes Required

### Current API Limitations
1. **CSV-specific endpoints**: Current import endpoints are designed for CSV files
2. **Single annotator focus**: Current structure assumes one annotator per import
3. **Limited batch operations**: No support for multi-file imports

### Proposed API Enhancements
1. **Generic import endpoints**: Abstract away file format specifics
2. **Multi-annotator support**: Handle multiple annotators per chat room
3. **Batch import capabilities**: Support for multiple files in single operation
4. **Enhanced validation**: Pre-import validation and error reporting

### Backward Compatibility
- Maintain existing CSV import functionality
- Add Excel import as additional capability
- Ensure existing API contracts remain unchanged

## Success Metrics

### Functional Metrics
- [ ] Successfully parse 100% of valid Excel files
- [ ] Create users and chat rooms without duplicates
- [ ] Import annotations with 100% accuracy
- [ ] Handle errors gracefully with detailed reporting

### Performance Metrics
- [ ] Process large Excel files (>1000 rows) in under 30 seconds
- [ ] Handle batch imports of 10+ files efficiently
- [ ] Memory usage remains under 1GB for typical files
- [ ] API response times under 5 seconds per operation

### Quality Metrics
- [ ] 95%+ code coverage in tests
- [ ] Zero critical bugs in production
- [ ] Complete documentation for all features
- [ ] User satisfaction with import process

## Risk Mitigation

### Technical Risks
- **Memory issues with large files**: Implement streaming and chunked processing
- **API rate limiting**: Add retry logic and backoff strategies
- **Data corruption**: Use database transactions and validation
- **Performance degradation**: Monitor and optimize bottlenecks

### Operational Risks
- **User training**: Provide comprehensive documentation and examples
- **Data migration**: Ensure backward compatibility with existing data
- **System integration**: Test thoroughly with existing workflows
- **Maintenance burden**: Design for extensibility and maintainability

## Next Steps

1. **Review and approval**: Validate this plan with stakeholders
2. **Environment setup**: Prepare development and testing environments
3. **Implementation kickoff**: Begin with Phase 1 development
4. **Regular check-ins**: Weekly progress reviews and adjustments
5. **User feedback**: Gather input from intended users throughout development

This plan provides a comprehensive roadmap for implementing the Excel parsing tool while maintaining high code quality, performance, and user experience standards. 