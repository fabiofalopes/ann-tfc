#!/usr/bin/env python3
"""
Script to generate Postman collection from FastAPI OpenAPI JSON
"""
import json
import requests
from datetime import datetime

def generate_postman_collection():
    # Get OpenAPI spec from running FastAPI app
    try:
        response = requests.get('http://localhost:8000/openapi.json')
        response.raise_for_status()
        openapi_spec = response.json()
    except requests.RequestException as e:
        print(f"Error fetching OpenAPI spec: {e}")
        return None
    
    # Create Postman collection structure
    collection = {
        "info": {
            "name": "Annotation API",
            "description": openapi_spec.get("description", "Backend for the annotation system"),
            "version": openapi_spec.get("version", "1.0.0"),
            "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
        },
        "item": [],
        "variable": [
            {
                "key": "baseUrl",
                "value": "http://localhost:8000",
                "type": "string"
            }
        ]
    }
    
    # Process each path and method
    for path, path_item in openapi_spec.get("paths", {}).items():
        for method, operation in path_item.items():
            if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                # Create request item
                request_item = {
                    "name": operation.get("summary", f"{method.upper()} {path}"),
                    "request": {
                        "method": method.upper(),
                        "header": [],
                        "url": {
                            "raw": "{{baseUrl}}" + path,
                            "host": ["{{baseUrl}}"],
                            "path": path.strip("/").split("/") if path != "/" else []
                        }
                    },
                    "response": []
                }
                
                # Add description if available
                if operation.get("description"):
                    request_item["request"]["description"] = operation["description"]
                
                # Add authentication header for protected endpoints
                if "security" in operation:
                    request_item["request"]["header"].append({
                        "key": "Authorization",
                        "value": "Bearer {{access_token}}",
                        "type": "text"
                    })
                
                # Add Content-Type header for POST/PUT requests
                if method.upper() in ['POST', 'PUT', 'PATCH']:
                    request_item["request"]["header"].append({
                        "key": "Content-Type",
                        "value": "application/json",
                        "type": "text"
                    })
                
                # Add request body for POST/PUT requests
                if method.upper() in ['POST', 'PUT', 'PATCH'] and "requestBody" in operation:
                    request_body = operation["requestBody"]
                    if "application/json" in request_body.get("content", {}):
                        schema = request_body["content"]["application/json"].get("schema", {})
                        # Create a simple example body
                        request_item["request"]["body"] = {
                            "mode": "raw",
                            "raw": json.dumps(create_example_from_schema(schema), indent=2)
                        }
                
                # Add query parameters
                if "parameters" in operation:
                    query_params = []
                    for param in operation["parameters"]:
                        if param.get("in") == "query":
                            query_params.append({
                                "key": param["name"],
                                "value": "",
                                "description": param.get("description", "")
                            })
                    if query_params:
                        request_item["request"]["url"]["query"] = query_params
                
                # Group by tags
                tags = operation.get("tags", ["Default"])
                tag = tags[0] if tags else "Default"
                
                # Find or create folder for this tag
                folder = None
                for item in collection["item"]:
                    if item.get("name") == tag.title():
                        folder = item
                        break
                
                if not folder:
                    folder = {
                        "name": tag.title(),
                        "item": []
                    }
                    collection["item"].append(folder)
                
                folder["item"].append(request_item)
    
    return collection

def create_example_from_schema(schema):
    """Create a simple example object from JSON schema"""
    if not isinstance(schema, dict):
        return {}
    
    if schema.get("type") == "object":
        example = {}
        properties = schema.get("properties", {})
        for prop_name, prop_schema in properties.items():
            if prop_schema.get("type") == "string":
                example[prop_name] = f"example_{prop_name}"
            elif prop_schema.get("type") == "integer":
                example[prop_name] = 1
            elif prop_schema.get("type") == "boolean":
                example[prop_name] = True
            elif prop_schema.get("type") == "array":
                example[prop_name] = []
            else:
                example[prop_name] = None
        return example
    
    return {}

if __name__ == "__main__":
    print("Generating Postman collection from FastAPI app...")
    collection = generate_postman_collection()
    
    if collection:
        # Save to file
        filename = "annotation_api_postman_collection.json"
        with open(filename, 'w') as f:
            json.dump(collection, f, indent=2)
        
        print(f"✅ Postman collection generated successfully: {filename}")
        print(f"📊 Collection contains {len(collection['item'])} folders with endpoints")
        
        # Print summary
        total_requests = 0
        for folder in collection['item']:
            folder_requests = len(folder.get('item', []))
            total_requests += folder_requests
            print(f"   - {folder['name']}: {folder_requests} endpoints")
        
        print(f"🚀 Total endpoints: {total_requests}")
        print("\n📝 To use this collection:")
        print("1. Open Postman")
        print("2. Click 'Import' button")
        print(f"3. Select the file: {filename}")
        print("4. Set the 'access_token' variable for authenticated endpoints")
        
    else:
        print("❌ Failed to generate Postman collection") 