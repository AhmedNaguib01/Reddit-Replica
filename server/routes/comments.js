const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const Comment = require('../models/Comment');
const Post = require('../models/Post');
const Vote = require('../models/Vote');
const User = require('../models/User');
const UserActivity = require('../models/UserActivity');
const { notifyPostComment, notifyCommentReply } = require('../utils/notifications');
const { formatComment, normalizeName } = require('../utils/helpers');
const { attachCommentVoteInfo } = require('../utils/votes');

const router = express.Router();

const MAX_COMMENTS_PER_POST = 500;

// Helper to build comment tree from lean documents
const buildCommentTree = (comments) => {
  const commentMap = new Map();
  const roots = [];

  comments.forEach(comment => {
    commentMap.set(comment._id.toString(), { ...formatComment(comment), replies: [] });
  });

  comments.forEach(comment => {
    const node = commentMap.get(comment._id.toString());
    const parent = comment.parentComment && commentMap.get(comment.parentComment.toString());
    if (parent) {
      parent.replies.push(node);
    } else {
      roots.push(node);
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

    // Capped so a runaway thread cannot return an unbounded payload. Replies
    // are nested client-side, so the whole thread has to be fetched together.
    const comments = await Comment.find({ post: postId })
      .sort({ createdAt: 1 })
      .limit(MAX_COMMENTS_PER_POST)
      .lean();

    const tree = buildCommentTree(comments);

    res.status(200).json(await attachCommentVoteInfo(tree, req.user?.id));
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/comments/user/:username - Get comments by user
router.get('/user/:username', async (req, res) => {
  try {
    const comments = await Comment.find({ authorUsername: normalizeName(req.params.username) })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.status(200).json(comments.map(formatComment));
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

      // The post body can be a base64 image, so only the fields needed for the
      // membership check and the notification are selected. The membership
      // lookup and the parent comment are fetched alongside it.
      const [post, userActivity, parentComment] = await Promise.all([
        Post.findById(postId).select('author community title').lean(),
        UserActivity.findOne({ user: req.user.id }).select('joinedCommunities').lean(),
        parentId ? Comment.findById(parentId).select('author depth').lean() : null
      ]);

      if (!post) {
        return res.status(404).json({ message: 'Post not found' });
      }

      const isMember = userActivity?.joinedCommunities?.some(
        c => c.toString() === post.community.toString()
      );
      if (!isMember) {
        return res.status(403).json({ message: 'You must join this community to comment' });
      }

      const newComment = await Comment.create({
        content,
        post: postId,
        author: req.user.id,
        authorUsername: req.user.username,
        parentComment: parentId || null,
        depth: parentComment ? parentComment.depth + 1 : 0
      });

      // Counter bump and notification are independent of each other
      await Promise.all([
        Post.updateOne({ _id: postId }, { $inc: { commentCount: 1 } }),
        parentComment
          ? notifyCommentReply(parentComment, post, req.user)
          : notifyPostComment(post, req.user)
      ]);

      res.status(201).json(formatComment(newComment.toObject()));
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

    res.status(200).json(formatComment(comment.toObject()));
  } catch (error) {
    console.error('Update comment error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/comments/:id - Delete comment (protected)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.id).select('author post').lean();

    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    if (comment.author.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized to delete this comment' });
    }

    // Collect the whole reply subtree breadth-first, one query per level,
    // instead of two queries per individual comment. The deletes then run as
    // two bulk operations.
    const idsToDelete = [comment._id];
    let frontier = [comment._id];

    while (frontier.length) {
      const replies = await Comment.find({ parentComment: { $in: frontier } })
        .select('_id')
        .lean();
      frontier = replies.map(r => r._id);
      idsToDelete.push(...frontier);
    }

    await Promise.all([
      Comment.deleteMany({ _id: { $in: idsToDelete } }),
      Vote.deleteMany({ target: { $in: idsToDelete }, targetType: 'comment' }),
      // The post's counter drops by the whole subtree, not just one comment
      Post.updateOne({ _id: comment.post }, { $inc: { commentCount: -idsToDelete.length } })
    ]);

    // Guard against the counter going negative from older inconsistent data
    await Post.updateOne(
      { _id: comment.post, commentCount: { $lt: 0 } },
      { $set: { commentCount: 0 } }
    );

    res.status(200).json({ message: 'Comment deleted successfully', deletedCount: idsToDelete.length });
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

    const comment = await Comment.findById(commentId).select('author').lean();
    if (!comment) {
      return res.status(404).json({ message: 'Comment not found' });
    }

    const voteValue = vote === 'up' ? 1 : -1;

    const existingVote = await Vote.findOne({
      user: req.user.id,
      target: commentId,
      targetType: 'comment'
    });

    // Same atomic-delta approach as post voting
    let upvoteDelta = 0;
    let downvoteDelta = 0;
    let karmaChange = 0;
    let userVote = null;

    if (existingVote && existingVote.voteType === voteValue) {
      if (voteValue === 1) {
        upvoteDelta = -1;
        karmaChange = -1;
      } else {
        downvoteDelta = -1;
        karmaChange = 1;
      }
      await Vote.deleteOne({ _id: existingVote._id });
    } else if (existingVote) {
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
      if (voteValue === 1) {
        upvoteDelta = 1;
        karmaChange = 1;
      } else {
        downvoteDelta = 1;
        karmaChange = -1;
      }
      await Vote.create({
        user: req.user.id,
        target: commentId,
        targetType: 'comment',
        voteType: voteValue
      });
      userVote = vote;
    }

    const isOwnComment = comment.author.toString() === req.user.id;

    const [updatedComment] = await Promise.all([
      Comment.findByIdAndUpdate(
        commentId,
        { $inc: { upvotes: upvoteDelta, downvotes: downvoteDelta } },
        { new: true, projection: 'upvotes downvotes' }
      ).lean(),
      !isOwnComment && karmaChange !== 0
        ? User.updateOne({ _id: comment.author }, { $inc: { karma: karmaChange } })
        : null
    ]);

    res.status(200).json({
      voteCount: updatedComment.upvotes - updatedComment.downvotes,
      userVote
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
