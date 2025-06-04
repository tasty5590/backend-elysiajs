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