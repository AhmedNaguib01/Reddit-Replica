# High-Level Architecture Document

## System Overview

Reddit Clone is a full-stack social media application that replicates core Reddit functionality. The system follows a traditional **three-tier architecture** with a React frontend, Node.js/Express backend, and MongoDB database.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT TIER                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  React 19 + Vite (SPA)                                   │   │
│  │  - React Router for navigation                           │   │
│  │  - Context API for state management                      │   │
│  │  - Axios for HTTP requests                               │   │
│  │  - Lucide React for icons                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ HTTPS/REST
┌─────────────────────────────────────────────────────────────────┐
│                       SERVER TIER                                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Node.js + Express 5                                     │   │
│  │  - RESTful API endpoints                                 │   │
│  │  - JWT authentication middleware                         │   │
│  │  - Google OAuth 2.0 integration                          │   │
│  │  - Request validation (express-validator)                │   │
│  │  - In-memory caching layer                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              ↕ MongoDB Driver
┌─────────────────────────────────────────────────────────────────┐
│                      DATABASE TIER                               │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  MongoDB Atlas (Cloud)                                   │   │
│  │  - 9 Collections (Users, Posts, Comments, etc.)          │   │
│  │  - Mongoose ODM for schema validation                    │   │
│  │  - Compound indexes for query optimization               │   │
│  │  - Connection pooling (2-10 connections)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19 (latest)
- **Build Tool**: Vite 7.1.7
- **Routing**: React Router DOM 7.9.4
- **HTTP Client**: Axios 1.12.2
- **Icons**: Lucide React 0.548.0
- **Authentication**: @react-oauth/google 0.12.2
- **Styling**: Custom CSS with CSS variables for theming

### Backend
- **Runtime**: Node.js
- **Framework**: Express 5.1.0
- **Database ODM**: Mongoose 9.0.0
- **Authentication**: JWT (jsonwebtoken 9.0.2) + Google OAuth (google-auth-library 10.5.0)
- **Password Hashing**: bcryptjs 3.0.3
- **Validation**: express-validator 7.3.1
- **File Upload**: Multer 2.0.2
- **Email**: SendGrid (@sendgrid/mail 8.1.6)
- **AI**: Google Gemini API (@google/generative-ai 0.24.1)

### Database
- **Type**: MongoDB (NoSQL document database)
- **Hosting**: MongoDB Atlas (AWS)
- **Collections**: 9 (Users, Posts, Comments, Communities, Votes, UserActivity, Notifications, CustomFeeds, Chats)

### Deployment
- **Frontend**: Vercel (Static hosting with CDN)
- **Backend**: Railway (Container-based hosting)
- **Database**: MongoDB Atlas (Managed cloud database)

## System Architecture Patterns

### 1. **Client-Server Architecture**
- Clear separation between presentation (React) and business logic (Express)
- RESTful API communication over HTTPS
- Stateless server design with JWT tokens

### 2. **Layered Architecture**
```
Frontend Layers:
├── Pages (Route components)
├── Components (Reusable UI)
├── Context (Global state)
├── Services (API calls)
└── Hooks (Custom React hooks)

Backend Layers:
├── Routes (API endpoints)
├── Middleware (Auth, validation)
├── Models (Mongoose schemas)
├── Utils (Helpers, notifications)
└── Config (Database connection)
```

### 3. **Caching Strategy**
- **Client-side**: LocalStorage for auth tokens and user data
- **Server-side**: In-memory caching for frequently accessed data
  - Posts cache: 30 seconds
  - Communities cache: 15-30 seconds
  - User data cache: 5 minutes
- **Request deduplication**: Prevents duplicate simultaneous API calls

### 4. **Authentication Flow**
```
┌──────────┐                ┌──────────┐                ┌──────────┐
│  Client  │                │  Server  │                │ Database │
└────┬─────┘                └────┬─────┘                └────┬─────┘
     │                           │                           │
     │  1. Login Request         │                           │
     ├──────────────────────────>│                           │
     │  (username + password)    │                           │
     │                           │  2. Verify Credentials    │
     │                           ├──────────────────────────>│
     │                           │                           │
     │                           │  3. User Data             │
     │                           │<──────────────────────────┤
     │                           │                           │
     │  4. JWT Token + User Data │                           │
     │<──────────────────────────┤                           │
     │                           │                           │
     │  5. Store Token           │                           │
     │  (localStorage)           │                           │
     │                           │                           │
     │  6. Subsequent Requests   │                           │
     │  (Authorization: Bearer)  │                           │
     ├──────────────────────────>│                           │
     │                           │  7. Verify JWT            │
     │                           │  (middleware)             │
     │                           │                           │
     │  8. Protected Resource    │                           │
     │<──────────────────────────┤                           │
```

## Data Flow

### Post Creation Flow
```
1. User fills form → CreatePostModal (client)
2. Form submission → postsAPI.create() (client service)
3. HTTP POST /api/posts → authenticateToken middleware (server)
4. Validation → express-validator (server)
5. Find community → Community.findOne() (database)
6. Create post → Post.create() (database)
7. Invalidate cache → invalidatePostsCache() (server)
8. Return formatted post → formatPost() (server)
9. Update UI → React state update (client)
```

### Comment System Flow
```
1. User submits comment → CommentForm (client)
2. API call → commentsAPI.create() (client service)
3. HTTP POST /api/comments → authenticateToken (server)
4. Verify post exists → Post.findById() (database)
5. Check community membership → UserActivity.findOne() (database)
6. Calculate depth → parentComment.depth + 1 (server)
7. Create comment → Comment.create() (database)
8. Increment post.commentCount → post.save() (database)
9. Create notification → notifyPostComment() (server)
10. Build comment tree → buildCommentTreeLean() (server)
11. Return nested structure → client
12. Update UI → React state update (client)
```

### Voting Flow
```
1. User clicks vote button → VoteButtons (client)
2. API call → postsAPI.vote() or commentsAPI.vote() (client)
3. HTTP POST /api/posts/:id/vote → authenticateToken (server)
4. Find existing vote → Vote.findOne() (database)
5. Calculate karma change → based on vote type (server)
6. Update vote counts → post.upvotes/downvotes (database)
7. Update author karma → User.findByIdAndUpdate() (database)
8. Create notification → notifyPostUpvote() (server)
9. Return vote counts → client
10. Update UI optimistically → React state (client)
```

## Service Communication

### API Endpoints Structure
```
/api
├── /auth
│   ├── POST /register
│   ├── POST /login
│   ├── POST /google
│   ├── POST /forgot-password
│   ├── POST /reset-password
│   ├── POST /check-email
│   ├── GET  /me
│   └── POST /logout
├── /posts
│   ├── GET    /
│   ├── GET    /search
│   ├── GET    /user/saved
│   ├── GET    /by-user/:username
│   ├── GET    /:id
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── POST   /:id/vote
│   ├── POST   /:id/save
│   └── POST   /:id/summarize
├── /comments
│   ├── GET    /
│   ├── GET    /user/:username
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── POST   /:id/vote
├── /communities
│   ├── GET    /
│   ├── GET    /user/recent
│   ├── GET    /user/joined
│   ├── GET    /:id
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   └── POST   /:id/join
├── /users
│   ├── GET    /search
│   ├── GET    /:username/profile
│   ├── GET    /:username/followers
│   ├── PUT    /profile
│   ├── PUT    /change-password
│   └── POST   /:username/follow
├── /notifications
│   ├── GET    /
│   ├── GET    /unread-count
│   ├── PUT    /:id/read
│   └── PUT    /read-all
├── /custom-feeds
│   ├── GET    /
│   ├── GET    /user/:username
│   ├── GET    /:id
│   ├── GET    /:id/posts
│   ├── POST   /
│   ├── PUT    /:id
│   ├── DELETE /:id
│   ├── PUT    /:id/favorite
│   ├── POST   /:id/communities
│   └── DELETE /:id/communities/:communityId
└── /chats
    ├── GET    /
    ├── GET    /unread-count
    ├── POST   /
    ├── GET    /:id
    ├── GET    /:id/messages
    ├── POST   /:id/messages
    ├── DELETE /:id/messages/:messageId
    └── DELETE /:id
```

## Security Architecture

### Authentication Mechanisms
1. **Local Authentication**: Email/password with bcrypt hashing (10 salt rounds)
2. **OAuth 2.0**: Google Sign-In integration
3. **JWT Tokens**: 7-day expiration, stored in localStorage
4. **Password Reset**: Crypto-generated tokens with 1-hour expiration

### Authorization Layers
- **Public Routes**: No authentication required (GET posts, communities)
- **Protected Routes**: JWT required (create post, vote, comment)
- **Owner-Only Routes**: Resource ownership verification (edit/delete own content)

### Security Measures
- CORS configuration with whitelist
- Request validation with express-validator
- Password hashing with bcrypt
- JWT secret stored in environment variables
- SQL injection prevention via Mongoose
- XSS protection via React's built-in escaping
- Rate limiting considerations (not yet implemented)

## Scalability Considerations

### Current Optimizations
1. **Database Indexes**: Compound indexes on frequently queried fields
2. **Lean Queries**: `.lean()` for read-only operations (40% faster)
3. **Caching**: In-memory caching for hot data
4. **Request Deduplication**: Prevents duplicate API calls
5. **Connection Pooling**: 2-10 MongoDB connections
6. **Denormalization**: Username fields to avoid joins

### Future Scalability Paths
1. **Redis Cache**: Replace in-memory cache with Redis
2. **CDN**: Serve static assets via CDN
3. **Load Balancer**: Horizontal scaling of backend servers
4. **Database Sharding**: Partition data by community or user
5. **Message Queue**: Async processing for notifications
6. **WebSocket**: Real-time updates for chat and notifications
7. **Microservices**: Split monolith into services (auth, posts, chat)

## Monitoring & Observability

### Current Logging
- Console logging for errors and requests
- MongoDB Atlas monitoring dashboard
- Vercel deployment logs
- Railway application logs

### Recommended Additions
- Structured logging (Winston, Pino)
- Error tracking (Sentry)
- Performance monitoring (New Relic, DataDog)
- Uptime monitoring (Pingdom, UptimeRobot)
- Analytics (Google Analytics, Mixpanel)

## Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRODUCTION                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌────────────────┐         ┌────────────────┐                  │
│  │   Vercel CDN   │         │    Railway     │                  │
│  │  (Frontend)    │◄───────►│   (Backend)    │                  │
│  │                │  HTTPS  │                │                  │
│  │ - Static files │         │ - Node.js app  │                  │
│  │ - Auto deploy  │         │ - Auto deploy  │                  │
│  │ - Edge network │         │ - Health checks│                  │
│  └────────────────┘         └────────┬───────┘                  │
│                                      │                           │
│                                      │ MongoDB Driver            │
│                                      ▼                           │
│                            ┌────────────────┐                    │
│                            │ MongoDB Atlas  │                    │
│                            │   (Database)   │                    │
│                            │                │                    │
│                            │ - AWS hosted   │                    │
│                            │ - Auto backups │                    │
│                            │ - Monitoring   │                    │
│                            └────────────────┘                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Deployment URLs
- **Frontend**: https://reddit-replica-asu.vercel.app/
- **Backend**: Configured via VITE_API_URL environment variable
- **Database**: MongoDB Atlas connection string

## Performance Metrics

### Target Performance
- **Page Load**: < 2 seconds (first contentful paint)
- **API Response**: < 200ms (cached), < 500ms (database)
- **Database Queries**: < 100ms (indexed queries)
- **Concurrent Users**: 100+ (current architecture)

### Bottlenecks
1. **No pagination**: All posts/comments loaded at once
2. **No lazy loading**: Images loaded immediately
3. **No CDN for images**: User-uploaded images not optimized
4. **Synchronous notifications**: Blocks request processing
5. **No rate limiting**: Vulnerable to abuse

## Disaster Recovery

### Backup Strategy
- **Database**: MongoDB Atlas daily snapshots (7-day retention)
- **Code**: Git version control (GitHub)
- **Environment Variables**: Documented in .env.example files

### Recovery Procedures
1. **Database Restore**: Use MongoDB Atlas point-in-time recovery
2. **Application Rollback**: Revert to previous Git commit
3. **Configuration Restore**: Redeploy with backed-up environment variables

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintainer**: Ahmed Mohamed Naguib
