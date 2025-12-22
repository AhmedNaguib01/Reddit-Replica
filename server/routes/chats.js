const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');
const { getDefaultAvatar } = require('../utils/helpers');

const router = express.Router();

// GET /api/chats - Get all chats for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Use aggregation to efficiently count unread messages without loading all of them
    const chats = await Chat.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(req.user.id) } },
      { $sort: { updatedAt: -1 } },
      {
        $project: {
          participantUsernames: 1,
          lastMessage: 1,
          updatedAt: 1,
          unreadCount: {
            $size: {
              $filter: {
                input: '$messages',
                as: 'msg',
                cond: {
                  $and: [
                    { $eq: ['$$msg.read', false] },
                    { $ne: ['$$msg.senderUsername', req.user.username] }
                  ]
                }
              }
            }
          }
        }
      }
    ]);

    // Get other usernames to fetch their avatars
    const otherUsernames = chats.map(chat => 
      chat.participantUsernames.find(u => u !== req.user.username)
    ).filter(Boolean);
    
    // Fetch avatars for all other users in one query
    const users = await User.find({ 
      username: { $in: otherUsernames } 
    }).select('username avatar').lean();
    
    const avatarMap = {};
    users.forEach(u => {
      avatarMap[u.username.toLowerCase()] = u.avatar || getDefaultAvatar(u.username);
    });

    // Format chats for response with avatars
    const formattedChats = chats.map(chat => {
      const otherUsername = chat.participantUsernames.find(u => u !== req.user.username);
      return {
        id: chat._id,
        otherUser: otherUsername,
        otherUserAvatar: avatarMap[otherUsername?.toLowerCase()] || getDefaultAvatar(otherUsername),
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        unreadCount: chat.unreadCount
      };
    });

    res.status(200).json(formattedChats);
  } catch (error) {
    console.error('Get chats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/unread-count - Get total unread message count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    // Use aggregation pipeline for efficient counting without loading all messages
    const result = await Chat.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(req.user.id) } },
      { $unwind: '$messages' },
      { $match: { 
        'messages.read': false,
        'messages.senderUsername': { $ne: req.user.username }
      }},
      { $count: 'totalUnread' }
    ]);

    const count = result.length > 0 ? result[0].totalUnread : 0;
    res.status(200).json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});


// POST /api/chats - Create or get existing chat with a user
router.post(
  '/',
  authenticateToken,
  [
    body('username').trim().notEmpty().withMessage('Username is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const { username } = req.body;
      const lowerUsername = username.toLowerCase();

      // Can't chat with yourself
      if (lowerUsername === req.user.username.toLowerCase()) {
        return res.status(400).json({ message: "You can't chat with yourself" });
      }

      // Find user and existing chat in parallel for speed
      const [otherUser, existingChat] = await Promise.all([
        User.findOne({ username: lowerUsername }).select('_id username avatar').lean(),
        Chat.findOne({ participantUsernames: { $all: [req.user.username.toLowerCase(), lowerUsername] } })
          .select('_id')
          .lean()
      ]);

      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (existingChat) {
        return res.status(200).json({ 
          id: existingChat._id, 
          otherUser: otherUser.username,
          otherUserAvatar: otherUser.avatar || getDefaultAvatar(otherUser.username),
          isNew: false 
        });
      }

      // Create new chat
      const chat = await Chat.create({
        participants: [req.user.id, otherUser._id],
        participantUsernames: [req.user.username.toLowerCase(), lowerUsername],
        messages: []
      });

      res.status(201).json({ 
        id: chat._id, 
        otherUser: otherUser.username,
        otherUserAvatar: otherUser.avatar || getDefaultAvatar(otherUser.username),
        isNew: true 
      });
    } catch (error) {
      console.error('Create chat error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// GET /api/chats/:id - Get chat with messages
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id).lean();

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const otherUsername = chat.participantUsernames.find(u => u !== req.user.username);
    
    // Fetch avatar for the other user
    const otherUser = await User.findOne({ username: otherUsername }).select('avatar').lean();

    res.status(200).json({
      id: chat._id,
      otherUser: otherUsername,
      otherUserAvatar: otherUser?.avatar || getDefaultAvatar(otherUsername),
      messages: chat.messages,
      updatedAt: chat.updatedAt
    });
  } catch (error) {
    console.error('Get chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/chats/:id/messages - Get messages (for polling)
router.get('/:id/messages', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Mark messages as read
    let hasUnread = false;
    chat.messages.forEach(msg => {
      if (!msg.read && msg.senderUsername !== req.user.username) {
        msg.read = true;
        hasUnread = true;
      }
    });

    if (hasUnread) {
      await chat.save();
    }

    res.status(200).json(chat.messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/chats/:id/messages - Send a message (with optional reply)
router.post(
  '/:id/messages',
  authenticateToken,
  [
    body('content').trim().isLength({ min: 1, max: 5000 }).withMessage('Message is required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ message: errors.array()[0].msg });
      }

      const chat = await Chat.findById(req.params.id);

      if (!chat) {
        return res.status(404).json({ message: 'Chat not found' });
      }

      if (!chat.participants.some(p => p.toString() === req.user.id)) {
        return res.status(403).json({ message: 'Not authorized' });
      }

      const { content, replyToId } = req.body;

      const newMessage = {
        sender: req.user.id,
        senderUsername: req.user.username,
        content,
        read: false
      };

      // Handle reply
      if (replyToId) {
        const replyToMessage = chat.messages.id(replyToId);
        if (replyToMessage && !replyToMessage.deleted) {
          newMessage.replyTo = replyToMessage._id;
          newMessage.replyToContent = replyToMessage.content.substring(0, 100);
          newMessage.replyToUsername = replyToMessage.senderUsername;
        }
      }

      chat.messages.push(newMessage);
      chat.lastMessage = {
        content: content.substring(0, 100),
        senderUsername: req.user.username,
        createdAt: new Date()
      };

      await chat.save();

      // Return the newly created message
      const savedMessage = chat.messages[chat.messages.length - 1];

      res.status(201).json(savedMessage);
    } catch (error) {
      console.error('Send message error:', error);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// DELETE /api/chats/:chatId/messages/:messageId - Delete a message (soft delete)
router.delete('/:chatId/messages/:messageId', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const message = chat.messages.id(req.params.messageId);

    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }

    // Only the sender can delete their message
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: 'You can only delete your own messages' });
    }

    // Soft delete - mark as deleted
    message.deleted = true;
    message.content = 'This message was deleted';

    // Update lastMessage if this was the last message
    if (chat.messages.length > 0) {
      const lastMsg = chat.messages[chat.messages.length - 1];
      if (lastMsg._id.toString() === req.params.messageId) {
        chat.lastMessage = {
          content: 'This message was deleted',
          senderUsername: message.senderUsername,
          createdAt: message.createdAt
        };
      }
    }

    await chat.save();

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/chats/:id - Delete a chat (for both users)
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await Chat.findByIdAndDelete(req.params.id);

    res.status(200).json({ message: 'Chat deleted successfully' });
  } catch (error) {
    console.error('Delete chat error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
