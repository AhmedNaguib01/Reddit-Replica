require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const postsRoutes = require('./routes/posts');
const communitiesRoutes = require('./routes/communities');
const commentsRoutes = require('./routes/comments');
const usersRoutes = require('./routes/users');
const notificationsRoutes = require('./routes/notifications');
const customFeedsRoutes = require('./routes/customFeeds');
const chatsRoutes = require('./routes/chats');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no Origin header (curl, server-to-server, health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // Allow Vercel preview deployments of the frontend
    if (/^https:\/\/[a-z0-9-]+\.vercel\.app$/i.test(origin)) return callback(null, true);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Ensure MongoDB is connected before handling any route. On a long-running
// server this resolves instantly after the first call; on serverless it makes
// the cold-start connection part of the request lifecycle.
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    res.status(503).json({ message: 'Database unavailable' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/posts', postsRoutes);
app.use('/api/communities', communitiesRoutes);
app.use('/api/comments', commentsRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/custom-feeds', customFeedsRoutes);
app.use('/api/chats', chatsRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server only when running as a normal Node process. On Vercel the app is
// exported and invoked by the serverless runtime instead (see api/index.js).
if (!process.env.VERCEL) {
  connectDB().catch((error) => {
    console.error(`MongoDB Connection Error: ${error.message}`);
  });
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

module.exports = app;
