const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  trip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip',
    required: true
  },
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pickup: {
    address: { type: String, required: true },
    city: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  },
  dropoff: {
    address: { type: String, required: true },
    city: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: [Number]
    }
  },
  scheduledDate: {
    type: Date,
    required: true
  },
  goodsType: {
    type: String,
    required: true
  },
  goodsWeight: Number, // in kg
  goodsDescription: String,
  distanceKm: Number,
  quotedPrice: {
    type: Number,
    required: true
  },
  finalPrice: Number,
  platformCommission: Number,
  platformCommissionPercent: {
    type: Number,
    default: 8
  },
  driverEarnings: Number,
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  rejectionReason: String,
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['driver', 'customer', 'admin']
  },
  startedAt: Date,
  completedAt: Date,
  payment: {
    method: {
      type: String,
      enum: ['online', 'offline', 'pending'],
      default: 'pending'
    },
    status: {
      type: String,
      enum: ['pending', 'paid', 'refunded', 'failed'],
      default: 'pending'
    },
    stripePaymentIntentId: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    paidAt: Date,
    offlineMarkedAt: Date,
    offlineMarkedBy: String
  },
  driverRating: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating'
  },
  customerRating: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Rating'
  },
  notes: String,
  trackingHistory: [{
    location: {
      coordinates: [Number]
    },
    timestamp: { type: Date, default: Date.now },
    status: String
  }],
  chat: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat'
  }
}, {
  timestamps: true
});

bookingSchema.index({ trip: 1 });
bookingSchema.index({ driver: 1 });
bookingSchema.index({ customer: 1 });
bookingSchema.index({ status: 1 });
bookingSchema.index({ scheduledDate: 1 });

module.exports = mongoose.model('Booking', bookingSchema);
