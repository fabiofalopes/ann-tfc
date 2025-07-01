#!/usr/bin/env python3
"""
Import Annotated Chatroom Tool

Imports a complete annotated chatroom from a CSV file that contains both
chat messages and thread annotations. Uses existing backend APIs.

WORKFLOW:
1. ✅ Check backend connectivity
2. ✅ Authenticate as admin
3. ✅ Validate project exists (shows available projects if not found)
4. ✅ Create user if doesn't exist
5. ✅ Assign user to project (required for access)
6. ✅ Import chatroom with messages
7. ✅ Import annotations linked to the user
8. ✅ Provide success feedback with direct link

Edit the CONFIGURATION section below, then simply run:
    python import_annotated_chatroom.py

Or use command line flags to override the configuration.

Requirements:
    pip install pandas requests click
"""

# =============================================================================
# CONFIGURATION - Edit these variables as needed
# =============================================================================

# Backend API Configuration
API_BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin"

# Import Configuration
CSV_FILE = "annotated_csvs/VAC_R10-zuil.csv"  # Path to your CSV file
ANNOTATOR_EMAIL = "zuil@research.pt"          # Email for the annotator
ANNOTATOR_NAME = "Zuil"                       # Name for the annotator (optional)
PROJECT_ID = 5                               # Target project ID

# Optional: Override chatroom name (default: auto-generated from filename)
CHATROOM_NAME = None  # Set to string to override, None for auto-generation
                      # Example: "VAC Study - Round 10 Chat" instead of auto-generated name

# =============================================================================

import os
import sys
import io
import time
import pandas as pd
import requests
import click
from typing import Dict, List, Tuple, Optional
from urllib.parse import urljoin


class AnnotatedChatroomImporter:
    """Handles the import of annotated chatrooms via existing APIs."""
    
    def __init__(self, api_base_url: str, admin_email: str, admin_password: str):
        self.api_base_url = api_base_url
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.access_token = None
        self.session = requests.Session()
    
    def check_backend_health(self) -> None:
        """Check if the backend is running and accessible."""
        try:
            # Try to reach the backend root endpoint
            health_url = urljoin(self.api_base_url, "/")
            response = self.session.get(health_url, timeout=5)
            
            if response.status_code == 200:
                click.echo(f"✅ Backend is running at {self.api_base_url}")
            else:
                raise RuntimeError(f"Backend responded with status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to backend at {self.api_base_url}. Is the backend running?")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Backend at {self.api_base_url} is not responding (timeout)")
        except Exception as e:
            raise RuntimeError(f"❌ Backend health check failed: {str(e)}")

    def authenticate(self) -> None:
        """Authenticate with the API and get access token."""
        login_url = urljoin(self.api_base_url, "/auth/token")
        
        login_data = {
            "username": self.admin_email,
            "password": self.admin_password
        }
        
        try:
            response = self.session.post(login_url, data=login_data, timeout=10)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to authentication endpoint. Is the backend running at {self.api_base_url}?")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Authentication request timed out. Backend may be overloaded.")
        
        if response.status_code != 200:
            if response.status_code == 401:
                raise RuntimeError("❌ Authentication failed: Invalid admin credentials")
            else:
                raise RuntimeError(f"❌ Authentication failed (HTTP {response.status_code}): {response.text}")
        
        try:
            result = response.json()
            self.access_token = result["access_token"]
        except (KeyError, ValueError) as e:
            raise RuntimeError(f"❌ Invalid authentication response format: {e}")
        
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
        
        click.echo(f"✅ Authenticated as {self.admin_email}")
    
    def list_projects(self) -> List[Dict]:
        """List all available projects."""
        projects_url = urljoin(self.api_base_url, "/admin/projects")
        
        try:
            response = self.session.get(projects_url, timeout=10)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to projects endpoint")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Projects listing timed out")
        
        if response.status_code != 200:
            if response.status_code == 404:
                raise RuntimeError(f"❌ Projects endpoint not found. Check API URL.")
            elif response.status_code == 403:
                raise RuntimeError(f"❌ Permission denied. Admin access required.")
            else:
                raise RuntimeError(f"❌ Failed to list projects (HTTP {response.status_code}): {response.text}")
        
        try:
            projects = response.json()
        except ValueError as e:
            raise RuntimeError(f"❌ Invalid response format from projects endpoint: {e}")
        
        return projects
    
    def display_available_projects(self) -> None:
        """Display available projects in a user-friendly format."""
        try:
            projects = self.list_projects()
            
            if not projects:
                click.echo("📋 No projects found. Create a project first through the admin interface.")
                return
            
            click.echo("📋 Available Projects:")
            click.echo("=" * 80)
            
            for project in projects:
                click.echo(f"   ID: {project.get('id', 'N/A')}")
                click.echo(f"   Name: {project.get('name', 'N/A')}")
                click.echo(f"   Description: {project.get('description', 'No description')}")
                
                # Show chat room count if available
                if 'chat_rooms' in project:
                    chat_room_count = len(project['chat_rooms'])
                    click.echo(f"   Chat Rooms: {chat_room_count}")
                
                click.echo("   " + "-" * 50)
            
            click.echo(f"\n💡 To use a project, set PROJECT_ID = <id> in the configuration section")
            
        except Exception as e:
            click.echo(f"❌ Failed to list projects: {str(e)}")
    
    def create_or_get_user(self, email: str, name: str) -> int:
        """Create user if doesn't exist, or get existing user ID."""
        # Check if user exists
        users_url = urljoin(self.api_base_url, "/admin/users")
        response = self.session.get(users_url)
        
        if response.status_code == 200:
            users = response.json()
            for user in users:
                if user["email"] == email:
                    click.echo(f"✅ User exists: {email} (ID: {user['id']})")
                    return user["id"]
        
        # Create new user
        create_user_data = {
            "email": email,
            "name": name,
            "password": "temp_password_123",  # Will need to be changed
            "is_admin": False
        }
        
        response = self.session.post(users_url, json=create_user_data)
        
        if response.status_code not in [200, 201]:
            raise RuntimeError(f"Failed to create user: {response.text}")
        
        user_id = response.json()["id"]
        click.echo(f"✅ User created: {email} (ID: {user_id})")
        return user_id
    
    def assign_user_to_project(self, project_id: int, user_id: int) -> None:
        """Assign user to project if not already assigned."""
        assign_url = urljoin(self.api_base_url, f"/projects/{project_id}/assign/{user_id}")
        
        try:
            response = self.session.post(assign_url, timeout=10)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to project assignment endpoint")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Project assignment request timed out")
        
        if response.status_code == 204:
            click.echo(f"✅ User assigned to project {project_id}")
        elif response.status_code == 404:
            raise RuntimeError(f"❌ Project {project_id} or User {user_id} not found for assignment")
        elif response.status_code == 403:
            raise RuntimeError(f"❌ Permission denied for project assignment")
        else:
            # Assignment might already exist, which could return different status codes
            # Let's not fail for this, just warn
            click.echo(f"⚠️  Project assignment response: HTTP {response.status_code} (user may already be assigned)")
    
    def parse_csv_structure(self, df: pd.DataFrame) -> Tuple[List[Dict], List[Dict]]:
        """Extract messages and annotations from DataFrame."""
        
        # Detect thread column
        thread_column = self.detect_thread_column(df)
        if not thread_column:
            raise ValueError("No thread column found in CSV. Expected: thread, Thread_*, thread_id, or thread_column")
        
        click.echo(f"✅ Thread column detected: '{thread_column}'")
        
        # Extract messages (for chatroom creation)
        messages = []
        for _, row in df.iterrows():
            messages.append({
                'turn_id': str(row['turn_id']).strip(),
                'user_id': str(row['user_id']).strip(),
                'turn_text': str(row['turn_text']).strip(),
                'reply_to_turn': str(row['reply_to_turn']).strip() if pd.notna(row['reply_to_turn']) else ""
            })
        
        # Extract annotations (only non-null thread values)
        annotations = []
        for _, row in df.iterrows():
            if pd.notna(row[thread_column]) and str(row[thread_column]).strip():
                annotations.append({
                    'turn_id': str(row['turn_id']).strip(),
                    'thread_id': str(row[thread_column]).strip()
                })
        
        # Statistics
        total_messages = len(messages)
        annotated_messages = len(annotations)
        percentage = (annotated_messages / total_messages * 100) if total_messages > 0 else 0
        
        click.echo(f"📊 Statistics:")
        click.echo(f"   - Total messages: {total_messages}")
        click.echo(f"   - Annotated messages: {annotated_messages} ({percentage:.1f}%)")
        
        # Thread distribution
        thread_counts = {}
        for ann in annotations:
            thread_id = ann['thread_id']
            thread_counts[thread_id] = thread_counts.get(thread_id, 0) + 1
        
        unique_threads = len(thread_counts)
        click.echo(f"   - Unique threads: {unique_threads}")
        
        if unique_threads <= 10:
            thread_dist = ", ".join([f"{tid}({count})" for tid, count in sorted(thread_counts.items())])
            click.echo(f"   - Thread distribution: {thread_dist}")
        
        return messages, annotations
    
    def detect_thread_column(self, df: pd.DataFrame) -> Optional[str]:
        """Detect the thread column automatically."""
        candidates = ['thread', 'thread_id', 'thread_column']
        
        # Add dynamic detection for Thread_* patterns
        for col in df.columns:
            if col.lower().startswith('thread'):
                candidates.append(col)
        
        for candidate in candidates:
            if candidate in df.columns:
                # Validate that column has meaningful data
                non_null_values = df[candidate].dropna()
                if len(non_null_values) > 0:
                    return candidate
        
        return None
    
    def prepare_chatroom_csv(self, messages: List[Dict]) -> str:
        """Prepare CSV content for chatroom import API."""
        output = io.StringIO()
        
        # Write header
        output.write("turn_id,user_id,turn_text,reply_to_turn\n")
        
        # Write messages
        for msg in messages:
            # Escape any quotes in turn_text
            text = msg['turn_text'].replace('"', '""')
            reply_to = msg['reply_to_turn'] if msg['reply_to_turn'] else ""
            
            output.write(f'"{msg["turn_id"]}","{msg["user_id"]}","{text}","{reply_to}"\n')
        
        return output.getvalue()
    
    def prepare_annotations_csv(self, annotations: List[Dict]) -> str:
        """Prepare CSV content for annotations import API."""
        output = io.StringIO()
        
        # Write header
        output.write("turn_id,thread\n")
        
        # Write annotations
        for ann in annotations:
            output.write(f'"{ann["turn_id"]}","{ann["thread_id"]}"\n')
        
        return output.getvalue()
    
    def import_chatroom(self, project_id: int, chatroom_name: str, messages: List[Dict]) -> int:
        """Import chatroom via existing API."""
        csv_content = self.prepare_chatroom_csv(messages)
        
        import_url = urljoin(self.api_base_url, f"/admin/projects/{project_id}/import-chat-room-csv")
        
        files = {
            'file': ('chatroom.csv', csv_content, 'text/csv')
        }
        data = {
            'chat_room_name': chatroom_name
        }
        
        try:
            response = self.session.post(import_url, files=files, data=data, timeout=30)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Lost connection to backend during chatroom import")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Chatroom import timed out (30s). Large datasets may take longer.")
        
        if response.status_code not in [200, 201]:
            if response.status_code == 404:
                click.echo(f"❌ Project ID {project_id} not found.\n")
                self.display_available_projects()
                raise RuntimeError(f"Please use a valid project ID from the list above.")
            elif response.status_code == 403:
                raise RuntimeError(f"❌ Permission denied. Check admin credentials and project access.")
            else:
                raise RuntimeError(f"❌ Failed to import chatroom (HTTP {response.status_code}): {response.text}")
        
        try:
            result = response.json()
            # Try different possible locations for chatroom ID
            chatroom_id = (
                result.get('chat_room_id') or 
                result.get('id') or 
                (result.get('chat_room', {}).get('id') if isinstance(result.get('chat_room'), dict) else None)
            )
            if not chatroom_id:
                raise RuntimeError(f"❌ Backend did not return a chatroom ID. Response: {result}")
        except ValueError as e:
            raise RuntimeError(f"❌ Invalid response format from chatroom import: {e}")
        
        click.echo(f"✅ Chatroom imported: \"{chatroom_name}\" (ID: {chatroom_id})")
        return chatroom_id
    
    def import_annotations(self, chatroom_id: int, user_id: int, annotations: List[Dict]) -> None:
        """Import annotations via existing API."""
        csv_content = self.prepare_annotations_csv(annotations)
        
        import_url = urljoin(self.api_base_url, f"/admin/chat-rooms/{chatroom_id}/import-annotations")
        
        files = {
            'file': ('annotations.csv', csv_content, 'text/csv')
        }
        data = {
            'user_id': user_id
        }
        
        try:
            response = self.session.post(import_url, files=files, data=data, timeout=30)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Lost connection to backend during annotations import")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Annotations import timed out (30s). Large annotation sets may take longer.")
        
        if response.status_code not in [200, 201]:
            if response.status_code == 404:
                raise RuntimeError(f"❌ Chatroom ID {chatroom_id} or User ID {user_id} not found.")
            elif response.status_code == 403:
                raise RuntimeError(f"❌ Permission denied for annotations import.")
            else:
                raise RuntimeError(f"❌ Failed to import annotations (HTTP {response.status_code}): {response.text}")
        
        click.echo(f"✅ Annotations imported: {len(annotations)} annotations successfully processed")
    
    def import_annotated_chatroom(self, csv_file: str, annotator_email: str, 
                                annotator_name: str, project_id: int, 
                                chatroom_name: str) -> Dict:
        """Main import function."""
        start_time = time.time()
        
        # Step 1: Validate and read CSV
        if not os.path.exists(csv_file):
            raise ValueError(f"CSV file not found: {csv_file}")
        
        click.echo(f"📁 Reading CSV file: {csv_file}")
        
        # Try different delimiters
        try:
            df = pd.read_csv(csv_file, delimiter=';')
        except Exception:
            try:
                df = pd.read_csv(csv_file, delimiter=',')
            except Exception as e:
                raise ValueError(f"Failed to read CSV file: {e}")
        
        click.echo(f"✅ CSV file validated: {len(df)} messages found")
        
        # Step 2: Parse structure
        messages, annotations = self.parse_csv_structure(df)
        
        # Step 3: Check backend health
        click.echo("🔍 Checking backend connectivity...")
        self.check_backend_health()
        
        # Step 4: Authenticate
        self.authenticate()
        
        # Step 5: Create/get user
        user_id = self.create_or_get_user(annotator_email, annotator_name)
        
        # Step 6: Assign user to project
        self.assign_user_to_project(project_id, user_id)
        
        # Step 7: Import chatroom
        chatroom_id = self.import_chatroom(project_id, chatroom_name, messages)
        
        # Step 8: Import annotations
        self.import_annotations(chatroom_id, user_id, annotations)
        
        # Results
        import_time = time.time() - start_time
        
        click.echo("\n🎯 Import completed successfully!")
        click.echo(f"   Chatroom ID: {chatroom_id}")
        click.echo(f"   User ID: {user_id}")
        click.echo(f"   Total messages: {len(messages)}")
        click.echo(f"   Total annotations: {len(annotations)}")
        click.echo(f"   Import time: {import_time:.1f} seconds")
        
        return {
            'chatroom_id': chatroom_id,
            'user_id': user_id,
            'messages_count': len(messages),
            'annotations_count': len(annotations),
            'import_time': import_time
        }


@click.command()
@click.option('--csv-file', default=CSV_FILE, help=f'Path to the annotated CSV file (default: {CSV_FILE})')
@click.option('--annotator-email', default=ANNOTATOR_EMAIL, help=f'Email of the annotator (default: {ANNOTATOR_EMAIL})')
@click.option('--project-id', default=PROJECT_ID, type=int, help=f'ID of the project to import into (default: {PROJECT_ID})')
@click.option('--annotator-name', default=ANNOTATOR_NAME, help=f'Name of the annotator (default: {ANNOTATOR_NAME})')
@click.option('--chatroom-name', default=CHATROOM_NAME, help='Name for the chatroom (default: auto-generated)')
@click.option('--api-base-url', default=API_BASE_URL, help=f'Base URL of the API (default: {API_BASE_URL})')
@click.option('--admin-email', default=ADMIN_EMAIL, help=f'Admin email for authentication (default: {ADMIN_EMAIL})')
@click.option('--admin-password', default=ADMIN_PASSWORD, help=f'Admin password for authentication (default: {ADMIN_PASSWORD})')
@click.option('--list-projects', is_flag=True, help='List available projects and exit')
@click.option('--dry-run', is_flag=True, help='Validate CSV and show what would be imported without actually importing')
def main(csv_file, annotator_email, project_id, annotator_name, chatroom_name, 
         api_base_url, admin_email, admin_password, list_projects, dry_run):
    """Import an annotated chatroom from a CSV file."""
    
    # Create importer instance for backend connection
    try:
        importer = AnnotatedChatroomImporter(api_base_url, admin_email, admin_password)
    except Exception as e:
        click.echo(f"❌ Failed to initialize importer: {e}", err=True)
        sys.exit(1)
    
    # Handle --list-projects flag
    if list_projects:
        try:
            click.echo("🔍 Checking backend connectivity...")
            importer.check_backend_health()
            importer.authenticate()
            importer.display_available_projects()
        except Exception as e:
            click.echo(f"❌ Failed to list projects: {e}", err=True)
            sys.exit(1)
        return
    
    # Validate required parameters
    if not csv_file:
        raise click.ClickException("CSV file path is required. Set CSV_FILE in configuration or use --csv-file")
    
    if not annotator_email:
        raise click.ClickException("Annotator email is required. Set ANNOTATOR_EMAIL in configuration or use --annotator-email")
    
    if not admin_email:
        raise click.ClickException("Admin email is required. Set ADMIN_EMAIL in configuration or use --admin-email")
    
    if not admin_password:
        raise click.ClickException("Admin password is required. Set ADMIN_PASSWORD in configuration or use --admin-password")
    
    # Set defaults
    if not annotator_name:
        annotator_name = annotator_email.split('@')[0].replace('.', ' ').title()
    
    if not chatroom_name:
        filename = os.path.splitext(os.path.basename(csv_file))[0]
        # Extract meaningful name from filename (remove annotator suffix if present)
        clean_filename = filename
        if '-' in filename:
            # Remove annotator suffix (e.g., "VAC_R10-joao" -> "VAC_R10")
            clean_filename = filename.split('-')[0]
        chatroom_name = f"{clean_filename} (annotated by {annotator_name})"
    
    # Show configuration
    mode = "🧪 DRY RUN - " if dry_run else "🚀 "
    click.echo(f"{mode}Starting annotated chatroom import...")
    click.echo(f"   CSV file: {csv_file}")
    click.echo(f"   Annotator: {annotator_name} ({annotator_email})")
    click.echo(f"   Project ID: {project_id}")
    click.echo(f"   Chatroom name: {chatroom_name}")
    click.echo(f"   API URL: {api_base_url}")
    if dry_run:
        click.echo("   Mode: DRY RUN (validation only, no actual import)")
    click.echo()
    
    try:
        if dry_run:
            # Dry run: validate CSV and show statistics
            if not os.path.exists(csv_file):
                raise ValueError(f"CSV file not found: {csv_file}")
            
            click.echo(f"📁 Reading CSV file: {csv_file}")
            
            # Try different delimiters
            try:
                df = pd.read_csv(csv_file, delimiter=';')
            except Exception:
                try:
                    df = pd.read_csv(csv_file, delimiter=',')
                except Exception as e:
                    raise ValueError(f"Failed to read CSV file: {e}")
            
            click.echo(f"✅ CSV file validated: {len(df)} messages found")
            
            # Parse structure (validation only)
            messages, annotations = importer.parse_csv_structure(df)
            
            click.echo("\n🧪 Dry run completed! CSV is valid and ready for import.")
            click.echo("   To actually import, run the same command without --dry-run")
            
        else:
            # Normal import
            result = importer.import_annotated_chatroom(
                csv_file, annotator_email, annotator_name, project_id, chatroom_name
            )
            
            click.echo(f"\n✨ Success! You can now view the imported chatroom in the web interface:")
            click.echo(f"   {api_base_url.replace(':8000', ':3000')}/admin/projects/{project_id}")
        
    except Exception as e:
        click.echo(f"\n❌ {'Validation' if dry_run else 'Import'} failed: {str(e)}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    main() 