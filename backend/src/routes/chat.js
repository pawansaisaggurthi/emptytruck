const express = require('express');
const router = express.Router();
const { Chat, Message } = require('../models/Chat');
const { protect } = require('../middleware/auth');
const { uploadChat } = require('../middleware/upload');

// @route   GET /api/chat/my-chats
// @desc    Get all chats for user
// @access  Private
router.get('/my-chats', protect, async (req, res) => {
  try {
    const chats = await Chat.find({ participants: req.user._id, isActive: true })
      .populate('participants', 'name avatar isOnline role')
      .populate('lastMessage')
      .populate('booking', 'status scheduledDate pickup dropoff')
      .sort({ updatedAt: -1 });

    // Add unread count for current user
    const chatsWithUnread = chats.map(chat => {
      const chatObj = chat.toObject();
      chatObj.unreadCount = chat.unreadCount?.get(req.user._id.toString()) || 0;
      return chatObj;
    });

    res.json({ success: true, chats: chatsWithUnread });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch chats' });
  }
});

// @route   GET /api/chat/:chatId/messages
// @desc    Get messages for a chat
// @access  Private
router.get('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    // Verify user is a participant
    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { page = 1, limit = 50 } = req.query;
    const messages = await Message.find({ chat: req.params.chatId })
      .populate('sender', 'name avatar role')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    // Mark messages as read
    await Message.updateMany(
      { chat: req.params.chatId, sender: { $ne: req.user._id }, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    // Reset unread count
    const unreadCount = chat.unreadCount || new Map();
    unreadCount.set(req.user._id.toString(), 0);
    chat.unreadCount = unreadCount;
    await chat.save();

    res.json({
      success: true,
      messages: messages.reverse(), // Return in chronological order
      total: await Message.countDocuments({ chat: req.params.chatId })
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch messages' });
  }
});

// @route   POST /api/chat/:chatId/messages
// @desc    Send a message (REST fallback - WebSocket preferred)
// @access  Private
router.post('/:chatId/messages', protect, async (req, res) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found' });

    if (!chat.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const { content, type = 'text', location } = req.body;

    const message = await Message.create({
      chat: req.params.chatId,
      sender: req.user._id,
      type,
      content,
      location
    });

    await message.populate('sender', 'name avatar role');

    // Update chat's last message and unread count
    chat.lastMessage = message._id;
    const unreadCount = chat.unreadCount || new Map();
    chat.participants.forEach(participantId => {
      if (participantId.toString() !== req.user._id.toString()) {
        const current = unreadCount.get(participantId.toString()) || 0;
        unreadCount.set(participantId.toString(), current + 1);
      }
    });
    chat.unreadCount = unreadCount;
    await chat.save();

    // Emit via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`chat_${req.params.chatId}`).emit('new_message', message);
    }

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message' });
  }
});

// @route   POST /api/chat/:chatId/image
// @desc    Send image in chat
// @access  Private
router.post('/:chatId/image', protect, uploadChat.single('image'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image provided' });

    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.participants.includes(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    const imageUrl = req.file.path || req.file.secure_url;

    const message = await Message.create({
      chat: req.params.chatId,
      sender: req.user._id,
      type: 'image',
      imageUrl
    });

    await message.populate('sender', 'name avatar role');

    chat.lastMessage = message._id;
    await chat.save();

    const io = req.app.get('io');
    if (io) io.to(`chat_${req.params.chatId}`).emit('new_message', message);

    res.status(201).json({ success: true, message });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send image' });
  }
});

module.exports = router;
