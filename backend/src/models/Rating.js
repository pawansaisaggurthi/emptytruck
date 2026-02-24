const mongoose = require('mongoose');

const ratingSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  },
  rater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  ratedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  raterRole: {
    type: String,
    enum: ['driver', 'customer'],
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  review: {
    type: String,
    maxlength: [500, 'Review cannot exceed 500 characters']
  },
  tags: [{
    type: String,
    enum: ['punctual', 'professional', 'careful', 'communicative', 'clean_truck', 
           'good_payer', 'polite', 'clear_instructions', 'trustworthy']
  }]
}, {
  timestamps: true
});

ratingSchema.index({ ratedUser: 1 });
ratingSchema.index({ booking: 1 });

module.exports = mongoose.model('Rating', ratingSchema);
