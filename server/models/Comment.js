const mongoose = require('mongoose');
const { getTimeAgo } = require('../utils/helpers');

const commentSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 10000
  },
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorUsername: {
    type: String,
    required: true
  },
  parentComment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null
  },
  depth: {
    type: Number,
    default: 0
  },
  upvotes: {
    type: Number,
    default: 1
  },
  downvotes: {
    type: Number,
    default: 0
  },
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Virtual for vote count
commentSchema.virtual('voteCount').get(function() {
  return this.upvotes - this.downvotes;
});

// Virtual for time ago
commentSchema.methods.getTimeAgo = function() {
  return getTimeAgo(this.createdAt);
};

commentSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  obj.voteCount = this.upvotes - this.downvotes;
  obj.timeAgo = this.getTimeAgo();
  obj.author = obj.authorUsername;
  obj.authorId = obj.author?.toString ? obj.author.toString() : obj.author;
  obj.postId = obj.post;
  obj.parentId = obj.parentComment;
  return obj;
};

// Indexes
commentSchema.index({ post: 1, createdAt: 1 });
commentSchema.index({ author: 1 });
commentSchema.index({ authorUsername: 1, createdAt: -1 }); // For fetching comments by username
commentSchema.index({ parentComment: 1 });

module.exports = mongoose.model('Comment', commentSchema);
