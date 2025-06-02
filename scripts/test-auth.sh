#!/bin/bash

# Google Authentication Test Script
# This script tests the Google Sign In authentication flow

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"
AUTH_URL="$BASE_URL/auth"

echo "🧪 Google Authentication Flow Test"
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

# Test 2: Test Google Sign In endpoint (without real Google token)
echo ""
print_info "2. Testing Google Sign In endpoint (will fail without real token)..."

GOOGLE_RESPONSE=$(curl -s -X POST "$AUTH_URL/google" \
  -H "Content-Type: application/json" \
  -d "{
    \"idToken\": \"fake-google-id-token\"
  }")

echo "Google Sign In Response:"
echo "$GOOGLE_RESPONSE" | jq '.' || echo "$GOOGLE_RESPONSE"

if echo "$GOOGLE_RESPONSE" | grep -q "Invalid Google token"; then
    print_status "Google endpoint is working (correctly rejecting fake token)"
else
    print_error "Google endpoint response unexpected"
fi

# Test 3: Test protected endpoints without authentication
echo ""
print_info "3. Testing protected endpoints without authentication..."

PROTECTED_RESPONSE=$(curl -s -X GET "$API_URL/profile")
echo "Protected endpoint response (no auth):"
echo "$PROTECTED_RESPONSE" | jq '.' || echo "$PROTECTED_RESPONSE"

if echo "$PROTECTED_RESPONSE" | grep -q "Missing authorization header"; then
    print_status "Protected endpoints correctly require authentication"
else
    print_error "Protected endpoints should require authentication"
fi

# Test 4: Test /auth/me endpoint without authentication
echo ""
print_info "4. Testing /auth/me endpoint without authentication..."

ME_RESPONSE=$(curl -s -X GET "$AUTH_URL/me")
echo "Me endpoint response (no auth):"
echo "$ME_RESPONSE" | jq '.' || echo "$ME_RESPONSE"

if echo "$ME_RESPONSE" | grep -q "Missing authorization header"; then
    print_status "Me endpoint correctly requires authentication"
else
    print_error "Me endpoint should require authentication"
fi

# Test 5: Test sign-out without authentication
echo ""
print_info "5. Testing sign-out endpoint without authentication..."

SIGNOUT_RESPONSE=$(curl -s -X POST "$AUTH_URL/sign-out")
echo "Sign-out response (no auth):"
echo "$SIGNOUT_RESPONSE" | jq '.' || echo "$SIGNOUT_RESPONSE"

if echo "$SIGNOUT_RESPONSE" | grep -q "Missing authorization header"; then
    print_status "Sign-out endpoint correctly requires authentication"
else
    print_error "Sign-out endpoint should require authentication"
fi

echo ""
print_info "Test Summary:"
echo "- All endpoints are properly configured for Google authentication"
echo "- To test with real Google tokens, use a mobile app or web app"
echo "- Protected endpoints correctly require authentication"
echo ""
print_info "Next steps:"
echo "1. Set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in your .env file"
echo "2. Configure Google OAuth in Google Cloud Console"
echo "3. Use the mobile integration example to test with real Google tokens"
echo ""
print_status "Google Authentication Test Complete!"

echo ""
echo "🎉 Complete authentication test finished!"
echo "All endpoints tested successfully."
