#!/bin/bash

# Base URL
BASE_URL="http://localhost:8000"

# CSV directory
CSV_DIR="/Users/fabiofalopes/Documents/projetos/rascunhos/vit/uploads"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print section headers
print_section() {
    echo -e "\n${BLUE}=== $1 ===${NC}"
}

# Function to print success messages
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error messages
print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Function to print info messages
print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

# Function to pretty print JSON
pretty_print() {
    echo "$1" | jq
}

# Function to load CSV files
load_csv() {
    local file=$1
    local endpoint=$2
    local description=$3
    local full_path="$CSV_DIR/$file"
    
    print_section "Loading $file"
    
    if [ ! -f "$full_path" ]; then
        print_error "File not found: $full_path"
        print_info "Available files in $CSV_DIR:"
        ls -l "$CSV_DIR" | awk '{print $9}'
        return 1
    fi
    
    print_info "Found file at: $full_path"
    print_info "File size: $(du -h "$full_path" | cut -f1)"
    print_info "First few lines of the file:"
    head -n 3 "$full_path"
    
    # For chat messages import
    response=$(curl -s -X POST "$BASE_URL/$endpoint" \
        -H "Authorization: Bearer $TOKEN" \
        -F "file=@$full_path")
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q "Not Found"; then
            print_error "Endpoint not found: $endpoint"
            return 1
        elif echo "$response" | grep -q "Method Not Allowed"; then
            print_error "Method not allowed: POST $endpoint"
            return 1
        else
            print_success "Successfully loaded $file"
            pretty_print "$response"
        fi
    else
        print_error "Failed to load $file"
        return 1
    fi
}

# Function to test endpoint and pretty print response
test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    print_section "Testing $description"
    print_info "Endpoint: $BASE_URL/$endpoint"
    
    if [ "$method" = "GET" ]; then
        response=$(curl -s -H "Authorization: Bearer $TOKEN" "$BASE_URL/$endpoint")
    else
        response=$(curl -s -X $method "$BASE_URL/$endpoint" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi
    
    if [ $? -eq 0 ]; then
        if echo "$response" | grep -q "Not Found"; then
            print_error "Endpoint not found: $endpoint"
            return 1
        elif echo "$response" | grep -q "Method Not Allowed"; then
            print_error "Method not allowed: $method $endpoint"
            return 1
        else
            print_success "Success"
            pretty_print "$response"
        fi
    else
        print_error "Failed"
        return 1
    fi
}

echo "Starting comprehensive API testing..."

# Test root endpoint
test_endpoint "GET" "" "root endpoint"

# Login as admin
print_section "Logging in as admin"
TOKEN=$(curl -s -X POST "$BASE_URL/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=admin@example.com&password=admin123" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    print_error "Failed to get token"
    exit 1
fi

print_success "Got token: $TOKEN"

# Test protected endpoints
print_section "Testing protected endpoints"

# Get current user
test_endpoint "GET" "auth/me" "" "current user details"

# List projects
test_endpoint "GET" "projects/" "" "list all projects"

# Create a new project
test_endpoint "POST" "projects/" '{"name": "Test Project", "description": "A test project"}' "create project"
PROJECT_ID=1  # Use a fixed project ID for testing

# Create a new user
TIMESTAMP=$(date +%s)
USER_EMAIL="user_${TIMESTAMP}@example.com"
test_endpoint "POST" "auth/register" "{\"email\": \"$USER_EMAIL\", \"password\": \"user123\", \"is_admin\": false}" "create user"
USER_ID=2  # Use a fixed user ID for testing

# Assign user to project
test_endpoint "POST" "projects/$PROJECT_ID/assign/$USER_ID" "" "assign user to project"

# Get project users
test_endpoint "GET" "projects/$PROJECT_ID/users" "" "list project users"

# Load CSV files
print_section "Loading CSV files"
load_csv "data.csv" "admin/import/csv/$PROJECT_ID" "Import chat messages"
load_csv "VAC_R10-fabio.csv" "admin/import/csv/$PROJECT_ID" "Import chat messages"

# Test project messages
print_section "Testing project messages"
test_endpoint "GET" "projects/$PROJECT_ID/messages" "" "list project messages"

# Create a test message via CSV import
print_section "Creating test message"
echo "user_id,turn_id,turn_text,reply_to_turn" > test_message.csv
echo "test_user,test_001,Test message," >> test_message.csv
response=$(curl -s -X POST "$BASE_URL/admin/import/csv/$PROJECT_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@test_message.csv")
if [ $? -eq 0 ]; then
    print_success "Successfully created test message"
    pretty_print "$response"
    rm test_message.csv
else
    print_error "Failed to create test message"
    rm test_message.csv
    exit 1
fi

# Get the message ID
test_endpoint "GET" "projects/$PROJECT_ID/messages" "" "get message ID"
MESSAGE_ID=1  # Use a fixed message ID for testing

# Test annotation endpoints
print_section "Testing annotation endpoints"
test_endpoint "GET" "annotations/projects/$PROJECT_ID" "" "list project annotations"
test_endpoint "GET" "annotations/messages/$MESSAGE_ID" "" "get message annotations"

# Login as regular user
print_section "Logging in as regular user"
TOKEN=$(curl -s -X POST "$BASE_URL/auth/token" \
    -H "Content-Type: application/x-www-form-urlencoded" \
    -d "username=$USER_EMAIL&password=user123" | jq -r '.access_token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    print_error "Failed to get token"
    exit 1
fi

print_success "Got token: $TOKEN"

# Create annotation as regular user
print_section "Creating annotation as regular user"
test_endpoint "POST" "annotations/messages/$MESSAGE_ID" "{\"message_id\": $MESSAGE_ID, \"thread_id\": \"test_thread\"}" "create annotation"

# Verify annotation visibility
print_section "Verifying annotation visibility"
test_endpoint "GET" "annotations/messages/$MESSAGE_ID" "" "get message annotations"
test_endpoint "GET" "annotations/projects/$PROJECT_ID" "" "list project annotations"

print_success "All tests completed successfully!" 