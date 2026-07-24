# Repository Structure & Codebase Overview

## Repository Information

- **Repository**: Reddit Clone Full-Stack Application
- **Live Demo**: https://reddit-replica-asu.vercel.app/
- **Author**: Ahmed Mohamed Naguib
- **University**: Ain Shams University
- **Tech Stack**: MERN (MongoDB, Express, React, Node.js)

## Project Structure

```
reddit-clone/
├── client/                      # Frontend React application
│   ├── public/                  # Static assets
│   │   └── reddit.svg          # Reddit logo
│   ├── src/                    # Source code
│   │   ├── components/         # Reusable React components
│   │   │   ├── auth/          # Authentication components
│   │   │   ├── comment/       # Comment-related components
│   │   │   ├── common/        # Shared UI components
│   │   │   ├── community/     # Community components
│   │   │   ├── feed/          # Feed and post list components
│   │   │   ├── layout/        # Layout components (Header, Sidebar)
│   │   │   ├── post/          # Post components
│   │   │   └── user/          # User profile components
│   │   ├── context/           # React Context providers
│   │   │   ├── AuthContext.jsx        # Authentication state
│   │   │   ├── ChatContext.jsx        # Chat state
│   │   │   ├── LoadingContext.jsx     # Loading state
│   │   │   ├── SidebarContext.jsx     # Sidebar state
│   │   │   └── ToastContext.jsx       # Toast notifications
│   │   ├── hooks/             # Custom React hooks
│   │   │   └── usePageTitle.js        # Dynamic page titles
│   │   ├── pages/             # Route page components
│   │   │   ├── HomePage.jsx           # Main feed
│   │   │   ├── CommunityPage.jsx      # Subreddit view
│   │   │   ├── PostDetailPage.jsx     # Single post view
│   │   │   ├── UserProfilePage.jsx    # User profile
│   │   │   ├── ChatPage.jsx           # Direct messages
│   │   │   ├── SearchResultsPage.jsx  # Search results
│   │   │   └── ... (21 pages total)
│   │   ├── services/          # API service layer
│   │   │   └── api.js         # Axios API client
│   │   ├── styles/            # CSS stylesheets
│   │   │   └── global.css     # Global styles
│   │   ├── App.jsx            # Root component
│   │   └── main.jsx           # Entry point
│   ├── .env                   # Environment variables
│   ├── .gitignore            # Git ignore rules
│   ├── eslint.config.js      # ESLint configuration
│   ├── index.html            # HTML template
│   ├── package.json          # Dependencies
│   ├── vercel.json           # Vercel deployment config
│   └── vite.config.js        # Vite build configuration
│
├── server/                    # Backend Node.js application
│   ├── config/               # Configuration files
│   │   └── database.js       # MongoDB connection
│   ├── docs/                 # Documentation
│   │   ├── api/              # API documentation
│   │   ├── database-schema.puml  # PlantUML diagram
│   │   └── DATABASE_SCHEMA.md    # Schema documentation
│   ├── middleware/           # Express middleware
│   │   └── auth.js           # JWT authentication
│   ├── models/               # Mongoose schemas
│   │   ├── User.js           # User model
│   │   ├── Post.js           # Post model
│   │   ├── Comment.js        # Comment model
│   │   ├── Community.js      # Community model
│   │   ├── Vote.js           # Vote model
│   │   ├── UserActivity.js   # User activity tracking
│   │   ├── Notification.js   # Notification model
│   │   ├── CustomFeed.js     # Custom feed model
│   │   └── Chat.js           # Chat/messaging model
│   ├── routes/               # API route handlers
│   │   ├── auth.js           # Authentication routes
│   │   ├── posts.js          # Post CRUD routes
│   │   ├── comments.js       # Comment routes
│   │   ├── communities.js    # Community routes
│   │   ├── users.js          # User routes
│   │   ├── notifications.js  # Notification routes
│   │   ├── customFeeds.js    # Custom feed routes
│   │   └── chats.js          # Chat routes
│   ├── scripts/              # Utility scripts
│   │   └── seed.js           # Database seeding
│   ├── utils/                # Helper utilities
│   │   ├── email.js          # Email service (SendGrid)
│   │   ├── helpers.js        # Formatting helpers
│   │   └── notifications.js  # Notification helpers
│   ├── .env                  # Environment variables
│   ├── .gitignore           # Git ignore rules
│   ├── package.json         # Dependencies
│   └── server.js            # Express app entry point
│
├── .git/                     # Git repository
├── .vscode/                  # VS Code settings
└── README.md                 # Project documentation
```

## Core vs Optional Components

### Core Components (Essential Functionality)

#### Backend Core
```
server/
├── server.js                 # ⭐ Application entry point
├── config/database.js        # ⭐ Database connection
├── middleware/auth.js        # ⭐ Authentication middleware
├── models/                   # ⭐ All models are core
│   ├── User.js              # ⭐ User authentication
│   ├── Post.js              # ⭐ Content creation
│   ├── Comment.js           # ⭐ Discussions
│   ├── Community.js         # ⭐ Subreddits
│   └── Vote.js              # ⭐ Voting system
├── routes/                   # ⭐ Core API endpoints
│   ├── auth.js              # ⭐ Login/register
│   ├── posts.js             # ⭐ Post CRUD
│   ├── comments.js          # ⭐ Comment CRUD
│   └── communities.js       # ⭐ Community CRUD
└── utils/helpers.js          # ⭐ Formatting utilities
```

#### Frontend Core
```
client/src/
├── App.jsx                   # ⭐ Root component
├── main.jsx                  # ⭐ Entry point
├── context/                  # ⭐ State management
│   ├── AuthContext.jsx      # ⭐ Authentication
│   └── LoadingContext.jsx   # ⭐ Loading states
├── services/api.js           # ⭐ API client
├── pages/                    # ⭐ Core pages
│   ├── HomePage.jsx         # ⭐ Main feed
│   ├── CommunityPage.jsx    # ⭐ Subreddit view
│   └── PostDetailPage.jsx   # ⭐ Post view
└── components/               # ⭐ Core UI components
    ├── layout/Header.jsx    # ⭐ Navigation
    ├── post/PostCard.jsx    # ⭐ Post display
    └── comment/CommentTree.jsx  # ⭐ Comment threads
```

### Optional/Enhancement Components

#### Backend Optional
```
server/
├── models/
│   ├── Notification.js       # 🔔 Real-time notifications
│   ├── CustomFeed.js         # 📋 Multi-reddit feature
│   ├── Chat.js               # 💬 Direct messaging
│   └── UserActivity.js       # 📊 Activity tracking
├── routes/
│   ├── notifications.js      # 🔔 Notification API
│   ├── customFeeds.js        # 📋 Custom feed API
│   └── chats.js              # 💬 Chat API
└── utils/
    ├── email.js              # 📧 Password reset emails
    └── notifications.js      # 🔔 Notification helpers
```

#### Frontend Optional
```
client/src/
├── context/
│   ├── ChatContext.jsx       # 💬 Chat state
│   ├── SidebarContext.jsx    # 🎨 UI preferences
│   └── ToastContext.jsx      # 🍞 Toast notifications
├── pages/
│   ├── ChatPage.jsx          # 💬 Messaging
│   ├── SavedPostsPage.jsx    # 🔖 Saved content
│   ├── CustomFeedPage.jsx    # 📋 Custom feeds
│   └── SearchResultsPage.jsx # 🔍 Search
└── components/
    ├── user/FollowButton.jsx # 👥 Social features
    └── post/AISummary.jsx    # 🤖 AI summaries
```

## Suggested Reading Order

### For New Developers

#### Phase 1: Understanding the Foundation (Day 1)
1. **README.md** - Project overview and setup
2. **server/server.js** - Backend entry point
3. **server/config/database.js** - Database connection
4. **client/src/main.jsx** - Frontend entry point
5. **client/src/App.jsx** - React app structure

#### Phase 2: Authentication Flow (Day 1-2)
6. **server/models/User.js** - User schema
7. **server/middleware/auth.js** - JWT authentication
8. **server/routes/auth.js** - Login/register endpoints
9. **client/src/context/AuthContext.jsx** - Auth state management
10. **client/src/components/auth/LoginModal.jsx** - Login UI

#### Phase 3: Core Features (Day 2-3)
11. **server/models/Post.js** - Post schema
12. **server/models/Comment.js** - Comment schema
13. **server/models/Community.js** - Community schema
14. **server/routes/posts.js** - Post CRUD operations
15. **server/routes/comments.js** - Comment operations
16. **server/routes/communities.js** - Community operations

#### Phase 4: Frontend Architecture (Day 3-4)
17. **client/src/services/api.js** - API client and caching
18. **client/src/pages/HomePage.jsx** - Main feed page
19. **client/src/pages/PostDetailPage.jsx** - Post detail page
20. **client/src/components/post/PostCard.jsx** - Post display
21. **client/src/components/comment/CommentTree.jsx** - Comment threads

#### Phase 5: Advanced Features (Day 4-5)
22. **server/models/Vote.js** - Voting system
23. **server/models/UserActivity.js** - User tracking
24. **server/utils/helpers.js** - Utility functions
25. **server/utils/notifications.js** - Notification system
26. **client/src/context/LoadingContext.jsx** - Loading states

#### Phase 6: Optional Features (Day 5+)
27. **server/models/Chat.js** - Messaging system
28. **server/models/Notification.js** - Notifications
29. **server/models/CustomFeed.js** - Custom feeds
30. **client/src/pages/ChatPage.jsx** - Chat UI

### For Code Review

#### Critical Path (Must Review)
1. Authentication: `server/routes/auth.js`, `server/middleware/auth.js`
2. Data Models: All files in `server/models/`
3. API Endpoints: All files in `server/routes/`
4. Security: Password hashing, JWT validation, input validation

#### Performance Path (Optimization Review)
1. Caching: `server/routes/posts.js` (cache implementation)
2. Database Queries: Look for `.lean()`, indexes in models
3. API Client: `client/src/services/api.js` (request deduplication)
4. Frontend Performance: Context providers, component re-renders

#### Feature Path (Functionality Review)
1. Voting System: `server/routes/posts.js` vote endpoint
2. Comment Threading: `server/routes/comments.js` tree building
3. Search: `server/routes/posts.js` search endpoint
4. User Profiles: `server/routes/users.js` profile endpoint

## File Naming Conventions

### Backend
- **Models**: PascalCase (e.g., `User.js`, `Post.js`)
- **Routes**: camelCase (e.g., `auth.js`, `posts.js`)
- **Utilities**: camelCase (e.g., `helpers.js`, `email.js`)
- **Config**: camelCase (e.g., `database.js`)

### Frontend
- **Components**: PascalCase (e.g., `PostCard.jsx`, `Header.jsx`)
- **Pages**: PascalCase with "Page" suffix (e.g., `HomePage.jsx`)
- **Context**: PascalCase with "Context" suffix (e.g., `AuthContext.jsx`)
- **Hooks**: camelCase with "use" prefix (e.g., `usePageTitle.js`)
- **Services**: camelCase (e.g., `api.js`)
- **Styles**: camelCase (e.g., `global.css`)

## Key Dependencies

### Frontend Dependencies
```json
{
  "react": "^19.1.1",                    // UI library
  "react-dom": "^19.1.1",                // React DOM renderer
  "react-router-dom": "^7.9.4",          // Routing
  "axios": "^1.12.2",                    // HTTP client
  "lucide-react": "^0.548.0",            // Icons
  "@react-oauth/google": "^0.12.2"       // Google OAuth
}
```

### Backend Dependencies
```json
{
  "express": "^5.1.0",                   // Web framework
  "mongoose": "^9.0.0",                  // MongoDB ODM
  "jsonwebtoken": "^9.0.2",              // JWT authentication
  "bcryptjs": "^3.0.3",                  // Password hashing
  "cors": "^2.8.5",                      // CORS middleware
  "express-validator": "^7.3.1",         // Input validation
  "google-auth-library": "^10.5.0",      // Google OAuth
  "@google/generative-ai": "^0.24.1",    // Gemini AI
  "@sendgrid/mail": "^8.1.6"             // Email service
}
```

## Environment Variables

### Client (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

### Server (.env)
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
SENDGRID_API_KEY=your_sendgrid_api_key
SENDGRID_FROM_EMAIL=your_verified_email
```

## Build & Development Scripts

### Client Scripts
```bash
npm run dev      # Start Vite dev server (port 5173)
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

### Server Scripts
```bash
npm run dev      # Start with nodemon (hot reload)
npm start        # Start production server
npm run seed     # Seed database with sample data
```

## Code Organization Principles

### Backend Principles
1. **Separation of Concerns**: Routes → Models → Database
2. **Middleware Pattern**: Authentication, validation, error handling
3. **RESTful Design**: Resource-based URLs, HTTP verbs
4. **Denormalization**: Username fields for performance
5. **Caching**: In-memory cache for hot data

### Frontend Principles
1. **Component Composition**: Small, reusable components
2. **Context for State**: Global state via Context API
3. **Service Layer**: API calls abstracted in services
4. **Optimistic Updates**: UI updates before server confirmation
5. **Error Boundaries**: Graceful error handling

## Testing Strategy

### Current State
- ❌ No automated tests implemented
- ✅ Manual testing during development
- ✅ Browser DevTools for debugging

### Recommended Testing
```
Recommended Test Coverage:
├── Backend (70% coverage target)
│   ├── Unit Tests (Jest)
│   │   ├── Models (validation, methods)
│   │   ├── Utils (helpers, formatters)
│   │   └── Middleware (auth, validation)
│   ├── Integration Tests (Supertest)
│   │   ├── Auth endpoints
│   │   ├── CRUD operations
│   │   └── Voting system
│   └── E2E Tests (Playwright)
│       └── Critical user flows
│
└── Frontend (60% coverage target)
    ├── Unit Tests (Vitest + React Testing Library)
    │   ├── Components (rendering, interactions)
    │   ├── Hooks (custom hooks)
    │   └── Utils (formatters)
    ├── Integration Tests
    │   ├── Context providers
    │   ├── API service
    │   └── Form submissions
    └── E2E Tests (Playwright)
        ├── Login/register flow
        ├── Post creation
        └── Comment threading
```

## Common Development Tasks

### Adding a New Feature
1. Create database model in `server/models/`
2. Add API routes in `server/routes/`
3. Create API service methods in `client/src/services/api.js`
4. Build UI components in `client/src/components/`
5. Create page component in `client/src/pages/`
6. Add route in `client/src/App.jsx`

### Debugging Tips
- **Backend**: Check `server.js` console logs
- **Frontend**: Use React DevTools and browser console
- **Database**: Use MongoDB Compass or Atlas UI
- **API**: Use Postman or Thunder Client
- **Network**: Check browser Network tab

### Performance Optimization
1. Add database indexes for slow queries
2. Implement caching for frequently accessed data
3. Use `.lean()` for read-only queries
4. Optimize React re-renders with `useMemo`/`useCallback`
5. Lazy load images and components

---

**Last Updated**: January 2026
**Version**: 1.0
**Maintainer**: Ahmed Mohamed Naguib
