const express = require('express');
const { body, validationResult } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const Chat = require('../models/Chat');
const User = require('../models/User');

const router = express.Router();

// GET /api/chats - Get all chats for current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user.id })
      .sort({ updatedAt: -1 });

    // Format chats for response
    const formattedChats = chats.map(chat => {
      const otherUsername = chat.participantUsernames.find(u => u !== req.user.username);
      return {
        id: chat._id,
        otherUser: otherUsername,
        lastMessage: chat.lastMessage,
        updatedAt: chat.updatedAt,
        unreadCount: chat.messages.filter(m => 
          !m.read && m.senderUsername !== req.user.username
        ).length
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
    const chats = await Chat.find({ participants: req.user.id });
    
    let totalUnread = 0;
    chats.forEach(chat => {
      totalUnread += chat.messages.filter(m => 
        !m.read && m.senderUsername !== req.user.username
      ).length;
    });

    res.status(200).json({ count: totalUnread });
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

      // Can't chat with yourself
      if (username.toLowerCase() === req.user.username.toLowerCase()) {
        return res.status(400).json({ message: "You can't chat with yourself" });
      }

      // Find the other user
      const otherUser = await User.findOne({ 
        username: { $regex: new RegExp(`^${username}$`, 'i') }
      });

      if (!otherUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Check if chat already exists
      let chat = await Chat.findOne({
        participants: { $all: [req.user.id, otherUser._id] }
      });

      if (chat) {
        return res.status(200).json({ 
          id: chat._id, 
          otherUser: otherUser.username,
          isNew: false 
        });
      }

      // Create new chat
      chat = await Chat.create({
        participants: [req.user.id, otherUser._id],
        participantUsernames: [req.user.username, otherUser.username],
        messages: []
      });

      res.status(201).json({ 
        id: chat._id, 
        otherUser: otherUser.username,
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
    const chat = await Chat.findById(req.params.id);

    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }

    // Verify user is participant
    if (!chat.participants.some(p => p.toString() === req.user.id)) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const otherUsername = chat.participantUsernames.find(u => u !== req.user.username);

    res.status(200).json({
      id: chat._id,
      otherUser: otherUsername,
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

// POST /api/chats/:id/messages - Send a message
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

      const { content } = req.body;

      const newMessage = {
        sender: req.user.id,
        senderUsername: req.user.username,
        content,
        read: false
      };

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

module.exports = router;
