import csv
import pandas as pd
from typing import List, Dict, Any

def import_chat_messages(file_path: str) -> List[Dict[str, Any]]:
    """
    Import chat messages from a CSV file, only caring about specific required columns.
    Returns a list of dictionaries with the required fields.
    
    Required columns (case insensitive):
    - turn_id: Unique identifier for the message
    - user_id: ID of the user who sent the message
    - turn_text: The message content
    - reply_to_turn (optional): ID of the message this is replying to
    """
    try:
        # Read CSV with pandas with proper quoting settings
        df = pd.read_csv(
            file_path,
            quoting=csv.QUOTE_MINIMAL,  # Handle quoted fields
            escapechar='\\',  # Allow escaping of quotes
            encoding='utf-8',  # Ensure proper UTF-8 encoding
            on_bad_lines='skip'  # Skip problematic lines
        )
        
        # Convert column names to lowercase for case-insensitive matching
        df.columns = df.columns.str.lower()
        
        # Check required columns
        required_columns = ['turn_id', 'user_id', 'turn_text']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"Missing required columns: {', '.join(missing_columns)}")
        
        # Select only the columns we care about
        columns_to_use = required_columns + (['reply_to_turn'] if 'reply_to_turn' in df.columns else [])
        df = df[columns_to_use]
        
        # Clean up the data
        # Handle user_id first - convert to integer then string to remove decimal points
        df['user_id'] = df['user_id'].apply(lambda x: str(int(float(x))) if pd.notna(x) else None)
        
        # Convert other fields to strings and strip whitespace
        for col in ['turn_id', 'turn_text']:
            df[col] = df[col].apply(lambda x: str(x).strip() if pd.notna(x) else None)
        
        # Handle reply_to_turn separately since it's optional
        if 'reply_to_turn' in df.columns:
            df['reply_to_turn'] = df['reply_to_turn'].apply(
                lambda x: str(x).strip() if pd.notna(x) and str(x).strip() not in ['nan', 'None', ''] else None
            )
        
        # Remove any rows where required fields are None
        df = df.dropna(subset=required_columns)
        
        # Convert to list of dictionaries
        messages = df.to_dict('records')
        
        # Print first few messages for debugging
        print(f"Successfully parsed {len(messages)} messages")
        if messages:
            print("First message:", messages[0])
        
        return messages
        
    except Exception as e:
        raise Exception(f"Error importing CSV: {str(e)}")

def validate_csv_format(file_path: str) -> bool:
    """
    Validate that a file is a properly formatted CSV with the required columns.
    Returns True if valid, raises ValueError with description if invalid.
    """
    try:
        # Try to read first few rows to validate format
        df = pd.read_csv(
            file_path,
            nrows=5,
            quoting=csv.QUOTE_MINIMAL,
            escapechar='\\',
            encoding='utf-8',
            on_bad_lines='skip'
        )
        
        # Convert column names to lowercase
        df.columns = df.columns.str.lower()
        
        # Check required columns
        required_columns = ['turn_id', 'user_id', 'turn_text']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            raise ValueError(f"CSV is missing required columns: {', '.join(missing_columns)}")
            
        return True
        
    except pd.errors.EmptyDataError:
        raise ValueError("CSV file is empty")
    except pd.errors.ParserError:
        raise ValueError("File is not a valid CSV format")
    except Exception as e:
        raise ValueError(f"Error validating CSV: {str(e)}") 