const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  driver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  driverProfile: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DriverProfile',
    required: true
  },
  origin: {
    address: { type: String, required: true },
    city: String,
    state: String,
    pincode: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    }
  },
  destination: {
    address: { type: String, required: true },
    city: String,
    state: String,
    pincode: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      }
    }
  },
  availableDate: {
    type: Date,
    required: true
  },
  availableUntil: Date,
  pricePerKm: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  minimumCharge: {
    type: Number,
    default: 0
  },
  truckType: {
    type: String,
    required: true
  },
  capacity: {
    type: Number, // tons
    required: true
  },
  totalDistanceKm: Number,
  estimatedPrice: Number,
  status: {
    type: String,
    enum: ['active', 'booked', 'in_progress', 'completed', 'cancelled', 'expired'],
    default: 'active'
  },
  notes: {
    type: String,
    maxlength: [500, 'Notes cannot exceed 500 characters']
  },
  acceptedGoods: [String], // Types of goods accepted
  rejectedGoods: [String], // Types of goods not accepted
  views: {
    type: Number,
    default: 0
  },
  bookingRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }]
}, {
  timestamps: true
});

tripSchema.index({ 'origin.location': '2dsphere' });
tripSchema.index({ 'destination.location': '2dsphere' });
tripSchema.index({ driver: 1 });
tripSchema.index({ status: 1 });
tripSchema.index({ availableDate: 1 });
tripSchema.index({ truckType: 1 });
tripSchema.index({ pricePerKm: 1 });

module.exports = mongoose.model('Trip', tripSchema);
