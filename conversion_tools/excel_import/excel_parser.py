"""
Excel Chat Room Parser

This module provides functionality for parsing Excel files containing 
chat room annotations with multiple tabs representing different annotators.
"""

import re
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import logging

logger = logging.getLogger(__name__)


class ExcelChatRoomParser:
    """
    Parser for Excel files containing chat room annotations.
    
    Each Excel file contains multiple tabs with the same chat room data
    but different annotations from different annotators.
    """
    
    # Patterns to extract annotator names from sheet names
    ANNOTATOR_PATTERNS = [
        r"anotação\s+(.+)",       # anotação zuil, anotação bruno (case-insensitive)
        r"thread_(.+)",           # thread_joao
        r"(.+)_annotations",      # joao_annotations
        r"(.+)_thread",          # joao_thread
        r"annotation_(.+)",       # annotation_joao
        r"^(.+)$"                # fallback: whole name
    ]
    
    # Required columns in Excel sheets
    REQUIRED_COLUMNS = ["user_id", "turn_id", "turn_text", "reply_to_turn"]
    
    # Thread/annotation column patterns
    THREAD_COLUMN_PATTERNS = [
        r"^thread$",
        r"^thread_.*",
        r".*_thread.*",
        r"^annotation.*",
        r".*annotation.*"
    ]
    
    def __init__(self, excel_file_path: str):
        """
        Initialize the Excel parser.
        
        Args:
            excel_file_path: Path to the Excel file
        """
        self.excel_file_path = Path(excel_file_path)
        self.base_name = self._extract_base_name()
        self._sheets_data = None
        self._validate_file()
    
    def _validate_file(self) -> None:
        """Validate that the Excel file exists and is readable."""
        if not self.excel_file_path.exists():
            raise FileNotFoundError(f"Excel file not found: {self.excel_file_path}")
        
        if not self.excel_file_path.suffix.lower() in ['.xlsx', '.xls']:
            raise ValueError(f"File must be Excel format (.xlsx or .xls): {self.excel_file_path}")
    
    def _extract_base_name(self) -> str:
        """Extract base name from file name (e.g., VAC_R10.xlsx -> VAC_R10)."""
        return self.excel_file_path.stem
    
    def get_sheet_names(self) -> List[str]:
        """
        Get all sheet names from the Excel file.
        
        Returns:
            List of sheet names
        """
        try:
            excel_file = pd.ExcelFile(self.excel_file_path)
            return excel_file.sheet_names
        except Exception as e:
            logger.error(f"Failed to read Excel file {self.excel_file_path}: {e}")
            raise
    
    def _load_all_sheets(self) -> Dict[str, pd.DataFrame]:
        """Load all sheets from the Excel file."""
        if self._sheets_data is None:
            try:
                logger.info(f"Loading Excel file: {self.excel_file_path}")
                self._sheets_data = pd.read_excel(
                    self.excel_file_path, 
                    sheet_name=None,  # Read all sheets
                    dtype=str  # Keep everything as string initially
                )
                logger.info(f"Loaded {len(self._sheets_data)} sheets")
            except Exception as e:
                logger.error(f"Failed to load Excel file: {e}")
                raise
        
        return self._sheets_data
    
    def parse_sheet(self, sheet_name: str) -> Dict[str, Any]:
        """
        Parse a specific sheet and return structured data.
        
        Args:
            sheet_name: Name of the sheet to parse
            
        Returns:
            Dictionary containing parsed data
        """
        sheets_data = self._load_all_sheets()
        
        if sheet_name not in sheets_data:
            raise ValueError(f"Sheet '{sheet_name}' not found in Excel file")
        
        df = sheets_data[sheet_name]
        
        # Clean the dataframe
        df = self._clean_dataframe(df)
        
        # Validate format
        self.validate_sheet_format(df)
        
        # Extract data
        return {
            "sheet_name": sheet_name,
            "annotator_name": self.extract_annotator_from_sheet_name(sheet_name),
            "chat_room_data": self._extract_chat_room_data(df),
            "messages_data": self._extract_messages_data(df),
            "annotations_data": self._extract_annotations_data(df),
            "thread_column": self._detect_thread_column(df),
            "total_rows": len(df)
        }
    
    def _clean_dataframe(self, df: pd.DataFrame) -> pd.DataFrame:
        """Clean and prepare the dataframe."""
        # Remove completely empty rows
        df = df.dropna(how='all')
        
        # Remove rows where all required columns are empty
        required_cols = [col for col in self.REQUIRED_COLUMNS if col in df.columns]
        if required_cols:
            df = df.dropna(subset=required_cols, how='all')
        
        # Reset index
        df = df.reset_index(drop=True)
        
        # Clean column names (strip whitespace, lowercase)
        df.columns = df.columns.str.strip().str.lower()
        
        return df
    
    def validate_sheet_format(self, df: pd.DataFrame) -> bool:
        """
        Validate that the sheet has the required format.
        
        Args:
            df: DataFrame to validate
            
        Returns:
            True if valid
            
        Raises:
            ValueError if invalid format
        """
        # Check for required columns
        missing_cols = []
        for col in self.REQUIRED_COLUMNS:
            if col not in df.columns:
                missing_cols.append(col)
        
        if missing_cols:
            raise ValueError(f"Missing required columns: {missing_cols}")
        
        # Check for thread/annotation column
        thread_col = self._detect_thread_column(df)
        if not thread_col:
            raise ValueError("No thread/annotation column found")
        
        # Check if we have data
        if len(df) == 0:
            raise ValueError("Sheet is empty")
        
        logger.info(f"Sheet format validation passed: {len(df)} rows")
        return True
    
    def _detect_thread_column(self, df: pd.DataFrame) -> Optional[str]:
        """Detect the thread/annotation column."""
        for col in df.columns:
            for pattern in self.THREAD_COLUMN_PATTERNS:
                if re.match(pattern, col, re.IGNORECASE):
                    return col
        return None
    
    def extract_annotator_from_sheet_name(self, sheet_name: str) -> str:
        """
        Extract annotator name from sheet name using regex patterns.
        
        Args:
            sheet_name: Name of the sheet
            
        Returns:
            Extracted annotator name
        """
        # Clean sheet name
        clean_name = sheet_name.strip().lower()
        
        # Try each pattern
        for pattern in self.ANNOTATOR_PATTERNS:
            match = re.match(pattern, clean_name, re.IGNORECASE)
            if match:
                annotator = match.group(1).strip()
                if annotator:  # Make sure it's not empty
                    return annotator
        
        # Fallback: use sheet name directly
        return clean_name
    
    def _extract_chat_room_data(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Extract chat room metadata from the sheet."""
        return {
            "base_name": self.base_name,
            "name": f"{self.base_name} - Multi-Annotator Study",
            "description": f"Chat room imported from {self.excel_file_path.name}",
            "total_messages": len(df)
        }
    
    def _extract_messages_data(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Extract chat messages from the sheet."""
        messages = []
        
        for _, row in df.iterrows():
            # Skip rows with empty turn_id
            if pd.isna(row.get('turn_id')) or str(row['turn_id']).strip() == '':
                continue
                
            message = {
                "turn_id": str(row['turn_id']).strip(),
                "user_id": str(row['user_id']).strip() if pd.notna(row.get('user_id')) else '',
                "turn_text": str(row['turn_text']).strip() if pd.notna(row.get('turn_text')) else '',
                "reply_to_turn": str(row['reply_to_turn']).strip() if pd.notna(row.get('reply_to_turn')) and str(row['reply_to_turn']).strip() != '' else None
            }
            
            messages.append(message)
        
        return messages
    
    def _extract_annotations_data(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Extract annotation data from the sheet."""
        thread_col = self._detect_thread_column(df)
        if not thread_col:
            return []
        
        annotations = []
        
        for _, row in df.iterrows():
            # Skip rows with empty turn_id or thread annotation
            if (pd.isna(row.get('turn_id')) or 
                str(row['turn_id']).strip() == '' or
                pd.isna(row.get(thread_col)) or
                str(row[thread_col]).strip() == ''):
                continue
            
            annotation = {
                "turn_id": str(row['turn_id']).strip(),
                "thread_id": str(row[thread_col]).strip()
            }
            
            annotations.append(annotation)
        
        return annotations
    
    def get_all_sheets_data(self) -> Dict[str, Dict[str, Any]]:
        """
        Parse all sheets in the Excel file.
        
        Returns:
            Dictionary mapping sheet names to parsed data
        """
        sheets_data = {}
        sheet_names = self.get_sheet_names()
        
        logger.info(f"Processing {len(sheet_names)} sheets: {sheet_names}")
        
        for sheet_name in sheet_names:
            try:
                sheets_data[sheet_name] = self.parse_sheet(sheet_name)
                logger.info(f"Successfully parsed sheet: {sheet_name}")
            except Exception as e:
                logger.error(f"Failed to parse sheet '{sheet_name}': {e}")
                # Continue with other sheets
                continue
        
        return sheets_data
    
    def get_annotators(self) -> List[str]:
        """Get list of all detected annotators."""
        annotators = []
        for sheet_name in self.get_sheet_names():
            try:
                annotator = self.extract_annotator_from_sheet_name(sheet_name)
                if annotator not in annotators:
                    annotators.append(annotator)
            except Exception:
                continue
        return annotators
    
    def validate_consistency(self) -> Tuple[bool, List[str]]:
        """
        Validate that all sheets have consistent chat room data.
        
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        sheets_data = self.get_all_sheets_data()
        errors = []
        
        if not sheets_data:
            return False, ["No valid sheets found"]
        
        # Get reference data from first sheet
        reference_sheet = next(iter(sheets_data.values()))
        reference_messages = reference_sheet['messages_data']
        reference_turn_ids = {msg['turn_id'] for msg in reference_messages}
        
        # Check each sheet against reference
        for sheet_name, sheet_data in sheets_data.items():
            messages = sheet_data['messages_data']
            turn_ids = {msg['turn_id'] for msg in messages}
            
            # Check if turn_ids match
            if turn_ids != reference_turn_ids:
                missing = reference_turn_ids - turn_ids
                extra = turn_ids - reference_turn_ids
                
                if missing:
                    errors.append(f"Sheet '{sheet_name}' missing turn_ids: {missing}")
                if extra:
                    errors.append(f"Sheet '{sheet_name}' has extra turn_ids: {extra}")
        
        return len(errors) == 0, errors
    
    def get_summary(self) -> Dict[str, Any]:
        """Get summary information about the Excel file."""
        try:
            sheets_data = self.get_all_sheets_data()
            annotators = self.get_annotators()
            is_consistent, consistency_errors = self.validate_consistency()
            
            if sheets_data:
                sample_sheet = next(iter(sheets_data.values()))
                total_messages = len(sample_sheet['messages_data'])
                total_annotations = sum(len(sheet['annotations_data']) for sheet in sheets_data.values())
            else:
                total_messages = 0
                total_annotations = 0
            
            return {
                "file_path": str(self.excel_file_path),
                "base_name": self.base_name,
                "total_sheets": len(sheets_data),
                "annotators": annotators,
                "total_messages": total_messages,
                "total_annotations": total_annotations,
                "is_consistent": is_consistent,
                "consistency_errors": consistency_errors,
                "valid_sheets": list(sheets_data.keys())
            }
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return {
                "file_path": str(self.excel_file_path),
                "error": str(e)
            } 