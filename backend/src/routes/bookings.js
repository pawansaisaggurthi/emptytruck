const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Booking = require('../models/Booking');
const Trip = require('../models/Trip');
const { Chat } = require('../models/Chat');
const { protect, authorize } = require('../middleware/auth');
const { haversineDistance } = require('../utils/geo');
const { getNotificationService } = require('../services/notification');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// @route   POST /api/bookings
// @desc    Create booking request (customer)
// @access  Private (customer)
router.post('/', protect, authorize('customer'), [
  body('tripId').notEmpty(),
  body('pickup.address').notEmpty(),
  body('pickup.location.coordinates').isArray({ min: 2 }),
  body('dropoff.address').notEmpty(),
  body('dropoff.location.coordinates').isArray({ min: 2 }),
  body('scheduledDate').isISO8601(),
  body('goodsType').notEmpty()
], validate, async (req, res) => {
  try {
    const { tripId, pickup, dropoff, scheduledDate, goodsType, goodsWeight, goodsDescription, notes } = req.body;

    const trip = await Trip.findById(tripId).populate('driver');
    if (!trip) return res.status(404).json({ success: false, message: 'Trip not found' });
    if (trip.status !== 'active') {
      return res.status(400).json({ success: false, message: 'This trip is no longer available' });
    }

    // Check if customer already has a pending booking for this trip
    const existing = await Booking.findOne({ trip: tripId, customer: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(400).json({ success: false, message: 'You already have a pending request for this trip' });
    }

    // Calculate distance and price
    const [pickupLng, pickupLat] = pickup.location.coordinates;
    const [dropLng, dropLat] = dropoff.location.coordinates;
    const distanceKm = haversineDistance(pickupLat, pickupLng, dropLat, dropLng);
    const quotedPrice = Math.max(Math.round(distanceKm * trip.pricePerKm), trip.minimumCharge || 0);
    const platformCommissionPercent = parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || 8);
    const platformCommission = Math.round(quotedPrice * platformCommissionPercent / 100);
    const driverEarnings = quotedPrice - platformCommission;

    // Create chat room
    const chat = await Chat.create({
      participants: [req.user._id, trip.driver._id],
      unreadCount: {
        [trip.driver._id.toString()]: 0,
        [req.user._id.toString()]: 0
      }
    });

    const booking = await Booking.create({
      trip: tripId,
      driver: trip.driver._id,
      customer: req.user._id,
      pickup,
      dropoff,
      scheduledDate,
      goodsType,
      goodsWeight,
      goodsDescription,
      distanceKm: Math.round(distanceKm * 10) / 10,
      quotedPrice,
      platformCommission,
      platformCommissionPercent,
      driverEarnings,
      notes,
      chat: chat._id
    });

    // Update chat with booking reference
    chat.booking = booking._id;
    await chat.save();

    // Add to trip's booking requests
    await Trip.findByIdAndUpdate(tripId, { $push: { bookingRequests: booking._id } });

    // Notify driver
    const notifService = getNotificationService();
    if (notifService) await notifService.notifyBookingRequest(booking);

    // Real-time notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${trip.driver._id}`).emit('booking_request', {
        bookingId: booking._id,
        customer: { name: req.user.name, id: req.user._id }
      });
    }

    await booking.populate([
      { path: 'trip', select: 'origin destination pricePerKm truckType' },
      { path: 'driver', select: 'name avatar phone averageRating' },
      { path: 'customer', select: 'name avatar phone' }
    ]);

    res.status(201).json({ success: true, message: 'Booking request sent', booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// @route   GET /api/bookings/my-bookings
// @desc    Get user's bookings
// @access  Private
router.get('/my-bookings', protect, async (req, res) => {
  try {
    const { status, role, page = 1, limit = 10 } = req.query;
    
    const query = {};
    if (req.user.role === 'driver') query.driver = req.user._id;
    else query.customer = req.user._id;
    
    if (status) query.status = status;

    const bookings = await Booking.find(query)
      .populate('trip', 'origin destination pricePerKm truckType status')
      .populate('driver', 'name avatar phone averageRating')
      .populate('customer', 'name avatar phone averageRating')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);

    res.json({ success: true, count: bookings.length, total, bookings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// @route   GET /api/bookings/:id
// @desc    Get single booking
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate('trip')
      .populate('driver', 'name avatar phone email averageRating')
      .populate('customer', 'name avatar phone email averageRating')
      .populate('chat');

    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    // Ensure only involved parties or admin can view
    const isDriver = booking.driver._id.toString() === req.user._id.toString();
    const isCustomer = booking.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDriver && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    res.json({ success: true, booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch booking' });
  }
});

// @route   PUT /api/bookings/:id/accept
// @desc    Driver accepts booking
// @access  Private (driver)
router.put('/:id/accept', protect, authorize('driver'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Booking is no longer pending' });
    }

    booking.status = 'accepted';
    await booking.save();

    // Update trip status to booked
    await Trip.findByIdAndUpdate(booking.trip, { status: 'booked' });

    // Notify customer
    const notifService = getNotificationService();
    if (notifService) await notifService.notifyBookingAccepted(booking);

    const io = req.app.get('io');
    if (io) io.to(`user_${booking.customer}`).emit('booking_accepted', { bookingId: booking._id });

    res.json({ success: true, message: 'Booking accepted', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to accept booking' });
  }
});

// @route   PUT /api/bookings/:id/reject
// @desc    Driver rejects booking
// @access  Private (driver)
router.put('/:id/reject', protect, authorize('driver'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    if (booking.driver.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (booking.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Booking is no longer pending' });
    }

    booking.status = 'rejected';
    booking.rejectionReason = req.body.reason || '';
    await booking.save();

    // Remove from trip's booking requests and re-activate if no other pending
    const pendingCount = await Booking.countDocuments({ trip: booking.trip, status: 'pending' });
    if (pendingCount === 0) {
      await Trip.findByIdAndUpdate(booking.trip, { status: 'active' });
    }

    const notifService = getNotificationService();
    if (notifService) await notifService.notifyBookingRejected(booking);

    const io = req.app.get('io');
    if (io) io.to(`user_${booking.customer}`).emit('booking_rejected', { bookingId: booking._id });

    res.json({ success: true, message: 'Booking rejected', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject booking' });
  }
});

// @route   PUT /api/bookings/:id/start
// @desc    Start trip
// @access  Private (driver)
router.put('/:id/start', protect, authorize('driver'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.driver.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.status !== 'accepted') {
      return res.status(400).json({ success: false, message: 'Booking must be accepted before starting' });
    }

    booking.status = 'in_progress';
    booking.startedAt = new Date();
    await booking.save();

    await Trip.findByIdAndUpdate(booking.trip, { status: 'in_progress' });

    const io = req.app.get('io');
    if (io) io.to(`user_${booking.customer}`).emit('trip_started', { bookingId: booking._id });

    res.json({ success: true, message: 'Trip started', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to start trip' });
  }
});

// @route   PUT /api/bookings/:id/complete
// @desc    Complete trip
// @access  Private (driver)
router.put('/:id/complete', protect, authorize('driver'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking || booking.driver.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (booking.status !== 'in_progress') {
      return res.status(400).json({ success: false, message: 'Trip must be in progress to complete' });
    }

    booking.status = 'completed';
    booking.completedAt = new Date();
    booking.finalPrice = booking.quotedPrice;
    await booking.save();

    // Update trip and driver profile stats
    await Trip.findByIdAndUpdate(booking.trip, { status: 'completed' });
    const DriverProfile = require('../models/DriverProfile');
    await DriverProfile.findOneAndUpdate(
      { user: req.user._id },
      { $inc: { totalTrips: 1, totalEarnings: booking.driverEarnings } }
    );

    const notifService = getNotificationService();
    if (notifService) await notifService.notifyBookingCompleted(booking);

    res.json({ success: true, message: 'Trip completed', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to complete trip' });
  }
});

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancel booking
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });

    const isDriver = booking.driver.toString() === req.user._id.toString();
    const isCustomer = booking.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isDriver && !isCustomer && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (['completed', 'cancelled'].includes(booking.status)) {
      return res.status(400).json({ success: false, message: 'Cannot cancel this booking' });
    }

    booking.status = 'cancelled';
    booking.cancellationReason = req.body.reason || '';
    booking.cancelledBy = isAdmin ? 'admin' : (isDriver ? 'driver' : 'customer');
    await booking.save();

    // Re-activate trip if it was booked
    if (['booked', 'accepted'].includes(booking.status)) {
      await Trip.findByIdAndUpdate(booking.trip, { status: 'active' });
    }

    res.json({ success: true, message: 'Booking cancelled', booking });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

module.exports = router;
