const Notification = require('../models/Notification');

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  async create(userId, type, title, message, data = {}) {
    try {
      const notification = await Notification.create({
        user: userId,
        type,
        title,
        message,
        data
      });

      // Emit real-time notification via Socket.IO
      if (this.io) {
        this.io.to(`user_${userId}`).emit('notification', notification);
      }

      return notification;
    } catch (err) {
      console.error('Notification creation error:', err);
    }
  }

  async notifyBookingRequest(booking) {
    await this.create(
      booking.driver,
      'booking_request',
      'New Booking Request',
      `You have a new booking request for your trip`,
      { bookingId: booking._id, tripId: booking.trip }
    );
  }

  async notifyBookingAccepted(booking) {
    await this.create(
      booking.customer,
      'booking_accepted',
      'Booking Accepted! 🎉',
      `Your booking request has been accepted by the driver`,
      { bookingId: booking._id }
    );
  }

  async notifyBookingRejected(booking) {
    await this.create(
      booking.customer,
      'booking_rejected',
      'Booking Declined',
      `Your booking request was declined: ${booking.rejectionReason || 'No reason provided'}`,
      { bookingId: booking._id }
    );
  }

  async notifyBookingCompleted(booking) {
    // Notify both parties
    await this.create(
      booking.customer,
      'booking_completed',
      'Trip Completed ✅',
      `Your trip has been completed. Please rate your experience.`,
      { bookingId: booking._id }
    );
    await this.create(
      booking.driver,
      'booking_completed',
      'Trip Completed ✅',
      `Trip completed. Your earnings have been credited.`,
      { bookingId: booking._id }
    );
  }

  async notifyDriverApproved(driverId) {
    await this.create(
      driverId,
      'driver_approved',
      'Account Approved! 🎉',
      `Congratulations! Your driver account has been verified and approved. You can now post trips.`,
      {}
    );
  }

  async notifyDriverRejected(driverId, reason) {
    await this.create(
      driverId,
      'driver_rejected',
      'Account Verification Failed',
      `Your account was not approved: ${reason}. Please update your documents and reapply.`,
      {}
    );
  }

  async notifyNewMessage(userId, senderName, chatId) {
    await this.create(
      userId,
      'new_message',
      `New message from ${senderName}`,
      `You have a new message. Tap to reply.`,
      { chatId }
    );
  }
}

let notificationService;

module.exports = {
  initNotificationService: (io) => {
    notificationService = new NotificationService(io);
    return notificationService;
  },
  getNotificationService: () => notificationService
};
