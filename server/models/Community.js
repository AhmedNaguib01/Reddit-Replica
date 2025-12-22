const mongoose = require('mongoose');

const communitySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 21
  },
  displayName: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
  },
  iconUrl: {
    type: String,
    default: function() {
      return `https://placehold.co/100/ff4500/white?text=${this.name?.charAt(0).toUpperCase() || 'C'}`;
    }
  },
  bannerUrl: {
    type: String,
    default: 'https://placehold.co/1000x150/ff4500/white?text=Community'
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  creatorUsername: {
    type: String,
    required: true
  },
  memberCount: {
    type: Number,
    default: 1
  },
  category: {
    type: String,
    default: 'General'
  },
  rules: [{
    type: String
  }]
}, {
  timestamps: true
});

communitySchema.index({ memberCount: -1 });
communitySchema.index({ category: 1 });
communitySchema.index({ creator: 1 });

module.exports = mongoose.model('Community', communitySchema);
