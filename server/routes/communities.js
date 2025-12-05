const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Community = require('../models/Community');
const UserActivity = require('../models/UserActivity');

const router = express.Router();

// Simple in-memory cache for communities list
let communitiesCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 60 * 1000; // 1 minute cache

const invalidateCommunitiesCache = () => {
  communitiesCache = null;
  cacheTimestamp = 0;
};

// GET /api/communities/user/recent - Get recent communities (protected)
router.get('/user/recent', authenticateToken, async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id })
      .select('recentCommunities')
      .populate({ path: 'recentCommunities', options: { lean: true } })
      .lean();
    
    if (!activity || !activity.recentCommunities || !activity.recentCommunities.length) {
      return res.status(200).json([]);
    }

    // Format communities with id field
    const formattedCommunities = activity.recentCommunities.map(c => ({
      ...c,
      id: c.name, // Use name as id for routing
      displayName: c.displayName || `r/${c.name}`
    }));

    res.status(200).json(formattedCommunities);
  } catch (error) {
    console.error('Get recent communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/user/joined - Get joined communities (protected)
router.get('/user/joined', authenticateToken, async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id })
      .select('joinedCommunities')
      .populate({ path: 'joinedCommunities', options: { lean: true } })
      .lean();
    
    if (!activity || !activity.joinedCommunities || !activity.joinedCommunities.length) {
      return res.status(200).json([]);
    }

    // Format communities with id field
    const formattedCommunities = activity.joinedCommunities.map(c => ({
      ...c,
      id: c.name, // Use name as id for routing
      displayName: c.displayName || `r/${c.name}`
    }));

    res.status(200).json(formattedCommunities);
  } catch (error) {
    console.error('Get joined communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities - Get all communities
router.get('/', async (req, res) => {
  try {
    const now = Date.now();
    
    // Return cached data if available and not expired
    if (communitiesCache && (now - cacheTimestamp) < CACHE_DURATION) {
      return res.status(200).json(communitiesCache);
    }
    
    const communities = await Community.find()
      .sort({ memberCount: -1 })
      .limit(100)
      .lean(); // Use lean for faster read-only queries
    
    // Update cache
    communitiesCache = communities;
    cacheTimestamp = now;
    
    res.status(200).json(communities);
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/:id - Get single community
router.get('/:id', async (req, res) => {
  try {
    const community = await Community.findOne({ 
      name: req.params.id.toLowerCase() 
    }).lean();
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Format lean document
    const formattedCommunity = {
      ...community,
      id: community.name,
      members: community.memberCount >= 1000000 
        ? `${(community.memberCount / 1000000).toFixed(1)}M`
        : community.memberCount >= 1000 
          ? `${(community.memberCount / 1000).toFixed(0)}k`
          : String(community.memberCount),
      online: String(Math.max(Math.floor(community.memberCount * 0.003), 1)),
      created: new Date(community.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      creatorId: community.creator?.toString()
    };

    // Track visit if user is authenticated (non-blocking)
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      // Run in background, don't wait for it
      setImmediate(async () => {
        try {
          const token = authHeader.split(' ')[1];
          const jwt = require('jsonwebtoken');
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          
          await UserActivity.findOneAndUpdate(
            { user: decoded.id },
            { 
              $pull: { recentCommunities: community._id },
            }
          );
          await UserActivity.findOneAndUpdate(
            { user: decoded.id },
            { 
              $push: { 
                recentCommunities: { 
                  $each: [community._id], 
                  $position: 0, 
                  $slice: 5 
                } 
              } 
            },
            { upsert: true }
          );
        } catch (err) {
          // Ignore auth errors
        }
      });
    }

    res.status(200).json(formattedCommunity);
  } catch (error) {
    console.error('Get community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/communities - Create new community (protected)
router.post(
  '/',
  authenticateToken,
  [
    body('name')
      .trim()
      .isLength({ min: 3, max: 21 })
      .withMessage('Community name must be 3-21 characters')
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage('Community name can only contain letters, numbers, and underscores'),
    body('title').optional().trim().isLength({ max: 100 }),
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

      const { name, title, description, iconUrl, bannerUrl, category } = req.body;

      // Check if community exists
      const existing = await Community.findOne({ name: name.toLowerCase() });
      if (existing) {
        return res.status(409).json({ message: 'Community already exists' });
      }

      const newCommunity = await Community.create({
        name: name.toLowerCase(),
        displayName: `r/${name}`,
        title: title || name,
        description: description || '',
        category: category || 'Other',
        iconUrl,
        bannerUrl,
        creator: req.user.id,
        creatorUsername: req.user.username
      });

      // Invalidate cache when new community is created
      invalidateCommunitiesCache();

      // Auto-join creator to community
      let activity = await UserActivity.findOne({ user: req.user.id });
      if (!activity) {
        activity = await UserActivity.create({ user: req.user.id });
      }
      activity.joinedCommunities.push(newCommunity._id);
      await activity.save();

      res.status(201).json(newCommunity);
    } catch (error) {
      console.error('Create community error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/communities/:id/join - Join/leave community (protected)
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findOne({ name: req.params.id.toLowerCase() });
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    // Check if user is the creator - creators cannot leave their own community
    if (community.creator.toString() === req.user.id) {
      // Check if they're trying to leave
      const activity = await UserActivity.findOne({ user: req.user.id });
      const isJoined = activity?.joinedCommunities?.includes(community._id);
      if (isJoined) {
        return res.status(400).json({ message: 'Community creators cannot leave their own community' });
      }
    }

    let activity = await UserActivity.findOne({ user: req.user.id });
    if (!activity) {
      activity = await UserActivity.create({ user: req.user.id });
    }

    const index = activity.joinedCommunities.indexOf(community._id);
    let joined;

    if (index > -1) {
      // Leave
      activity.joinedCommunities.splice(index, 1);
      community.memberCount = Math.max(0, community.memberCount - 1);
      joined = false;
    } else {
      // Join
      activity.joinedCommunities.push(community._id);
      community.memberCount++;
      joined = true;
    }

    await activity.save();
    await community.save();

    res.status(200).json({
      joined,
      community,
      message: joined ? 'Joined community' : 'Left community'
    });
  } catch (error) {
    console.error('Join/leave community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/communities/:id - Update community (protected, owner only)
router.put(
  '/:id',
  authenticateToken,
  [
    body('title').optional().trim().isLength({ max: 100 }),
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

      const community = await Community.findOne({ name: req.params.id.toLowerCase() });
      
      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }

      if (community.creator.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Only the community creator can edit' });
      }

      const { title, description, iconUrl, bannerUrl } = req.body;
      
      if (title) community.title = title;
      if (description !== undefined) community.description = description;
      if (iconUrl) community.iconUrl = iconUrl;
      if (bannerUrl) community.bannerUrl = bannerUrl;

      await community.save();

      res.status(200).json(community);
    } catch (error) {
      console.error('Update community error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/communities/:id - Delete community (protected, owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findOne({ name: req.params.id.toLowerCase() });
    
    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the community creator can delete it' });
    }

    // Delete all posts in this community
    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Vote = require('../models/Vote');
    
    // Get all posts in this community
    const posts = await Post.find({ community: community._id });
    const postIds = posts.map(p => p._id);
    
    // Delete all comments on those posts
    await Comment.deleteMany({ post: { $in: postIds } });
    
    // Delete all votes on those posts
    await Vote.deleteMany({ target: { $in: postIds }, targetType: 'post' });
    
    // Delete all posts
    await Post.deleteMany({ community: community._id });
    
    // Remove community from all users' joined lists
    await UserActivity.updateMany(
      { joinedCommunities: community._id },
      { $pull: { joinedCommunities: community._id } }
    );
    
    // Delete the community
    await Community.findByIdAndDelete(community._id);
    
    // Invalidate cache when community is deleted
    invalidateCommunitiesCache();

    res.status(200).json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
