# Reddit Clone

A full-stack Reddit clone with communities, posts, comments, voting, real-time chat, notifications, and custom feeds.

🔗 **Live Demo:** [https://reddit-replica-asu.vercel.app/](https://reddit-replica-asu.vercel.app/)

## Features

- **Authentication** - Email/password registration & login, Google OAuth, password reset
- **Communities** - Create, join, leave, edit, and delete communities
- **Posts** - Create text/image posts, edit, delete, upvote/downvote
- **Comments** - Nested comment threads with voting
- **User Profiles** - Customizable profiles with banners, bios, karma tracking
- **Real-time Chat** - Direct messaging between users with reply support
- **Notifications** - Get notified for upvotes, comments, replies, and follows
- **Custom Feeds** - Create personalized feeds from multiple communities
- **Search** - Search posts, communities, and users
- **Dark/Light Mode** - Theme toggle with system preference detection
- **AI Post Summary** - AI-powered post summarization using Google Gemini

## Tech Stack

**Frontend:** React 19, React Router, Vite, Lucide React  
**Backend:** Node.js, Express 5, MongoDB, Mongoose, JWT  
**Auth:** Local + Google OAuth 2.0  
**AI:** Google Gemini API  
**Deployment:** Vercel (frontend), Railway (backend)

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or Atlas)
- Google OAuth credentials (optional, for Google sign-in)

### Backend Setup

```bash
cd server
npm install
```

Create `server/.env`:
```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key_here
NODE_ENV=development
GOOGLE_CLIENT_ID=your_google_client_id
FRONTEND_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key
```

> **Note:** Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey). The AI Summary feature is optional - if not configured, the feature will be disabled.

Start the server:
```bash
npm run dev
```

### Frontend Setup

```bash
cd client
npm install
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

Start the dev server:
```bash
npm run dev
```

## Deployment

### Backend (Railway)

1. Create project on [Railway](https://railway.app/)
2. Connect GitHub repo, set root to `server`
3. Add environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `GOOGLE_CLIENT_ID`
   - `FRONTEND_URL` (your Vercel URL)

### Frontend (Vercel)

1. Create project on [Vercel](https://vercel.com/)
2. Connect GitHub repo, set root to `client`
3. Framework preset: Vite
4. Add environment variables:
   - `VITE_API_URL` (Railway URL + `/api`)
   - `VITE_GOOGLE_CLIENT_ID`

**Important:** Add your Vercel domain to Google OAuth authorized origins.

## Scripts

### Server
- `npm run dev` - Development with hot reload
- `npm start` - Production server
- `npm run seed` - Seed sample data

### Client
- `npm run dev` - Development server
- `npm run build` - Production build
- `npm run preview` - Preview build
