const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Community = require('../models/Community');
const UserActivity = require('../models/UserActivity');
const { formatCommunity, formatCount, normalizeName } = require('../utils/helpers');
const { TTLCache } = require('../utils/cache');

const router = express.Router();

// One cache implementation for all three cases, replacing the three ad-hoc
// timestamp/Map pairs this file used to carry.
const communityListCache = new TTLCache(15 * 1000, 1);
const communityCache = new TTLCache(30 * 1000, 200);
const userDataCache = new TTLCache(5 * 1000, 500); // short TTL keeps joins responsive

const LIST_CACHE_KEY = 'all';

const SIDEBAR_FIELDS = 'name displayName iconUrl bannerUrl memberCount';
const JOINED_FIELDS = `${SIDEBAR_FIELDS} description creator creatorUsername`;

// Records the visit without blocking the response.
//
// Note for serverless: the platform may freeze the instance once the response
// is flushed, so a visit can occasionally be lost. That is an acceptable
// trade-off here - the alternative is charging every community page view an
// extra two round trips.
const trackCommunityVisit = (userId, communityId) => {
  if (!userId) return;

  setImmediate(async () => {
    try {
      // $pull and $push cannot touch the same array in one update, so the
      // move-to-front is two steps.
      await UserActivity.updateOne(
        { user: userId },
        { $pull: { recentCommunities: communityId } }
      );
      await UserActivity.updateOne(
        { user: userId },
        { $push: { recentCommunities: { $each: [communityId], $position: 0, $slice: 5 } } },
        { upsert: true }
      );

      userDataCache.delete(`${userId}:recentCommunities`);
    } catch (err) {
      console.error('Track community visit error:', err.message);
    }
  });
};

const withRouteId = (community) => ({
  ...community,
  id: community.name,
  displayName: community.displayName || `r/${community.name}`
});

// Shared handler for the two "communities this user cares about" endpoints
const getUserCommunities = (field, select) => async (req, res) => {
  try {
    const cacheKey = `${req.user.id}:${field}`;
    const cached = userDataCache.get(cacheKey);
    if (cached) {
      return res.status(200).json(cached);
    }

    const activity = await UserActivity.findOne({ user: req.user.id })
      .select(field)
      .populate({ path: field, select, options: { lean: true } })
      .lean();

    const communities = activity?.[field] || [];
    if (!communities.length) {
      return res.status(200).json([]);
    }

    const formatted = communities.map(withRouteId);

    userDataCache.set(cacheKey, formatted);
    res.status(200).json(formatted);
  } catch (error) {
    console.error(`Get ${field} error:`, error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/communities/user/recent - Get recent communities (protected)
router.get('/user/recent', authenticateToken, getUserCommunities('recentCommunities', SIDEBAR_FIELDS));

// GET /api/communities/user/joined - Get joined communities (protected)
router.get('/user/joined', authenticateToken, getUserCommunities('joinedCommunities', JOINED_FIELDS));

// GET /api/communities - Get all communities
router.get('/', async (req, res) => {
  try {
    const cached = communityListCache.get(LIST_CACHE_KEY);
    if (cached) {
      return res.status(200).json(cached);
    }

    // `rules` can be long and is never used by the list view
    const communities = await Community.find()
      .select('-rules')
      .sort({ memberCount: -1 })
      .limit(100)
      .lean();

    const formatted = communities.map(c => ({
      ...c,
      id: c.name,
      members: formatCount(c.memberCount)
    }));

    communityListCache.set(LIST_CACHE_KEY, formatted);

    res.status(200).json(formatted);
  } catch (error) {
    console.error('Get communities error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/communities/:id - Get single community
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const communityName = normalizeName(req.params.id);

    const cached = communityCache.get(communityName);
    if (cached) {
      trackCommunityVisit(req.user?.id, cached._id);
      return res.status(200).json(cached);
    }

    const community = await Community.findOne({ name: communityName }).lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const formattedCommunity = formatCommunity(community);

    communityCache.set(communityName, formattedCommunity);

    trackCommunityVisit(req.user?.id, community._id);

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
      const communityName = normalizeName(name);

      const existing = await Community.exists({ name: communityName });
      if (existing) {
        return res.status(409).json({ message: 'Community already exists' });
      }

      const newCommunity = await Community.create({
        name: communityName,
        displayName: `r/${name}`,
        title: title || name,
        description: description || '',
        category: category || 'Other',
        iconUrl,
        bannerUrl,
        creator: req.user.id,
        creatorUsername: req.user.username
      });

      communityListCache.clear();

      // Auto-join creator to community
      await UserActivity.updateOne(
        { user: req.user.id },
        { $addToSet: { joinedCommunities: newCommunity._id } },
        { upsert: true }
      );
      userDataCache.delete(`${req.user.id}:joinedCommunities`);

      res.status(201).json(formatCommunity(newCommunity.toObject()));
    } catch (error) {
      console.error('Create community error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// POST /api/communities/:id/join - Join/leave community (protected)
router.post('/:id/join', authenticateToken, async (req, res) => {
  try {
    const communityName = normalizeName(req.params.id);

    const [community, activity] = await Promise.all([
      Community.findOne({ name: communityName }).select('_id name creator memberCount').lean(),
      UserActivity.findOne({ user: req.user.id }).select('joinedCommunities').lean()
    ]);

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    const isJoined = activity?.joinedCommunities?.some(
      id => id.toString() === community._id.toString()
    );

    // Creators cannot leave their own community
    if (isJoined && community.creator.toString() === req.user.id) {
      return res.status(400).json({ message: 'Community creators cannot leave their own community' });
    }

    const joined = !isJoined;

    const [, updatedCommunity] = await Promise.all([
      UserActivity.updateOne(
        { user: req.user.id },
        joined
          ? { $addToSet: { joinedCommunities: community._id } }
          : { $pull: { joinedCommunities: community._id } },
        { upsert: true }
      ),
      Community.findByIdAndUpdate(
        community._id,
        { $inc: { memberCount: joined ? 1 : -1 } },
        { new: true }
      ).lean()
    ]);

    // Guard against a negative count from older inconsistent data
    if (updatedCommunity.memberCount < 0) {
      updatedCommunity.memberCount = 0;
      await Community.updateOne({ _id: community._id }, { $set: { memberCount: 0 } });
    }

    userDataCache.delete(`${req.user.id}:joinedCommunities`);
    userDataCache.delete(`${req.user.id}:recentCommunities`);
    communityCache.delete(community.name);
    communityListCache.clear();

    res.status(200).json({
      joined,
      community: updatedCommunity,
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

      const community = await Community.findOne({ name: normalizeName(req.params.id) });

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

      communityCache.delete(community.name);
      communityListCache.clear();

      res.status(200).json(formatCommunity(community.toObject()));
    } catch (error) {
      console.error('Update community error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/communities/:id - Delete community (protected, owner only)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const community = await Community.findOne({ name: normalizeName(req.params.id) })
      .select('_id name creator')
      .lean();

    if (!community) {
      return res.status(404).json({ message: 'Community not found' });
    }

    if (community.creator.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Only the community creator can delete it' });
    }

    const Post = require('../models/Post');
    const Comment = require('../models/Comment');
    const Vote = require('../models/Vote');
    const CustomFeed = require('../models/CustomFeed');

    // Only the ids are needed to cascade, not the post bodies
    const posts = await Post.find({ community: community._id }).select('_id').lean();
    const postIds = posts.map(p => p._id);

    await Promise.all([
      Comment.deleteMany({ post: { $in: postIds } }),
      Vote.deleteMany({ target: { $in: postIds }, targetType: 'post' }),
      Post.deleteMany({ community: community._id }),
      UserActivity.updateMany(
        {
          $or: [
            { joinedCommunities: community._id },
            { recentCommunities: community._id },
            { savedPosts: { $in: postIds } }
          ]
        },
        {
          $pull: {
            joinedCommunities: community._id,
            recentCommunities: community._id,
            savedPosts: { $in: postIds }
          }
        }
      ),
      CustomFeed.updateMany(
        { communities: community._id },
        { $pull: { communities: community._id } }
      ),
      Community.deleteOne({ _id: community._id })
    ]);

    communityCache.delete(community.name);
    communityListCache.clear();
    userDataCache.clear();

    res.status(200).json({ message: 'Community deleted successfully' });
  } catch (error) {
    console.error('Delete community error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
