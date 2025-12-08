# Notifications API

Base path: `/api/notifications`

Handles user notifications for various events.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/notifications` | 🔐 | Get notifications |
| GET | `/notifications/unread-count` | 🔐 | Get unread count |
| PUT | `/notifications/:id/read` | 🔐 | Mark as read |
| PUT | `/notifications/read-all` | 🔐 | Mark all as read |

---

## Notification Types

| Type | Description |
|------|-------------|
| `upvote` | Someone upvoted your post |
| `comment` | Someone commented on your post |
| `reply` | Someone replied to your comment |
| `follow` | Someone followed you |
| `mention` | Someone mentioned you |

---

## GET /notifications 🔐

Get user's notifications.

**Headers:**
```
Authorization: Bearer <token>
```


**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "type": "upvote",
    "message": "johndoe upvoted your post",
    "link": "/post/507f1f77bcf86cd799439099",
    "fromUsername": "johndoe",
    "fromAvatar": "https://...",
    "read": false,
    "time": "2 hours ago",
    "createdAt": "2025-12-08T08:00:00.000Z"
  },
  {
    "id": "507f1f77bcf86cd799439012",
    "type": "comment",
    "message": "janedoe commented on your post",
    "link": "/post/507f1f77bcf86cd799439099",
    "fromUsername": "janedoe",
    "fromAvatar": "https://...",
    "read": true,
    "time": "1 day ago",
    "createdAt": "2025-12-07T10:00:00.000Z"
  }
]
```

**Notes:**
- Sorted by creation date (newest first)
- Returns up to 50 notifications

---

## GET /notifications/unread-count 🔐

Get unread notification count.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "count": 3
}
```

---

## PUT /notifications/:id/read 🔐

Mark a single notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Notification's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "type": "upvote",
  "message": "johndoe upvoted your post",
  "read": true,
  ...
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 404 | Notification not found |

---

## PUT /notifications/read-all 🔐

Mark all notifications as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

---

## Notification Creation

Notifications are automatically created by the system when:

| Event | Notification Type | Recipient |
|-------|------------------|-----------|
| User upvotes a post | `upvote` | Post author |
| User comments on a post | `comment` | Post author |
| User replies to a comment | `reply` | Comment author |
| User follows another user | `follow` | Followed user |
| User mentions @username | `mention` | Mentioned user |

**Notes:**
- Users don't receive notifications for their own actions
- Duplicate notifications are prevented (e.g., multiple upvotes from same user)
