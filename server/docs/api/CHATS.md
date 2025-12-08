# Chats API

Base path: `/api/chats`

Handles direct messaging between users.

---

## Endpoints Overview

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/chats` | 🔐 | Get all chats |
| GET | `/chats/unread-count` | 🔐 | Get unread count |
| POST | `/chats` | 🔐 | Create/get chat |
| GET | `/chats/:id` | 🔐 | Get chat with messages |
| GET | `/chats/:id/messages` | 🔐 | Get messages (polling) |
| POST | `/chats/:id/messages` | 🔐 | Send message |
| DELETE | `/chats/:chatId/messages/:messageId` | 🔐 | Delete message |
| DELETE | `/chats/:id` | 🔐 | Delete chat |

---

## GET /chats 🔐

Get all chats for current user.

**Headers:**
```
Authorization: Bearer <token>
```


**Success Response (200):**
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "otherUser": "johndoe",
    "otherUserDisplayName": "John Doe",
    "otherUserAvatar": "https://...",
    "lastMessage": {
      "content": "Hey, how are you?",
      "senderUsername": "johndoe",
      "createdAt": "2025-12-08T10:00:00.000Z"
    },
    "unreadCount": 2
  }
]
```

**Notes:**
- Sorted by last message time (most recent first)
- `unreadCount` shows messages not yet read by current user

---

## GET /chats/unread-count 🔐

Get total unread message count across all chats.

**Headers:**
```
Authorization: Bearer <token>
```

**Success Response (200):**
```json
{
  "count": 5
}
```

---

## POST /chats 🔐

Create a new chat or get existing chat with a user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "username": "johndoe"
}
```

**Success Response (200/201):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "otherUser": "johndoe",
  "otherUserDisplayName": "John Doe",
  "otherUserAvatar": "https://...",
  "isNew": true
}
```

**Response Fields:**
| Field | Description |
|-------|-------------|
| `isNew` | `true` if chat was just created, `false` if existing |

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Cannot chat with yourself |
| 404 | User not found |

---

## GET /chats/:id 🔐

Get chat with all messages.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Chat's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "id": "507f1f77bcf86cd799439011",
  "otherUser": "johndoe",
  "otherUserDisplayName": "John Doe",
  "otherUserAvatar": "https://...",
  "messages": [
    {
      "_id": "507f1f77bcf86cd799439012",
      "sender": "507f1f77bcf86cd799439099",
      "senderUsername": "johndoe",
      "content": "Hello!",
      "read": true,
      "createdAt": "2025-12-08T10:00:00.000Z",
      "replyTo": null,
      "deleted": false
    }
  ],
  "updatedAt": "2025-12-08T10:00:00.000Z"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not a participant in this chat |
| 404 | Chat not found |

---

## GET /chats/:id/messages 🔐

Get messages for polling. Marks messages as read.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Chat's MongoDB ObjectId |

**Success Response (200):**
```json
[
  {
    "_id": "507f1f77bcf86cd799439012",
    "sender": "507f1f77bcf86cd799439099",
    "senderUsername": "johndoe",
    "content": "Hello!",
    "read": true,
    "createdAt": "2025-12-08T10:00:00.000Z",
    "replyTo": null,
    "replyToContent": null,
    "replyToUsername": null,
    "deleted": false
  }
]
```

**Notes:**
- Automatically marks all messages from other user as read
- Use for polling to get new messages

---

## POST /chats/:id/messages 🔐

Send a message in a chat.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Chat's MongoDB ObjectId |

**Request Body:**
```json
{
  "content": "Hello, how are you?",
  "replyToId": "507f1f77bcf86cd799439012"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `content` | Yes | Message text (1-5000 chars) |
| `replyToId` | No | Message ID to reply to |

**Success Response (201):**
```json
{
  "_id": "507f1f77bcf86cd799439013",
  "sender": "507f1f77bcf86cd799439098",
  "senderUsername": "currentuser",
  "content": "Hello, how are you?",
  "read": false,
  "createdAt": "2025-12-08T10:05:00.000Z",
  "replyTo": "507f1f77bcf86cd799439012",
  "replyToContent": "Hello!",
  "replyToUsername": "johndoe"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 400 | Content too long or empty |
| 403 | Not a participant in this chat |
| 404 | Chat not found |

---

## DELETE /chats/:chatId/messages/:messageId 🔐

Delete a message (soft delete, sender only).

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `chatId` | Chat's MongoDB ObjectId |
| `messageId` | Message's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "message": "Message deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not the message sender |
| 404 | Message not found |

**Notes:**
- Soft delete: message content replaced with "[deleted]"
- `deleted` flag set to `true`
- Message still visible in chat history

---

## DELETE /chats/:id 🔐

Delete entire chat conversation.

**Headers:**
```
Authorization: Bearer <token>
```

**URL Parameters:**
| Parameter | Description |
|-----------|-------------|
| `id` | Chat's MongoDB ObjectId |

**Success Response (200):**
```json
{
  "message": "Chat deleted successfully"
}
```

**Error Responses:**
| Status | Condition |
|--------|-----------|
| 403 | Not a participant in this chat |
| 404 | Chat not found |

**Notes:**
- Permanently deletes chat and all messages
- Cannot be undone
