# Custom Feeds API

Base path: `/api/custom-feeds`

Handles multi-reddit style custom feeds that aggregate posts from multiple communities.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/custom-feeds` | 🔐 | Get user's feeds |
| GET | `/custom-feeds/user/:username` | 🔓 | Get user's public feeds |
| GET | `/custom-feeds/:id` | 🔐 | Get single feed |
| GET | `/custom-feeds/:id/posts` | 🔐 | Get feed posts |
| POST | `/custom-feeds` | 🔐 | Create feed |
| PUT | `/custom-feeds/:id` | 🔐 | Update feed |
| PUT | `/custom-feeds/:id/favorite` | 🔐 | Toggle favorite |
| POST | `/custom-feeds/:id/communities` | 🔐 | Add community |
| DELETE | `/custom-feeds/:id/communities/:communityId` | 🔐 | Remove community |
| DELETE | `/custom-feeds/:id` | 🔐 | Delete feed |

---

## GET /custom-feeds 🔐

Get current user's custom feeds.

**Headers:**
```
Authorization: Bearer <token>
```


**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Tech Feed",
    "description": "All my favorite tech communities",
    "communities": [
      {
        "_id": "507f1f77bcf86cd799439021",
        "name": "programming",
        "displayName": "r/programming",
        "iconUrl": "https://..."
      }
    ],
    "communityCount": 5,
    "isFavorite": true,
    "isPrivate": false,
    "showOnProfile": true
  }
]
```

---

## GET /custom-feeds/user/:username 🔓

Get public feeds for a user's profile.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "name": "My Tech Feed",
    "description": "...",
    "communityCount": 5,
    "isFavorite": true
  }
]
```

**Notes:**
- Only returns feeds where `showOnProfile` is `true`
- Only returns public feeds (`isPrivate: false`)

---

## GET /custom-feeds/:id 🔐

Get a single custom feed.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "My Tech Feed",
  "description": "All my favorite tech communities",
  "communities": [...],
  "communityCount": 5,
  "isFavorite": true,
  "isPrivate": false,
  "showOnProfile": true,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Private feed, not owner |
| 404 | Feed not found |

---

## GET /custom-feeds/:id/posts 🔐

Get posts from all communities in the feed.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439031",
    "title": "Post from programming",
    "subreddit": "programming",
    "author": "johndoe",
    "voteCount": 42,
    "commentCount": 5,
    "timeAgo": "2 hours ago"
  },
  {
    "id": "507f1f77bcf86cd799439032",
    "title": "Post from javascript",
    "subreddit": "javascript",
    ...
  }
]
```

**Notes:**
- Aggregates posts from all communities in the feed
- Sorted by creation date (newest first)
- Returns up to 50 posts

---

## POST /custom-feeds 🔐

Create a new custom feed.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "name": "My Feed",
  "description": "A collection of my favorite communities",
  "isPrivate": false,
  "showOnProfile": true
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `name` | 1-50 characters, required |
| `description` | Max 200 characters |
| `isPrivate` | Boolean, default `false` |
| `showOnProfile` | Boolean, default `true` |

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "name": "My Feed",
  "description": "A collection of my favorite communities",
  "user": "507f1f77bcf86cd799439099",
  "communities": [],
  "isFavorite": false,
  "isPrivate": false,
  "showOnProfile": true,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

---

## PUT /custom-feeds/:id 🔐

Update a custom feed (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Request Body:**
```json
{
  "name": "Updated Feed Name",
  "description": "Updated description",
  "isPrivate": true,
  "showOnProfile": false
}
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "Updated Feed Name",
  ...
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the feed owner |
| 404 | Feed not found |

---

## PUT /custom-feeds/:id/favorite 🔐

Toggle favorite status.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "isFavorite": true
}
```

**Notes:**
- Favorite feeds appear at the top of the list
- Shown in sidebar for quick access

---

## POST /custom-feeds/:id/communities 🔐

Add a community to the feed.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Request Body:**
```json
{
  "communityId": "507f1f77bcf86cd799439021"
}
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "communities": [...],
  "communityCount": 6
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Community already in feed |
| 403 | Must join community first |
| 403 | Not the feed owner |
| 404 | Feed or community not found |

---

## DELETE /custom-feeds/:id/communities/:communityId 🔐

Remove a community from the feed.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |
| `communityId` | Community's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "communities": [...],
  "communityCount": 4
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the feed owner |
| 404 | Feed or community not found |

---

## DELETE /custom-feeds/:id 🔐

Delete a custom feed (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Feed's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "message": "Custom feed deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the feed owner |
| 404 | Feed not found |
