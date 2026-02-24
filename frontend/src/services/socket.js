import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
  }

  connect(token) {
    if (this.socket?.connected) return;

    this.socket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected');
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  joinChat(chatId) {
    this.socket?.emit('join_chat', { chatId });
  }

  leaveChat(chatId) {
    this.socket?.emit('leave_chat', { chatId });
  }

  sendMessage(chatId, content, type = 'text') {
    this.socket?.emit('send_message', { chatId, content, type });
  }

  shareLocation(chatId, coordinates, address) {
    this.socket?.emit('share_location', { chatId, coordinates, address });
  }

  startTyping(chatId) {
    this.socket?.emit('typing', { chatId });
  }

  stopTyping(chatId) {
    this.socket?.emit('stop_typing', { chatId });
  }

  updateDriverLocation(coordinates, bookingId) {
    this.socket?.emit('update_location', { coordinates, bookingId });
  }

  trackBooking(bookingId) {
    this.socket?.emit('track_booking', { bookingId });
  }

  on(event, callback) {
    this.socket?.on(event, callback);
    // Store reference for cleanup
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    this.socket?.off(event, callback);
    if (this.listeners.has(event)) {
      const listeners = this.listeners.get(event).filter(l => l !== callback);
      this.listeners.set(event, listeners);
    }
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

const socketService = new SocketService();
export default socketService;
