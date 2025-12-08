# Comments API

Base path: `/api/comments`

Handles threaded comments on posts, including replies, voting, and moderation.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/comments` | 🔑 | Get comments for a post |
| GET | `/comments/user/:username` | 🔓 | Get user's comments |
| POST | `/comments` | 🔐 | Create comment |
| PUT | `/comments/:id` | 🔐 | Update comment |
| DELETE | `/comments/:id` | 🔐 | Delete comment |
| POST | `/comments/:id/vote` | 🔐 | Vote on comment |

---

## GET /comments 🔑

Get comments for a post (threaded structure).

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `postId` | string | Yes | Post's MongoDB ObjectId |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "content": "Great post! Very informative.",
    "author": "johndoe",
    "voteCount": 5,
    "timeAgo": "1 hour ago",
    "depth": 0,
    "isEdited": false,
    "userVote": null,
    "replies": [
      {
        "id": "507f1f77bcf86cd799439012",
        "content": "I agree completely!",
        "author": "janedoe",
        "voteCount": 2,
        "timeAgo": "30 minutes ago",
        "depth": 1,
        "userVote": "up",
        "replies": []
      }
    ]
  }
]
```

**Response Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Comment's MongoDB ObjectId |
| `content` | string | Comment text |
| `author` | string | Author's username |
| `voteCount` | number | Net votes (upvotes - downvotes) |
| `timeAgo` | string | Human-readable time since creation |
| `depth` | number | Nesting level (0 = top-level) |
| `isEdited` | boolean | Whether comment was edited |
| `userVote` | string/null | Current user's vote ("up", "down", or null) |
| `replies` | array | Nested child comments |

**Notes:**
- Returns threaded comment tree structure
- Sorted by creation time (oldest first)
- `userVote` only included when authenticated

---

## GET /comments/user/:username 🔓

Get all comments by a specific user.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "content": "This is my comment",
    "postId": "507f1f77bcf86cd799439099",
    "postTitle": "Original post title",
    "subreddit": "programming",
    "voteCount": 5,
    "timeAgo": "2 hours ago"
  }
]
```

**Notes:**
- Includes post context (postId, postTitle, subreddit)
- Sorted by creation date (newest first)

---

## POST /comments 🔐

Create a new comment or reply.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body (Top-level comment):**
```json
{
  "postId": "507f1f77bcf86cd799439099",
  "content": "This is my comment on the post"
}
```

**Request Body (Reply to comment):**
```json
{
  "postId": "507f1f77bcf86cd799439099",
  "content": "This is my reply",
  "parentId": "507f1f77bcf86cd799439011"
}
```

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `postId` | Required, must be valid post ID |
| `content` | 1-10,000 characters |
| `parentId` | Optional, must be valid comment ID if provided |

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439012",
  "content": "This is my comment",
  "author": "johndoe",
  "postId": "507f1f77bcf86cd799439099",
  "parentId": null,
  "depth": 0,
  "voteCount": 1,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 403 | Must join community to comment |
| 404 | Post not found |
| 404 | Parent comment not found |

**Side Effects:**
- Increments post's `commentCount`
- Creates notification for:
  - Post author (if top-level comment)
  - Parent comment author (if reply)
- Notification not created if commenting on own post/comment

---

## PUT /comments/:id 🔐

Update a comment (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Comment's MongoDB ObjectId |

**Request Body:**
```json
{
  "content": "Updated comment text"
}
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "content": "Updated comment text",
  "isEdited": true,
  "editedAt": "2025-12-08T12:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the comment owner |
| 404 | Comment not found |

---

## DELETE /comments/:id 🔐

Delete a comment and all its replies (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Comment's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "message": "Comment deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the comment owner |
| 404 | Comment not found |

**Side Effects:**
- Recursively deletes all child replies
- Decrements post's `commentCount` by total deleted comments
- Deletes associated votes

---

## POST /comments/:id/vote 🔐

Vote on a comment (upvote or downvote).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Comment's MongoDB ObjectId |

**Request Body:**
```json
{
  "vote": "up"
}
```

| Value | Description |
|-------|-------------|
| `"up"` | Upvote the comment |
| `"down"` | Downvote the comment |

**Success Response (200):**
```json
{
  "voteCount": 6,
  "userVote": "up"
}
```

**Voting Behavior:**
| Current Vote | Action | Result |
|--------------|--------|--------|
| None | Upvote | Vote recorded as up |
| None | Downvote | Vote recorded as down |
| Up | Upvote | Vote removed (toggle off) |
| Up | Downvote | Vote changed to down |
| Down | Downvote | Vote removed (toggle off) |
| Down | Upvote | Vote changed to up |

**Notes:**
- Updates comment author's karma
- Cannot vote on your own comments (silently ignored)

---

## Comment Threading

Comments support unlimited nesting depth. The `depth` field indicates the nesting level:

```
depth 0: Top-level comment
  depth 1: Reply to top-level
    depth 2: Reply to reply
      depth 3: And so on...
```

The API returns comments in a nested tree structure, with each comment containing a `replies` array of its children.
