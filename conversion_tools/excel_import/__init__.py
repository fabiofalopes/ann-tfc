"""
Excel Import Package for Chat Room Annotation Processing

This package provides tools for importing Excel files containing 
chat room annotations into the annotation system.
"""

from .excel_parser import ExcelChatRoomParser
from .data_transformer import ChatRoomDataTransformer
from .api_client import AnnotationAPIClient
from .batch_import_manager import BatchExcelImportManager

__version__ = "1.0.0"
__all__ = [
    "ExcelChatRoomParser",
    "ChatRoomDataTransformer", 
    "AnnotationAPIClient",
    "BatchExcelImportManager"
] 