const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const { generateToken, protect } = require('../middleware/auth');
const crypto = require('crypto');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
  body('name').notEmpty().trim().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['driver', 'customer']).withMessage('Role must be driver or customer')
], validate, async (req, res) => {
  try {
    const { name, email, phone, password, role, companyName } = req.body;

    // Check existing user
    const existingUser = await User.findOne({ $or: [{ email }, { phone }] });
    if (existingUser) {
      const field = existingUser.email === email ? 'email' : 'phone number';
      return res.status(400).json({ success: false, message: `User with this ${field} already exists` });
    }

    // Create user
    const user = await User.create({ name, email, phone, password, role, companyName });

    // Create empty driver profile if registering as driver
    if (role === 'driver') {
      // Driver profile will be completed in onboarding
    }

    const token = generateToken(user._id, user.role);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during registration' });
  }
});

// @route   POST /api/auth/login
// @desc    Login with email & password
// @access  Public
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], validate, async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ 
        success: false, 
        message: `Account suspended: ${user.suspendedReason || 'Contact support'}` 
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get driver profile if driver
    let driverProfile = null;
    if (user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: user._id });
    }

    const token = generateToken(user._id, user.role);

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        averageRating: user.averageRating,
        totalRatings: user.totalRatings,
        driverProfile: driverProfile ? {
          approvalStatus: driverProfile.approvalStatus,
          truckType: driverProfile.truckType,
          isOnline: driverProfile.isOnline
        } : null
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
});

// @route   POST /api/auth/send-otp
// @desc    Send OTP to phone
// @access  Public
router.post('/send-otp', [
  body('phone').notEmpty().withMessage('Phone is required')
], validate, async (req, res) => {
  try {
    const { phone } = req.body;
    
    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpire = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    let user = await User.findOne({ phone });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account found with this phone number' });
    }
    
    user.phoneOtp = otp;
    user.phoneOtpExpire = otpExpire;
    await user.save();
    
    // Send OTP via Twilio (or log in development)
    if (process.env.TWILIO_ACCOUNT_SID && process.env.NODE_ENV === 'production') {
      const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      await twilio.messages.create({
        body: `Your EmptyTruck OTP is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: phone
      });
    } else {
      console.log(`🔑 OTP for ${phone}: ${otp}`); // Development only
    }
    
    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// @route   POST /api/auth/verify-otp
// @desc    Login with OTP
// @access  Public
router.post('/verify-otp', [
  body('phone').notEmpty(),
  body('otp').isLength({ min: 6, max: 6 })
], validate, async (req, res) => {
  try {
    const { phone, otp } = req.body;
    
    const user = await User.findOne({ 
      phone,
      phoneOtp: otp,
      phoneOtpExpire: { $gt: new Date() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }
    
    user.phoneOtp = undefined;
    user.phoneOtpExpire = undefined;
    user.isPhoneVerified = true;
    user.lastLogin = new Date();
    await user.save();

    let driverProfile = null;
    if (user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: user._id });
    }
    
    const token = generateToken(user._id, user.role);
    
    res.json({
      success: true,
      message: 'OTP verified. Login successful.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
        driverProfile
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'OTP verification failed' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    let driverProfile = null;
    if (req.user.role === 'driver') {
      driverProfile = await DriverProfile.findOne({ user: req.user._id });
    }
    
    res.json({
      success: true,
      user: {
        ...req.user.toObject(),
        driverProfile
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/forgot-password
// @desc    Send reset password email
// @access  Public
router.post('/forgot-password', [
  body('email').isEmail()
], validate, async (req, res) => {
  try {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'No account with that email' });
    }
    
    const resetToken = crypto.randomBytes(20).toString('hex');
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour
    await user.save();
    
    const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
    
    // Send email (simplified - add nodemailer config as needed)
    console.log(`Password reset URL: ${resetUrl}`);
    
    res.json({ success: true, message: 'Password reset email sent' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Email could not be sent' });
  }
});

// @route   PUT /api/auth/reset-password/:token
// @desc    Reset password
// @access  Public
router.put('/reset-password/:token', [
  body('password').isLength({ min: 6 })
], validate, async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');
    
    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }
    
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.json({ success: true, message: 'Password reset successful' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password reset failed' });
  }
});

module.exports = router;
