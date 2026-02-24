const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { Chat, Message } = require('../models/Chat');
const { getNotificationService } = require('../services/notification');

module.exports = (io) => {
  // Auth middleware for socket
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      const user = await User.findById(decoded.id).select('-password');
      if (!user) return next(new Error('User not found'));
      
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`🔌 User connected: ${user.name} (${user._id})`);

    // Join personal notification room
    socket.join(`user_${user._id}`);

    // Mark user as online
    User.findByIdAndUpdate(user._id, { isOnline: true }).exec();

    // Join a chat room
    socket.on('join_chat', async ({ chatId }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (chat && chat.participants.some(p => p.toString() === user._id.toString())) {
          socket.join(`chat_${chatId}`);
          socket.emit('chat_joined', { chatId });
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to join chat' });
      }
    });

    // Leave a chat room
    socket.on('leave_chat', ({ chatId }) => {
      socket.leave(`chat_${chatId}`);
    });

    // Send message via WebSocket
    socket.on('send_message', async ({ chatId, content, type = 'text', location }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === user._id.toString())) {
          return socket.emit('error', { message: 'Not authorized to send in this chat' });
        }

        const message = await Message.create({
          chat: chatId,
          sender: user._id,
          type,
          content,
          location
        });

        await message.populate('sender', 'name avatar role');

        // Update last message and unread count
        const unreadCount = chat.unreadCount || new Map();
        chat.lastMessage = message._id;
        chat.participants.forEach(participantId => {
          if (participantId.toString() !== user._id.toString()) {
            const current = unreadCount.get(participantId.toString()) || 0;
            unreadCount.set(participantId.toString(), current + 1);
          }
        });
        chat.unreadCount = unreadCount;
        await chat.save();

        // Broadcast to all in chat room
        io.to(`chat_${chatId}`).emit('new_message', message);

        // Notify other participants if they're not in the chat room
        const otherParticipants = chat.participants.filter(p => p.toString() !== user._id.toString());
        const notifService = getNotificationService();
        for (const participantId of otherParticipants) {
          if (notifService) {
            await notifService.notifyNewMessage(participantId, user.name, chatId);
          }
        }
      } catch (err) {
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('user_typing', { userId: user._id, name: user.name });
    });

    socket.on('stop_typing', ({ chatId }) => {
      socket.to(`chat_${chatId}`).emit('user_stop_typing', { userId: user._id });
    });

    // Share location
    socket.on('share_location', async ({ chatId, coordinates, address }) => {
      try {
        const chat = await Chat.findById(chatId);
        if (!chat || !chat.participants.some(p => p.toString() === user._id.toString())) return;

        const message = await Message.create({
          chat: chatId,
          sender: user._id,
          type: 'location',
          location: { coordinates, address }
        });

        await message.populate('sender', 'name avatar role');
        chat.lastMessage = message._id;
        await chat.save();

        io.to(`chat_${chatId}`).emit('new_message', message);
      } catch (err) {
        socket.emit('error', { message: 'Failed to share location' });
      }
    });

    // Driver location update (for tracking)
    socket.on('update_location', async ({ coordinates, bookingId }) => {
      try {
        if (user.role !== 'driver') return;
        
        // Update user location
        await User.findByIdAndUpdate(user._id, {
          location: { type: 'Point', coordinates }
        });

        // Broadcast to customer tracking the booking
        if (bookingId) {
          io.to(`tracking_${bookingId}`).emit('driver_location', {
            coordinates,
            driverId: user._id,
            timestamp: new Date()
          });
        }
      } catch (err) {}
    });

    // Track booking (customer joins tracking room)
    socket.on('track_booking', ({ bookingId }) => {
      socket.join(`tracking_${bookingId}`);
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`🔌 User disconnected: ${user.name}`);
      User.findByIdAndUpdate(user._id, { isOnline: false }).exec();
    });
  });
};
