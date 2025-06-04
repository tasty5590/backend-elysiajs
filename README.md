# Backend API with OAuth Authentication

A modern backend API built with ElysiaJS, Drizzle ORM, and better-auth, designed for mobile app integration with Google and Apple Sign In authentication.

## Features

- 🚀 **ElysiaJS** - Fast and modern web framework
- 🔐 **Unified OAuth** - Support for Google and Apple Sign In
- 🍎 **Apple Sign In** - Native Apple authentication support
- 🌐 **Google Sign In** - OAuth authentication with Google
- 🗄️ **Drizzle ORM** - Type-safe database operations with PostgreSQL
- 📱 **Mobile-Ready** - CORS configured for mobile app integration
- 🛡️ **Protected Routes** - Session-based authentication middleware
- 🔄 **Session Management** - Automatic session creation and cleanup
- 🧹 **Automatic Cleanup** - ElysiaJS cron job for expired session cleanup
- ✅ **Health Checks** - Monitor API and database health

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- PostgreSQL database
- Google OAuth credentials (Client ID and Client Secret)
- Apple OAuth credentials (for Apple Sign In support)
- Node.js 18+ (for compatibility)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd backend
bun install
```

2. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database URL, auth secret, and OAuth credentials
```

Required environment variables:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/backend_db
AUTH_SECRET=your-super-secret-key-change-in-production-minimum-32-characters
```

3. **Set up the database:**
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Optional: Open Drizzle Studio
bun run db:studio
```

4. **Start the development server:**
```bash
bun run dev
```

The server will start at `http://localhost:3000`

## API Documentation

### Health Endpoints

#### GET /health
Basic health check
```json
{
  "status": "ok",
  "timestamp": "2025-06-02T18:00:00.000Z",
  "bunVersion": "1.0.0",
  "uptime": 123.45
}
```

#### GET /db-health
Database connectivity check
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2025-06-02T18:00:00.000Z"
}
```

### Authentication Endpoints

#### Supported Providers
The backend supports the following OAuth providers:
- **Google Sign In**: `POST /auth/google`
- **Apple Sign In**: `POST /auth/apple`

Both endpoints follow the same authentication flow and return the same response format.

#### POST /auth/google
**Google Sign In endpoint**
```bash
curl -X POST "http://localhost:3000/auth/google" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google-id-token-from-mobile-app"
  }'
```

#### POST /auth/apple
**Apple Sign In endpoint** (with optional user info for first-time sign-in)
```bash
curl -X POST "http://localhost:3000/auth/apple" \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "apple-id-token-from-mobile-app",
    "user": {
      "name": {
        "firstName": "John",
        "lastName": "Doe"
      },
      "email": "john@example.com"
    }
  }'
```

Response (same for both Google and Apple):
```json
{
  "message": "Successfully signed in with google",
  "provider": "google",
  "user": {
    "id": "user_id",
    "email": "john@example.com", 
    "name": "John Doe",
    "image": "https://lh3.googleusercontent.com/...",
    "emailVerified": true,
    "createdAt": "2025-06-02T18:00:00.000Z"
  },
  "token": "session_token_here",
  "session": {
    "id": "session_id",
    "expiresAt": "2025-06-09T18:00:00.000Z"
  }
}
```

#### POST /auth/sign-out
Sign out user (requires authentication)
```bash
curl -X POST http://localhost:3000/auth/sign-out \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "message": "Signed out successfully",
  "sessionId": "session_id"
}
```

### Protected API Endpoints

All protected endpoints require the `Authorization: Bearer TOKEN` header.

#### GET /v1/profile
Get current user profile and session information
```bash
curl -X GET http://localhost:3000/v1/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Response:
```json
{
  "message": "This is a protected endpoint",
  "user": {
    "id": "user_id",
    "email": "john@example.com",
    "name": "John Doe",
    "image": "https://lh3.googleusercontent.com/...",
    "emailVerified": true,
    "createdAt": "2025-06-02T18:00:00.000Z",
    "updatedAt": "2025-06-02T18:00:00.000Z"
  },
  "session": {
    "id": "session_id",
    "token": "session_token",
    "userId": "user_id",
    "expiresAt": "2025-06-09T18:00:00.000Z",
    "ipAddress": "192.168.1.1",
    "userAgent": "...",
    "createdAt": "2025-06-02T18:00:00.000Z",
    "updatedAt": "2025-06-02T18:00:00.000Z"
  },
  "timestamp": "2025-06-02T18:00:00.000Z"
}
```

### Session Management & Cleanup

The backend includes automatic session cleanup functionality to remove expired sessions from the database.

#### Automatic Cleanup (Cron Job)
- **Schedule**: Runs every hour at minute 0 (e.g., 1:00, 2:00, 3:00, etc.)
- **Function**: Automatically removes sessions where `expiresAt` is less than the current timestamp
- **Logging**: Logs cleanup results to the console

#### Manual Session Management

#### GET /debug/session-stats
Get statistics about sessions (for monitoring)
```bash
curl -X GET http://localhost:3000/debug/session-stats
```

Response:
```json
{
  "total": 25,
  "active": 20,
  "expired": 5,
  "timestamp": "2025-06-02T18:00:00.000Z"
}
```

#### POST /debug/cleanup-sessions
Manually trigger session cleanup
```bash
curl -X POST http://localhost:3000/debug/cleanup-sessions
```

Response:
```json
{
  "message": "Session cleanup completed",
  "deletedCount": 5,
  "timestamp": "2025-06-02T18:00:00.000Z"
}
```

#### Testing Session Cleanup
Run the comprehensive test script:
```bash
./scripts/test-session-cleanup.sh
```

This script tests:
- Server and database health
- Session statistics retrieval
- Manual session cleanup
- Verification of cleanup results

## Mobile App Integration

### OAuth Authentication Flow

This backend supports unified OAuth authentication with **Google Sign In** and **Apple Sign In**. The mobile integration follows this flow:

1. **Configure OAuth Providers**: Set up Google and Apple Sign In in your mobile app
2. **Authenticate**: Get ID token from Google/Apple SDK
3. **Backend Verification**: Send ID token to backend for verification and session creation
4. **Store Session**: Save the session token securely in your mobile app
5. **API Calls**: Include the token in the `Authorization: Bearer TOKEN` header for protected endpoints

### Supported Providers

- ✅ **Google Sign In** - Cross-platform support (iOS & Android)
- 🍎 **Apple Sign In** - iOS support (required for App Store)

### Quick Setup

#### 1. Google Sign In Setup
```bash
npm install @react-native-google-signin/google-signin
```

#### 2. Apple Sign In Setup (iOS only)
```bash
npm install @invertase/react-native-apple-authentication
```

#### 3. Implementation Example

```javascript
import { signInWithGoogle, signInWithApple } from './auth-helpers';

// Google Sign In
const handleGoogleSignIn = async () => {
  try {
    const user = await signInWithGoogle();
    console.log('Signed in with Google:', user);
  } catch (error) {
    console.error('Google Sign In failed:', error);
  }
};

// Apple Sign In (iOS only)
const handleAppleSignIn = async () => {
  try {
    const user = await signInWithApple();
    console.log('Signed in with Apple:', user);
  } catch (error) {
    console.error('Apple Sign In failed:', error);
  }
};
```

### Complete Integration Examples

For complete React Native integration examples with Google and Apple Sign In, see:
📁 [`examples/mobile-oauth-integration.ts`](examples/mobile-oauth-integration.ts)

This file includes:
- Complete Google Sign In setup and implementation
- Complete Apple Sign In setup and implementation
- Error handling and edge cases
- Token storage and management
- Platform-specific considerations

### API Helper Functions

```javascript
// Store authentication token
const storeAuthToken = async (token) => {
  await AsyncStorage.setItem('auth_token', token);
};

// Get stored token
const getAuthToken = async () => {
  return await AsyncStorage.getItem('auth_token');
};

// Make authenticated API call
const authenticatedFetch = async (url, options = {}) => {
  const token = await getAuthToken();
  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  });
};

// Example: Get user profile
const getProfile = async () => {
  const response = await authenticatedFetch('http://localhost:3000/v1/profile');
  return response.json();
};

// Example: Update profile
const updateProfile = async (profileData) => {
  const response = await authenticatedFetch('http://localhost:3000/v1/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(profileData),
  });
  return response.json();
};
```

### OAuth Testing

Test your OAuth integration using the provided script:
```bash
./scripts/test-oauth.sh
```

This script tests:
- Provider listing
- Google OAuth simulation
- Apple OAuth simulation
- Error handling scenarios

## Database Schema

### Users Table
- `id` - Primary key
- `name` - User's display name
- `email` - User's email (unique)
- `emailVerified` - Email verification status
- `image` - Profile image URL
- `createdAt` - Account creation timestamp
- `updatedAt` - Last update timestamp

### Sessions Table
- `id` - Primary key
- `token` - Session token (unique)
- `userId` - Foreign key to users table
- `expiresAt` - Session expiration time
- `ipAddress` - Client IP address
- `userAgent` - Client user agent
- `createdAt` - Session creation timestamp

### Accounts & Verification Tables
Additional tables for OAuth providers and email verification (managed by better-auth).

## Development

### Available Scripts

```bash
# Development
bun run dev          # Start development server with watch mode

# Database
bun run db:generate  # Generate new migrations
bun run db:migrate   # Run pending migrations
bun run db:push      # Push schema changes directly to DB
bun run db:studio    # Open Drizzle Studio

# Testing
./test-complete-auth.sh  # Run complete authentication flow test
```

### Testing

Use the included test script to verify all endpoints:

```bash
# Make sure the server is running
bun run dev

# In another terminal, run the test
./test-complete-auth.sh
```

The test script will:
1. Test health endpoints
2. Register a new user
3. Sign in and get a token
4. Test all protected endpoints
5. Update user profile
6. Manage sessions
7. Test sign out flow

## Environment Variables

Create a `.env` file with:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"

# Authentication
AUTH_SECRET="your-super-secret-auth-key-here"
```

## Production Deployment

1. **Environment**: Set production environment variables
2. **Database**: Use a production PostgreSQL instance
3. **CORS**: Configure specific origins instead of allowing all
4. **SSL**: Enable HTTPS for production
5. **Monitoring**: Add logging and error tracking

## Tech Stack

- **Runtime**: Bun
- **Framework**: ElysiaJS
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM
- **Authentication**: better-auth
- **Validation**: TypeBox (via Elysia)
- **CORS**: @elysiajs/cors

## License

MIT