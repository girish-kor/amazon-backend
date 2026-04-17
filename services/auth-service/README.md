# Auth Service

User authentication, JWT token issuance, and session management.

## Features

- **User Registration**: Create new user accounts with email and password
- **User Login**: Authenticate users and issue JWT tokens
- **JWT Management**: Issue access and refresh tokens with configurable expiry
- **Token Refresh**: Issue new access tokens using refresh tokens
- **Password Security**: PBKDF2 password hashing with salt
- **JWKS Endpoint**: Public key endpoint for token verification by other services
- **Health Checks**: `/health` and `/ready` endpoints

## API Endpoints

### Register User

```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (201):
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "createdAt": "2026-04-17T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Login

```bash
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

Response (200):
{
  "user": {
    "id": "user_xxx",
    "email": "user@example.com",
    "createdAt": "2026-04-17T..."
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Refresh Token

```bash
POST /auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

Response (200):
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 900
}
```

### Get Current User

```bash
GET /auth/me
Authorization: Bearer <ACCESS_TOKEN>

Response (200):
{
  "id": "user_xxx",
  "email": "user@example.com",
  "createdAt": "2026-04-17T..."
}
```

### JWKS Endpoint

```bash
GET /auth/.well-known/jwks.json

Response (200):
{
  "keys": []
}
```

## Architecture

### Domain Layer
- **User**: User entity and value objects
- **PasswordManager**: PBKDF2 password hashing and verification
- **JWTManager**: JWT token generation and validation (HS256)
- **UserRepository**: Interface for user persistence

### Application Layer
- **AuthenticationService**: Business logic for registration, login, token refresh, profile retrieval

### Infrastructure Layer
- **PostgresUserRepository**: PostgreSQL implementation of UserRepository
- **Database**: Schema initialization and migrations

### HTTP Layer
- **Routes**: Express routes for all authentication endpoints

## Database Schema

```sql
CREATE TABLE users (
  id VARCHAR(255) PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_users_email ON users(email);
```

## Configuration

Environment variables:

```bash
# Server
AUTH_SERVICE_PORT=3001
NODE_ENV=development
LOG_LEVEL=info

# Database
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=ecommerce
DATABASE_USER=postgres
DATABASE_PASSWORD=password

# JWT
JWT_SECRET=your-secret-key-change-in-production
```

## Security

- **Password Hashing**: PBKDF2 with 100,000 iterations, SHA-512
- **Salt**: 32-byte random salt per password
- **JWT**: HMAC-SHA256 (HS256) signature
- **Access Token**: 15-minute expiry
- **Refresh Token**: 7-day expiry
- **Password Requirements**: Minimum 8 characters

## Development

### Start Service

```bash
pnpm dev
```

Service runs on port 3001 (or `AUTH_SERVICE_PORT` if set).

### Test Endpoints

```bash
# Register
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test12345"}'

# Login
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Test12345"}'

# Get profile
curl http://localhost:3001/auth/me \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

## Error Responses

### 400 Bad Request
```json
{
  "error": {
    "message": "Email and password are required",
    "code": "INVALID_REQUEST"
  }
}
```

### 409 Conflict
```json
{
  "error": {
    "message": "Email already registered",
    "code": "CONFLICT"
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Invalid email or password",
    "code": "UNAUTHORIZED"
  }
}
```

### 422 Unprocessable Entity
```json
{
  "error": {
    "message": "Password must be at least 8 characters",
    "code": "VALIDATION_ERROR"
  }
}
```

## Production Considerations

1. **Token Storage**: Use RS256 (RSA) instead of HS256 for multi-service verification
2. **JWKS**: Implement proper public key distribution
3. **Token Rotation**: Implement token rotation for refresh tokens
4. **Rate Limiting**: Add rate limiting for auth endpoints
5. **Account Lockout**: Implement account lockout after failed attempts
6. **Two-Factor Auth**: Add 2FA support
7. **Password Reset**: Implement secure password reset flow
8. **Audit Logging**: Log all authentication events
9. **Database**: Use prepared statements and connection pooling
10. **HTTPS**: Enforce HTTPS in production
