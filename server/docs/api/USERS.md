# Users API

Base path: `/api/users`

Handles user profiles, search, following, and account management.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/users/search` | 🔓 | Search users |
| GET | `/users/:username` | 🔓 | Get user profile |
| PUT | `/users/profile` | 🔐 | Update own profile |
| PUT | `/users/change-password` | 🔐 | Change password |
| POST | `/users/:username/follow` | 🔐 | Follow/unfollow user |
| GET | `/users/:username/followers` | 🔓 | Get followers |
| GET | `/users/:username/following` | 🔓 | Get following |
| GET | `/users/:username/is-following` | 🔐 | Check follow status |

---

## GET /users/search 🔓

Search users by username or display name.

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `q` | string | Search query |


**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://...",
    "bio": "Software developer",
    "karma": 1234
  }
]
```

**Notes:**
- Searches both username and displayName
- Case-insensitive search
- Returns up to 20 results

---

## GET /users/:username 🔓

Get user profile by username.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "displayName": "John Doe",
  "avatar": "https://...",
  "bio": "Software developer and open source enthusiast",
  "bannerColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "bannerUrl": null,
  "karma": "1.2k",
  "cakeDay": "Dec 8, 2025",
  "followerCount": 100,
  "followingCount": 50
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | User not found |

---

## PUT /users/profile 🔐

Update own profile.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "newusername",
  "displayName": "New Display Name",
  "bio": "Updated bio text",
  "avatar": "https://example.com/avatar.jpg",
  "bannerColor": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "bannerUrl": "https://example.com/banner.jpg"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `username` | 3-20 chars, lowercase only, alphanumeric + underscore |
| `displayName` | Max 30 characters, any case allowed |
| `bio` | Max 200 characters |
| `avatar` | Valid URL |
| `bannerColor` | CSS gradient or color |
| `bannerUrl` | Valid URL |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "newusername",
  "displayName": "New Display Name",
  "bio": "Updated bio text",
  "avatar": "https://...",
  "bannerColor": "...",
  "bannerUrl": "..."
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 409 | Username already taken |

**Notes:**
- Username change updates all related documents (posts, comments, chats, etc.)
- Username must be lowercase; displayName can be any case

---

## PUT /users/change-password 🔐

Change account password.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "oldPassword": "currentpassword",
  "newPassword": "newpassword123"
}
```

**Success Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Email doesn't match account |
| 400 | Incorrect old password |
| 400 | New password too short |

---

## POST /users/:username/follow 🔐

Follow or unfollow a user (toggle).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
{
  "following": true,
  "message": "User followed"
}
```

**Unfollow Response:**
```json
{
  "following": false,
  "message": "User unfollowed"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Cannot follow yourself |
| 404 | User not found |

**Side Effects:**
- Creates notification for target user when followed
- Updates follower/following counts

---

## GET /users/:username/followers 🔓

Get user's followers list.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "follower1",
    "displayName": "Follower One",
    "avatar": "https://..."
  }
]
```

---

## GET /users/:username/following 🔓

Get users that this user follows.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "username": "following1",
    "displayName": "Following One",
    "avatar": "https://..."
  }
]
```

---

## GET /users/:username/is-following 🔐

Check if current user follows target user.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
{
  "following": true
}
```
