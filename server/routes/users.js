const express = require('express');
const { authenticateToken, optionalAuth, clearUserCache } = require('../middleware/auth');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const Community = require('../models/Community');
const CustomFeed = require('../models/CustomFeed');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const { notifyFollow } = require('../utils/notifications');
const { getTimeAgo, ensureAvatar, ensureAvatars, escapeRegex, normalizeName } = require('../utils/helpers');
const { buildVoteMap } = require('../utils/votes');

const router = express.Router();

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
    if (username && newUsername !== oldUsername) {
      const userWithSameName = await User.exists({
        username: newUsername,
        _id: { $ne: req.user.id }
      });

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
    // Usernames are stored lowercase, so this is an indexed exact match
    const user = await User.findOne({ username: normalizeName(req.params.username) })
      .select('-password -passwordResetToken -passwordResetExpires -googleId')
      .lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const userId = user._id;
    const isOwnProfile = req.user && req.user.id === userId.toString();

    // Everything that does not depend on another result goes out at once
    const [activity, posts, comments, customFeeds, currentUserActivity] = await Promise.all([
      // Followers/following are capped - a popular account should not drag
      // hundreds of avatars into a profile view
      UserActivity.findOne({ user: userId })
        .select('followers following savedPosts')
        .populate({ path: 'followers', select: 'username displayName avatar', options: { limit: 100 } })
        .populate({ path: 'following', select: 'username displayName avatar', options: { limit: 100 } })
        .lean(),

      Post.find({ author: userId })
        .select('title type content authorUsername communityName upvotes downvotes commentCount createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),

      Comment.find({ author: userId })
        .select('content post authorUsername upvotes downvotes createdAt')
        .sort({ createdAt: -1 })
        .limit(25)
        .lean(),

      CustomFeed.find({ creator: userId, isPrivate: false, showOnProfile: true })
        .select('name description communities isPrivate')
        .populate('communities', 'name iconUrl')
        .sort({ name: 1 })
        .limit(10)
        .lean(),

      // Only needed to answer "am I following this person"
      req.user && !isOwnProfile
        ? UserActivity.findOne({ user: req.user.id }).select('following').lean()
        : null
    ]);

    // Votes need the post ids, so this is the one query that has to come second.
    // Saved posts do not need a lookup at all on an own-profile view - `activity`
    // is already the current user's document.
    const voteMap = req.user && posts.length
      ? await buildVoteMap(req.user.id, posts.map(p => p._id), 'post')
      : {};

    const savedPostIds = isOwnProfile
      ? new Set(activity?.savedPosts?.map(id => id.toString()) || [])
      : new Set();

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
    const userToFollow = await User.findOne({ username: normalizeName(req.params.username) })
      .select('_id username')
      .lean();


    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (userToFollow._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    // Only the one array is needed to decide the direction of the toggle
    const followerActivity = await UserActivity.findOne({ user: req.user.id })
      .select('following')
      .lean();

    const following = !followerActivity?.following?.some(
      id => id.toString() === userToFollow._id.toString()
    );

    // $addToSet / $pull keep both sides of the relationship consistent even if
    // two follow requests race, which the previous array splice could not.
    await Promise.all([
      UserActivity.updateOne(
        { user: req.user.id },
        following
          ? { $addToSet: { following: userToFollow._id } }
          : { $pull: { following: userToFollow._id } },
        { upsert: true }
      ),
      UserActivity.updateOne(
        { user: userToFollow._id },
        following
          ? { $addToSet: { followers: req.user.id } }
          : { $pull: { followers: req.user.id } },
        { upsert: true }
      ),
      following ? notifyFollow(userToFollow._id, req.user) : null
    ]);

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
    const user = await User.findOne({ username: normalizeName(req.params.username) })
      .select('_id')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Only the fields the follower list renders - avatars can be base64 blobs,
    // so pulling whole user documents here was needlessly heavy.
    const activity = await UserActivity.findOne({ user: user._id })
      .select('followers')
      .populate('followers', 'username displayName avatar bio')
      .lean();


    res.status(200).json(ensureAvatars(activity?.followers || []));
  } catch (error) {
    console.error('Get followers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
