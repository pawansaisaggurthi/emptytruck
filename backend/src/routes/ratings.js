const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Rating = require('../models/Rating');
const Booking = require('../models/Booking');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/ratings
// @desc    Submit a rating
// @access  Private
router.post('/', protect, [
  body('bookingId').notEmpty(),
  body('rating').isInt({ min: 1, max: 5 })
], async (req, res) => {
  try {
    const { bookingId, rating, review, tags } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'Can only rate completed bookings' });
    }

    const isDriver = booking.driver.toString() === req.user._id.toString();
    const isCustomer = booking.customer.toString() === req.user._id.toString();

    if (!isDriver && !isCustomer) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Check if already rated
    const raterRole = isDriver ? 'driver' : 'customer';
    const existingRating = await Rating.findOne({ booking: bookingId, rater: req.user._id });
    if (existingRating) {
      return res.status(400).json({ success: false, message: 'Already rated this booking' });
    }

    const ratedUserId = isDriver ? booking.customer : booking.driver;

    const newRating = await Rating.create({
      booking: bookingId,
      rater: req.user._id,
      ratedUser: ratedUserId,
      raterRole,
      rating,
      review,
      tags
    });

    // Update user's average rating
    const ratedUser = await User.findById(ratedUserId);
    ratedUser.updateRating(rating);
    await ratedUser.save();

    // Update booking
    if (isCustomer) booking.driverRating = newRating._id;
    else booking.customerRating = newRating._id;
    await booking.save();

    res.status(201).json({ success: true, message: 'Rating submitted', rating: newRating });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to submit rating' });
  }
});

// @route   GET /api/ratings/user/:userId
// @desc    Get ratings for a user
// @access  Private
router.get('/user/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const ratings = await Rating.find({ ratedUser: req.params.userId })
      .populate('rater', 'name avatar role')
      .populate('booking', 'scheduledDate pickup dropoff')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Rating.countDocuments({ ratedUser: req.params.userId });
    const user = await User.findById(req.params.userId, 'averageRating totalRatings');

    res.json({ success: true, ratings, total, averageRating: user?.averageRating, totalRatings: user?.totalRatings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch ratings' });
  }
});

module.exports = router;
