const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { body, validationResult } = require('express-validator');
const { OAuth2Client } = require('google-auth-library');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { authenticateToken } = require('../middleware/auth');
const { sendPasswordResetEmail } = require('../utils/email');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user._id.toString(), 
      username: user.username 
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
};

// POST /api/auth/register
router.post('/register', 
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail(),
    body('username')
      .trim()
      .isLength({ min: 3, max: 20 })
      .withMessage('Username must be between 3 and 20 characters')
      .matches(/^[a-z0-9_]+$/)
      .withMessage('Username can only contain lowercase letters, numbers, and underscores (no spaces or capitals)'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { email, username, password } = req.body;

      // Check if email already exists
      const existingEmail = await User.findOne({ email: email.toLowerCase() });
      if (existingEmail) {
        return res.status(409).json({ message: 'Email already in use' });
      }

      // Check if username already exists
      const existingUser = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      if (existingUser) {
        return res.status(409).json({ message: 'Username already exists' });
      }

      // Create new user (password is hashed by pre-save hook)
      const newUser = await User.create({ email, username, password });

      // Create user activity record
      await UserActivity.create({ user: newUser._id });

      // Generate token
      const token = generateToken(newUser);

      res.status(201).json({
        user: newUser.toJSON(),
        token
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ message: 'Server error during registration' });
    }
  }
);

// POST /api/auth/google - Google OAuth authentication
router.post('/google', async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: 'Google credential is required' });
    }

    // Verify the Google ID token
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub: googleId, email, name, picture } = payload;

    // Check if user exists with this Google ID
    let user = await User.findOne({ googleId });

    if (user) {
      // Existing Google user - update avatar if they have placeholder or Google avatar
      if (picture && (!user.avatar || user.avatar.includes('placehold.co') || user.avatar.includes('googleusercontent.com'))) {
        user.avatar = picture;
        await user.save();
      }
    } else {
      // Check if email already exists (user registered with email/password)
      const existingEmailUser = await User.findOne({ email: email.toLowerCase() });
      
      if (existingEmailUser) {
        // Link Google account to existing user
        existingEmailUser.googleId = googleId;
        existingEmailUser.authProvider = existingEmailUser.authProvider === 'local' ? 'local' : 'google';
        // Update avatar if user has placeholder
        if (picture && (!existingEmailUser.avatar || existingEmailUser.avatar.includes('placehold.co'))) {
          existingEmailUser.avatar = picture;
        }
        await existingEmailUser.save();
        user = existingEmailUser;
      } else {
        // Create new user with Google account
        // Generate a unique username from email or name (lowercase)
        let baseUsername = (name || email.split('@')[0])
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, '')
          .substring(0, 15);
        
        let username = baseUsername;
        let counter = 1;
        
        // Ensure username is unique
        while (await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } })) {
          username = `${baseUsername}${counter}`;
          counter++;
        }

        // Ensure username meets minimum length
        if (username.length < 3) {
          username = `user${Date.now().toString().slice(-6)}`;
        }

        user = await User.create({
          email: email.toLowerCase(),
          username,
          displayName: name || username, // Use Google name as display name, fallback to username
          googleId,
          authProvider: 'google',
          avatar: picture || undefined,
        });

        // Create user activity record
        await UserActivity.create({ user: user._id });
      }
    }

    // Generate JWT token
    const token = generateToken(user);

    res.status(200).json({
      user: user.toJSON(),
      token,
    });
  } catch (error) {
    console.error('Google auth error:', error);
    res.status(401).json({ message: 'Invalid Google credential' });
  }
});

// POST /api/auth/login
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { username, password } = req.body;

      // Find user (case-insensitive)
      const user = await User.findOne({ username: { $regex: new RegExp(`^${username}$`, 'i') } });
      if (!user) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Verify password
      const isValidPassword = await user.comparePassword(password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid username or password' });
      }

      // Generate token
      const token = generateToken(user);

      res.status(200).json({
        user: user.toJSON(),
        token
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Server error during login' });
    }
  }
);

// POST /api/auth/forgot-password
router.post('/forgot-password',
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email is required')
      .isEmail()
      .withMessage('Please enter a valid email address')
  ],
  async (req, res) => {
    try {
      // Debug logging for production issues
      console.log('Forgot password request body:', JSON.stringify(req.body));
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', JSON.stringify(errors.array()));
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { email } = req.body;
      const normalizedEmail = email.trim().toLowerCase();

      const user = await User.findOne({ email: normalizedEmail });
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.status(200).json({ 
          message: 'If an account with that email exists, we sent a password reset link' 
        });
      }

      // Check if user signed up with Google OAuth
      if (user.authProvider === 'google' && !user.password) {
        return res.status(400).json({ 
          message: 'This account was created using Google Sign-In. Please use Google to access your account.',
          isGoogleAccount: true
        });
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

      // Save hashed token to user
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
      await user.save();

      // Send email with unhashed token (non-blocking, fire and forget)
      sendPasswordResetEmail(user.email, resetToken);

      res.status(200).json({ 
        message: 'If an account with that email exists, we sent a password reset link' 
      });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ message: 'Error sending password reset email' });
    }
  }
);

// POST /api/auth/reset-password
router.post('/reset-password',
  [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { token, password } = req.body;

      // Hash the incoming token to compare with stored hash
      const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

      const user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      // Update password and clear reset fields
      user.password = password;
      user.resetPasswordToken = undefined;
      user.resetPasswordExpires = undefined;
      await user.save();

      res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ message: 'Error resetting password' });
    }
  }
);

// POST /api/auth/check-email - Check if email is available
router.post('/check-email',
  [
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please enter a valid email address')
      .normalizeEmail()
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          message: errors.array()[0].msg,
          errors: errors.array() 
        });
      }

      const { email } = req.body;
      const existingUser = await User.findOne({ email: email.toLowerCase() });

      res.status(200).json({ 
        available: !existingUser,
        message: existingUser ? 'Email already in use' : 'Email is available'
      });
    } catch (error) {
      console.error('Check email error:', error);
      res.status(500).json({ message: 'Error checking email' });
    }
  }
);

// GET /api/auth/me - Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -passwordResetToken -passwordResetExpires')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ ...user, id: user._id });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/auth/logout
router.post('/logout', authenticateToken, (req, res) => {
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
