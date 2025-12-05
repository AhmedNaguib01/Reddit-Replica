const mongoose = require('mongoose');
const { getTimeAgo } = require('../utils/helpers');

const postSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 300
  },
  type: {
    type: String,
    enum: ['text', 'image', 'link'],
    default: 'text'
  },
  content: {
    type: String,
    default: ''
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
  community: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community',
    required: true
  },
  communityName: {
    type: String,
    required: true
  },
  upvotes: {
    type: Number,
    default: 1
  },
  downvotes: {
    type: Number,
    default: 0
  },
  commentCount: {
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
postSchema.virtual('voteCount').get(function() {
  return this.upvotes - this.downvotes;
});

// Virtual for time ago
postSchema.methods.getTimeAgo = function() {
  return getTimeAgo(this.createdAt);
};

postSchema.methods.toJSON = function() {
  const obj = this.toObject();
  obj.id = obj._id;
  obj.voteCount = this.upvotes - this.downvotes;
  obj.timeAgo = this.getTimeAgo();
  obj.subreddit = obj.communityName;
  obj.author = obj.authorUsername;
  obj.authorId = obj.author?.toString ? obj.author.toString() : obj.author;
  return obj;
};

// Indexes
postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ authorUsername: 1, createdAt: -1 }); // For fetching posts by username
postSchema.index({ communityName: 1, createdAt: -1 }); // For fetching posts by community
postSchema.index({ createdAt: -1 });
// Text index for search - allows efficient text search on title and content
postSchema.index({ title: 'text', content: 'text' });

module.exports = mongoose.model('Post', postSchema);
