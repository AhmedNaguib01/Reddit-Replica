const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Cache for user data to avoid repeated DB queries
const userCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const getCachedUser = async (userId) => {
  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.user;
  }
  
  const user = await User.findById(userId).select('username avatar').lean();
  if (user) {
    userCache.set(userId, { user, timestamp: Date.now() });
  }
  return user;
};

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Use cached user data to avoid DB query on every request
    const user = await getCachedUser(decoded.id);
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    // Set req.user with current database values
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

// Optional authentication - doesn't fail if no token, just sets req.user if valid
// OPTIMIZED: Uses JWT data directly without DB query for most cases
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Use JWT data directly - no DB query needed for optional auth
    // The JWT already contains id and username from login
    req.user = {
      id: decoded.id,
      username: decoded.username
    };
  } catch (err) {
    req.user = null;
  }
  next();
};

// Clear user from cache (call after profile update)
const clearUserCache = (userId) => {
  userCache.delete(userId);
};

module.exports = { authenticateToken, optionalAuth, clearUserCache };
