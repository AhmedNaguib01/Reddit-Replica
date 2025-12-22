const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  senderUsername: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000
  },
  read: {
    type: Boolean,
    default: false
  },
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    default: null
  },
  replyToContent: {
    type: String,
    default: null
  },
  replyToUsername: {
    type: String,
    default: null
  },
  deleted: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  participantUsernames: [{
    type: String,
    required: true
  }],
  messages: [messageSchema],
  lastMessage: {
    content: String,
    senderUsername: String,
    createdAt: Date
  }
}, {
  timestamps: true
});

chatSchema.index({ participants: 1 });
chatSchema.index({ participantUsernames: 1 });
chatSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Chat', chatSchema);
