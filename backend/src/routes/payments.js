const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');

// @route   POST /api/payments/create-intent
// @desc    Create Stripe payment intent
// @access  Private (customer)
router.post('/create-intent', protect, authorize('customer'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    if (booking.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }
    if (booking.payment.status === 'paid') {
      return res.status(400).json({ success: false, message: 'Already paid' });
    }

    if (process.env.STRIPE_SECRET_KEY) {
      const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(booking.quotedPrice * 100), // Convert to paise/cents
        currency: 'inr',
        metadata: { bookingId: booking._id.toString() }
      });

      booking.payment.stripePaymentIntentId = paymentIntent.id;
      await booking.save();

      return res.json({
        success: true,
        clientSecret: paymentIntent.client_secret,
        amount: booking.quotedPrice
      });
    }

    res.status(400).json({ success: false, message: 'Payment gateway not configured' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Payment intent creation failed' });
  }
});

// @route   POST /api/payments/create-razorpay-order
// @desc    Create Razorpay order
// @access  Private (customer)
router.post('/create-razorpay-order', protect, authorize('customer'), async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    
    if (!booking || booking.customer.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (process.env.RAZORPAY_KEY_ID) {
      const Razorpay = require('razorpay');
      const razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET
      });

      const order = await razorpay.orders.create({
        amount: Math.round(booking.quotedPrice * 100),
        currency: 'INR',
        receipt: `booking_${booking._id}`,
        notes: { bookingId: booking._id.toString() }
      });

      booking.payment.razorpayOrderId = order.id;
      await booking.save();

      return res.json({
        success: true,
        orderId: order.id,
        amount: booking.quotedPrice,
        key: process.env.RAZORPAY_KEY_ID
      });
    }

    res.status(400).json({ success: false, message: 'Razorpay not configured' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Order creation failed' });
  }
});

// @route   POST /api/payments/verify-razorpay
// @desc    Verify Razorpay payment
// @access  Private (customer)
router.post('/verify-razorpay', protect, authorize('customer'), async (req, res) => {
  try {
    const { bookingId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    
    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }

    const booking = await Booking.findById(bookingId);
    booking.payment.status = 'paid';
    booking.payment.method = 'online';
    booking.payment.razorpayPaymentId = razorpay_payment_id;
    booking.payment.paidAt = new Date();
    await booking.save();

    res.json({ success: true, message: 'Payment verified successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Payment verification failed' });
  }
});

// @route   POST /api/payments/mark-offline
// @desc    Mark payment as offline
// @access  Private (driver or admin)
router.post('/mark-offline', protect, async (req, res) => {
  try {
    const { bookingId } = req.body;
    const booking = await Booking.findById(bookingId);
    
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    const isDriver = booking.driver.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    
    if (!isDriver && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    booking.payment.method = 'offline';
    booking.payment.status = 'paid';
    booking.payment.offlineMarkedAt = new Date();
    booking.payment.offlineMarkedBy = req.user._id.toString();
    await booking.save();

    res.json({ success: true, message: 'Payment marked as offline/cash' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update payment' });
  }
});

// @route   GET /api/payments/booking/:bookingId
// @desc    Get payment status for booking
// @access  Private
router.get('/booking/:bookingId', protect, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.bookingId, 'payment quotedPrice finalPrice customer driver');
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    
    const isAuthorized = [booking.customer.toString(), booking.driver.toString()].includes(req.user._id.toString()) 
                         || req.user.role === 'admin';
    if (!isAuthorized) return res.status(403).json({ success: false, message: 'Not authorized' });

    res.json({ success: true, payment: booking.payment, amount: booking.quotedPrice });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch payment status' });
  }
});

module.exports = router;
