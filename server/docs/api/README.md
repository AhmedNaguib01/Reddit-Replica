# API Documentation

Complete REST API documentation for the Reddit Clone application.

## Base URL

```
http://localhost:5000/api
```

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <token>
```

### Authentication Types

| Icon | Type | Description |
|------|------|-------------|
| 🔓 | Public | No authentication required |
| 🔐 | Protected | Requires valid JWT token |
| 🔑 | Optional | Works with or without authentication (enhanced features when authenticated) |

---

## API Modules

| Module | Base Path | Description |
|--------|-----------|-------------|
| [Authentication](./AUTH.md) | `/api/auth` | User registration, login, password reset |
| [Posts](./POSTS.md) | `/api/posts` | Create, read, update, delete posts |
| [Comments](./COMMENTS.md) | `/api/comments` | Threaded comments on posts |
| [Communities](./COMMUNITIES.md) | `/api/communities` | Subreddit-like communities |
| [Users](./USERS.md) | `/api/users` | User profiles and social features |
| [Chats](./CHATS.md) | `/api/chats` | Direct messaging |
| [Notifications](./NOTIFICATIONS.md) | `/api/notifications` | User notifications |
| [Custom Feeds](./CUSTOM_FEEDS.md) | `/api/custom-feeds` | Multi-reddit style feeds |

---

## Error Response Format

All error responses follow this format:

```json
{
  "message": "Human-readable error message",
  "errors": [
    {
      "msg": "Validation error message",
      "param": "fieldName",
      "location": "body"
    }
  ]
}
```

## HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (not authorized for action) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 500 | Server Error |
| 503 | Service Unavailable |

---

## Rate Limiting

Currently no rate limiting is implemented. Consider adding for production.

## Caching

| Endpoint | Cache Duration |
|----------|---------------|
| GET /posts | 30 seconds |
| GET /communities | 15 seconds |
| GET /communities/:id | 30 seconds |
| GET /communities/user/* | 5 seconds |
