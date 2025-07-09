#!/usr/bin/env python3
"""
Enhanced Excel Annotations Import Tool

Features:
- Interactive project selection/creation
- Smart configuration management
- Automatic user management
- Complete data import flow
- Beautiful progress indicators
- Custom folder path support via command-line arguments

Usage: 
    python import_excel.py                          # Use default paths
    python import_excel.py --folder ../uploads/Archive  # Use custom folder
    python import_excel.py --help                  # Show help
"""

import os
import sys
import logging
import argparse
from pathlib import Path
from typing import Dict, Any, Optional, List
from datetime import datetime

# Add the excel_import package to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from excel_import import (
    ExcelChatRoomParser,
    ChatRoomDataTransformer,
    AnnotationAPIClient,
    BatchExcelImportManager
)
from excel_import.api_client import APIError


def setup_logging(level: str = "INFO"):
    """Set up clean logging."""
    logging.basicConfig(
        level=getattr(logging, level.upper()),
        format="%(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )


def print_banner():
    """Print a nice banner."""
    print()
    print("╔═══════════════════════════════════════════════════════════════════╗")
    print("║                    Excel Annotations Import Tool                  ║")
    print("║                                                                   ║")
    print("║  Imports Excel files with chat room annotations into the system  ║")
    print("╚═══════════════════════════════════════════════════════════════════╝")
    print()





def find_excel_files(custom_folder: Optional[str] = None) -> List[str]:
    """Find Excel files in specified folder or common locations."""
    if custom_folder:
        # Use the custom folder specified by user
        search_paths = [custom_folder]
        print(f"🎯 Searching for Excel files in specified folder: {custom_folder}")
    else:
        # Use default search paths
        search_paths = [
            "../uploads/Archive/",
            "../uploads/",
            "./excel_files/",
            "./"
        ]
        print("🔍 Searching for Excel files in default locations...")
    
    excel_files = []
    for path in search_paths:
        path_obj = Path(path)
        if path_obj.exists():
            files = list(path_obj.glob("*.xlsx"))
            if files:
                excel_files.extend([str(f) for f in files])
                print(f"📁 Found {len(files)} Excel files in {path}")
                for file in files:
                    print(f"   - {file.name}")
                break
        else:
            if custom_folder:
                print(f"❌ Specified folder does not exist: {path}")
    
    return excel_files


def load_config(file_path: str = "config.yaml") -> Optional[Dict[str, Any]]:
    """Load configuration from YAML file."""
    try:
        import yaml
        with open(file_path, 'r', encoding='utf-8') as f:
            return yaml.safe_load(f)
    except FileNotFoundError:
        return None
    except ImportError:
        print("❌ PyYAML not installed. Please run: pip install pyyaml")
        return None
    except Exception as e:
        print(f"❌ Error reading config: {e}")
        return None


def save_config(config: Dict[str, Any], file_path: str = "config.yaml"):
    """Save configuration to YAML file."""
    try:
        import yaml
        with open(file_path, 'w', encoding='utf-8') as f:
            yaml.dump(config, f, default_flow_style=False, indent=2)
        return True
    except ImportError:
        print("❌ PyYAML not installed. Please run: pip install pyyaml")
        return False
    except Exception as e:
        print(f"❌ Error saving config: {e}")
        return False


def create_initial_config() -> Dict[str, Any]:
    """Create initial configuration through user input."""
    print("🔧 INITIAL SETUP")
    print("=" * 50)
    print("Let's set up your configuration...")
    print()
    
    # Get API details
    print("📡 API Configuration:")
    api_url = input("  API URL [http://localhost:8000]: ").strip() or "http://localhost:8000"
    admin_email = input("  Admin email [admin@example.com]: ").strip() or "admin@example.com"
    admin_password = input("  Admin password [admin123]: ").strip() or "admin123"
    
    print("\n📋 Import Configuration:")
    email_domain = input("  Email domain for users [research.pt]: ").strip() or "research.pt"
    
    config = {
        "api": {
            "base_url": api_url,
            "admin_email": admin_email,
            "admin_password": admin_password
        },
        "project": {
            "mode": "select_existing",
            "project_id": 1,
            "new_project": {
                "name": "Excel Import Project",
                "description": "Project created from Excel import tool"
            },
            "last_used_project_id": None
        },
        "import": {
            "email_domain": email_domain,
            "default_user_password": "ChangeMe123!",
            "auto_confirm": False
        }
    }
    
    if save_config(config):
        print("\n✅ Configuration saved to config.yaml")
        print("You can edit this file anytime to change settings.")
        return config
    else:
        return None


def display_project_menu(projects: List[Dict[str, Any]], config: Dict[str, Any]) -> int:
    """Display project selection menu and get user choice."""
    print("\n📋 PROJECT SELECTION")
    print("=" * 50)
    
    # Show last used project if available
    last_used = config.get("project", {}).get("last_used_project_id")
    if last_used:
        for project in projects:
            if project["id"] == last_used:
                print(f"🔄 Last used: {project['name']} (ID: {project['id']})")
                break
    
    print("\nAvailable projects:")
    for i, project in enumerate(projects, 1):
        status = "✅ Active" if project.get("is_active", True) else "❌ Inactive"
        print(f"  {i}. {project['name']} (ID: {project['id']}) - {status}")
        if project.get("description"):
            print(f"     Description: {project['description']}")
    
    print(f"\n  {len(projects) + 1}. Create new project")
    print(f"  0. Use last used project (ID: {last_used})" if last_used else "  0. Exit")
    
    while True:
        try:
            choice = input(f"\nSelect option [0-{len(projects) + 1}]: ").strip()
            
            if choice == "0":
                if last_used:
                    return last_used
                else:
                    return None
            
            choice_num = int(choice)
            if 1 <= choice_num <= len(projects):
                selected_project = projects[choice_num - 1]
                return selected_project["id"]
            elif choice_num == len(projects) + 1:
                return "create_new"
            else:
                print("❌ Invalid choice. Please try again.")
                
        except ValueError:
            print("❌ Please enter a valid number.")


def create_new_project(api_client: AnnotationAPIClient, config: Dict[str, Any]) -> Optional[int]:
    """Create a new project with user input."""
    print("\n🆕 CREATE NEW PROJECT")
    print("=" * 50)
    
    # Use configured default name
    default_name = config.get("project", {}).get("new_project", {}).get("name", "Excel Import Project")
    default_desc = config.get("project", {}).get("new_project", {}).get("description", f"Project created from Excel import - {datetime.now().strftime('%Y-%m-%d')}")
    
    name = input(f"Project name [{default_name}]: ").strip() or default_name
    description = input(f"Project description [{default_desc}]: ").strip() or default_desc
    
    try:
        print(f"\n🔨 Creating project '{name}'...")
        project = api_client.create_project(name, description)
        project_id = project["id"]
        
        print(f"✅ Project created successfully!")
        print(f"   Name: {project['name']}")
        print(f"   ID: {project_id}")
        print(f"   Description: {project.get('description', 'No description')}")
        
        return project_id
        
    except APIError as e:
        print(f"❌ Failed to create project: {e}")
        print("\n🔍 Debugging information:")
        print(f"   Project name: {name}")
        print(f"   Project description: {description}")
        print(f"   API endpoint: {api_client.base_url}/admin/projects")
        print("   Please check backend logs for more details.")
        return None


def manage_project_selection(api_client: AnnotationAPIClient, config: Dict[str, Any], excel_files: List[str] = None) -> Optional[int]:
    """Handle project selection/creation based on config and user input."""
    mode = config.get("project", {}).get("mode", "select_existing")
    
    if mode == "use_id":
        # Use specific project ID from config
        project_id = config.get("project", {}).get("project_id", 1)
        print(f"🎯 Using configured project ID: {project_id}")
        
        try:
            project = api_client.get_project(project_id)
            print(f"✅ Project found: {project['name']}")
            return project_id
        except APIError as e:
            print(f"❌ Cannot access project {project_id}: {e}")
            print("Falling back to project selection...")
            mode = "select_existing"
    
    if mode == "create_new":
        # Create new project with config details
        project_config = config.get("project", {}).get("new_project", {})
        name = project_config.get("name", "Excel Import Project")
        description = project_config.get("description", f"Project created from Excel import - {datetime.now().strftime('%Y-%m-%d')}")
        
        print(f"🆕 Creating new project: {name}")
        try:
            project = api_client.create_project(name, description)
            project_id = project["id"]
            print(f"✅ Project created: {project['name']} (ID: {project_id})")
            return project_id
        except APIError as e:
            print(f"❌ Failed to create project: {e}")
            print("\n💡 Possible causes:")
            print("   • Backend server is not running")
            print("   • Database connection issues")
            print("   • Admin authentication problems")
            print("   • Duplicate project name")
            print("\nFalling back to project selection...")
            mode = "select_existing"
    
    # Default: select from existing projects
    try:
        print("🔍 Fetching available projects...")
        projects = api_client.get_projects()
        
        if not projects:
            print("❌ No projects found in database.")
            print("🔨 Attempting to create a default project...")
            try:
                project = api_client.create_default_project()
                print(f"✅ Default project created: {project['name']} (ID: {project['id']})")
                return project["id"]
            except APIError as e:
                print(f"❌ Failed to create default project: {e}")
                print("\n🚨 CRITICAL ERROR: Cannot create projects!")
                print("   Please ensure:")
                print("   1. Backend is running (check http://localhost:8000)")
                print("   2. Database is accessible")
                print("   3. Admin credentials are correct")
                print("   4. Admin user has project creation permissions")
                return None
        
        project_id = display_project_menu(projects, config)
        
        if project_id == "create_new":
            return create_new_project(api_client, config)
        elif project_id:
            return project_id
        else:
            return None
            
    except APIError as e:
        print(f"❌ Error fetching projects: {e}")
        print("\n🔍 Debugging information:")
        print(f"   API URL: {api_client.base_url}")
        print(f"   Admin email: {api_client.admin_email}")
        print("   Endpoint: /admin/projects")
        print("\n💡 Please verify:")
        print("   • Backend server is running")
        print("   • Admin credentials are correct")
        print("   • Network connectivity to API")
        return None


def update_config_with_project(config: Dict[str, Any], project_id: int) -> Dict[str, Any]:
    """Update configuration with the selected project."""
    if "project" not in config:
        config["project"] = {}
    
    config["project"]["last_used_project_id"] = project_id
    return config


def preview_import_data(excel_files: List[str]) -> Dict[str, Any]:
    """Preview what will be imported."""
    print("\n📋 IMPORT PREVIEW")
    print("=" * 50)
    
    total_annotators = set()
    total_messages = 0
    total_annotations = 0
    file_summaries = []
    
    for file_path in excel_files:
        try:
            parser = ExcelChatRoomParser(file_path)
            summary = parser.get_summary()
            
            if "error" not in summary:
                print(f"📄 {Path(file_path).name}")
                print(f"   Annotators: {', '.join(summary['annotators'])}")
                print(f"   Messages: {summary['total_messages']}")
                print(f"   Annotations: {summary['total_annotations']}")
                print(f"   Consistent: {'✅' if summary['is_consistent'] else '❌'}")
                print()
                
                total_annotators.update(summary['annotators'])
                total_messages += summary['total_messages']
                total_annotations += summary['total_annotations']
                file_summaries.append(summary)
            else:
                print(f"❌ Error parsing {Path(file_path).name}: {summary['error']}")
                
        except Exception as e:
            print(f"❌ Error parsing {Path(file_path).name}: {e}")
    
    print(f"📊 TOTAL SUMMARY:")
    print(f"   Files: {len(file_summaries)}")
    print(f"   Unique annotators: {len(total_annotators)}")
    print(f"   Total messages: {total_messages}")
    print(f"   Total annotations: {total_annotations}")
    print(f"   Annotators: {', '.join(sorted(total_annotators))}")
    
    return {
        "files": file_summaries,
        "annotators": list(total_annotators),
        "total_messages": total_messages,
        "total_annotations": total_annotations
    }


def confirm_import(config: Dict[str, Any]) -> bool:
    """Ask user to confirm the import."""
    if config.get("import", {}).get("auto_confirm", False):
        return True
    
    print("\n❓ CONFIRMATION")
    print("=" * 50)
    response = input("Do you want to proceed with the import? [y/N]: ").strip().lower()
    return response in ['y', 'yes']


def perform_import(api_client: AnnotationAPIClient, excel_files: List[str], project_id: int, config: Dict[str, Any]) -> bool:
    """Perform the actual import."""
    print(f"\n🚀 IMPORTING TO PROJECT {project_id}")
    print("=" * 50)
    
    try:
        # Initialize the data transformer
        transformer = ChatRoomDataTransformer(
            default_email_domain=config.get("import", {}).get("email_domain", "research.pt")
        )
        
        # Initialize the batch import manager
        batch_manager = BatchExcelImportManager(
            api_client=api_client,
            transformer=transformer,
            project_id=project_id,
            skip_existing=False  # Don't skip files, user already confirmed
        )
        
        # Run the import using the correct method
        results = batch_manager.process_file_list(excel_files, show_progress=True)
        
        # Display additional results summary
        print(f"\n📊 DETAILED IMPORT RESULTS")
        print("=" * 50)
        
        for result in results.results:
            filename = Path(result.file_path).name
            if result.status == "success":
                print(f"✅ {filename}")
                if result.chat_room_id:
                    print(f"   Chat room ID: {result.chat_room_id}")
                if result.chat_room_name:
                    print(f"   Chat room: {result.chat_room_name}")
                if result.users_created:
                    print(f"   Users created: {len(result.users_created)}")
                print(f"   Messages: {result.total_messages}")
                print(f"   Annotations: {result.total_annotations}")
                if result.details.get("annotators"):
                    print(f"   Annotators: {', '.join(result.details['annotators'])}")
            else:
                print(f"❌ {filename}")
                if result.error_message:
                    print(f"   Error: {result.error_message}")
            print()
        
        return results.successful_imports > 0
        
    except Exception as e:
        print(f"❌ Import failed: {e}")
        import traceback
        traceback.print_exc()
        return False


def parse_arguments():
    """Parse command-line arguments."""
    parser = argparse.ArgumentParser(
        description="Excel Annotations Import Tool",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python import_excel.py                          # Use default search paths
  python import_excel.py --folder ../uploads/Archive  # Import from specific folder
  python import_excel.py --folder /path/to/excel/files  # Use absolute path
        """
    )
    
    parser.add_argument(
        "--folder", "-f",
        type=str,
        help="Specify a custom folder path containing Excel files to import"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Enable verbose logging for debugging"
    )
    
    return parser.parse_args()


def main():
    """Main function."""
    # Parse command-line arguments
    args = parse_arguments()
    
    print_banner()
    
    # Set up logging
    log_level = "DEBUG" if args.verbose else "INFO"
    setup_logging(log_level)
    
    # Load configuration
    config = load_config()
    if not config:
        print("📄 No configuration file found. Let's create one...")
        config = create_initial_config()
        if not config:
            print("❌ Failed to create configuration. Exiting.")
            return 1
    
    # Find Excel files with optional custom folder
    excel_files = find_excel_files(args.folder)
    if not excel_files:
        print("❌ No Excel files found!")
        if args.folder:
            print(f"   No .xlsx files found in: {args.folder}")
            print("   Please check the folder path and ensure it contains Excel files.")
        else:
            print("   Please place Excel files in one of these locations:")
            print("   - ../uploads/Archive/")
            print("   - ../uploads/")
            print("   - ./excel_files/")
            print("   - Current directory")
            print("   Or use --folder to specify a custom path.")
        return 1
    
    # Test API connection
    print("🔗 Testing API connection...")
    try:
        api_client = AnnotationAPIClient(
            base_url=config["api"]["base_url"],
            admin_email=config["api"]["admin_email"],
            admin_password=config["api"]["admin_password"]
        )
        
        api_client.check_health()
        api_client.authenticate()
        print("✅ API connection successful")
        
    except APIError as e:
        print(f"❌ API connection failed: {e}")
        print("\n💡 Common fixes:")
        print("   • Make sure the backend is running")
        print("   • Check the API URL in config.yaml")
        print("   • Verify admin credentials")
        return 1
    
    # Handle project selection
    project_id = manage_project_selection(api_client, config, excel_files)
    if not project_id:
        print("❌ No project selected. Exiting.")
        return 1
    
    # Update config with selected project
    config = update_config_with_project(config, project_id)
    save_config(config)
    
    # Preview import data
    preview_data = preview_import_data(excel_files)
    
    # Confirm import
    if not confirm_import(config):
        print("❌ Import cancelled by user.")
        return 1
    
    # Perform the import
    success = perform_import(api_client, excel_files, project_id, config)
    
    if success:
        print("\n🎉 Import completed successfully!")
        print(f"   Project ID: {project_id}")
        print(f"   Files processed: {len(excel_files)}")
        return 0
    else:
        print("\n❌ Import failed!")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 