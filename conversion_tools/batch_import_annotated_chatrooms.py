#!/usr/bin/env python3
"""
Batch Import Annotated Chatrooms Tool

Intelligently imports multiple CSV files that represent the same chatrooms 
annotated by different people. Perfect for IAA (Inter-Annotator Agreement) studies.

SMART WORKFLOW:
1. Scans folder for annotated CSV files
2. Groups files by chatroom name (VAC_R10-joao.csv, VAC_R10-zuil.csv → VAC_R10)
3. Creates ONE chatroom per group
4. Imports all annotators' annotations to the same chatroom
5. Creates users and assigns them to projects automatically

RESULT: One chatroom with multiple annotation sets for IAA analysis
"""

# =============================================================================
# CONFIGURATION - Edit these variables as needed
# =============================================================================

API_BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin"

ANNOTATED_CSVS_FOLDER = "annotated_csvs"
PROJECT_ID = 5

# Auto-extract annotator names from filenames (VAC_R10-joao.csv → joao)
AUTO_EXTRACT_ANNOTATOR_NAMES = True
DEFAULT_EMAIL_DOMAIN = "research.pt"

# Save intermediate files for inspection
SAVE_INTERMEDIATE_FILES = True
OUTPUT_FOLDER = "generated_files"

# Manual mapping (if AUTO_EXTRACT_ANNOTATOR_NAMES = False)
ANNOTATOR_MAPPING = {
    "VAC_R10-joao.csv": {"name": "João Silva", "email": "joao@research.pt"},
    "VAC_R10-zuil.csv": {"name": "Zuil Santos", "email": "zuil@research.pt"}
}

# =============================================================================

import os
import sys
import io
import time
import pandas as pd
import requests
import click
from collections import defaultdict
from typing import Dict, List, Tuple, Optional
from urllib.parse import urljoin


class BatchAnnotatedChatroomImporter:
    def __init__(self, api_base_url: str, admin_email: str, admin_password: str):
        self.api_base_url = api_base_url
        self.admin_email = admin_email
        self.admin_password = admin_password
        self.access_token = None
        self.session = requests.Session()
    
    def check_backend_health(self) -> None:
        try:
            health_url = urljoin(self.api_base_url, "/")
            response = self.session.get(health_url, timeout=5)
            
            if response.status_code == 200:
                click.echo(f"✅ Backend running at {self.api_base_url}")
            else:
                raise RuntimeError(f"Backend responded with status {response.status_code}")
                
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to backend. Is it running?")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Backend not responding (timeout)")
        except Exception as e:
            raise RuntimeError(f"❌ Backend health check failed: {str(e)}")

    def authenticate(self) -> None:
        login_url = urljoin(self.api_base_url, "/auth/token")
        
        login_data = {
            "username": self.admin_email,
            "password": self.admin_password
        }
        
        try:
            response = self.session.post(login_url, data=login_data, timeout=10)
        except requests.exceptions.ConnectionError:
            raise RuntimeError(f"❌ Cannot connect to authentication endpoint")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Authentication request timed out")
        
        if response.status_code != 200:
            if response.status_code == 401:
                raise RuntimeError("❌ Authentication failed: Invalid admin credentials")
            else:
                raise RuntimeError(f"❌ Authentication failed (HTTP {response.status_code})")
        
        try:
            result = response.json()
            self.access_token = result["access_token"]
        except (KeyError, ValueError) as e:
            raise RuntimeError(f"❌ Invalid authentication response format: {e}")
        
        self.session.headers.update({"Authorization": f"Bearer {self.access_token}"})
        click.echo(f"✅ Authenticated as {self.admin_email}")
    
    def scan_csv_folder(self, folder_path: str) -> Dict[str, List[str]]:
        if not os.path.exists(folder_path):
            raise ValueError(f"Folder not found: {folder_path}")
        
        csv_files = [f for f in os.listdir(folder_path) if f.endswith('.csv')]
        
        if not csv_files:
            raise ValueError(f"No CSV files found in {folder_path}")
        
        # Group files by chatroom base name
        chatroom_groups = defaultdict(list)
        
        for csv_file in csv_files:
            # Extract base name (everything before last "-" or whole name if no "-")
            if '-' in csv_file:
                base_name = csv_file.rsplit('-', 1)[0]  # VAC_R10-joao.csv → VAC_R10
            else:
                base_name = os.path.splitext(csv_file)[0]  # single.csv → single
            
            chatroom_groups[base_name].append(csv_file)
        
        click.echo(f"📁 Found {len(csv_files)} CSV files in {folder_path}")
        click.echo(f"📊 Grouped into {len(chatroom_groups)} chatrooms:")
        
        for base_name, files in chatroom_groups.items():
            click.echo(f"   {base_name}: {len(files)} annotators ({', '.join(files)})")
        
        return dict(chatroom_groups)
    
    def extract_annotator_info(self, filename: str) -> Tuple[str, str]:
        if AUTO_EXTRACT_ANNOTATOR_NAMES:
            if '-' in filename:
                # Extract annotator name from filename (VAC_R10-joao.csv → joao)
                annotator_name = os.path.splitext(filename)[0].split('-')[-1]
                annotator_email = f"{annotator_name}@{DEFAULT_EMAIL_DOMAIN}"
            else:
                # Use filename as annotator name
                annotator_name = os.path.splitext(filename)[0]
                annotator_email = f"{annotator_name}@{DEFAULT_EMAIL_DOMAIN}"
        else:
            # Use manual mapping
            if filename in ANNOTATOR_MAPPING:
                mapping = ANNOTATOR_MAPPING[filename]
                annotator_name = mapping["name"]
                annotator_email = mapping["email"]
            else:
                raise ValueError(f"No annotator mapping found for {filename}")
        
        return annotator_name, annotator_email
    
    def create_or_get_user(self, email: str, name: str) -> int:
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
            "password": "temp_password_123",
            "is_admin": False
        }
        
        response = self.session.post(users_url, json=create_user_data)
        
        if response.status_code not in [200, 201]:
            raise RuntimeError(f"Failed to create user: {response.text}")
        
        user_id = response.json()["id"]
        click.echo(f"✅ User created: {email} (ID: {user_id})")
        return user_id
    
    def assign_user_to_project(self, project_id: int, user_id: int) -> None:
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
            raise RuntimeError(f"❌ Project {project_id} or User {user_id} not found")
        elif response.status_code == 403:
            raise RuntimeError(f"❌ Permission denied for project assignment")
        else:
            click.echo(f"⚠️  Assignment response: HTTP {response.status_code} (may already exist)")
    
    def validate_chatroom_consistency(self, files: List[str], folder_path: str) -> Tuple[pd.DataFrame, str]:
        if not files:
            raise ValueError("No files provided for validation")
        
        # Read first file as reference
        reference_file = files[0]
        reference_path = os.path.join(folder_path, reference_file)
        
        try:
            ref_df = pd.read_csv(reference_path, delimiter=';')
        except Exception:
            try:
                ref_df = pd.read_csv(reference_path, delimiter=',')
            except Exception as e:
                raise ValueError(f"Failed to read reference file {reference_file}: {e}")
        
        # Validate all files have same message structure
        for file in files[1:]:
            file_path = os.path.join(folder_path, file)
            try:
                df = pd.read_csv(file_path, delimiter=';')
            except Exception:
                try:
                    df = pd.read_csv(file_path, delimiter=',')
                except Exception as e:
                    raise ValueError(f"Failed to read file {file}: {e}")
            
            # Check core message columns match
            core_columns = ['user_id', 'turn_id', 'turn_text', 'reply_to_turn']
            for col in core_columns:
                if not df[col].equals(ref_df[col]):
                    raise ValueError(f"File {file} has different messages than {reference_file}")
        
        click.echo(f"✅ All files have consistent message structure ({len(ref_df)} messages)")
        
        # Find thread column in reference file
        thread_column = self.detect_thread_column(ref_df)
        if not thread_column:
            raise ValueError(f"No thread column found in {reference_file}")
        
        return ref_df, thread_column
    
    def detect_thread_column(self, df: pd.DataFrame) -> Optional[str]:
        candidates = ['thread', 'thread_id', 'thread_column']
        
        # Add dynamic detection for Thread_* patterns
        for col in df.columns:
            if col.lower().startswith('thread'):
                candidates.append(col)
        
        for candidate in candidates:
            if candidate in df.columns:
                non_null_values = df[candidate].dropna()
                if len(non_null_values) > 0:
                    return candidate
        
        return None
    
    def prepare_chatroom_csv(self, df: pd.DataFrame) -> str:
        output = io.StringIO()
        
        # Write header
        output.write("turn_id,user_id,turn_text,reply_to_turn\n")
        
        # Write messages (core structure, no annotations)
        for _, row in df.iterrows():
            turn_id = str(row['turn_id']).strip()
            user_id = str(row['user_id']).strip()
            turn_text = str(row['turn_text']).strip().replace('"', '""')
            reply_to_turn = str(row['reply_to_turn']).strip() if pd.notna(row['reply_to_turn']) else ""
            
            output.write(f'"{turn_id}","{user_id}","{turn_text}","{reply_to_turn}"\n')
        
        return output.getvalue()
    
    def prepare_annotations_csv(self, df: pd.DataFrame, thread_column: str) -> Tuple[str, int]:
        output = io.StringIO()
        
        # Write header
        output.write("turn_id,thread\n")
        
        # Write annotations (only non-null thread values)
        annotation_count = 0
        for _, row in df.iterrows():
            if pd.notna(row[thread_column]) and str(row[thread_column]).strip():
                turn_id = str(row['turn_id']).strip()
                thread_id = str(row[thread_column]).strip()
                output.write(f'"{turn_id}","{thread_id}"\n')
                annotation_count += 1
        
        return output.getvalue(), annotation_count
    
    def save_intermediate_file(self, content: str, filename: str) -> str:
        """Save intermediate CSV content to file for inspection."""
        if not SAVE_INTERMEDIATE_FILES:
            return ""
        
        # Create output folder if it doesn't exist
        os.makedirs(OUTPUT_FOLDER, exist_ok=True)
        
        file_path = os.path.join(OUTPUT_FOLDER, filename)
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        click.echo(f"💾 Saved intermediate file: {file_path}")
        return file_path

    def import_chatroom(self, project_id: int, chatroom_name: str, df: pd.DataFrame) -> int:
        csv_content = self.prepare_chatroom_csv(df)
        
        # Save intermediate chatroom CSV
        safe_name = chatroom_name.replace(" - IAA Study", "").replace(" ", "_")
        chatroom_filename = f"{safe_name}_chatroom.csv"
        self.save_intermediate_file(csv_content, chatroom_filename)
        
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
            raise RuntimeError(f"❌ Lost connection during chatroom import")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Chatroom import timed out (30s)")
        
        if response.status_code not in [200, 201]:
            if response.status_code == 404:
                raise RuntimeError(f"❌ Project ID {project_id} not found")
            elif response.status_code == 403:
                raise RuntimeError(f"❌ Permission denied")
            else:
                raise RuntimeError(f"❌ Failed to import chatroom (HTTP {response.status_code})")
        
        try:
            result = response.json()
            chatroom_id = (
                result.get('chat_room_id') or 
                result.get('id') or 
                (result.get('chat_room', {}).get('id') if isinstance(result.get('chat_room'), dict) else None)
            )
            if not chatroom_id:
                raise RuntimeError(f"❌ Backend did not return chatroom ID")
        except ValueError as e:
            raise RuntimeError(f"❌ Invalid response format: {e}")
        
        click.echo(f"✅ Chatroom imported: \"{chatroom_name}\" (ID: {chatroom_id})")
        return chatroom_id
    
    def import_annotations(self, chatroom_id: int, user_id: int, df: pd.DataFrame, thread_column: str, annotator_name: str) -> int:
        csv_content, annotation_count = self.prepare_annotations_csv(df, thread_column)
        
        if annotation_count == 0:
            click.echo(f"⚠️  No annotations found for {annotator_name}")
            return 0
        
        # Save intermediate annotations CSV
        annotations_filename = f"{annotator_name}_annotations.csv"
        self.save_intermediate_file(csv_content, annotations_filename)
        
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
            raise RuntimeError(f"❌ Lost connection during annotations import")
        except requests.exceptions.Timeout:
            raise RuntimeError(f"❌ Annotations import timed out (30s)")
        
        if response.status_code not in [200, 201]:
            if response.status_code == 404:
                raise RuntimeError(f"❌ Chatroom {chatroom_id} or User {user_id} not found")
            elif response.status_code == 403:
                raise RuntimeError(f"❌ Permission denied for annotations import")
            else:
                raise RuntimeError(f"❌ Failed to import annotations (HTTP {response.status_code})")
        
        click.echo(f"✅ Annotations imported: {annotation_count} from {annotator_name}")
        return annotation_count
    
    def batch_import_chatrooms(self, folder_path: str, project_id: int) -> Dict:
        start_time = time.time()
        
        # Step 1: Scan and group files
        chatroom_groups = self.scan_csv_folder(folder_path)
        
        # Step 2: Backend health and auth
        click.echo("\n🔍 Checking backend connectivity...")
        self.check_backend_health()
        self.authenticate()
        
        # Step 3: Process each chatroom group
        results = {
            'chatrooms_created': 0,
            'total_annotations': 0,
            'total_annotators': 0,
            'chatrooms': []
        }
        
        for base_name, files in chatroom_groups.items():
            click.echo(f"\n📋 Processing chatroom group: {base_name}")
            click.echo(f"   Files: {', '.join(files)}")
            
            try:
                # Validate consistency
                ref_df, ref_thread_column = self.validate_chatroom_consistency(files, folder_path)
                
                # Create chatroom name
                chatroom_name = f"{base_name} - IAA Study"
                
                # Import chatroom (only once per group)
                chatroom_id = self.import_chatroom(project_id, chatroom_name, ref_df)
                
                # Process each annotator
                annotators_data = []
                group_annotations = 0
                
                for file in files:
                    click.echo(f"\n   👤 Processing annotator: {file}")
                    
                    # Extract annotator info
                    annotator_name, annotator_email = self.extract_annotator_info(file)
                    
                    # Create/get user and assign to project
                    user_id = self.create_or_get_user(annotator_email, annotator_name)
                    self.assign_user_to_project(project_id, user_id)
                    
                    # Read annotator's file
                    file_path = os.path.join(folder_path, file)
                    try:
                        df = pd.read_csv(file_path, delimiter=';')
                    except Exception:
                        df = pd.read_csv(file_path, delimiter=',')
                    
                    # Detect thread column for this annotator
                    thread_column = self.detect_thread_column(df)
                    if not thread_column:
                        click.echo(f"⚠️  No thread column found for {annotator_name}")
                        continue
                    
                    # Import annotations
                    annotation_count = self.import_annotations(
                        chatroom_id, user_id, df, thread_column, annotator_name
                    )
                    
                    annotators_data.append({
                        'name': annotator_name,
                        'email': annotator_email,
                        'user_id': user_id,
                        'annotations': annotation_count,
                        'thread_column': thread_column
                    })
                    
                    group_annotations += annotation_count
                
                # Record results
                chatroom_result = {
                    'base_name': base_name,
                    'chatroom_name': chatroom_name,
                    'chatroom_id': chatroom_id,
                    'files': files,
                    'messages': len(ref_df),
                    'annotators': annotators_data,
                    'total_annotations': group_annotations
                }
                
                results['chatrooms'].append(chatroom_result)
                results['chatrooms_created'] += 1
                results['total_annotations'] += group_annotations
                results['total_annotators'] += len(annotators_data)
                
                click.echo(f"✅ Group completed: {len(annotators_data)} annotators, {group_annotations} annotations")
                
            except Exception as e:
                click.echo(f"❌ Failed to process group {base_name}: {str(e)}")
                continue
        
        # Summary
        import_time = time.time() - start_time
        
        click.echo("\n🎯 Batch import completed!")
        click.echo(f"   Chatrooms created: {results['chatrooms_created']}")
        click.echo(f"   Total annotators: {results['total_annotators']}")
        click.echo(f"   Total annotations: {results['total_annotations']}")
        click.echo(f"   Import time: {import_time:.1f} seconds")
        
        click.echo(f"\n✨ Success! View in web interface:")
        click.echo(f"   {self.api_base_url.replace(':8000', ':3000')}/admin/projects/{project_id}")
        
        results['import_time'] = import_time
        return results


@click.command()
@click.option('--folder', default=ANNOTATED_CSVS_FOLDER, help=f'Folder containing CSV files (default: {ANNOTATED_CSVS_FOLDER})')
@click.option('--project-id', default=PROJECT_ID, type=int, help=f'Project ID (default: {PROJECT_ID})')
@click.option('--api-base-url', default=API_BASE_URL, help=f'API URL (default: {API_BASE_URL})')
@click.option('--admin-email', default=ADMIN_EMAIL, help=f'Admin email (default: {ADMIN_EMAIL})')
@click.option('--admin-password', default=ADMIN_PASSWORD, help=f'Admin password (default: {ADMIN_PASSWORD})')
@click.option('--dry-run', is_flag=True, help='Scan and validate only, no import')
@click.option('--generate-files', is_flag=True, help='Generate intermediate CSV files without importing')
def main(folder, project_id, api_base_url, admin_email, admin_password, dry_run, generate_files):
    """Batch import annotated chatrooms for IAA studies."""
    
    # Validate required parameters
    if not folder:
        raise click.ClickException("Folder path required")
    
    if not admin_email:
        raise click.ClickException("Admin email required")
    
    if not admin_password:
        raise click.ClickException("Admin password required")
    
    # Show configuration
    if dry_run:
        mode = "🧪 DRY RUN - "
    elif generate_files:
        mode = "📁 GENERATE FILES - "
    else:
        mode = "🚀 "
    
    click.echo(f"{mode}Starting batch import...")
    click.echo(f"   Folder: {folder}")
    click.echo(f"   Project ID: {project_id}")
    click.echo(f"   API URL: {api_base_url}")
    click.echo(f"   Auto-extract names: {AUTO_EXTRACT_ANNOTATOR_NAMES}")
    if dry_run:
        click.echo("   Mode: DRY RUN (scan only)")
    elif generate_files:
        click.echo("   Mode: GENERATE FILES (create intermediate CSVs)")
    click.echo()
    
    try:
        importer = BatchAnnotatedChatroomImporter(api_base_url, admin_email, admin_password)
        
        if dry_run:
            # Dry run: scan and validate only
            chatroom_groups = importer.scan_csv_folder(folder)
            
            click.echo("\n🧪 Dry run analysis:")
            for base_name, files in chatroom_groups.items():
                click.echo(f"\n📋 Chatroom: {base_name}")
                
                try:
                    ref_df, ref_thread_column = importer.validate_chatroom_consistency(files, folder)
                    click.echo(f"   ✅ Consistent: {len(ref_df)} messages")
                    
                    for file in files:
                        annotator_name, annotator_email = importer.extract_annotator_info(file)
                        click.echo(f"   👤 {annotator_name} ({annotator_email})")
                        
                        # Count annotations
                        file_path = os.path.join(folder, file)
                        try:
                            df = pd.read_csv(file_path, delimiter=';')
                        except Exception:
                            df = pd.read_csv(file_path, delimiter=',')
                        
                        thread_column = importer.detect_thread_column(df)
                        if thread_column:
                            annotation_count = df[thread_column].dropna().count()
                            click.echo(f"      📝 {annotation_count} annotations ({thread_column})")
                        else:
                            click.echo(f"      ⚠️  No thread column found")
                
                except Exception as e:
                    click.echo(f"   ❌ Validation failed: {e}")
            
            click.echo("\n🧪 Dry run completed! Ready for import.")
            click.echo("   Remove --dry-run to actually import")
        
        elif generate_files:
            # Generate intermediate files without importing
            chatroom_groups = importer.scan_csv_folder(folder)
            
            click.echo("\n📁 Generating intermediate CSV files...")
            
            for base_name, files in chatroom_groups.items():
                click.echo(f"\n📋 Processing chatroom group: {base_name}")
                
                try:
                    # Validate consistency
                    ref_df, ref_thread_column = importer.validate_chatroom_consistency(files, folder)
                    
                    # Generate chatroom CSV
                    chatroom_name = f"{base_name} - IAA Study"
                    csv_content = importer.prepare_chatroom_csv(ref_df)
                    safe_name = base_name.replace(" ", "_")
                    chatroom_filename = f"{safe_name}_chatroom.csv"
                    importer.save_intermediate_file(csv_content, chatroom_filename)
                    
                    # Generate annotations CSVs for each annotator
                    for file in files:
                        annotator_name, annotator_email = importer.extract_annotator_info(file)
                        
                        # Read annotator's file
                        file_path = os.path.join(folder, file)
                        try:
                            df = pd.read_csv(file_path, delimiter=';')
                        except Exception:
                            df = pd.read_csv(file_path, delimiter=',')
                        
                        # Detect thread column for this annotator
                        thread_column = importer.detect_thread_column(df)
                        if thread_column:
                            csv_content, annotation_count = importer.prepare_annotations_csv(df, thread_column)
                            annotations_filename = f"{annotator_name}_annotations.csv"
                            importer.save_intermediate_file(csv_content, annotations_filename)
                            click.echo(f"   📝 Generated {annotation_count} annotations for {annotator_name}")
                        else:
                            click.echo(f"   ⚠️  No thread column found for {annotator_name}")
                
                except Exception as e:
                    click.echo(f"   ❌ Failed to generate files for {base_name}: {e}")
            
            click.echo("\n📁 File generation completed!")
            click.echo(f"   Check the '{OUTPUT_FOLDER}' folder for generated CSV files")
        
        else:
            # Normal batch import
            results = importer.batch_import_chatrooms(folder, project_id)
        
    except Exception as e:
        if dry_run:
            operation = "Analysis"
        elif generate_files:
            operation = "File generation"
        else:
            operation = "Import"
        click.echo(f"\n❌ {operation} failed: {str(e)}", err=True)
        sys.exit(1)


if __name__ == '__main__':
    main()
