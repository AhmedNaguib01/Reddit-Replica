# Database Schema Documentation

This document provides a comprehensive overview of the MongoDB database schema used in the Reddit Clone application.

## Overview

The application uses **MongoDB** with **Mongoose ODM**. The database consists of 9 collections that handle users, content, social interactions, and messaging.

---

## Hosting & Infrastructure

### MongoDB Atlas

The database is hosted on **MongoDB Atlas**, a fully managed cloud database service.

**Cluster Details:**
- **Cluster Name**: Reddit-Replica
- **Cloud Provider**: AWS
- **Region**: Configurable (default: closest region)
- **Tier**: M0 (Free Tier) / Scalable to higher tiers
- **Database Name**: `reddit-clone`

**Connection String Format:**
```
mongodb+srv://<username>:<password>@reddit-replica.xxxxx.mongodb.net/reddit-clone?retryWrites=true&w=majority&appName=Reddit-Replica
```

### Connection Configuration

The database connection is managed in `server/config/database.js`:

```javascript
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,        // Maximum connections in pool
      minPoolSize: 2,         // Minimum connections maintained
      serverSelectionTimeoutMS: 5000,  // Timeout for server selection
      socketTimeoutMS: 45000, // Socket timeout
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};
```

### Connection Pool Settings

| Setting | Value | Description |
|---------|-------|-------------|
| `maxPoolSize` | 10 | Maximum number of connections in the pool |
| `minPoolSize` | 2 | Minimum connections maintained at all times |
| `serverSelectionTimeoutMS` | 5000ms | How long to wait for server selection |
| `socketTimeoutMS` | 45000ms | How long a socket can be inactive before closing |

### Environment Variables

The connection requires the following environment variable in `.env`:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/<database>?retryWrites=true&w=majority
```

### Atlas Features Used

- **Automatic Backups**: Daily snapshots with point-in-time recovery
- **Monitoring**: Real-time performance metrics and alerts
- **Security**: Network access controls, IP whitelisting, encryption at rest
- **Indexes**: Managed through Mongoose schema definitions
- **Connection Pooling**: Handled by Mongoose driver

### Security Considerations

1. **Network Access**: Configure IP whitelist in Atlas (or allow all IPs for development)
2. **Database Users**: Create dedicated users with minimal required permissions
3. **Connection String**: Store in environment variables, never commit to version control
4. **Encryption**: TLS/SSL enabled by default for all connections

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  username: String,                 // Required, unique, 3-20 chars, lowercase only
  displayName: String,              // Max 30 chars, default: username
  email: String,                    // Required, unique, lowercase
  password: String,                 // Bcrypt hashed (required if no googleId)
  googleId: String,                 // Google OAuth ID (nullable, sparse unique)
  authProvider: String,             // "local" | "google", default: "local"
  resetPasswordToken: String,       // Hashed reset token (nullable)
  resetPasswordExpires: Date,       // Token expiration (nullable)
  avatar: String,                   // Profile picture URL
  bio: String,                      // Max 200 chars, default: "New Redditor"
  bannerColor: String,              // Profile banner gradient
  bannerUrl: String,                // Custom banner image URL
  karma: Number,                    // Default: 1
  cakeDay: Date,                    // Account creation date
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  title: String,                    // Required, max 300 chars
  type: String,                     // "text" | "image" | "link", default: "text"
  content: String,                  // Post body or URL, default: ""
  author: ObjectId,                 // Required, ref: Users
  authorUsername: String,           // Required, denormalized
  community: ObjectId,              // Required, ref: Communities
  communityName: String,            // Required, denormalized
  upvotes: Number,                  // Default: 1
  downvotes: Number,                // Default: 0
  commentCount: Number,             // Default: 0
  isEdited: Boolean,                // Default: false
  editedAt: Date,                   // Last edit timestamp (nullable)
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Virtuals: voteCount (upvotes - downvotes), timeAgo
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  content: String,                  // Required, max 10,000 chars
  post: ObjectId,                   // Required, ref: Posts
  author: ObjectId,                 // Required, ref: Users
  authorUsername: String,           // Required, denormalized
  parentComment: ObjectId,          // Ref: Comments (nullable, for replies)
  depth: Number,                    // Nesting level, default: 0 (top-level)
  upvotes: Number,                  // Default: 1
  downvotes: Number,                // Default: 0
  isEdited: Boolean,                // Default: false
  editedAt: Date,                   // Last edit timestamp (nullable)
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Virtuals: voteCount (upvotes - downvotes), timeAgo
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  name: String,                     // Required, unique, 3-21 chars, lowercase
  displayName: String,              // Required
  title: String,                    // Required, max 100 chars
  description: String,              // Max 500 chars, default: ""
  iconUrl: String,                  // Community icon URL
  bannerUrl: String,                // Banner image URL
  creator: ObjectId,                // Required, ref: Users
  creatorUsername: String,          // Required, denormalized
  memberCount: Number,              // Default: 1
  category: String,                 // Default: "General"
  rules: [String],                  // Array of community rules, default: []
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Virtuals: members (formatted count), online (simulated)
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  user: ObjectId,                   // Required, ref: Users
  targetType: String,               // Required, "post" | "comment"
  target: ObjectId,                 // Required, ref: Posts or Comments
  voteType: Number,                 // Required, 1 (upvote) | -1 (downvote)
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  user: ObjectId,                   // Required, unique, ref: Users
  savedPosts: [ObjectId],           // Array of Post IDs, ref: Posts
  joinedCommunities: [ObjectId],    // Array of Community IDs, ref: Communities
  recentCommunities: [ObjectId],    // Recently visited Communities
  following: [ObjectId],            // Users being followed, ref: Users
  followers: [ObjectId],            // Users following this user, ref: Users
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  user: ObjectId,                   // Required, ref: Users (recipient)
  type: String,                     // Required, "upvote" | "comment" | "reply" | "follow" | "mention"
  message: String,                  // Required, notification text
  link: String,                     // Required, URL path to related content
  fromUser: ObjectId,               // Ref: Users (who triggered notification, nullable)
  fromUsername: String,             // Denormalized (nullable)
  relatedPost: ObjectId,            // Ref: Posts (nullable)
  relatedComment: ObjectId,         // Ref: Comments (nullable)
  read: Boolean,                    // Default: false
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Virtuals: time (human-readable time since creation)
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  name: String,                     // Required, max 50 chars
  description: String,              // Max 500 chars, default: ""
  creator: ObjectId,                // Required, ref: Users
  creatorUsername: String,          // Required, denormalized
  communities: [ObjectId],          // Array of Community IDs, ref: Communities
  isPrivate: Boolean,               // Default: false
  showOnProfile: Boolean,           // Default: true
  isFavorite: Boolean,              // Default: false
  iconColor: String,                // Hex color code, default: "#FFD700"
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Virtuals: communityCount (number of communities in feed)
```

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

**Schema:**
```
{
  _id: ObjectId,                    // Auto-generated unique identifier
  participants: [ObjectId],         // Required, array of 2 User IDs, ref: Users
  participantUsernames: [String],   // Required, denormalized usernames
  messages: [Message],              // Array of embedded messages (see below)
  lastMessage: {                    // Last message preview (nullable)
    content: String,
    senderUsername: String,
    createdAt: Date
  },
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}

// Embedded Message Schema:
{
  _id: ObjectId,                    // Auto-generated message ID
  sender: ObjectId,                 // Required, ref: Users
  senderUsername: String,           // Required, denormalized
  content: String,                  // Required, max 5,000 chars
  read: Boolean,                    // Default: false
  replyTo: ObjectId,                // Ref: Message (nullable)
  replyToContent: String,           // Preview of replied message (nullable)
  replyToUsername: String,          // Username of replied message (nullable)
  deleted: Boolean,                 // Soft delete flag, default: false
  createdAt: Date,                  // Auto-generated timestamp
  updatedAt: Date                   // Auto-generated timestamp
}
```

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
Username fields are denormalized across collections (`authorUsername`, `creatorUsername`, etc.) to avoid expensive joins for common read operations. When a user changes their username, these fields must be updated across all related documents.

### Soft Deletes
Chat messages use soft deletes (`deleted: true`) to preserve conversation context while hiding content. The message content is replaced with "This message was deleted" in the UI.

### Embedded Documents
Chat messages are embedded within the Chat document for efficient retrieval of conversation history. This pattern works well because messages are always accessed in the context of a chat.

### Sparse Indexes
The `googleId` field uses a sparse index to allow multiple null values while maintaining uniqueness for non-null values. This enables both local and OAuth authentication.

### Compound Indexes
Strategic compound indexes optimize common query patterns:
- Posts by community sorted by date
- Comments by post sorted by date
- User's posts/comments sorted by date
- Notifications by user sorted by date

### Virtual Fields
Computed fields like `voteCount` (upvotes - downvotes) and `timeAgo` are implemented as virtuals or methods to avoid data duplication while providing convenient access.

---

## Data Integrity

- **Referential Integrity**: Maintained at application level (Mongoose)
- **Unique Constraints**: Enforced via unique indexes
- **Validation**: Schema-level validation with Mongoose validators
- **Password Security**: Bcrypt hashing with salt rounds of 10
- **Cascade Updates**: Username changes propagate to denormalized fields

---

## Performance Considerations

1. **Text Indexes**: Posts have text indexes on `title` and `content` for full-text search
2. **Compound Indexes**: Optimized for common query patterns
3. **Denormalization**: Reduces need for population/joins
4. **Capped Arrays**: Consider implementing for `recentCommunities` to limit size
5. **Pagination**: All list endpoints should implement cursor-based or offset pagination
6. **Lean Queries**: Use `.lean()` for read-only operations to skip Mongoose document overhead

---

## Migration Notes

When adding new fields:
1. Add field to schema with appropriate default value
2. Existing documents will get the default on next save
3. For immediate backfill, run a migration script

Example migration for `displayName` field:
```javascript
// Backfill displayName for existing users
db.users.updateMany(
  { displayName: { $exists: false } },
  [{ $set: { displayName: "$username" } }]
);
```

---

## Backup & Recovery

### MongoDB Atlas Backups

Atlas provides automated backup solutions:

- **Continuous Backups**: Point-in-time recovery (paid tiers)
- **Daily Snapshots**: Automatic daily backups retained for 7 days (free tier)
- **On-Demand Snapshots**: Manual backups before major changes

### Manual Backup (mongodump)

```bash
# Export entire database
mongodump --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/reddit-clone" --out=./backup

# Export specific collection
mongodump --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/reddit-clone" --collection=users --out=./backup
```

### Restore (mongorestore)

```bash
# Restore entire database
mongorestore --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/reddit-clone" ./backup/reddit-clone

# Restore specific collection
mongorestore --uri="mongodb+srv://<user>:<pass>@cluster.mongodb.net/reddit-clone" --collection=users ./backup/reddit-clone/users.bson
```

---

## Monitoring & Debugging

### Atlas Monitoring

Access via MongoDB Atlas dashboard:
- **Real-time Metrics**: Operations/sec, connections, network I/O
- **Performance Advisor**: Index suggestions based on query patterns
- **Query Profiler**: Slow query analysis
- **Alerts**: Configure alerts for high CPU, connections, etc.

### Mongoose Debug Mode

Enable query logging in development:

```javascript
mongoose.set('debug', true);
// Logs all queries to console
```

### Common Queries for Debugging

```javascript
// Check collection stats
db.posts.stats()

// Find slow queries (if profiling enabled)
db.system.profile.find({ millis: { $gt: 100 } })

// Check indexes on a collection
db.posts.getIndexes()

// Analyze query performance
db.posts.find({ communityName: "photography" }).explain("executionStats")
```

---

## Scaling Considerations

### Current Limitations (Free Tier - M0)

- **Storage**: 512 MB
- **RAM**: Shared
- **Connections**: 500 max
- **No dedicated resources**

### Upgrade Path

1. **M2/M5 (Shared)**: More storage, better performance
2. **M10+ (Dedicated)**: Dedicated resources, auto-scaling, advanced features
3. **Sharding**: For horizontal scaling at very large scale

### Optimization Tips

1. **Index Coverage**: Ensure queries use indexes (check with `.explain()`)
2. **Projection**: Only fetch needed fields
3. **Pagination**: Use skip/limit or cursor-based pagination
4. **Lean Queries**: Use `.lean()` for read-only operations
5. **Batch Operations**: Use `bulkWrite()` for multiple updates
6. **Connection Pooling**: Reuse connections (handled by Mongoose)
