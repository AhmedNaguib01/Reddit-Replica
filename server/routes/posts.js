const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const Community = require('../models/Community');
const Vote = require('../models/Vote');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { notifyPostUpvote } = require('../utils/notifications');
const { formatPost, formatPosts, escapeRegex, normalizeName } = require('../utils/helpers');
const { attachPostVoteInfo } = require('../utils/votes');
const { TTLCache } = require('../utils/cache');

const router = express.Router();

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

// Cache for the default homepage feed only. Anything narrower (a community, a
// later page) is cheap enough to hit the index directly.
const feedCache = new TTLCache(30 * 1000, 1);
const FEED_CACHE_KEY = 'home';

const invalidatePostsCache = () => feedCache.clear();

// Reads `limit` / `skip` from the query string, clamped to sane bounds. Both are
// optional so existing clients that send neither keep the previous behaviour.
const getPagination = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);
  const skip = Math.max(parseInt(query.skip, 10) || 0, 0);
  return { limit, skip };
};

// GET /api/posts - Get all posts (optionally filtered by subreddit)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subreddit } = req.query;
    const { limit, skip } = getPagination(req.query);
    const isDefaultFeed = !subreddit && skip === 0 && limit === DEFAULT_LIMIT;

    let formattedPosts = isDefaultFeed ? feedCache.get(FEED_CACHE_KEY) : null;

    if (!formattedPosts) {
      const query = subreddit ? { communityName: normalizeName(subreddit) } : {};

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      formattedPosts = formatPosts(posts);

      if (isDefaultFeed) {
        feedCache.set(FEED_CACHE_KEY, formattedPosts);
      }
    }

    res.status(200).json(await attachPostVoteInfo(formattedPosts, req.user?.id));
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/search - Search posts by query
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    const term = q.trim();
    const limit = 30;

    // Two index-backed lookups instead of one collection scan:
    //   - $text uses the title index and matches whole words, the same
    //     semantics the previous \bword\b regex had, but with stemming.
    //   - author / community names are short indexed fields, so a regex over
    //     them stays cheap. Post content is deliberately excluded: image posts
    //     store base64 data there, which is both meaningless to search and
    //     expensive to scan.
    const nameRegex = new RegExp(escapeRegex(term), 'i');

    const [byText, byName] = await Promise.all([
      Post.find({ $text: { $search: term } })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Post.find({ $or: [{ authorUsername: nameRegex }, { communityName: nameRegex }] })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean()
    ]);

    // Merge, de-duplicate, and keep the newest-first ordering
    const seen = new Set();
    const merged = [...byText, ...byName]
      .filter(post => {
        const id = post._id.toString();
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit);

    res.status(200).json(await attachPostVoteInfo(formatPosts(merged), req.user?.id));
  } catch (error) {
    console.error('Search posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/user/saved - Get saved posts (protected)
router.get('/user/saved', authenticateToken, async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id })
      .select('savedPosts')
      .lean();

    if (!activity?.savedPosts?.length) {
      return res.status(200).json([]);
    }

    const { limit, skip } = getPagination(req.query);

    const posts = await Post.find({ _id: { $in: activity.savedPosts } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json(await attachPostVoteInfo(formatPosts(posts), req.user.id));
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/by-user/:username - Get posts by username
router.get('/by-user/:username', optionalAuth, async (req, res) => {
  try {
    const { limit, skip } = getPagination(req.query);

    const posts = await Post.find({ authorUsername: normalizeName(req.params.username) })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json(await attachPostVoteInfo(formatPosts(posts), req.user?.id));
  } catch (error) {
    console.error('Get posts by user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/:id - Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const [withVotes] = await attachPostVoteInfo([formatPost(post)], req.user?.id);

    res.status(200).json(withVotes);
  } catch (error) {
    console.error('Get post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/posts - Create new post (protected)
router.post(
  '/',
  authenticateToken,
  [
    body('title').trim().isLength({ min: 1, max: 300 }).withMessage('Title is required (max 300 chars)'),
    body('subreddit').trim().notEmpty().withMessage('Community is required'),
    body('type').isIn(['text', 'image', 'link']).withMessage('Invalid post type'),
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

      const { title, subreddit, type, content } = req.body;

      // Find community
      const community = await Community.findOne({ name: normalizeName(subreddit) })
        .select('_id name')
        .lean();
      if (!community) {
        return res.status(404).json({ message: 'Community not found' });
      }

      const newPost = await Post.create({
        title,
        type: type || 'text',
        content: content || '',
        author: req.user.id,
        authorUsername: req.user.username,
        community: community._id,
        communityName: community.name
      });

      // Invalidate posts cache when new post is created
      invalidatePostsCache();

      res.status(201).json(formatPost(newPost.toObject()));
    } catch (error) {
      console.error('Create post error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/posts/:id - Update post (protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }

    const { title, content } = req.body;

    if (title) post.title = title;
    if (content !== undefined) post.content = content;
    post.isEdited = true;
    post.editedAt = new Date();

    await post.save();

    invalidatePostsCache();

    res.status(200).json(formatPost(post.toObject()));
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/posts/:id - Delete post (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    // Only the author field is needed for the ownership check - skipping the
    // body avoids pulling a base64 image into memory just to delete it.
    const post = await Post.findById(req.params.id).select('author').lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    const Comment = require('../models/Comment');

    await Promise.all([
      Post.findByIdAndDelete(req.params.id),
      Vote.deleteMany({ target: req.params.id, targetType: 'post' }),
      Comment.deleteMany({ post: req.params.id }),
      UserActivity.updateMany(
        { savedPosts: req.params.id },
        { $pull: { savedPosts: req.params.id } }
      )
    ]);

    // Invalidate posts cache when post is deleted
    invalidatePostsCache();

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error('Delete post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/posts/:id/vote - Vote on post (protected)
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { vote } = req.body; // 'up' or 'down'
    const postId = req.params.id;

    const post = await Post.findById(postId).select('author title').lean();
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const voteValue = vote === 'up' ? 1 : -1;

    const existingVote = await Vote.findOne({
      user: req.user.id,
      target: postId,
      targetType: 'post'
    });

    // Work out the counter deltas first, then apply them with a single atomic
    // $inc. The previous read-modify-write lost votes when two arrived at once.
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    let karmaChange = 0;
    let userVote = null;
    let isNewUpvote = false;

    if (existingVote && existingVote.voteType === voteValue) {
      // Same vote again - toggle it off
      if (voteValue === 1) {
        upvoteDelta = -1;
        karmaChange = -1;
      } else {
        downvoteDelta = -1;
        karmaChange = 1;
      }
      await Vote.deleteOne({ _id: existingVote._id });
    } else if (existingVote) {
      // Switching from up to down or vice versa
      if (existingVote.voteType === 1) {
        upvoteDelta = -1;
        downvoteDelta = 1;
        karmaChange = -2;
      } else {
        downvoteDelta = -1;
        upvoteDelta = 1;
        karmaChange = 2;
      }
      await Vote.updateOne({ _id: existingVote._id }, { $set: { voteType: voteValue } });
      userVote = vote;
    } else {
      // First vote on this post
      if (voteValue === 1) {
        upvoteDelta = 1;
        karmaChange = 1;
        isNewUpvote = true;
      } else {
        downvoteDelta = 1;
        karmaChange = -1;
      }
      await Vote.create({
        user: req.user.id,
        target: postId,
        targetType: 'post',
        voteType: voteValue
      });
      userVote = vote;
    }

    const isOwnPost = post.author.toString() === req.user.id;

    // Counter update, karma update and the upvote notification are independent,
    // so they go out together instead of as three sequential round trips.
    const [updatedPost] = await Promise.all([
      Post.findByIdAndUpdate(
        postId,
        { $inc: { upvotes: upvoteDelta, downvotes: downvoteDelta } },
        { new: true, projection: 'upvotes downvotes' }
      ).lean(),
      !isOwnPost && karmaChange !== 0
        ? User.updateOne({ _id: post.author }, { $inc: { karma: karmaChange } })
        : null,
      isNewUpvote ? notifyPostUpvote(post, req.user) : null
    ]);

    invalidatePostsCache();

    res.status(200).json({
      voteCount: updatedPost.upvotes - updatedPost.downvotes,
      upvotes: updatedPost.upvotes,
      downvotes: updatedPost.downvotes,
      userVote
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Instantiated once instead of per request - the constructor sets up an HTTP
// client that is safe to share.
let geminiModel = null;
const getGeminiModel = () => {
  if (!geminiModel) {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return geminiModel;
};

// POST /api/posts/:id/summarize - Summarize post using AI
router.post('/:id/summarize', optionalAuth, async (req, res) => {
  try {
    // Check if Gemini API key is configured before touching the database
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(503).json({ message: 'AI summarization is not configured' });
    }

    const post = await Post.findById(req.params.id).select('title content type').lean();

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Image posts store base64 in `content`, which is useless as prompt input
    const body = post.type === 'image' ? '' : (post.content || '');
    const contentToSummarize = `Title: ${post.title}\n\nContent: ${body || 'No additional content'}`;
    const prompt = `Summarize this Reddit post in 1 concise sentences. Be direct and capture the main point:\n\n${contentToSummarize}`;

    const result = await getGeminiModel().generateContent(prompt);
    const summary = result.response.text();

    res.status(200).json({ summary });
  } catch (error) {
    console.error('Summarize error:', error);
    res.status(500).json({ message: 'Failed to generate summary' });
  }
});

// POST /api/posts/:id/save - Save/unsave post (protected)
router.post('/:id/save', authenticateToken, async (req, res) => {
  try {
    const postId = req.params.id;

    const [post, activity] = await Promise.all([
      Post.exists({ _id: postId }),
      UserActivity.findOne({ user: req.user.id }).select('savedPosts').lean()
    ]);

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const alreadySaved = activity?.savedPosts?.some(id => id.toString() === postId);

    // $addToSet / $pull are atomic, so concurrent saves cannot duplicate or
    // drop entries the way a read-modify-write on the array could.
    await UserActivity.updateOne(
      { user: req.user.id },
      alreadySaved
        ? { $pull: { savedPosts: postId } }
        : { $addToSet: { savedPosts: postId } },
      { upsert: true }
    );

    res.status(200).json({ saved: !alreadySaved });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
