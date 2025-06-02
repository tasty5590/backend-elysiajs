#!/bin/bash

# Complete Authentication Test Script
# This script tests the full authentication flow with protected endpoints

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"
AUTH_URL="$BASE_URL/auth"

echo "🧪 Complete Authentication Flow Test"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

# Test 1: Health Check
echo ""
print_info "1. Testing health endpoints..."
curl -s "$BASE_URL/health" | jq '.' || print_error "Health check failed"

# Test 2: Register new user
echo ""
print_info "2. Registering new user..."

# Generate unique email with timestamp
TIMESTAMP=$(date +%s)
UNIQUE_EMAIL="complete${TIMESTAMP}@test.com"

REGISTER_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-up" \
  -H "Content-Type: application/json" \
  -d "{
    \"name\": \"Complete Test User\",
    \"email\": \"$UNIQUE_EMAIL\",
    \"password\": \"securepassword123\"
  }")

echo $REGISTER_RESPONSE | jq '.'

if echo $REGISTER_RESPONSE | jq -e '.user' > /dev/null; then
    print_status "User registration successful"
else
    print_error "User registration failed"
    exit 1
fi

# Test 3: Sign in
echo ""
print_info "3. Signing in..."
SIGNIN_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-in" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$UNIQUE_EMAIL\",
    \"password\": \"securepassword123\"
  }")

echo $SIGNIN_RESPONSE | jq '.'

TOKEN=$(echo $SIGNIN_RESPONSE | jq -r '.token')
if [ "$TOKEN" != "null" ] && [ "$TOKEN" != "" ]; then
    print_status "Sign in successful, token: $TOKEN"
else
    print_error "Sign in failed"
    exit 1
fi

# Test 4: Access protected profile
echo ""
print_info "4. Accessing protected profile..."
PROFILE_RESPONSE=$(curl -s -X GET "$API_URL/profile" \
  -H "Authorization: Bearer $TOKEN")

echo $PROFILE_RESPONSE | jq '.'

if echo $PROFILE_RESPONSE | jq -e '.user' > /dev/null; then
    print_status "Protected profile access successful"
else
    print_error "Protected profile access failed"
fi

# Test 5: Update profile
echo ""
print_info "5. Updating user profile..."
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/profile" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Complete Test User"
  }')

echo $UPDATE_RESPONSE | jq '.'

if echo $UPDATE_RESPONSE | jq -e '.user.name' | grep -q "Updated"; then
    print_status "Profile update successful"
else
    print_error "Profile update failed"
fi

# Test 6: Get user sessions
echo ""
print_info "6. Getting user sessions..."
SESSIONS_RESPONSE=$(curl -s -X GET "$API_URL/sessions" \
  -H "Authorization: Bearer $TOKEN")

echo $SESSIONS_RESPONSE | jq '.'

if echo $SESSIONS_RESPONSE | jq -e '.sessions' > /dev/null; then
    print_status "Sessions retrieval successful"
else
    print_error "Sessions retrieval failed"
fi

# Test 7: Get all users (protected endpoint)
echo ""
print_info "7. Getting all users..."
USERS_RESPONSE=$(curl -s -X GET "$API_URL/users" \
  -H "Authorization: Bearer $TOKEN")

echo $USERS_RESPONSE | jq '.'

if echo $USERS_RESPONSE | jq -e '.users' > /dev/null; then
    print_status "Users retrieval successful"
else
    print_error "Users retrieval failed"
fi

# Test 8: Test invalid token
echo ""
print_info "8. Testing invalid token (should fail)..."
INVALID_RESPONSE=$(curl -s -X GET "$API_URL/profile" \
  -H "Authorization: Bearer invalid_token")

echo $INVALID_RESPONSE

if echo $INVALID_RESPONSE | grep -q "Invalid"; then
    print_status "Invalid token properly rejected"
else
    print_error "Invalid token test failed"
fi

# Test 9: Sign out
echo ""
print_info "9. Signing out..."
SIGNOUT_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-out" \
  -H "Authorization: Bearer $TOKEN")

echo $SIGNOUT_RESPONSE | jq '.'

if echo $SIGNOUT_RESPONSE | jq -e '.message' | grep -q "success"; then
    print_status "Sign out successful"
else
    print_error "Sign out failed"
fi

# Test 10: Try to access protected endpoint after sign out (should fail)
echo ""
print_info "10. Testing access after sign out (should fail)..."
POST_SIGNOUT_RESPONSE=$(curl -s -X GET "$API_URL/profile" \
  -H "Authorization: Bearer $TOKEN")

echo $POST_SIGNOUT_RESPONSE

if echo $POST_SIGNOUT_RESPONSE | grep -q "Invalid"; then
    print_status "Access properly denied after sign out"
else
    print_error "Access after sign out test failed"
fi

echo ""
echo "🎉 Complete authentication test finished!"
echo "All endpoints tested successfully."
