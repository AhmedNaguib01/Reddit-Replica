const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Post = require('../models/Post');
const Community = require('../models/Community');
const Vote = require('../models/Vote');
const UserActivity = require('../models/UserActivity');
const { notifyPostUpvote } = require('../utils/notifications');

const router = express.Router();

// Helper to add user vote info to posts
const addUserVoteInfo = async (posts, userId) => {
  if (!userId) return posts.map(p => p.toJSON ? p.toJSON() : p);
  
  const postIds = posts.map(p => p._id);
  const votes = await Vote.find({
    user: userId,
    target: { $in: postIds },
    targetType: 'post'
  });

  const voteMap = {};
  votes.forEach(v => {
    voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down';
  });

  return posts.map(p => {
    const postObj = p.toJSON ? p.toJSON() : p;
    postObj.userVote = voteMap[p._id.toString()] || null;
    return postObj;
  });
};

// GET /api/posts - Get all posts (optionally filtered by subreddit)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { subreddit } = req.query;
    
    let query = {};
    if (subreddit) {
      query.communityName = { $regex: new RegExp(`^${subreddit}`, 'i') };
    }

    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .limit(100);

    const postsWithVotes = await addUserVoteInfo(posts, req.user?.id);

    res.status(200).json(postsWithVotes);
  } catch (error) {
    console.error('Get posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/user/saved - Get saved posts (protected)
router.get('/user/saved', authenticateToken, async (req, res) => {
  try {
    const activity = await UserActivity.findOne({ user: req.user.id })
      .populate('savedPosts');
    
    if (!activity) {
      return res.status(200).json([]);
    }

    const posts = await Post.find({ _id: { $in: activity.savedPosts } })
      .sort({ createdAt: -1 });

    const postsWithVotes = await addUserVoteInfo(posts, req.user.id);

    res.status(200).json(postsWithVotes);
  } catch (error) {
    console.error('Get saved posts error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/posts/:id - Get single post
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const postsWithVotes = await addUserVoteInfo([post], req.user?.id);

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

      res.status(201).json(newPost);
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

    res.status(200).json(post);
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
        if (voteValue === 1) post.upvotes--;
        else post.downvotes--;
        userVote = null;
      } else {
        // Change vote
        if (existingVote.voteType === 1) {
          post.upvotes--;
          post.downvotes++;
        } else {
          post.downvotes--;
          post.upvotes++;
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
        // Notify post author of upvote (only for new upvotes, not downvotes)
        await notifyPostUpvote(post, req.user);
      } else {
        post.downvotes++;
      }
      userVote = vote;
    }

    await post.save();

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
