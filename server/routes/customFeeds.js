const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const CustomFeed = require('../models/CustomFeed');
const Community = require('../models/Community');
const Post = require('../models/Post');

const router = express.Router();

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/custom-feeds - Get user's custom feeds
router.get('/', authenticateToken, async (req, res) => {
  try {
    const feeds = await CustomFeed.find({ creator: req.user.id })
      .populate('communities', 'name iconUrl')
      .sort({ isFavorite: -1, name: 1 })
      .lean();

    // Add community count to each feed
    const formattedFeeds = feeds.map(f => ({
      ...f,
      id: f._id,
      communityCount: f.communities?.length || 0
    }));

    res.status(200).json(formattedFeeds);
  } catch (error) {
    console.error('Get custom feeds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/custom-feeds/user/:username - Get public feeds for a user's profile
router.get('/user/:username', async (req, res) => {
  try {
    const User = require('../models/User');
    const user = await User.findOne({ 
      username: { $regex: new RegExp(`^${escapeRegex(req.params.username)}$`, 'i') }
    }).select('_id').lean();
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const feeds = await CustomFeed.find({ 
      creator: user._id,
      isPrivate: false,
      showOnProfile: true
    })
      .populate('communities', 'name iconUrl')
      .sort({ name: 1 })
      .lean();

    // Format feeds
    const formattedFeeds = feeds.map(f => ({
      ...f,
      id: f._id,
      communityCount: f.communities?.length || 0
    }));

    res.status(200).json(formattedFeeds);
  } catch (error) {
    console.error('Get user feeds error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/custom-feeds/:id - Get single custom feed with posts
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id)
      .populate('communities', 'name displayName iconUrl memberCount')
      .lean();

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    // Check access
    if (feed.isPrivate && feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This feed is private' });
    }

    res.status(200).json({
      ...feed,
      id: feed._id,
      communityCount: feed.communities?.length || 0
    });
  } catch (error) {
    console.error('Get custom feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/custom-feeds/:id/posts - Get posts from custom feed communities
router.get('/:id/posts', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id).lean();

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.isPrivate && feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'This feed is private' });
    }

    if (!feed.communities || feed.communities.length === 0) {
      return res.status(200).json([]);
    }

    const posts = await Post.find({ community: { $in: feed.communities } })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Format lean documents
    const { getTimeAgo } = require('../utils/helpers');
    const formattedPosts = posts.map(p => ({
      ...p,
      id: p._id,
      voteCount: p.upvotes - p.downvotes,
      timeAgo: getTimeAgo(p.createdAt),
      subreddit: p.communityName,
      author: p.authorUsername
    }));

    res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Get feed posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/custom-feeds - Create custom feed
router.post(
  '/',
  authenticateToken,
  [
    body('name').trim().isLength({ min: 1, max: 50 }).withMessage('Name is required (max 50 chars)'),
    body('description').optional().trim().isLength({ max: 500 }),
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

      const { name, description, isPrivate, showOnProfile } = req.body;

      // Check if feed with same name exists for this user
      const existing = await CustomFeed.findOne({ 
        creator: req.user.id, 
        name: { $regex: new RegExp(`^${escapeRegex(name)}$`, 'i') }
      }).lean();
      
      if (existing) {
        return res.status(409).json({ message: 'You already have a feed with this name' });
      }

      const newFeed = await CustomFeed.create({
        name,
        description: description || '',
        creator: req.user.id,
        creatorUsername: req.user.username,
        isPrivate: isPrivate || false,
        showOnProfile: showOnProfile !== false,
        communities: []
      });

      res.status(201).json(newFeed);
    } catch (error) {
      console.error('Create custom feed error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/custom-feeds/:id - Update custom feed
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, description, isPrivate, showOnProfile } = req.body;

    if (name) feed.name = name;
    if (description !== undefined) feed.description = description;
    if (isPrivate !== undefined) feed.isPrivate = isPrivate;
    if (showOnProfile !== undefined) feed.showOnProfile = showOnProfile;

    await feed.save();

    res.status(200).json(feed);
  } catch (error) {
    console.error('Update custom feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/custom-feeds/:id/favorite - Toggle favorite
router.put('/:id/favorite', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    feed.isFavorite = !feed.isFavorite;
    await feed.save();

    res.status(200).json({ isFavorite: feed.isFavorite });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/custom-feeds/:id/communities - Add community to feed
router.post('/:id/communities', authenticateToken, async (req, res) => {
  try {
    const { communityId } = req.body;
    const UserActivity = require('../models/UserActivity');
    
    const feed = await CustomFeed.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const community = await Community.findById(communityId).lean();
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user has joined this community
    const userActivity = await UserActivity.findOne({ user: req.user.id })
      .select('joinedCommunities')
      .lean();
    const isJoined = userActivity?.joinedCommunities?.some(
      c => c.toString() === communityId
    );
    
    if (!isJoined) {
      return res.status(403).json({ message: 'You must join this community before adding it to your feed' });
    }

    if (feed.communities.includes(communityId)) {
      return res.status(400).json({ message: 'Community already in feed' });
    }

    feed.communities.push(communityId);
    await feed.save();

    const updatedFeed = await CustomFeed.findById(feed._id)
      .populate('communities', 'name displayName iconUrl memberCount')
      .lean();

    res.status(200).json({
      ...updatedFeed,
      id: updatedFeed._id,
      communityCount: updatedFeed.communities?.length || 0
    });
  } catch (error) {
    console.error('Add community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/custom-feeds/:id/communities/:communityId - Remove community from feed
router.delete('/:id/communities/:communityId', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    feed.communities = feed.communities.filter(
      c => c.toString() !== req.params.communityId
    );
    await feed.save();

    const updatedFeed = await CustomFeed.findById(feed._id)
      .populate('communities', 'name displayName iconUrl memberCount')
      .lean();

    res.status(200).json({
      ...updatedFeed,
      id: updatedFeed._id,
      communityCount: updatedFeed.communities?.length || 0
    });
  } catch (error) {
    console.error('Remove community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/custom-feeds/:id - Delete custom feed
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const feed = await CustomFeed.findById(req.params.id);

    if (!feed) {
      return res.status(404).json({ message: 'Custom feed not found' });
    }

    if (feed.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await CustomFeed.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Custom feed deleted' });
  } catch (error) {
    console.error('Delete custom feed error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
