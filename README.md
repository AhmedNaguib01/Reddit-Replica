# Reddit Clone

A full-stack Reddit clone featuring communities, posts, comments, voting, real-time chat, notifications, and custom feeds — built with modern web technologies.

🔗 **Live Demo:** [reddit-replica-asu.vercel.app](https://reddit-replica-asu.vercel.app/)

---

## ✨ Features

| Category | Features |
|----------|----------|
| **Authentication** | Email/password registration, Google OAuth 2.0, password reset via email |
| **Communities** | Create, join, leave, edit, and delete communities |
| **Posts** | Text & image posts with full CRUD operations, upvote/downvote system |
| **Comments** | Nested comment threads with voting support |
| **User Profiles** | Customizable profiles with banners, bios, and karma tracking |
| **Real-time Chat** | Direct messaging between users with reply support |
| **Notifications** | Real-time alerts for upvotes, comments, replies, and follows |
| **Custom Feeds** | Create personalized feeds from multiple communities |
| **Search** | Search posts, communities, and users |
| **Theming** | Dark/Light mode with system preference detection |
| **AI Integration** | AI-powered post summarization using Google Gemini |

---

## 🛠️ Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, React Router, Vite, Lucide React |
| **Backend** | Node.js, Express 5, MongoDB, Mongoose, JWT |
| **Authentication** | Local + Google OAuth 2.0 |
| **AI** | Google Gemini API |
| **Deployment** | Vercel (Frontend), Railway (Backend) |

---

## 🚀 Getting Started

### Prerequisites

- Node.js v18+
- MongoDB (local or [MongoDB Atlas](https://www.mongodb.com/atlas))
- Google OAuth credentials *(optional, for Google sign-in)*
- Gemini API key *(optional, for AI summaries)*

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

> 💡 Get your Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey). The AI Summary feature is optional — if not configured, the feature will be disabled.

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

Start the development server:

```bash
npm run dev
```

---

## ☁️ Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository and set the root directory to `server`
3. Configure environment variables:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`
   - `GOOGLE_CLIENT_ID`
   - `FRONTEND_URL` *(your Vercel deployment URL)*
   - `GEMINI_API_KEY` *(optional)*

### Frontend (Vercel)

1. Create a new project on [Vercel](https://vercel.com/)
2. Connect your GitHub repository and set the root directory to `client`
3. Select **Vite** as the framework preset
4. Configure environment variables:
   - `VITE_API_URL` *(Railway URL + `/api`)*
   - `VITE_GOOGLE_CLIENT_ID`

> ⚠️ **Important:** Add your Vercel domain to Google OAuth authorized origins in the Google Cloud Console.

---

## 📜 Available Scripts

### Server

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm start` | Start production server |
| `npm run seed` | Seed database with sample data |

### Client

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Create production build |
| `npm run preview` | Preview production build locally |

---

## 📄 License

This project was developed as a university project at Ain Shams University.

---

## 👤 Author

**Ahmed Mohamed Naguib**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/ahmed-naguib-075415328/)
[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/AhmedNaguib01)
