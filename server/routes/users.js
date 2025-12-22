const express = require('express');
const { authenticateToken, optionalAuth, clearUserCache } = require('../middleware/auth');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const CustomFeed = require('../models/CustomFeed');
const Vote = require('../models/Vote');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const { notifyFollow } = require('../utils/notifications');
const { getTimeAgo, ensureAvatar, ensureAvatars } = require('../utils/helpers');

const router = express.Router();

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/users/search - Search users by username or displayName
router.get('/search', async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 1) {
      return res.status(200).json([]);
    }

    const searchRegex = { $regex: escapeRegex(q.trim()), $options: 'i' };
    const users = await User.find({
      $or: [
        { username: searchRegex },
        { displayName: searchRegex }
      ]
    })
    .select('-password -passwordResetToken -passwordResetExpires')
    .limit(10)
    .lean();

    res.status(200).json(ensureAvatars(users));
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/change-password - Change password (protected)
router.put('/change-password', authenticateToken, async (req, res) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    if (!email || !oldPassword || !newPassword) {
      return res.status(400).json({ message: 'Email, current password, and new password are required' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Verify email matches
    if (email.trim().toLowerCase() !== user.email.toLowerCase()) {
      return res.status(400).json({ message: 'Email does not match your account' });
    }

    // Verify old password
    const isMatch = await user.comparePassword(oldPassword);
    if (!isMatch) {
      return res.status(400).json({ message: 'Current password is incorrect' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters' });
    }

    user.password = newPassword; // Will be hashed by pre-save hook
    await user.save();

    res.status(200).json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/users/profile - Update own profile (protected) - MUST BE BEFORE /:username
router.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { username, displayName, bio, bannerColor, bannerUrl, avatar } = req.body;

    if (username) {
      const trimmedUsername = username.trim().toLowerCase();
      if (trimmedUsername.length < 3) {
        return res.status(400).json({ message: 'Username must be at least 3 characters' });
      }
      if (trimmedUsername.length > 20) {
        return res.status(400).json({ message: 'Username must be at most 20 characters' });
      }
      if (!/^[a-z0-9_]+$/.test(trimmedUsername)) {
        return res.status(400).json({ message: 'Username can only contain lowercase letters, numbers, and underscores (no spaces or capitals)' });
      }
    }

    if (displayName !== undefined) {
      const trimmedDisplayName = displayName.trim();
      if (trimmedDisplayName.length > 30) {
        return res.status(400).json({ message: 'Display name must be at most 30 characters' });
      }
    }

    // First get the user to check current values
    const existingUser = await User.findById(req.user.id);
    if (!existingUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const oldUsername = existingUser.username;
    const newUsername = username ? username.trim().toLowerCase() : oldUsername;

    // Check if username is taken (only if changing)
    if (username && newUsername.toLowerCase() !== oldUsername.toLowerCase()) {
      const userWithSameName = await User.findOne({ 
        username: { $regex: new RegExp(`^${escapeRegex(newUsername)}$`, 'i') },
        _id: { $ne: req.user.id }
      }).lean();
      
      if (userWithSameName) {
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

    }

    // Build update object - only include fields that are being changed
    const updateFields = {};
    if (username && newUsername !== oldUsername) {
      updateFields.username = newUsername;
    }
    if (displayName !== undefined) {
      const trimmedDisplayName = displayName.trim();
      // If displayName is empty, default to username
      updateFields.displayName = trimmedDisplayName || newUsername;
    }
    if (bio !== undefined) updateFields.bio = bio.trim();
    if (bannerColor !== undefined) updateFields.bannerColor = bannerColor;
    if (bannerUrl !== undefined) updateFields.bannerUrl = bannerUrl;
    if (avatar !== undefined) updateFields.avatar = avatar;

    // Use findByIdAndUpdate to avoid full document validation
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true, runValidators: false }
    );
    
    // Clear user cache after profile update
    clearUserCache(req.user.id);

    res.status(200).json(updatedUser.toJSON());
  } catch (error) {
    console.error('Update profile error:', error.message, error.stack);
    res.status(500).json({ message: error.message || 'Server error' });
  }
});

// GET /api/users/:username/profile - Get complete user profile data in one request (optimized)
router.get('/:username/profile', optionalAuth, async (req, res) => {
  try {
    const usernameRegex = new RegExp(`^${escapeRegex(req.params.username)}$`, 'i');
    
    // Fetch user first to get the ID
    const user = await User.findOne({ username: usernameRegex })
      .select('-password -passwordResetToken -passwordResetExpires -googleId')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user._id;
    const isOwnProfile = req.user && req.user.id === userId.toString();

    // Build all queries upfront for maximum parallelization
    const queries = [
      // User's activity - only populate what we need (limit followers/following for performance)
      UserActivity.findOne({ user: userId })
        .populate({ path: 'followers', select: 'username displayName avatar', options: { limit: 100 } })
        .populate({ path: 'following', select: 'username displayName avatar', options: { limit: 100 } })
        .lean(),
      
      // User's posts - only fetch needed fields
      Post.find({ author: userId })
        .select('title type content authorUsername communityName upvotes downvotes commentCount createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      
      // User's comments - only fetch needed fields
      Comment.find({ author: userId })
        .select('content post authorUsername upvotes downvotes createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),
      
      // User's public custom feeds
      CustomFeed.find({ creator: userId, isPrivate: false, showOnProfile: true })
        .select('name description communities isPrivate')
        .populate('communities', 'name iconUrl')
        .sort({ name: 1 })
        .limit(10)
        .lean(),
    ];

    // Add vote/follow queries if user is logged in
    if (req.user) {
      if (!isOwnProfile) {
        queries.push(UserActivity.findOne({ user: req.user.id }).select('following').lean());
      } else {
        queries.push(null); // placeholder
      }
    } else {
      queries.push(null);
    }

    // Execute all queries in parallel
    const [activity, posts, comments, customFeeds, currentUserActivity] = await Promise.all(queries);

    // Get vote info and saved posts in parallel (only if logged in)
    let voteMap = {};
    let savedPostIds = new Set();
    
    if (req.user && posts.length > 0) {
      const postIds = posts.map(p => p._id);
      const voteQuery = Vote.find({
        user: req.user.id,
        target: { $in: postIds },
        targetType: 'post'
      }).select('target voteType').lean();

      if (isOwnProfile) {
        const [votes, savedActivity] = await Promise.all([
          voteQuery,
          UserActivity.findOne({ user: req.user.id }).select('savedPosts').lean()
        ]);
        votes.forEach(v => { voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down'; });
        savedPostIds = new Set(savedActivity?.savedPosts?.map(id => id.toString()) || []);
      } else {
        const votes = await voteQuery;
        votes.forEach(v => { voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down'; });
      }
    }

    // Format posts with vote info
    const formattedPosts = posts.map(post => ({
      ...post,
      id: post._id,
      voteCount: post.upvotes - post.downvotes,
      timeAgo: getTimeAgo(post.createdAt),
      subreddit: post.communityName,
      author: post.authorUsername,
      userVote: voteMap[post._id.toString()] || null,
      saved: savedPostIds.has(post._id.toString())
    }));

    // Format comments inline (avoid extra function call overhead)
    const formattedComments = comments.map(comment => ({
      ...comment,
      id: comment._id,
      voteCount: comment.upvotes - comment.downvotes,
      timeAgo: getTimeAgo(comment.createdAt),
      author: comment.authorUsername,
      postId: comment.post
    }));

    // Format custom feeds inline
    const formattedFeeds = customFeeds.map(feed => ({
      ...feed,
      id: feed._id,
      communityCount: feed.communities?.length || 0
    }));

    // Check if current user is following this user
    const isFollowing = currentUserActivity?.following?.some(
      id => id.toString() === userId.toString()
    ) || false;

    // Get saved posts only if viewing own profile AND there are saved posts
    let savedPosts = [];
    if (isOwnProfile && activity?.savedPosts?.length) {
      // Limit saved posts fetch and only get essential fields
      const savedPostDocs = await Post.find({ 
        _id: { $in: activity.savedPosts.slice(0, 25) } 
      })
        .select('title type content authorUsername communityName upvotes downvotes commentCount createdAt')
        .sort({ createdAt: -1 })
        .lean();
      
      savedPosts = savedPostDocs.map(post => ({
        ...post,
        id: post._id,
        voteCount: post.upvotes - post.downvotes,
        timeAgo: getTimeAgo(post.createdAt),
        subreddit: post.communityName,
        author: post.authorUsername,
        saved: true
      }));
    }

    // Build response
    res.status(200).json({
      user: ensureAvatar({
        ...user,
        id: user._id,
        cakeDay: new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        followerCount: activity?.followers?.length || 0,
        followingCount: activity?.following?.length || 0
      }),
      posts: formattedPosts,
      comments: formattedComments,
      followers: ensureAvatars(activity?.followers || []),
      following: ensureAvatars(activity?.following || []),
      customFeeds: formattedFeeds,
      isFollowing,
      savedPosts
    });
  } catch (error) {
    console.error('Get user profile error:', error);
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
    
    res.status(200).json(ensureAvatars(activity?.followers || []));
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
