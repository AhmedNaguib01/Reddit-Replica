# Reddit-Replica

A full-stack Reddit clone with posts, comments, voting, and communities built using modern web technologies.

🔗 **Live Demo:** [https://reddit-replica-asu.vercel.app/](https://reddit-replica-asu.vercel.app/)

## Tech Stack

**Frontend:** React 19, React Router, Axios, Lucide React, Vite  
**Backend:** Node.js, Express 5, MongoDB, Mongoose, JWT Authentication  
**Deployment:** Frontend on Vercel, Backend on Railway

## Getting Started

### Prerequisites

- Node.js (v18+)
- MongoDB database (local or MongoDB Atlas)

### Backend Setup

1. Navigate to the server directory:
   ```bash
   cd server
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file with the following variables:
   ```env
   PORT=5000
   JWT_SECRET=your_secret_key_here
   NODE_ENV=development
   MONGODB_URI=your_mongodb_connection_string
   ```

4. (Optional) Seed the database:
   ```bash
   npm run seed
   ```

5. Start the server:
   ```bash
   npm run dev
   ```

### Frontend Setup

1. Navigate to the client directory:
   ```bash
   cd client
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file:
   ```env
   VITE_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```bash
   npm run dev
   ```

## Deployment

### Backend (Railway)

1. Create a new project on [Railway](https://railway.app/)
2. Connect your GitHub repository
3. Set the root directory to `server`
4. Add environment variables:
   - `PORT` (Railway provides this automatically)
   - `JWT_SECRET`
   - `MONGODB_URI`
   - `NODE_ENV=production`
5. Railway will automatically deploy on push to main

### Frontend (Vercel)

1. Create a new project on [Vercel](https://vercel.com/)
2. Connect your GitHub repository
3. Set the root directory to `client`
4. Set the framework preset to Vite
5. Add environment variable:
   - `VITE_API_URL` = your Railway backend URL + `/api`
6. Deploy

## Available Scripts

### Server
- `npm start` - Start production server
- `npm run dev` - Start development server with hot reload
- `npm run seed` - Seed database with sample data

### Client
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
