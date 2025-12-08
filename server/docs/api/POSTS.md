# Posts API

Base path: `/api/posts`

Handles creating, reading, updating, and deleting posts, as well as voting and saving functionality.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/posts` | 🔑 | Get all posts |
| GET | `/posts/search` | 🔑 | Search posts |
| GET | `/posts/user/saved` | 🔐 | Get saved posts |
| GET | `/posts/by-user/:username` | 🔑 | Get user's posts |
| GET | `/posts/:id` | 🔑 | Get single post |
| POST | `/posts` | 🔐 | Create post |
| PUT | `/posts/:id` | 🔐 | Update post |
| DELETE | `/posts/:id` | 🔐 | Delete post |
| POST | `/posts/:id/vote` | 🔐 | Vote on post |
| POST | `/posts/:id/save` | 🔐 | Save/unsave post |
| POST | `/posts/:id/summarize` | 🔑 | AI summarize post |

---

## GET /posts 🔑

Get all posts, optionally filtered by community.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `subreddit` | string | No | Filter by community name |

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439011",
    "id": "507f1f77bcf86cd799439011",
    "title": "My first post",
    "type": "text",
    "content": "This is the post content...",
    "author": "johndoe",
    "subreddit": "programming",
    "voteCount": 42,
    "commentCount": 5,
    "timeAgo": "2 hours ago",
    "userVote": "up",
    "saved": false
  }
]
```

**Notes:**
- Returns up to 50 posts, sorted by creation date (newest first)
- Cached for 30 seconds (homepage only, not when filtering by subreddit)
- `userVote` and `saved` fields only included when authenticated
- `userVote` can be `"up"`, `"down"`, or `null`

---

## GET /posts/search 🔑

Search posts by title, content, author, or community.

**Query Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `q` | string | Yes | Search query (minimum 2 characters) |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Matching post title",
    "content": "Content containing search term...",
    "author": "johndoe",
    "subreddit": "programming",
    "voteCount": 15,
    "commentCount": 3,
    "timeAgo": "1 day ago"
  }
]
```

**Search Behavior:**
- Case-insensitive search
- Searches across: title, content, author username, subreddit name
- Returns up to 50 results

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Query too short (less than 2 characters) |

---

## GET /posts/user/saved 🔐

Get current user's saved posts.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "Saved post",
    "type": "text",
    "content": "...",
    "author": "someuser",
    "subreddit": "programming",
    "voteCount": 100,
    "saved": true
  }
]
```

---

## GET /posts/by-user/:username 🔑

Get all posts by a specific user.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `username` | Target user's username |

**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "User's post",
    "type": "text",
    "content": "...",
    "author": "johndoe",
    "subreddit": "programming",
    "voteCount": 25,
    "timeAgo": "3 days ago"
  }
]
```

---

## GET /posts/:id 🔑

Get a single post by ID.

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Post's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Post title",
  "type": "text",
  "content": "Full post content here...",
  "author": "johndoe",
  "subreddit": "programming",
  "voteCount": 42,
  "commentCount": 5,
  "timeAgo": "2 hours ago",
  "isEdited": false,
  "editedAt": null,
  "userVote": null,
  "saved": false
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Post not found |

---

## POST /posts 🔐

Create a new post.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "My awesome post",
  "subreddit": "programming",
  "type": "text",
  "content": "This is the post content..."
}
```

**Post Types:**
| Type | Content Field |
|------|---------------|
| `text` | Text content (markdown supported) |
| `image` | Image URL |
| `link` | External URL |

**Validation Rules:**
| Field | Rules |
|-------|-------|
| `title` | 1-300 characters, required |
| `subreddit` | Community name, required, must exist |
| `type` | One of: "text", "image", "link" |
| `content` | Post body or URL |

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439011",
  "title": "My awesome post",
  "type": "text",
  "content": "This is the post content...",
  "author": "johndoe",
  "subreddit": "programming",
  "voteCount": 1,
  "commentCount": 0,
  "createdAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Validation error |
| 404 | Community not found |

**Notes:**
- Author automatically set to current user
- Initial vote count is 1 (auto-upvote by author)

---

## PUT /posts/:id 🔐

Update an existing post (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated title",
  "content": "Updated content"
}
```

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "Updated title",
  "content": "Updated content",
  "isEdited": true,
  "editedAt": "2025-12-08T12:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the post owner |
| 404 | Post not found |

---

## DELETE /posts/:id 🔐

Delete a post (owner only).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the post owner |
| 404 | Post not found |

**Notes:**
- Also deletes all associated votes
- Comments are NOT deleted (orphaned)

---

## POST /posts/:id/vote 🔐

Vote on a post (upvote or downvote).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "vote": "up"
}
```

| Value | Description |
|-------|-------------|
| `"up"` | Upvote the post |
| `"down"` | Downvote the post |

**Success Response (200):**
```json
{
  "voteCount": 43,
  "upvotes": 50,
  "downvotes": 7,
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
- Updates post author's karma accordingly
- Cannot vote on your own posts (silently ignored)

---

## POST /posts/:id/save 🔐

Save or unsave a post (toggle).

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "saved": true
}
```

**Notes:**
- Toggles save status
- Saved posts appear in `/posts/user/saved`

---

## POST /posts/:id/summarize 🔑

Generate AI summary of post using Google Gemini.

**Success Response (200):**
```json
{
  "summary": "This post discusses the benefits of using TypeScript in large-scale applications, highlighting type safety and improved developer experience."
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Post not found |
| 503 | AI summarization not configured (missing API key) |

**Notes:**
- Requires `GEMINI_API_KEY` environment variable
- Summary is generated on-demand, not cached
