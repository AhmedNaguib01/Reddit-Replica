const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  targetType: {
    type: String,
    enum: ['post', 'comment'],
    required: true
  },
  target: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType'
  },
  voteType: {
    type: Number,
    enum: [1, -1], // 1 for upvote, -1 for downvote
    required: true
  }
}, {
  timestamps: true
});

voteSchema.index({ user: 1, targetType: 1, target: 1 }, { unique: true });
// Serves the cascade deletes, which always filter on target + targetType
voteSchema.index({ target: 1, targetType: 1 });

module.exports = mongoose.model('Vote', voteSchema);
