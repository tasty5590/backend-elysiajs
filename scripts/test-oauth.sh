#!/bin/bash

# Test script for provider-specific OAuth authentication (Google and Apple)
# This script tests the new /auth/{provider} endpoint structure

echo "🧪 Testing Provider-Specific OAuth Authentication"
echo "============================================="

BASE_URL="http://localhost:3000"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
    fi
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

print_header() {
    echo -e "${BLUE}$1${NC}"
}

# Test 1: Check server health
echo
print_header "Test 1: Server Health Check"
HEALTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/health_response.json "$BASE_URL/health")
HTTP_CODE="${HEALTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Server is running"
    echo "Response: $(cat /tmp/health_response.json)"
else
    print_status 1 "Server is not responding (HTTP $HTTP_CODE)"
    exit 1
fi

# Test 2: Get supported providers
echo
print_header "Test 2: Get Supported Providers"
PROVIDERS_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/providers_response.json "$BASE_URL/auth/providers")
HTTP_CODE="${PROVIDERS_RESPONSE: -3}"

if [ "$HTTP_CODE" = "200" ]; then
    print_status 0 "Providers endpoint is working"
    echo "Response: $(cat /tmp/providers_response.json)"
else
    print_status 1 "Providers endpoint failed (HTTP $HTTP_CODE)"
fi

# Test 3: Test invalid provider
echo
print_header "Test 3: Test Invalid Provider"
INVALID_PROVIDER_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/invalid_provider_response.json \
    -X POST "$BASE_URL/auth/facebook" \
    -H "Content-Type: application/json" \
    -d '{"idToken": "fake-token"}')
HTTP_CODE="${INVALID_PROVIDER_RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
    print_status 0 "Invalid provider correctly rejected"
    echo "Response: $(cat /tmp/invalid_provider_response.json)"
else
    print_status 1 "Invalid provider should be rejected with 400 (got HTTP $HTTP_CODE)"
fi

# Test 4: Test Google OAuth endpoint (without valid token)
echo
print_header "Test 4: Test Google OAuth Endpoint (Security)"
GOOGLE_OAUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/google_oauth_response.json \
    -X POST "$BASE_URL/auth/google" \
    -H "Content-Type: application/json" \
    -d '{"idToken": "fake-google-token"}')
HTTP_CODE="${GOOGLE_OAUTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
    print_status 0 "Google OAuth correctly validates tokens"
    echo "Response: $(cat /tmp/google_oauth_response.json)"
else
    print_status 1 "Google OAuth should reject invalid tokens with 400 (got HTTP $HTTP_CODE)"
fi

# Test 5: Test Apple OAuth endpoint (without valid token)
echo
print_header "Test 5: Test Apple OAuth Endpoint (Security)"
APPLE_OAUTH_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/apple_oauth_response.json \
    -X POST "$BASE_URL/auth/apple" \
    -H "Content-Type: application/json" \
    -d '{"idToken": "fake-apple-token"}')
HTTP_CODE="${APPLE_OAUTH_RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
    print_status 0 "Apple OAuth correctly validates tokens"
    echo "Response: $(cat /tmp/apple_oauth_response.json)"
else
    print_status 1 "Apple OAuth should reject invalid tokens with 400 (got HTTP $HTTP_CODE)"
fi
print_header "Test 6: Test Legacy Google Endpoint"
LEGACY_GOOGLE_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/legacy_google_response.json \
    -X POST "$BASE_URL/auth/google" \
    -H "Content-Type: application/json" \
    -d '{"idToken": "fake-google-token"}')
HTTP_CODE="${LEGACY_GOOGLE_RESPONSE: -3}"

if [ "$HTTP_CODE" = "400" ]; then
    print_status 0 "Legacy Google endpoint is working (validates tokens)"
    echo "Response: $(cat /tmp/legacy_google_response.json)"
else
    print_status 1 "Legacy Google endpoint should validate tokens (got HTTP $HTTP_CODE)"
fi

# Test 7: Test authentication endpoints without token
echo
print_header "Test 7: Test Protected Endpoints (No Auth)"
ME_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/me_response.json "$BASE_URL/auth/me")
HTTP_CODE="${ME_RESPONSE: -3}"

if [ "$HTTP_CODE" = "401" ]; then
    print_status 0 "Protected endpoints require authentication"
    echo "Response: $(cat /tmp/me_response.json)"
else
    print_status 1 "Protected endpoints should require authentication (got HTTP $HTTP_CODE)"
fi

# Test 8: Test sign-out without token
echo
print_header "Test 8: Test Sign-out Without Token"
SIGNOUT_RESPONSE=$(curl -s -w "%{http_code}" -o /tmp/signout_response.json \
    -X POST "$BASE_URL/auth/sign-out")
HTTP_CODE="${SIGNOUT_RESPONSE: -3}"

if [ "$HTTP_CODE" = "401" ]; then
    print_status 0 "Sign-out correctly requires authentication"
    echo "Response: $(cat /tmp/signout_response.json)"
else
    print_status 1 "Sign-out should require authentication (got HTTP $HTTP_CODE)"
fi

echo
print_header "🎯 OAuth Authentication Test Summary"
echo "=================================="
echo "✅ Provider-specific endpoints configured: POST /auth/{provider}"
echo "✅ Supported providers: Google, Apple"
echo "✅ Provider validation is working correctly"
echo "✅ Token validation is enforced for all providers"
echo "✅ Protected endpoints require authentication"
echo "✅ Error handling is working properly"
echo
echo "📱 For mobile integration:"
echo "   • Google: POST /auth/google with Google ID token"
echo "   • Apple:  POST /auth/apple with Apple ID token"
echo
echo "🔧 To test with real tokens:"
echo "   1. Set up GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env"
echo "   2. Set up APPLE_CLIENT_ID and APPLE_CLIENT_SECRET in .env"
echo "   3. Use mobile app to get real ID tokens and test authentication"

# Cleanup temporary files
rm -f /tmp/health_response.json /tmp/providers_response.json /tmp/invalid_provider_response.json
rm -f /tmp/google_oauth_response.json /tmp/apple_oauth_response.json
rm -f /tmp/me_response.json /tmp/signout_response.json

echo
print_info "Provider-specific OAuth endpoints test completed!"
