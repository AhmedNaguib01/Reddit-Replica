const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  }],
  joinedCommunities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],
  recentCommunities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, {
  timestamps: true
});

// Static method to get or create user activity
userActivitySchema.statics.getOrCreate = async function(userId) {
  let activity = await this.findOne({ user: userId });
  if (!activity) {
    activity = await this.create({ user: userId });
  }
  return activity;
};

module.exports = mongoose.model('UserActivity', userActivitySchema);
