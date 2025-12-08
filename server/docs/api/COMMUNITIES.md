# Communities API

Base path: `/api/communities`

Handles subreddit-like communities - creation, membership, and management.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/communities` | 🔓 | Get all communities |
| GET | `/communities/user/recent` | 🔐 | Get recently visited |
| GET | `/communities/user/joined` | 🔐 | Get joined communities |
| GET | `/communities/:id` | 🔓 | Get single community |
| POST | `/communities` | 🔐 | Create community |
| POST | `/communities/:id/join` | 🔐 | Join/leave community |
| PUT | `/communities/:id` | 🔐 | Update community |
| DELETE | `/communities/:id` | 🔐 | Delete community |

---

## GET /communities 🔓

Get all communities.

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "id": "programming",
    "name": "programming",
    "displayName": "r/programming",
    "title": "Programming",
    "description": "A community for programmers",
    "iconUrl": "https://...",
    "members": "1.2M",
    "category": "Technology"
  }
]
```


**Notes:**
- Sorted by member count (descending)
- Limited to 100 communities
- Cached for 15 seconds

---

## GET /communities/user/recent 🔐

Get user's recently visited communities.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
[
  {
    "id": "programming",
    "name": "programming",
    "displayName": "r/programming",
    "iconUrl": "https://..."
  }
]
```

**Notes:**
- Returns up to 5 most recently visited
- Cached for 5 seconds

---

## GET /communities/user/joined 🔐

Get communities the user has joined.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
[
  {
    "id": "programming",
    "name": "programming",
    "displayName": "r/programming",
    "iconUrl": "https://...",
    "memberCount": 1200000
  }
]
```

**Notes:**
- Sorted alphabetically by name
- Cached for 5 seconds

---

## GET /communities/:id 🔓

Get a single community by name.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Community name (e.g., "programming") |

**Success Response (200):**
```json
{
  "id": "programming",
  "name": "programming",
  "displayName": "r/programming",
  "title": "Programming",
  "description": "A community for programmers of all skill levels",
  "iconUrl": "https://...",
  "bannerUrl": "https://...",
  "members": "1.2M",
  "online": "3.6k",
  "created": "Jan 1, 2020",
  "creatorUsername": "admin",
  "rules": [
    "Be respectful to others",
    "No spam or self-promotion",
    "Use appropriate tags"
  ],
  "isJoined": true
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Community not found |

**Notes:**
- Tracks visit for authenticated users (updates recent communities)
- Cached for 30 seconds
- `isJoined` only included when authenticated

---

## POST /communities 🔐

Create a new community.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "mycommunity",
  "title": "My Community",
  "description": "A place for discussing...",
  "category": "Technology",
  "iconUrl": "https://example.com/icon.png",
  "bannerUrl": "https://example.com/banner.jpg"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | 3-21 characters, alphanumeric and underscores only, unique |
| `title` | Max 100 characters |
| `description` | Max 500 characters |
| `category` | Optional, for organization |

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "mycommunity",
  "displayName": "r/mycommunity",
  "title": "My Community",
  "description": "A place for discussing...",
  "creator": "507f1f77bcf86cd799439099",
  "creatorUsername": "johndoe",
  "memberCount": 1,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 409 | Community name already exists |

**Notes:**
- Creator automatically joins the community
- Creator becomes the community owner

---

## POST /communities/:id/join 🔐

Join or leave a community (toggle).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Community name |

**Success Response (200) - Joined:**
```json
{
  "joined": true,
  "community": {
    "id": "programming",
    "name": "programming",
    "memberCount": 1200001
  },
  "message": "Joined community"
}
```

**Success Response (200) - Left:**
```json
{
  "joined": false,
  "community": {
    "id": "programming",
    "name": "programming",
    "memberCount": 1199999
  },
  "message": "Left community"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Creators cannot leave their own community |
| 404 | Community not found |

---

## PUT /communities/:id 🔐

Update community (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Community name |

**Request Body:**
```json
{
  "title": "New Title",
  "description": "Updated description",
  "iconUrl": "https://...",
  "bannerUrl": "https://...",
  "rules": ["Rule 1", "Rule 2"]
}
```

**Success Response (200):**
```json
{
  "id": "mycommunity",
  "title": "New Title",
  "description": "Updated description",
  ...
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Only creator can edit |
| 404 | Community not found |

---

## DELETE /communities/:id 🔐

Delete community (creator only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Community name |

**Success Response (200):**
```json
{
  "message": "Community deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Only creator can delete |
| 404 | Community not found |

**Side Effects:**
- Deletes all posts in the community
- Deletes all comments on those posts
- Deletes all votes on posts and comments
- Removes community from all users' joined lists
- Removes community from all custom feeds
