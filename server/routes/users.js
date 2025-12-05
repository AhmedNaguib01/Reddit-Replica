const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const { notifyFollow } = require('../utils/notifications');

const router = express.Router();

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search - Search users by username
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.status(200).json([]);
    }

    const users = await User.find({
      username: { $regex: escapeRegex(q.trim()), $options: 'i' }
    })
    .select('-password -passwordResetToken -passwordResetExpires')
    .limit(10)
    .lean();

    res.status(200).json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile - Update own profile (protected) - MUST BE BEFORE /:username
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, bio, bannerColor, avatar } = req.body;

    if (username && username.trim().length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldUsername = user.username;
    const newUsername = username ? username.trim() : oldUsername;

    // Check if username is taken (only if changing)
    if (username && newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
      const existingUser = await User.findOne({ 
        username: { $regex: new RegExp(`^${escapeRegex(newUsername)}$`, 'i') },
        _id: { $ne: req.user.id }
      }).lean();
      
      if (existingUser) {
        return res.status(409).json({ message: 'Username already taken' });
      }

      // Update username in all related documents (run in parallel)
      await Promise.all([
        Post.updateMany({ author: req.user.id }, { $set: { authorUsername: newUsername } }),
        Comment.updateMany({ author: req.user.id }, { $set: { authorUsername: newUsername } }),
        Community.updateMany({ creator: req.user.id }, { $set: { creatorUsername: newUsername } }),
        Notification.updateMany({ fromUser: req.user.id }, { $set: { fromUsername: newUsername } }),
        Chat.updateMany(
          { participants: req.user.id },
          { $set: { 'participantUsernames.$[elem]': newUsername } },
          { arrayFilters: [{ elem: oldUsername }] }
        ),
        Chat.updateMany(
          { 'messages.sender': req.user.id },
          { $set: { 'messages.$[msg].senderUsername': newUsername } },
          { arrayFilters: [{ 'msg.sender': req.user.id }] }
        ),
        Chat.updateMany(
          { 'lastMessage.senderUsername': oldUsername },
          { $set: { 'lastMessage.senderUsername': newUsername } }
        )
      ]);

      user.username = newUsername;
    }

    if (bio !== undefined) user.bio = bio.trim();
    if (bannerColor) user.bannerColor = bannerColor;
    if (avatar) user.avatar = avatar.trim();

    await user.save();

    res.status(200).json(user.toJSON());
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:username - Get user profile
router.get('/:username', async (req, res) => {
  try {
    // Use case-insensitive exact match with lean for performance
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    })
    .select('-password -passwordResetToken -passwordResetExpires')
    .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get follower/following counts - only select what we need
    const activity = await UserActivity.findOne({ user: user._id })
      .select('followers following')
      .lean();
    
    // Format response
    const userData = {
      ...user,
      id: user._id,
      cakeDay: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      followerCount: activity?.followers?.length || 0,
      followingCount: activity?.following?.length || 0
    };

    res.status(200).json(userData);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/users/:username/follow - Follow/unfollow user (protected)
router.post('/:username/follow', authenticateToken, async (req, res) => {
  try {
    const userToFollow = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    }).select('_id username').lean();
    
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToFollow._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Get or create activity for both users in parallel
    let [followerActivity, followingActivity] = await Promise.all([
      UserActivity.findOne({ user: req.user.id }),
      UserActivity.findOne({ user: userToFollow._id })
    ]);

    if (!followerActivity) {
      followerActivity = await UserActivity.create({ user: req.user.id });
    }
    if (!followingActivity) {
      followingActivity = await UserActivity.create({ user: userToFollow._id });
    }

    const index = followerActivity.following.indexOf(userToFollow._id);
    let following;

    if (index > -1) {
      // Unfollow
      followerActivity.following.splice(index, 1);
      const followerIndex = followingActivity.followers.indexOf(req.user.id);
      if (followerIndex > -1) {
        followingActivity.followers.splice(followerIndex, 1);
      }
      following = false;
    } else {
      // Follow
      followerActivity.following.push(userToFollow._id);
      if (!followingActivity.followers.includes(req.user.id)) {
        followingActivity.followers.push(req.user.id);
      }
      following = true;

      // Notify the user being followed (non-blocking)
      notifyFollow(userToFollow._id, req.user).catch(err => console.error('Notify error:', err));
    }

    // Save both in parallel
    await Promise.all([followerActivity.save(), followingActivity.save()]);

    res.status(200).json({
      following,
      message: following ? 'User followed' : 'User unfollowed'
    });
  } catch (error) {
    console.error('Follow user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:username/followers - Get user's followers
router.get('/:username/followers', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    }).select('_id').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activity = await UserActivity.findOne({ user: user._id })
      .select('followers')
      .populate('followers', '-password -passwordResetToken -passwordResetExpires')
      .lean();
    
    res.status(200).json(activity?.followers || []);
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:username/following - Get users that this user follows
router.get('/:username/following', async (req, res) => {
  try {
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    }).select('_id').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activity = await UserActivity.findOne({ user: user._id })
      .select('following')
      .populate('following', '-password -passwordResetToken -passwordResetExpires')
      .lean();
    
    res.status(200).json(activity?.following || []);
  } catch (error) {
    console.error('Get following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/users/:username/is-following - Check if current user follows this user (protected)
router.get('/:username/is-following', authenticateToken, async (req, res) => {
  try {
    const userToCheck = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    }).select('_id').lean();
    
    if (!userToCheck) {
      return res.status(404).json({ message: 'User not found' });
    }

    const activity = await UserActivity.findOne({ user: req.user.id })
      .select('following')
      .lean();
    
    const following = activity?.following?.some(id => id.toString() === userToCheck._id.toString()) || false;

    res.status(200).json({ following });
  } catch (error) {
    console.error('Check following error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
