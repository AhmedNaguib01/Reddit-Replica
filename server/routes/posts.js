const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const Community = require('../models/Community');
const Vote = require('../models/Vote');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { notifyPostUpvote } = require('../utils/notifications');
const { formatPost, formatPosts } = require('../utils/helpers');

const router = express.Router();

// Server-side cache for posts (reduces DB queries significantly)
let postsCache = null;
let postsCacheTimestamp = 0;
const POSTS_CACHE_DURATION = 30 * 1000; // 30 seconds cache

const invalidatePostsCache = () => {
  postsCache = null;
  postsCacheTimestamp = 0;
};

// Helper to add user vote info to posts - OPTIMIZED
const addUserVoteInfo = async (posts, userId) => {
  if (!userId) return posts.map(p => p.toJSON ? p.toJSON() : p);
  
  const postIds = posts.map(p => p._id);
  
  // Batch both queries in parallel for better performance
  const [votes, activity] = await Promise.all([
    Vote.find({
      user: userId,
      target: { $in: postIds },
      targetType: 'post'
    }).select('target voteType').lean(),
    UserActivity.findOne({ user: userId }).select('savedPosts').lean()
  ]);

  const voteMap = {};
  votes.forEach(v => {
    voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down';
  });

  const savedPostIds = new Set(activity?.savedPosts?.map(id => id.toString()) || []);

  return posts.map(p => {
    const postObj = p.toJSON ? p.toJSON() : p;
    postObj.userVote = voteMap[p._id.toString()] || null;
    postObj.saved = savedPostIds.has(p._id.toString());
    return postObj;
  });
};

// GET /api/posts - Get all posts (optionally filtered by subreddit)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subreddit } = req.query;
    const now = Date.now();
    
    let formattedPosts;
    
    // Use cache for homepage (no subreddit filter)
    if (!subreddit && postsCache && (now - postsCacheTimestamp) < POSTS_CACHE_DURATION) {
      formattedPosts = postsCache;
    } else {
      let query = {};
      if (subreddit) {
        query.communityName = subreddit.toLowerCase();
      }

      const posts = await Post.find(query)
        .sort({ createdAt: -1 })
        .limit(50)
        .lean();

      formattedPosts = formatPosts(posts);

      // Cache homepage posts only
      if (!subreddit) {
        postsCache = formattedPosts;
        postsCacheTimestamp = now;
      }
    }

    // Only fetch vote info if user is logged in
    const postsWithVotes = req.user?.id 
      ? await addUserVoteInfo(formattedPosts, req.user.id)
      : formattedPosts;

    res.status(200).json(postsWithVotes);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper to escape regex special characters
const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// GET /api/posts/search - Search posts by query
router.get('/search', optionalAuth, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.trim().length < 2) {
      return res.status(200).json([]);
    }

    // Escape special regex characters and use word boundary for better matching
    const escapedQuery = escapeRegex(q.trim());
    // Use word boundary \b to match whole words, preventing "cat" from matching "education"
    const searchRegex = new RegExp(`\\b${escapedQuery}\\b`, 'i');
    
    const posts = await Post.find({
      $or: [
        { title: searchRegex },
        { content: searchRegex },
        { authorUsername: searchRegex },
        { communityName: searchRegex }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const formattedPosts = formatPosts(posts);

    const postsWithVotes = await addUserVoteInfo(formattedPosts, req.user?.id);

    res.status(200).json(postsWithVotes);
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
    
    if (!activity || !activity.savedPosts?.length) {
      return res.status(200).json([]);
    }

    const posts = await Post.find({ _id: { $in: activity.savedPosts } })
      .sort({ createdAt: -1 })
      .lean();

    const formattedPosts = formatPosts(posts);

    const postsWithVotes = await addUserVoteInfo(formattedPosts, req.user.id);

    res.status(200).json(postsWithVotes);
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/by-user/:username - Get posts by username
router.get('/by-user/:username', optionalAuth, async (req, res) => {
  try {
    const posts = await Post.find({ authorUsername: req.params.username })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedPosts = formatPosts(posts);

    const postsWithVotes = await addUserVoteInfo(formattedPosts, req.user?.id);

    res.status(200).json(postsWithVotes);
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

    // Format the lean document
    const formattedPost = formatPost(post);

    const postsWithVotes = await addUserVoteInfo([formattedPost], req.user?.id);

    res.status(200).json(postsWithVotes[0]);
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
      const community = await Community.findOne({ name: subreddit.toLowerCase() });
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

    res.status(200).json(formatPost(post.toObject()));
  } catch (error) {
    console.error('Update post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/posts/:id - Delete post (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.id);
    
    // Also delete associated votes
    await Vote.deleteMany({ target: req.params.id, targetType: 'post' });

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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const voteValue = vote === 'up' ? 1 : -1;
    let karmaChange = 0;

    // Check for existing vote
    const existingVote = await Vote.findOne({
      user: req.user.id,
      target: postId,
      targetType: 'post'
    });

    let userVote = null;

    if (existingVote) {
      if (existingVote.voteType === voteValue) {
        // Remove vote (toggle off)
        await Vote.findByIdAndDelete(existingVote._id);
        if (voteValue === 1) {
          post.upvotes--;
          karmaChange = -1; // Removing upvote decreases karma
        } else {
          post.downvotes--;
          karmaChange = 1; // Removing downvote increases karma
        }
        userVote = null;
      } else {
        // Change vote
        if (existingVote.voteType === 1) {
          post.upvotes--;
          post.downvotes++;
          karmaChange = -2; // Changing from upvote to downvote
        } else {
          post.downvotes--;
          post.upvotes++;
          karmaChange = 2; // Changing from downvote to upvote
        }
        existingVote.voteType = voteValue;
        await existingVote.save();
        userVote = vote;
      }
    } else {
      // New vote
      await Vote.create({
        user: req.user.id,
        target: postId,
        targetType: 'post',
        voteType: voteValue
      });
      if (voteValue === 1) {
        post.upvotes++;
        karmaChange = 1; // New upvote increases karma
        // Notify post author of upvote (only for new upvotes, not downvotes)
        await notifyPostUpvote(post, req.user);
      } else {
        post.downvotes++;
        karmaChange = -1; // New downvote decreases karma
      }
      userVote = vote;
    }

    await post.save();

    // Update post author's karma (don't update if voting on own post)
    if (post.author.toString() !== req.user.id && karmaChange !== 0) {
      await User.findByIdAndUpdate(post.author, { $inc: { karma: karmaChange } });
    }

    res.status(200).json({
      voteCount: post.upvotes - post.downvotes,
      upvotes: post.upvotes,
      downvotes: post.downvotes,
      userVote
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/posts/:id/summarize - Summarize post using AI
router.post('/:id/summarize', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).lean();
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if Gemini API key is configured
    if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
      return res.status(503).json({ message: 'AI summarization is not configured' });
    }

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Try gemini-1.5-flash first, fallback models: gemini-pro, gemini-1.0-pro
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Prepare content for summarization
    const contentToSummarize = `Title: ${post.title}\n\nContent: ${post.content || 'No additional content'}`;
    
    const prompt = `Summarize this Reddit post in 2-3 concise sentences. Be direct and capture the main point:\n\n${contentToSummarize}`;

    const result = await model.generateContent(prompt);
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

    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    let activity = await UserActivity.findOne({ user: req.user.id });
    if (!activity) {
      activity = await UserActivity.create({ user: req.user.id });
    }

    const index = activity.savedPosts.indexOf(postId);
    let saved;

    if (index > -1) {
      activity.savedPosts.splice(index, 1);
      saved = false;
    } else {
      activity.savedPosts.push(postId);
      saved = true;
    }

    await activity.save();

    res.status(200).json({ saved });
  } catch (error) {
    console.error('Save post error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
