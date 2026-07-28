const mongoose = require('mongoose');

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

postSchema.index({ community: 1, createdAt: -1 });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ authorUsername: 1, createdAt: -1 }); // for fetching posts by username
postSchema.index({ communityName: 1, createdAt: -1 }); // for fetching posts by community
postSchema.index({ createdAt: -1 });

// Text search covers the title only. Including `content` made MongoDB tokenise
// the base64 payload of every image post, which produced an index roughly two
// orders of magnitude larger than the collection itself and slowed down every
// write. Run `npm run sync-indexes` after changing anything here.
postSchema.index({ title: 'text' });

module.exports = mongoose.model('Post', postSchema);
