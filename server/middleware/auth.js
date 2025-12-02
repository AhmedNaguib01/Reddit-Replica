const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch current user data from database to get updated username
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(403).json({ message: 'User not found' });
    }
    
    // Set req.user with current database values
    req.user = {
      id: user._id.toString(),
      username: user.username,
      avatar: user.avatar
    };
    next();
  } catch (err) {
    return res.status(403).json({ message: 'Invalid or expired token' });
  }
};

// Optional authentication - doesn't fail if no token, just sets req.user if valid
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch current user data from database to get updated username
    const user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = {
        id: user._id.toString(),
        username: user.username,
        avatar: user.avatar
      };
    } else {
      req.user = null;
    }
  } catch (err) {
    req.user = null;
  }
  next();
};

module.exports = { authenticateToken, optionalAuth };
