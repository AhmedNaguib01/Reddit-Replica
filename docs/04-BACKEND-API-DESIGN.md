# Backend & API Design Document

## Backend Framework & Language

### Node.js + Express 5
- **Language**: JavaScript (CommonJS modules)
- **Runtime**: Node.js (v18+)
- **Framework**: Express 5.1.0
- **Why Express?**
  - Minimalist and flexible
  - Large ecosystem of middleware
  - Well-documented and battle-tested
  - Easy to learn and maintain
  - Perfect for RESTful APIs

## API Style: REST

### RESTful Principles
The API follows REST (Representational State Transfer) architecture:

1. **Resource-Based URLs**: `/api/posts`, `/api/users/:username`
2. **HTTP Verbs**: GET (read), POST (create), PUT (update), DELETE (delete)
3. **Stateless**: Each request contains all necessary information
4. **JSON Format**: All requests and responses use JSON
5. **HTTP Status Codes**: Proper use of 200, 201, 400, 401, 403, 404, 500

### Why REST over GraphQL?
- **Simplicity**: Easier to implement and understand
- **Caching**: Better HTTP caching support
- **Tooling**: Standard HTTP tools (Postman, curl)
- **Learning**: Focus on fundamentals
- **Sufficient**: No need for complex queries in this app

## API Endpoints & Responsibilities

### Authentication Endpoints (`/api/auth`)

#### POST /api/auth/register
**Purpose**: Create new user account

**Request**:
```json
{
  "email": "user@example.com",
  "username": "johndoe",
  "password": "password123"
}
```

**Response** (201):
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "email": "user@example.com",
    "avatar": "https://placehold.co/100/ff4500/white?text=J",
    "karma": "1",
    "cakeDay": "Jan 30, 2026"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Validation**:
- Email: Valid format, unique
- Username: 3-20 chars, lowercase, alphanumeric + underscore, unique
- Password: Min 6 characters

**Business Logic**:
1. Validate input with express-validator
2. Check email/username uniqueness
3. Hash password with bcrypt (10 rounds)
4. Create user document
5. Create UserActivity document
6. Generate JWT token (7-day expiration)
7. Return user data + token

---

#### POST /api/auth/login
**Purpose**: Authenticate existing user

**Request**:
```json
{
  "username": "johndoe",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "user": { /* user object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Business Logic**:
1. Find user by username (case-insensitive)
2. Compare password with bcrypt
3. Generate JWT token
4. Return user data + token

---

#### POST /api/auth/google
**Purpose**: Google OAuth authentication

**Request**:
```json
{
  "credential": "google_id_token_here"
}
```

**Response** (200):
```json
{
  "user": { /* user object */ },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Business Logic**:
1. Verify Google ID token with google-auth-library
2. Extract user info (email, name, picture)
3. Check if user exists by googleId
4. If exists: Update avatar if needed
5. If not exists: Check if email exists (link accounts)
6. If new: Generate unique username, create user
7. Generate JWT token
8. Return user data + token

---

#### POST /api/auth/forgot-password
**Purpose**: Request password reset email

**Request**:
```json
{
  "email": "user@example.com"
}
```

**Response** (200):
```json
{
  "message": "If an account with that email exists, we sent a password reset link"
}
```

**Business Logic**:
1. Find user by email
2. Check if Google OAuth account (reject if no password)
3. Generate crypto token (32 bytes)
4. Hash token with SHA-256
5. Save hashed token + expiration (1 hour)
6. Send email with unhashed token via SendGrid
7. Return success message (always, to prevent email enumeration)

---

#### POST /api/auth/reset-password
**Purpose**: Reset password with token

**Request**:
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123"
}
```

**Response** (200):
```json
{
  "message": "Password reset successful"
}
```

**Business Logic**:
1. Hash incoming token
2. Find user with matching hashed token and valid expiration
3. Update password (will be hashed by pre-save hook)
4. Clear reset token fields
5. Return success message

---

#### GET /api/auth/me
**Purpose**: Get current user data

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "johndoe",
  "email": "user@example.com",
  "avatar": "https://...",
  "karma": "1.2k",
  "cakeDay": "Jan 30, 2026"
}
```

**Middleware**: `authenticateToken`

---

### Post Endpoints (`/api/posts`)

#### GET /api/posts
**Purpose**: Get all posts (optionally filtered by community)

**Query Params**:
- `subreddit` (optional): Filter by community name

**Response** (200):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "title": "My first post",
    "content": "Hello world!",
    "type": "text",
    "author": "johndoe",
    "subreddit": "programming",
    "voteCount": 42,
    "upvotes": 50,
    "downvotes": 8,
    "commentCount": 15,
    "timeAgo": "2 hours ago",
    "userVote": "up",
    "saved": false,
    "isEdited": false,
    "createdAt": "2026-01-30T10:00:00.000Z"
  }
]
```

**Caching**: 30-second server-side cache for homepage

**Business Logic**:
1. Check cache (if no subreddit filter)
2. Query posts with optional community filter
3. Sort by createdAt descending
4. Limit to 50 posts
5. Format posts (add virtuals)
6. If user authenticated: Add vote info and saved status
7. Cache result (if homepage)
8. Return posts

---

#### POST /api/posts
**Purpose**: Create new post

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "title": "My first post",
  "subreddit": "programming",
  "type": "text",
  "content": "Hello world!"
}
```

**Response** (201):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "title": "My first post",
  "content": "Hello world!",
  "type": "text",
  "author": "johndoe",
  "subreddit": "programming",
  "voteCount": 1,
  "upvotes": 1,
  "downvotes": 0,
  "commentCount": 0,
  "timeAgo": "just now"
}
```

**Validation**:
- Title: Required, max 300 chars
- Subreddit: Required, must exist
- Type: Must be 'text', 'image', or 'link'

**Business Logic**:
1. Validate input
2. Find community by name
3. Create post with author info
4. Invalidate posts cache
5. Return formatted post

---

#### POST /api/posts/:id/vote
**Purpose**: Vote on post (upvote/downvote/remove vote)

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "vote": "up"  // or "down"
}
```

**Response** (200):
```json
{
  "voteCount": 43,
  "upvotes": 51,
  "downvotes": 8,
  "userVote": "up"
}
```

**Business Logic**:
1. Find post
2. Check for existing vote
3. If same vote: Remove vote (toggle off)
4. If different vote: Change vote
5. If no vote: Create new vote
6. Update post upvotes/downvotes
7. Calculate karma change
8. Update post author's karma (if not self-vote)
9. Create notification (if new upvote)
10. Return vote counts

**Karma Calculation**:
- New upvote: +1 karma
- Remove upvote: -1 karma
- New downvote: -1 karma
- Remove downvote: +1 karma
- Change upvote to downvote: -2 karma
- Change downvote to upvote: +2 karma

---

#### POST /api/posts/:id/save
**Purpose**: Save/unsave post

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "saved": true
}
```

**Business Logic**:
1. Find post
2. Get/create user activity
3. Check if post is in savedPosts array
4. If saved: Remove from array
5. If not saved: Add to array
6. Save activity
7. Return saved status

---

#### POST /api/posts/:id/summarize
**Purpose**: Generate AI summary of post using Gemini

**Response** (200):
```json
{
  "summary": "This post discusses the benefits of using React for building user interfaces."
}
```

**Business Logic**:
1. Find post
2. Check if Gemini API key is configured
3. Prepare content (title + content)
4. Call Gemini API with prompt
5. Return summary

**Error Handling**:
- 503 if Gemini not configured
- 500 if API call fails

---

### Comment Endpoints (`/api/comments`)

#### GET /api/comments
**Purpose**: Get comments for a post (nested tree structure)

**Query Params**:
- `postId` (required): Post ID

**Response** (200):
```json
[
  {
    "id": "507f1f77bcf86cd799439011",
    "content": "Great post!",
    "author": "janedoe",
    "voteCount": 5,
    "upvotes": 6,
    "downvotes": 1,
    "depth": 0,
    "timeAgo": "1 hour ago",
    "userVote": null,
    "replies": [
      {
        "id": "507f1f77bcf86cd799439012",
        "content": "Thanks!",
        "author": "johndoe",
        "voteCount": 2,
        "depth": 1,
        "timeAgo": "30 minutes ago",
        "replies": []
      }
    ]
  }
]
```

**Business Logic**:
1. Find all comments for post
2. Sort by createdAt ascending
3. Build comment tree (recursive structure)
4. If user authenticated: Add vote info
5. Return nested comment tree

**Tree Building Algorithm**:
```javascript
const buildCommentTreeLean = (comments) => {
  const commentMap = {};
  const roots = [];

  // Create map
  comments.forEach(comment => {
    commentMap[comment._id.toString()] = {
      ...formatComment(comment),
      replies: []
    };
  });

  // Build tree
  comments.forEach(comment => {
    const commentObj = commentMap[comment._id.toString()];
    if (comment.parentComment) {
      const parent = commentMap[comment.parentComment.toString()];
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      roots.push(commentObj);
    }
  });

  return roots;
};
```

---

#### POST /api/comments
**Purpose**: Create comment or reply

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "postId": "507f1f77bcf86cd799439011",
  "content": "Great post!",
  "parentId": null  // or comment ID for replies
}
```

**Response** (201):
```json
{
  "id": "507f1f77bcf86cd799439013",
  "content": "Great post!",
  "author": "janedoe",
  "voteCount": 1,
  "depth": 0,
  "timeAgo": "just now"
}
```

**Validation**:
- postId: Required, must exist
- content: Required, max 10,000 chars
- User must be member of community

**Business Logic**:
1. Validate input
2. Verify post exists
3. Check community membership
4. Calculate depth (parent.depth + 1)
5. Create comment
6. Increment post.commentCount
7. Create notification (comment or reply)
8. Return formatted comment

---

### Community Endpoints (`/api/communities`)

#### GET /api/communities
**Purpose**: Get all communities

**Response** (200):
```json
[
  {
    "id": "programming",
    "name": "programming",
    "displayName": "r/programming",
    "title": "Programming",
    "description": "Computer programming",
    "iconUrl": "https://...",
    "bannerUrl": "https://...",
    "members": "1.2M",
    "online": "3.6k",
    "category": "Technology",
    "creator": "johndoe",
    "created": "Jan 1, 2025"
  }
]
```

**Caching**: 15-second server-side cache

**Business Logic**:
1. Check cache
2. Query all communities
3. Sort by memberCount descending
4. Limit to 100
5. Format communities (add virtuals)
6. Cache result
7. Return communities

---

#### POST /api/communities/:id/join
**Purpose**: Join or leave community

**Headers**: `Authorization: Bearer <token>`

**Response** (200):
```json
{
  "joined": true,
  "community": { /* community object */ },
  "message": "Joined community"
}
```

**Business Logic**:
1. Find community
2. Check if creator (creators can't leave)
3. Get/create user activity
4. Check if already joined
5. If joined: Remove from array, decrement memberCount
6. If not joined: Add to array, increment memberCount
7. Save activity and community
8. Invalidate caches
9. Return joined status

---

### User Endpoints (`/api/users`)

#### GET /api/users/:username/profile
**Purpose**: Get complete user profile (optimized single request)

**Response** (200):
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "username": "johndoe",
    "displayName": "John Doe",
    "avatar": "https://...",
    "bio": "Software developer",
    "karma": "1.2k",
    "cakeDay": "Jan 30, 2026",
    "followerCount": 42,
    "followingCount": 15
  },
  "posts": [ /* array of posts */ ],
  "comments": [ /* array of comments */ ],
  "followers": [ /* array of users */ ],
  "following": [ /* array of users */ ],
  "customFeeds": [ /* array of feeds */ ],
  "isFollowing": false,
  "savedPosts": [ /* array of posts (own profile only) */ ]
}
```

**Optimization**: All data fetched in parallel queries

**Business Logic**:
1. Find user by username
2. Build parallel queries:
   - User activity (followers, following)
   - User posts (limit 25)
   - User comments (limit 25)
   - Custom feeds (public only)
   - Current user's following status
3. Execute all queries in parallel with Promise.all
4. If viewing own profile: Fetch saved posts
5. Format all data
6. Return complete profile

---

#### PUT /api/users/profile
**Purpose**: Update own profile

**Headers**: `Authorization: Bearer <token>`

**Request**:
```json
{
  "username": "newusername",
  "displayName": "New Name",
  "bio": "Updated bio",
  "avatar": "https://...",
  "bannerColor": "linear-gradient(...)",
  "bannerUrl": "https://..."
}
```

**Response** (200):
```json
{
  "id": "507f1f77bcf86cd799439011",
  "username": "newusername",
  "displayName": "New Name",
  "bio": "Updated bio",
  "avatar": "https://...",
  "karma": "1.2k"
}
```

**Validation**:
- Username: 3-20 chars, lowercase, alphanumeric + underscore, unique
- DisplayName: Max 30 chars
- Bio: Max 200 chars

**Business Logic**:
1. Validate input
2. Check username uniqueness (if changing)
3. If username changed: Update denormalized fields in:
   - Posts (authorUsername)
   - Comments (authorUsername)
   - Communities (creatorUsername)
   - Notifications (fromUsername)
   - Chats (participantUsernames, message senderUsername)
4. Update user document
5. Clear user cache
6. Return updated user

---

## Permission & Role Handling

### Authentication Middleware

#### authenticateToken
**Purpose**: Verify JWT token and attach user to request

```javascript
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Use cached user data
    const user = await getCachedUser(decoded.id);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    req.user = {
      id: decoded.id,
      username: user.username,
      avatar: user.avatar
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};
```

**Caching**: User data cached for 5 minutes to reduce DB queries

---

#### optionalAuth
**Purpose**: Attach user if token present, but don't require it

```javascript
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.id,
      username: decoded.username
    };
  } catch (err) {
    req.user = null;
  }
  next();
};
```

**Use Cases**: Public endpoints that show different data for authenticated users (e.g., vote status)

---

### Authorization Patterns

#### 1. Public Routes (No Auth)
```javascript
router.get('/posts', optionalAuth, async (req, res) => {
  // Anyone can view posts
  // If authenticated, show vote status
});
```

#### 2. Protected Routes (Auth Required)
```javascript
router.post('/posts', authenticateToken, async (req, res) => {
  // Only authenticated users can create posts
});
```

#### 3. Owner-Only Routes
```javascript
router.put('/posts/:id', authenticateToken, async (req, res) => {
  const post = await Post.findById(req.params.id);
  
  if (post.author.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  
  // Only post author can edit
});
```

#### 4. Community Creator Routes
```javascript
router.delete('/communities/:id', authenticateToken, async (req, res) => {
  const community = await Community.findOne({ name: req.params.id });
  
  if (community.creator.toString() !== req.user.id) {
    return res.status(403).json({ message: 'Only creator can delete' });
  }
  
  // Only community creator can delete
});
```

### Role System (Not Implemented)

**Current State**: No role-based permissions

**Recommended Implementation**:
```javascript
// Add to User model
role: {
  type: String,
  enum: ['user', 'moderator', 'admin'],
  default: 'user'
}

// Middleware
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
    next();
  };
};

// Usage
router.delete('/posts/:id', authenticateToken, requireRole(['moderator', 'admin']), async (req, res) => {
  // Moderators and admins can delete any post
});
```

## Rate Limiting & Abuse Prevention

### Current State
**Status**: ❌ Not implemented

**Vulnerabilities**:
- No rate limiting on any endpoints
- Vulnerable to brute force attacks
- Vulnerable to spam/flooding
- No CAPTCHA on registration

### Recommended Implementation

#### 1. Express Rate Limit
```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

app.use('/api/', apiLimiter);

// Strict limit for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // 5 attempts per 15 minutes
  skipSuccessfulRequests: true
});

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);
```

#### 2. Slow Down Middleware
```bash
npm install express-slow-down
```

```javascript
const slowDown = require('express-slow-down');

const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
  delayMs: 500 // Add 500ms delay per request after that
});

app.use('/api/', speedLimiter);
```

#### 3. Content Spam Prevention
```javascript
// Detect spam patterns
const isSpam = (content) => {
  const spamPatterns = [
    /viagra/i,
    /casino/i,
    /\b(http|https):\/\/[^\s]+\b/g // Multiple URLs
  ];
  
  return spamPatterns.some(pattern => pattern.test(content));
};

// In post/comment creation
if (isSpam(content)) {
  return res.status(400).json({ message: 'Content flagged as spam' });
}
```

#### 4. Vote Manipulation Prevention
```javascript
// Track vote changes per user
const voteTracker = new Map();

const checkVoteAbuse = (userId) => {
  const key = `${userId}:${Date.now()}`;
  const count = voteTracker.get(userId) || 0;
  
  if (count > 10) { // More than 10 votes per minute
    return true;
  }
  
  voteTracker.set(userId, count + 1);
  setTimeout(() => voteTracker.delete(userId), 60000);
  
  return false;
};
```

#### 5. Account Creation Limits
```javascript
// Limit accounts per IP
const accountsPerIP = new Map();

const checkIPLimit = (ip) => {
  const count = accountsPerIP.get(ip) || 0;
  
  if (count >= 3) { // Max 3 accounts per IP per day
    return false;
  }
  
  accountsPerIP.set(ip, count + 1);
  setTimeout(() => accountsPerIP.delete(ip), 24 * 60 * 60 * 1000);
  
  return true;
};
```

## Error Handling

### Error Response Format
```json
{
  "message": "Human-readable error message",
  "errors": [ /* validation errors (optional) */ ]
}
```

### HTTP Status Codes
- **200 OK**: Successful GET, PUT, DELETE
- **201 Created**: Successful POST
- **400 Bad Request**: Validation errors
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource (username, email)
- **500 Internal Server Error**: Server errors

### Global Error Handler
```javascript
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});
```

### Validation Errors
```javascript
const errors = validationResult(req);
if (!errors.isEmpty()) {
  return res.status(400).json({ 
    message: errors.array()[0].msg,
    errors: errors.array() 
  });
}
```

## API Documentation

### Current State
**Status**: ⚠️ Minimal documentation in README

### Recommended: OpenAPI/Swagger
```bash
npm install swagger-jsdoc swagger-ui-express
```

```javascript
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Reddit Clone API',
      version: '1.0.0',
    },
  },
  apis: ['./routes/*.js'],
};

const specs = swaggerJsdoc(options);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintainer**: Ahmed Mohamed Naguib
