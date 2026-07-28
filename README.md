<div align="center">

# Reddit Replica

A full-stack Reddit clone with communities, threaded discussions, voting, direct messaging, and AI-assisted post summaries.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.19%2B-5FA04E?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/atlas)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-000000?logo=vercel&logoColor=white)](https://reddit-replica-asu.vercel.app/)

**[Live Demo](https://reddit-replica-asu.vercel.app/)** · **[API Reference](server/docs/api/README.md)** · **[Architecture Docs](docs/)**

</div>

---

## Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Scripts](#scripts)
- [API Reference](#api-reference)
- [Data Model](#data-model)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [License](#license)

---

## Overview

Reddit Replica is a single-page React application backed by a REST API. Users
register locally or through Google, create and join communities, publish text
and image posts, vote, reply in nested comment threads, follow other users,
message them directly, and group communities into custom feeds.

The backend exposes **61 endpoints across 8 modules** and runs either as a
long-lived Node process or as a Vercel serverless function from the same entry
point.

---

## Features

| Category | Description |
|----------|-------------|
| **Authentication** | Email/password registration, Google OAuth 2.0, JWT sessions, password reset by email |
| **Communities** | Create, join, leave, edit, and delete communities with member counts and moderation by the creator |
| **Posts** | Text and image posts with full CRUD, upvote/downvote, and save-for-later |
| **Comments** | Arbitrarily nested comment threads with independent voting |
| **Profiles** | Custom avatars, banners, bios, karma tracking, followers and following |
| **Messaging** | One-to-one conversations with replies, soft deletion, and unread counts |
| **Notifications** | In-app alerts for upvotes, comments, replies, and new followers |
| **Custom Feeds** | Personalised feeds aggregating posts from several communities |
| **Search** | Full-text search across posts, plus community and user lookup |
| **AI Summaries** | One-sentence post summaries via the Google Gemini API |
| **Theming** | Dark and light modes, persisted per browser |

> Messaging and notifications refresh by polling on a visibility-aware interval
> rather than over WebSockets — updates pause entirely while the tab is hidden.

---

## Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19 (with the React Compiler), React Router 7, Vite 7, Lucide icons |
| **Backend** | Node.js, Express 5, Mongoose 9, JSON Web Tokens |
| **Database** | MongoDB (Atlas) |
| **Auth** | Local credentials (bcrypt) + Google OAuth 2.0 |
| **Services** | Google Gemini (summaries), SendGrid (transactional email) |
| **Hosting** | Vercel — static frontend and serverless backend |

---

## Project Structure

```
Reddit-Replica/
├── client/                     # React single-page application
│   └── src/
│       ├── components/         # Feature-grouped UI (post, comment, community, layout, …)
│       ├── context/            # Auth, chat, toast, sidebar, loading providers
│       ├── hooks/              # usePageTitle, usePolling
│       ├── pages/              # One component per route
│       ├── services/api.js     # Single API client with caching and deduplication
│       └── styles/             # Per-component stylesheets
│
├── server/                     # Express REST API
│   ├── api/index.js            # Vercel serverless entry point
│   ├── config/database.js      # Cached Mongoose connection
│   ├── middleware/auth.js      # JWT verification (required and optional)
│   ├── models/                 # Mongoose schemas
│   ├── routes/                 # One router per resource
│   ├── scripts/                # Database seeding and index synchronisation
│   ├── utils/                  # Formatting, notifications, caching, vote helpers
│   ├── docs/                   # API and database documentation
│   └── server.js               # App composition and middleware chain
│
└── docs/                       # Architecture and design documentation
```

---

## Getting Started

### Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| **Node.js** | `^20.19.0` or `>=22.12.0` | Required by Vite 7 and Mongoose 9 |
| **MongoDB** | Any recent version | Local instance or [MongoDB Atlas](https://www.mongodb.com/atlas) |
| Google OAuth credentials | — | Optional, enables Google sign-in |
| Gemini API key | — | Optional, enables AI summaries |
| SendGrid API key | — | Optional, enables password-reset emails |

### 1. Clone and install

```bash
git clone https://github.com/AhmedNaguib01/Reddit-Replica.git
cd Reddit-Replica

# Backend
cd server && npm install

# Frontend
cd ../client && npm install
```

### 2. Configure environment

Copy `server/.env.example` to `server/.env` and fill in the values, then create
`client/.env`. See [Environment Variables](#environment-variables) for the full
reference.

```bash
cd server && cp .env.example .env
```

### 3. Seed sample data (optional)

```bash
cd server && npm run seed
```

> Destructive — `seed` clears every collection in the target database before
> inserting sample users, communities, posts, and comments. Point `MONGODB_URI`
> at a scratch database first. It prints working credentials when it finishes.

### 4. Run both services

```bash
# Terminal 1 — API on http://localhost:5000
cd server && npm run dev

# Terminal 2 — app on http://localhost:5173
cd client && npm run dev
```

---

## Environment Variables

### `server/.env`

| Variable | Required | Description |
|----------|:--------:|-------------|
| `MONGODB_URI` | Yes | MongoDB connection string |
| `JWT_SECRET` | Yes | Secret used to sign JSON Web Tokens |
| `PORT` | No | API port; defaults to `5000`. Ignored on Vercel |
| `NODE_ENV` | No | `development` or `production`. Enables request logging when not production |
| `FRONTEND_URL` | No | Frontend origin, added to the CORS allowlist |
| `CLIENT_URL` | No | Frontend origin used to build password-reset links |
| `GOOGLE_CLIENT_ID` | No | Enables Google sign-in verification |
| `GEMINI_API_KEY` | No | Enables AI post summaries |
| `SENDGRID_API_KEY` | No | Enables password-reset email delivery |
| `SENDGRID_FROM_EMAIL` | No | Verified sender address for SendGrid |

`http://localhost:5173` and `http://localhost:4173` are always allowed by CORS
for local development and production-build previews.

### `client/.env`

| Variable | Required | Description |
|----------|:--------:|-------------|
| `VITE_API_URL` | Yes | API base URL, including the `/api` suffix |
| `VITE_GOOGLE_CLIENT_ID` | No | Google OAuth client ID for the sign-in button |

---

## Scripts

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the API with nodemon hot reload |
| `npm start` | Start the API in production mode |
| `npm run seed` | Reset the target database and insert sample data |
| `npm run sync-indexes` | Align MongoDB indexes with the schemas, dropping obsolete ones |

### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Produce a production build in `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the project |

> Run `npm run sync-indexes` after changing any index declaration in
> `server/models/`. Mongoose creates new indexes automatically but never removes
> ones you have deleted from a schema.

---

## API Reference

Base URL: `http://localhost:5000/api` · Authentication: `Authorization: Bearer <token>`

| Module | Endpoints | Documentation |
|--------|:---------:|---------------|
| Authentication | 8 | [AUTH.md](server/docs/api/AUTH.md) |
| Posts | 11 | [POSTS.md](server/docs/api/POSTS.md) |
| Comments | 6 | [COMMENTS.md](server/docs/api/COMMENTS.md) |
| Communities | 8 | [COMMUNITIES.md](server/docs/api/COMMUNITIES.md) |
| Users | 6 | [USERS.md](server/docs/api/USERS.md) |
| Custom Feeds | 10 | [CUSTOM_FEEDS.md](server/docs/api/CUSTOM_FEEDS.md) |
| Chats | 8 | [CHATS.md](server/docs/api/CHATS.md) |
| Notifications | 4 | [NOTIFICATIONS.md](server/docs/api/NOTIFICATIONS.md) |

`GET /api/health` returns service status and is unauthenticated.

---

## Data Model

Nine Mongoose collections. Full field definitions live in
[DATABASE_SCHEMA.md](server/docs/DATABASE_SCHEMA.md), with a PlantUML diagram in
[database-schema.puml](server/docs/database-schema.puml).

| Collection | Purpose |
|------------|---------|
| `User` | Credentials, profile, karma |
| `Community` | Community metadata and member counts |
| `Post` | Posts, denormalised author and community names, vote tallies |
| `Comment` | Comment tree via `parentComment` and `depth` |
| `Vote` | One document per user/target pair, uniquely indexed |
| `UserActivity` | Saved posts, joined and recent communities, followers, following |
| `Notification` | Per-user notification feed |
| `CustomFeed` | User-defined community groupings |
| `Chat` | Conversations with embedded message subdocuments |

---

## Deployment

Both halves deploy to Vercel as separate projects from the same repository.

### Backend

1. Create a Vercel project and set the root directory to `server`.
2. Keep the framework preset as **Other** — `server/vercel.json` rewrites every
   request to the Express app exported from `server/api/index.js`.
3. Add the environment variables listed [above](#serverenv), with
   `NODE_ENV=production`.
4. Verify at `https://<backend>.vercel.app/api/health`.

> MongoDB Atlas must allow connections from anywhere (`0.0.0.0/0`); Vercel
> functions have no static outbound IP addresses.

### Frontend

1. Create a second Vercel project with the root directory set to `client`.
2. Select the **Vite** framework preset.
3. Set `VITE_API_URL` to the backend URL plus `/api`, and `VITE_GOOGLE_CLIENT_ID`.

> Add every deployed origin to the authorised JavaScript origins of your Google
> OAuth client, otherwise the sign-in button fails to render.

---

## Documentation

| Document | Contents |
|----------|----------|
| [High-Level Architecture](docs/01-HIGH-LEVEL-ARCHITECTURE.md) | System design and request lifecycle |
| [Repository Structure](docs/02-REPOSITORY-STRUCTURE.md) | Directory-by-directory tour |
| [Frontend Architecture](docs/03-FRONTEND-ARCHITECTURE.md) | Component hierarchy, state, and routing |
| [Backend API Design](docs/04-BACKEND-API-DESIGN.md) | Routing, middleware, and error handling |
| [API Reference](server/docs/api/README.md) | Endpoint-level request and response formats |
| [Database Schema](server/docs/DATABASE_SCHEMA.md) | Collections, fields, and indexes |

---

## License

Developed as a university project for CSE343 Web Development at Ain Shams
University.

## Author

**Ahmed Mohamed Naguib**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ahmed-naguib-075415328/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AhmedNaguib01)
