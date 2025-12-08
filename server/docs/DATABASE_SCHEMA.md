# Database Schema Documentation

This document provides a comprehensive overview of the MongoDB database schema used in the Reddit Clone application.

## Overview

The application uses **MongoDB** with **Mongoose ODM**. The database consists of 9 collections that handle users, content, social interactions, and messaging.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATABASE ARCHITECTURE                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│   ┌──────────┐     ┌───────────┐     ┌─────────────┐                        │
│   │   User   │────▶│   Post    │────▶│   Comment   │                        │
│   └──────────┘     └───────────┘     └─────────────┘                        │
│        │                 │                  │                                │
│        │                 │                  │                                │
│        ▼                 ▼                  ▼                                │
│   ┌──────────┐     ┌───────────┐     ┌─────────────┐                        │
│   │UserActiv.│     │ Community │     │    Vote     │                        │
│   └──────────┘     └───────────┘     └─────────────┘                        │
│        │                                                                     │
│        │           ┌───────────┐     ┌─────────────┐                        │
│        └──────────▶│CustomFeed │     │Notification │                        │
│                    └───────────┘     └─────────────┘                        │
│                                                                              │
│                    ┌───────────┐                                             │
│                    │   Chat    │                                             │
│                    └───────────┘                                             │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Collections

### 1. User

Stores user account information and profile data.

| Field | Type | Required | Unique | Default | Description |
|-------|------|----------|--------|---------|-------------|
| `_id` | ObjectId | Yes | Yes | Auto | Primary key |
| `username` | String | Yes | Yes | - | Unique identifier (3-20 chars, lowercase) |
| `displayName` | String | No | No | username | Display name shown on profile (max 30 chars) |
| `email` | String | Yes | Yes | - | User email (lowercase) |
| `password` | String | Conditional | No | - | Hashed password (required if no googleId) |
| `googleId` | String | No | Yes (sparse) | - | Google OAuth ID |
| `authProvider` | String | No | No | 'local' | Auth method: 'local' or 'google' |
| `resetPasswordToken` | String | No | No | - | Password reset token (hashed) |
| `resetPasswordExpires` | Date | No | No | - | Token expiration time |
| `avatar` | String | No | No | Generated | Profile picture URL |
| `bio` | String | No | No | 'New Redditor' | User bio (max 200 chars) |
| `bannerColor` | String | No | No | Gradient | Profile banner gradient |
| `bannerUrl` | String | No | No | '' | Custom banner image URL |
| `karma` | Number | No | No | 1 | User karma points |
| `cakeDay` | Date | No | No | Date.now | Account creation date |
| `createdAt` | Date | Yes | No | Auto | Timestamp |
| `updatedAt` | Date | Yes | No | Auto | Timestamp |

**Indexes:**
- `username` (unique)
- `email` (unique)
- `googleId` (unique, sparse)
- `createdAt` (descending)
- `displayName` (text index for search)

**Methods:**
- `comparePassword(candidatePassword)` - Validates password
- `getFormattedKarma()` - Returns karma as "1.2k" or "1.5M"
- `getFormattedCakeDay()` - Returns formatted date string
- `toJSON()` - Sanitizes output (removes password, tokens)

---

### 2. Post

Stores all posts/submissions in communities.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Primary key |
| `title` | String | Yes | - | Post title (max 300 chars) |
| `type` | String | No | 'text' | Post type: 'text', 'image', or 'link' |
| `content` | String | No | '' | Post body or URL |
| `author` | ObjectId | Yes | - | Reference to User |
| `authorUsername` | String | Yes | - | Denormalized username |
| `community` | ObjectId | Yes | - | Reference to Community |
| `communityName` | String | Yes | - | Denormalized community name |
| `upvotes` | Number | No | 1 | Upvote count |
| `downvotes` | Number | No | 0 | Downvote count |
| `commentCount` | Number | No | 0 | Number of comments |
| `isEdited` | Boolean | No | false | Edit flag |
| `editedAt` | Date | No | - | Last edit timestamp |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `community, createdAt` (compound, descending)
- `author, createdAt` (compound, descending)
- `authorUsername, createdAt` (compound, descending)
- `communityName, createdAt` (compound, descending)
- `createdAt` (descending)
- `title, content` (text index for search)

**Virtuals:**
- `voteCount` - Computed as `upvotes - downvotes`

---

### 3. Comment

Stores comments on posts with support for nested replies.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Primary key |
| `content` | String | Yes | - | Comment text (max 10,000 chars) |
| `post` | ObjectId | Yes | - | Reference to Post |
| `author` | ObjectId | Yes | - | Reference to User |
| `authorUsername` | String | Yes | - | Denormalized username |
| `parentComment` | ObjectId | No | null | Reference to parent Comment (for replies) |
| `depth` | Number | No | 0 | Nesting level (0 = top-level) |
| `upvotes` | Number | No | 1 | Upvote count |
| `downvotes` | Number | No | 0 | Downvote count |
| `isEdited` | Boolean | No | false | Edit flag |
| `editedAt` | Date | No | - | Last edit timestamp |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `post, createdAt` (compound)
- `author`
- `authorUsername, createdAt` (compound, descending)
- `parentComment`

---

### 4. Community

Stores subreddit/community information.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Primary key |
| `name` | String | Yes | - | Unique name (3-21 chars, lowercase) |
| `displayName` | String | Yes | - | Display name |
| `title` | String | Yes | - | Community title (max 100 chars) |
| `description` | String | No | '' | Description (max 500 chars) |
| `iconUrl` | String | No | Generated | Community icon URL |
| `bannerUrl` | String | No | Placeholder | Banner image URL |
| `creator` | ObjectId | Yes | - | Reference to User |
| `creatorUsername` | String | Yes | - | Denormalized username |
| `memberCount` | Number | No | 1 | Number of members |
| `category` | String | No | 'General' | Community category |
| `rules` | [String] | No | [] | Array of community rules |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `name` (unique)
- `memberCount` (descending)
- `category`
- `creator`

**Methods:**
- `getFormattedMembers()` - Returns "1.2k" or "1.5M" format
- `getOnlineCount()` - Simulated online count (~0.3% of members)

---

### 5. Vote

Tracks user votes on posts and comments.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Primary key |
| `user` | ObjectId | Yes | Reference to User |
| `targetType` | String | Yes | 'post' or 'comment' |
| `target` | ObjectId | Yes | Reference to Post or Comment |
| `voteType` | Number | Yes | 1 (upvote) or -1 (downvote) |
| `createdAt` | Date | Yes | Timestamp |
| `updatedAt` | Date | Yes | Timestamp |

**Indexes:**
- `user, targetType, target` (compound, unique) - Ensures one vote per user per target
- `target`

---

### 6. UserActivity

Tracks user interactions: saved posts, joined communities, follows.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Primary key |
| `user` | ObjectId | Yes | Reference to User (unique) |
| `savedPosts` | [ObjectId] | No | References to saved Posts |
| `joinedCommunities` | [ObjectId] | No | References to joined Communities |
| `recentCommunities` | [ObjectId] | No | Recently visited Communities |
| `following` | [ObjectId] | No | Users being followed |
| `followers` | [ObjectId] | No | Users following this user |
| `createdAt` | Date | Yes | Timestamp |
| `updatedAt` | Date | Yes | Timestamp |

**Indexes:**
- `user` (unique)

**Static Methods:**
- `getOrCreate(userId)` - Gets or creates activity record

---

### 7. Notification

Stores user notifications for various events.

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Primary key |
| `user` | ObjectId | Yes | - | Recipient User reference |
| `type` | String | Yes | - | 'upvote', 'comment', 'reply', 'follow', 'mention' |
| `message` | String | Yes | - | Notification text |
| `link` | String | Yes | - | URL to related content |
| `fromUser` | ObjectId | No | - | User who triggered notification |
| `fromUsername` | String | No | - | Denormalized username |
| `relatedPost` | ObjectId | No | - | Reference to related Post |
| `relatedComment` | ObjectId | No | - | Reference to related Comment |
| `read` | Boolean | No | false | Read status |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `user, createdAt` (compound, descending)
- `user, read` (compound)

---

### 8. CustomFeed

Stores user-created custom feeds (multi-reddits).

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Primary key |
| `name` | String | Yes | - | Feed name (max 50 chars) |
| `description` | String | No | '' | Description (max 500 chars) |
| `creator` | ObjectId | Yes | - | Reference to User |
| `creatorUsername` | String | Yes | - | Denormalized username |
| `communities` | [ObjectId] | No | [] | References to Communities |
| `isPrivate` | Boolean | No | false | Privacy setting |
| `showOnProfile` | Boolean | No | true | Show on user profile |
| `isFavorite` | Boolean | No | false | Favorited by creator |
| `iconColor` | String | No | '#FFD700' | Feed icon color |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `creator, name` (compound, unique)

---

### 9. Chat

Stores direct messages between users.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Yes | Primary key |
| `participants` | [ObjectId] | Yes | Array of 2 User references |
| `participantUsernames` | [String] | Yes | Denormalized usernames |
| `messages` | [Message] | No | Array of embedded messages |
| `lastMessage` | Object | No | Last message preview |
| `createdAt` | Date | Yes | Timestamp |
| `updatedAt` | Date | Yes | Timestamp |

**Embedded Message Schema:**

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `_id` | ObjectId | Yes | Auto | Message ID |
| `sender` | ObjectId | Yes | - | Reference to User |
| `senderUsername` | String | Yes | - | Denormalized username |
| `content` | String | Yes | - | Message text (max 5,000 chars) |
| `read` | Boolean | No | false | Read status |
| `replyTo` | ObjectId | No | null | Reference to replied message |
| `replyToContent` | String | No | null | Preview of replied message |
| `replyToUsername` | String | No | null | Username of replied message |
| `deleted` | Boolean | No | false | Soft delete flag |
| `createdAt` | Date | Yes | Auto | Timestamp |
| `updatedAt` | Date | Yes | Auto | Timestamp |

**Indexes:**
- `participants`
- `updatedAt` (descending)

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │  Community  │       │    Post     │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ _id (PK)    │◀──┐   │ _id (PK)    │◀──┐   │ _id (PK)    │
│ username    │   │   │ name        │   │   │ title       │
│ displayName │   │   │ displayName │   │   │ content     │
│ email       │   │   │ title       │   │   │ type        │
│ password    │   │   │ description │   │   │ author (FK) │──┐
│ avatar      │   │   │ creator(FK) │───┘   │ community   │──┼──┐
│ karma       │   │   │ memberCount │       │   (FK)      │  │  │
└─────────────┘   │   └─────────────┘       │ upvotes     │  │  │
      ▲           │          ▲              │ downvotes   │  │  │
      │           │          │              └─────────────┘  │  │
      │           │          │                    ▲          │  │
      │           │          │                    │          │  │
┌─────┴───────┐   │   ┌──────┴──────┐      ┌─────┴───────┐  │  │
│UserActivity │   │   │ CustomFeed  │      │   Comment   │  │  │
├─────────────┤   │   ├─────────────┤      ├─────────────┤  │  │
│ user (FK)   │───┘   │ creator(FK) │──────│ post (FK)   │──┘  │
│ savedPosts  │       │ communities │      │ author (FK) │─────┘
│ joined      │       │   (FK[])    │      │ parent (FK) │◀─┐
│ Communities │       └─────────────┘      │ content     │  │
│ following   │                            │ depth       │  │
│ followers   │                            └─────────────┘──┘
└─────────────┘                                   │
                                                  │
┌─────────────┐       ┌─────────────┐            │
│    Vote     │       │Notification │            │
├─────────────┤       ├─────────────┤            │
│ user (FK)   │       │ user (FK)   │            │
│ target (FK) │───────│ fromUser    │            │
│ targetType  │       │   (FK)      │            │
│ voteType    │       │ relatedPost │────────────┘
└─────────────┘       │   (FK)      │
                      └─────────────┘

┌─────────────┐
│    Chat     │
├─────────────┤
│participants │
│  (FK[])     │
│ messages[]  │
│  └─sender   │
│    (FK)     │
└─────────────┘
```

---

## Design Patterns

### Denormalization
Username fields are denormalized across collections (`authorUsername`, `creatorUsername`, etc.) to avoid expensive joins for common read operations.

### Soft Deletes
Chat messages use soft deletes (`deleted: true`) to preserve conversation context while hiding content.

### Embedded Documents
Chat messages are embedded within the Chat document for efficient retrieval of conversation history.

### Sparse Indexes
The `googleId` field uses a sparse index to allow multiple null values while maintaining uniqueness for non-null values.

### Compound Indexes
Strategic compound indexes optimize common query patterns (e.g., posts by community sorted by date).

---

## Data Integrity

- **Referential Integrity**: Maintained at application level (Mongoose)
- **Unique Constraints**: Enforced via unique indexes
- **Validation**: Schema-level validation with Mongoose validators
- **Password Security**: Bcrypt hashing with salt rounds of 10

---

## Performance Considerations

1. **Text Indexes**: Posts have text indexes on `title` and `content` for full-text search
2. **Compound Indexes**: Optimized for common query patterns
3. **Denormalization**: Reduces need for population/joins
4. **Capped Arrays**: Consider implementing for `recentCommunities` to limit size
