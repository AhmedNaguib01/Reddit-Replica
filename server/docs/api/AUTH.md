# Authentication API

Base path: `/api/auth`

Handles user registration, login, password management, and session management.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | 🔓 | Register new user |
| POST | `/auth/login` | 🔓 | Login with credentials |
| POST | `/auth/google` | 🔓 | Google OAuth login |
| POST | `/auth/forgot-password` | 🔓 | Request password reset |
| POST | `/auth/reset-password` | 🔓 | Reset password with token |
| POST | `/auth/check-email` | 🔓 | Check email availability |
| GET | `/auth/me` | 🔐 | Get current user |
| POST | `/auth/logout` | 🔐 | Logout user |

---

## POST /auth/register 🔓

Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `email` | Valid email format, required, unique |
| `username` | 3-20 characters, lowercase letters, numbers, underscores only, unique |
| `password` | Minimum 6 characters |

**Success Response (201):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "displayName": "johndoe",
    "email": "user@example.com",
    "avatar": "https://api.dicebear.com/7.x/avataaars/svg?seed=johndoe",
    "bio": "New Redditor",
    "karma": "1",
    "cakeDay": "Dec 8, 2025"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation error (invalid email, username too short, etc.) |
| 409 | Email or username already exists |

**Notes:**
- Username is automatically converted to lowercase
- Display name defaults to the username
- Avatar is auto-generated using DiceBear API
- JWT token expires in 7 days

---

## POST /auth/login 🔓

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "username": "johndoe",
  "password": "securepassword123"
}
```

**Success Response (200):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "user@example.com",
    "avatar": "https://...",
    "bio": "...",
    "karma": "1.2k",
    "cakeDay": "Dec 8, 2025"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Missing username or password |
| 401 | Invalid username or password |

---

## POST /auth/google 🔓

Authenticate using Google OAuth.

**Request Body:**
```json
{
  "credential": "google_id_token_here"
}
```

**Success Response (200):**
```json
{
  "user": {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "displayName": "John Doe",
    "email": "user@example.com",
    "avatar": "https://lh3.googleusercontent.com/...",
    "authProvider": "google"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Behavior:**
- Creates new account if user doesn't exist
- Links Google account to existing email if found
- Auto-generates lowercase username from Google name (removes spaces, special chars)
- Sets `displayName` to Google profile name
- Uses Google profile picture as avatar

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid Google token |
| 500 | Google OAuth verification failed |

---

## POST /auth/forgot-password 🔓

Request password reset email.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "message": "If an account with that email exists, we sent a password reset link"
}
```

**Notes:**
- Always returns success to prevent email enumeration attacks
- Returns error for Google OAuth accounts (they don't have passwords)
- Reset token expires in 1 hour
- Sends email via configured SMTP service

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Account uses Google OAuth |

---

## POST /auth/reset-password 🔓

Reset password using token from email.

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password reset successful"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Invalid or expired token |
| 400 | Password too short |

**Notes:**
- Token is single-use and invalidated after successful reset
- Token expires after 1 hour

---

## POST /auth/check-email 🔓

Check if email is available for registration.

**Request Body:**
```json
{
  "email": "user@example.com"
}
```

**Success Response (200):**
```json
{
  "available": true,
  "message": "Email is available"
}
```

**Response when taken:**
```json
{
  "available": false,
  "message": "Email is already registered"
}
```

---

## GET /auth/me 🔐

Get current authenticated user's profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "displayName": "John Doe",
  "email": "user@example.com",
  "avatar": "https://...",
  "bio": "Software developer",
  "karma": "1.2k",
  "cakeDay": "Dec 8, 2025",
  "authProvider": "local"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 401 | Invalid or missing token |
| 404 | User not found |

---

## POST /auth/logout 🔐

Logout current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Notes:**
- This is primarily for client-side token removal
- Server does not maintain session state (stateless JWT)
- Client should delete stored token after this call

---

## Token Format

JWT tokens contain the following payload:

```json
{
  "userId": "507f1f77bcf86cd799439011",
  "iat": 1702000000,
  "exp": 1702604800
}
```

| Field | Description |
|-------|-------------|
| `userId` | MongoDB ObjectId of the user |
| `iat` | Issued at timestamp |
| `exp` | Expiration timestamp (7 days from issue) |
