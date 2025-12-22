const mongoose = require('mongoose');

const customFeedSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  description: {
    type: String,
    default: '',
    maxlength: 500
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
  communities: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Community'
  }],
  isPrivate: {
    type: Boolean,
    default: false
  },
  showOnProfile: {
    type: Boolean,
    default: true
  },
  isFavorite: {
    type: Boolean,
    default: false
  },
  iconColor: {
    type: String,
    default: '#FFD700' 
  }
}, {
  timestamps: true
});

customFeedSchema.index({ creator: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CustomFeed', customFeedSchema);
