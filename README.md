# Backend API with Google Authentication

A modern backend API built with ElysiaJS, Drizzle ORM, and better-auth, designed for mobile app integration with Google Sign In authentication.

## Features

- 🚀 **ElysiaJS** - Fast and modern web framework
- 🔐 **Google Sign In** - OAuth authentication with Google
- 🗄️ **Drizzle ORM** - Type-safe database operations with PostgreSQL
- 📱 **Mobile-Ready** - CORS configured for mobile app integration
- 🛡️ **Protected Routes** - Session-based authentication middleware
- 🔄 **Session Management** - Create, list, and revoke user sessions
- 🧹 **Automatic Cleanup** - ElysiaJS cron job for expired session cleanup
- ✅ **Health Checks** - Monitor API and database health

## Quick Start

### Prerequisites

- [Bun](https://bun.sh/) (latest version)
- PostgreSQL database
- Google OAuth credentials (Client ID and Client Secret)
- Node.js 18+ (for compatibility)

### Installation

1. **Clone and install dependencies:**
```bash
git clone <your-repo>
cd backend
bun install
```

2. **Set up Google OAuth:**
   - Go to the [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable the Google+ API
   - Create OAuth 2.0 credentials
   - Add your domain to authorized origins

3. **Set up environment variables:**
```bash
cp .env.example .env
# Edit .env with your database URL, auth secret, and Google OAuth credentials
```

Required environment variables:
```bash
DATABASE_URL=postgresql://username:password@localhost:5432/backend_db
AUTH_SECRET=your-super-secret-key-change-in-production-minimum-32-characters
GOOGLE_CLIENT_ID=your-google-client-id.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

4. **Set up the database:**
```bash
# Generate migrations
bun run db:generate

# Run migrations
bun run db:migrate

# Optional: Open Drizzle Studio
bun run db:studio
```

5. **Start the development server:**
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

#### POST /auth/google
Authenticate with Google ID token
```bash
curl -X POST http://localhost:3000/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "google-id-token-from-mobile-app"
  }'
```

Response:
```json
{
  "message": "Successfully signed in with Google",
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

#### GET /auth/me
Get current user information
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Protected API Endpoints

All protected endpoints require the `Authorization: Bearer TOKEN` header.

#### GET /api/profile
Get current user profile
```bash
curl -X GET http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### PUT /api/profile
Update user profile
```bash
curl -X PUT http://localhost:3000/api/profile \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "email": "new@example.com"
  }'
```

#### GET /api/users
Get all users (admin-like endpoint)
```bash
curl -X GET http://localhost:3000/api/users \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### GET /api/sessions
Get user's active sessions
```bash
curl -X GET http://localhost:3000/api/sessions \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### DELETE /api/sessions/:sessionId
Revoke a specific session
```bash
curl -X DELETE http://localhost:3000/api/sessions/SESSION_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### POST /api/sessions/revoke-all
Revoke all other sessions (except current)
```bash
curl -X POST http://localhost:3000/api/sessions/revoke-all \
  -H "Authorization: Bearer YOUR_TOKEN"
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

### Authentication Flow

1. **Register/Sign In**: Use `/auth/sign-up` or `/auth/sign-in` to get a session token
2. **Store Token**: Save the token securely in your mobile app (e.g., Keychain/Keystore)
3. **API Calls**: Include the token in the `Authorization: Bearer TOKEN` header for protected endpoints
4. **Token Management**: Monitor token expiration and refresh as needed

### Example Integration (React Native)

```javascript
// Sign in
const signIn = async (email, password) => {
  const response = await fetch('http://localhost:3000/auth/sign-in', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  if (data.token) {
    // Store token securely
    await AsyncStorage.setItem('auth_token', data.token);
    return data.user;
  }
  throw new Error(data.error);
};

// Make authenticated API call
const getProfile = async () => {
  const token = await AsyncStorage.getItem('auth_token');
  const response = await fetch('http://localhost:3000/api/profile', {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
};
```

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