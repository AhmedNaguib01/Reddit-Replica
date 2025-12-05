const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Community = require('../models/Community');
const UserActivity = require('../models/UserActivity');
const { notifyPostComment, notifyCommentReply } = require('../utils/notifications');

const router = express.Router();

// Helper to add user vote info to comments
const addUserVoteInfo = async (comments, userId) => {
  if (!userId) return comments;
  
  const commentIds = [];
  const collectIds = (cmts) => {
    cmts.forEach(c => {
      commentIds.push(c._id || c.id);
      if (c.replies && c.replies.length > 0) {
        collectIds(c.replies);
      }
    });
  };
  collectIds(comments);

  const votes = await Vote.find({
    user: userId,
    target: { $in: commentIds },
    targetType: 'comment'
  });

  const voteMap = {};
  votes.forEach(v => {
    voteMap[v.target.toString()] = v.voteType === 1 ? 'up' : 'down';
  });

  const addVotes = (cmts) => {
    cmts.forEach(c => {
      const id = (c._id || c.id).toString();
      c.userVote = voteMap[id] || null;
      if (c.replies && c.replies.length > 0) {
        addVotes(c.replies);
      }
    });
  };
  addVotes(comments);

  return comments;
};

// Helper to build comment tree
const buildCommentTree = (comments) => {
  const commentMap = {};
  const roots = [];

  // Create map
  comments.forEach(comment => {
    commentMap[comment._id.toString()] = { ...comment.toJSON(), replies: [] };
  });

  // Build tree
  comments.forEach(comment => {
    const commentObj = commentMap[comment._id.toString()];
    if (comment.parentComment) {
      const parent = commentMap[comment.parentComment.toString()];
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      roots.push(commentObj);
    }
  });

  return roots;
};

// Helper to build comment tree from lean documents (no toJSON method)
const buildCommentTreeLean = (comments) => {
  const commentMap = {};
  const roots = [];
  const { getTimeAgo } = require('../utils/helpers');

  // Create map with formatted data
  comments.forEach(comment => {
    commentMap[comment._id.toString()] = {
      ...comment,
      id: comment._id,
      voteCount: comment.upvotes - comment.downvotes,
      timeAgo: getTimeAgo(comment.createdAt),
      author: comment.authorUsername,
      postId: comment.post,
      parentId: comment.parentComment,
      replies: []
    };
  });

  // Build tree
  comments.forEach(comment => {
    const commentObj = commentMap[comment._id.toString()];
    if (comment.parentComment) {
      const parent = commentMap[comment.parentComment.toString()];
      if (parent) {
        parent.replies.push(commentObj);
      }
    } else {
      roots.push(commentObj);
    }
  });

  return roots;
};

// GET /api/comments - Get comments by post ID
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { postId } = req.query;
    
    if (!postId) {
      return res.status(400).json({ message: 'postId is required' });
    }

    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .lean(); // Use lean for faster read-only queries

    const tree = buildCommentTreeLean(comments);
    const treeWithVotes = await addUserVoteInfo(tree, req.user?.id);

    res.status(200).json(treeWithVotes);
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/comments/user/:username - Get comments by user
router.get('/user/:username', async (req, res) => {
  try {
    const comments = await Comment.find({ authorUsername: req.params.username })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    // Format lean documents
    const { getTimeAgo } = require('../utils/helpers');
    const formattedComments = comments.map(c => ({
      ...c,
      id: c._id,
      voteCount: c.upvotes - c.downvotes,
      timeAgo: getTimeAgo(c.createdAt),
      author: c.authorUsername,
      postId: c.post,
      parentId: c.parentComment
    }));

    res.status(200).json(formattedComments);
  } catch (error) {
    console.error('Get user comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/comments - Create comment (protected)
router.post(
  '/',
  authenticateToken,
  [
    body('postId').notEmpty().withMessage('Post ID is required'),
    body('content').trim().isLength({ min: 1, max: 10000 }).withMessage('Comment content is required'),
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

      const { postId, content, parentId } = req.body;

      // Verify post exists
      const post = await Post.findById(postId);
      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      // Check if user is a member of the community
      const userActivity = await UserActivity.findOne({ user: req.user.id });
      const isMember = userActivity?.joinedCommunities?.some(
        c => c.toString() === post.community.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: 'You must join this community to comment' });
      }

      // Calculate depth if replying
      let depth = 0;
      if (parentId) {
        const parentComment = await Comment.findById(parentId);
        if (parentComment) {
          depth = parentComment.depth + 1;
        }
      }

      const newComment = await Comment.create({
        content,
        post: postId,
        author: req.user.id,
        authorUsername: req.user.username,
        parentComment: parentId || null,
        depth
      });

      // Increment post comment count
      post.commentCount++;
      await post.save();

      // Create notifications
      if (parentId) {
        // This is a reply to another comment
        const parentComment = await Comment.findById(parentId);
        if (parentComment) {
          await notifyCommentReply(parentComment, post, req.user);
        }
      } else {
        // This is a top-level comment on the post
        await notifyPostComment(post, req.user);
      }

      res.status(201).json(newComment);
    } catch (error) {
      console.error('Create comment error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// PUT /api/comments/:id - Update comment (protected)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to edit this comment' });
    }

    const { content } = req.body;
    
    if (!content || !content.trim()) {
      return res.status(400).json({ message: 'Content is required' });
    }

    comment.content = content.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();

    await comment.save();

    res.status(200).json(comment);
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/comments/:id - Delete comment (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id);
    
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Delete comment and all replies
    const deleteCommentAndReplies = async (commentId) => {
      const replies = await Comment.find({ parentComment: commentId });
      for (const reply of replies) {
        await deleteCommentAndReplies(reply._id);
      }
      await Comment.findByIdAndDelete(commentId);
      await Vote.deleteMany({ target: commentId, targetType: 'comment' });
    };

    await deleteCommentAndReplies(req.params.id);

    // Decrement post comment count
    const post = await Post.findById(comment.post);
    if (post) {
      post.commentCount = Math.max(0, post.commentCount - 1);
      await post.save();
    }

    res.status(200).json({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/comments/:id/vote - Vote on comment (protected)
router.post('/:id/vote', authenticateToken, async (req, res) => {
  try {
    const { vote } = req.body;
    const commentId = req.params.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const voteValue = vote === 'up' ? 1 : -1;
    let userVote = null;
    let karmaChange = 0;

    const existingVote = await Vote.findOne({
      user: req.user.id,
      target: commentId,
      targetType: 'comment'
    });

    if (existingVote) {
      if (existingVote.voteType === voteValue) {
        // Remove vote
        await Vote.findByIdAndDelete(existingVote._id);
        if (voteValue === 1) {
          comment.upvotes--;
          karmaChange = -1;
        } else {
          comment.downvotes--;
          karmaChange = 1;
        }
        userVote = null;
      } else {
        // Change vote
        if (existingVote.voteType === 1) {
          comment.upvotes--;
          comment.downvotes++;
          karmaChange = -2;
        } else {
          comment.downvotes--;
          comment.upvotes++;
          karmaChange = 2;
        }
        existingVote.voteType = voteValue;
        await existingVote.save();
        userVote = vote;
      }
    } else {
      // New vote
      await Vote.create({
        user: req.user.id,
        target: commentId,
        targetType: 'comment',
        voteType: voteValue
      });
      if (voteValue === 1) {
        comment.upvotes++;
        karmaChange = 1;
      } else {
        comment.downvotes++;
        karmaChange = -1;
      }
      userVote = vote;
    }

    await comment.save();

    // Update comment author's karma (don't update if voting on own comment)
    if (comment.author.toString() !== req.user.id && karmaChange !== 0) {
      await User.findByIdAndUpdate(comment.author, { $inc: { karma: karmaChange } });
    }

    res.status(200).json({
      voteCount: comment.upvotes - comment.downvotes,
      userVote
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
