const mongoose = require('mongoose');

const driverProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  truckType: {
    type: String,
    enum: ['mini_truck', 'pickup', 'lorry', 'trailer', 'container', 'tanker', 'refrigerated', 'flatbed', 'tipper'],
    required: true
  },
  truckNumber: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true
  },
  licenseNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  truckCapacity: {
    type: Number, // in tons
    required: true
  },
  truckLength: Number, // in feet
  truckWidth: Number,  // in feet
  documents: {
    governmentId: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false }
    },
    vehicleRC: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false }
    },
    insurance: {
      url: String,
      publicId: String,
      verified: { type: Boolean, default: false },
      expiryDate: Date
    },
    profilePhoto: {
      url: String,
      publicId: String
    },
    truckPhoto: {
      url: String,
      publicId: String
    }
  },
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approvedAt: Date,
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectionReason: String,
  totalTrips: {
    type: Number,
    default: 0
  },
  totalEarnings: {
    type: Number,
    default: 0
  },
  isOnline: {
    type: Boolean,
    default: false
  },
  currentTrip: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trip'
  },
  bankDetails: {
    accountNumber: String,
    ifscCode: String,
    accountHolderName: String,
    bankName: String
  }
}, {
  timestamps: true
});

driverProfileSchema.index({ user: 1 });
driverProfileSchema.index({ approvalStatus: 1 });
driverProfileSchema.index({ truckType: 1 });

module.exports = mongoose.model('DriverProfile', driverProfileSchema);
