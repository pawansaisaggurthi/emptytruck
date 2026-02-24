const express = require('express');
const router = express.Router();
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const Trip = require('../models/Trip');
const Booking = require('../models/Booking');
const { protect, authorize } = require('../middleware/auth');
const { getNotificationService } = require('../services/notification');

// All admin routes protected
router.use(protect, authorize('admin'));

// @route   GET /api/admin/dashboard
// @desc    Get analytics dashboard
// @access  Admin
router.get('/dashboard', async (req, res) => {
  try {
    const [
      totalUsers, totalDrivers, totalCustomers, activeDrivers,
      pendingDrivers, totalTrips, activeTrips, completedTrips,
      totalBookings, pendingBookings, completedBookings, cancelledBookings
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      User.countDocuments({ role: 'driver' }),
      User.countDocuments({ role: 'customer' }),
      DriverProfile.countDocuments({ approvalStatus: 'approved', isOnline: true }),
      DriverProfile.countDocuments({ approvalStatus: 'pending' }),
      Trip.countDocuments(),
      Trip.countDocuments({ status: 'active' }),
      Trip.countDocuments({ status: 'completed' }),
      Booking.countDocuments(),
      Booking.countDocuments({ status: 'pending' }),
      Booking.countDocuments({ status: 'completed' }),
      Booking.countDocuments({ status: 'cancelled' })
    ]);

    // Revenue calculation
    const revenueData = await Booking.aggregate([
      { $match: { status: 'completed', 'payment.status': 'paid' } },
      { $group: { _id: null, total: { $sum: '$platformCommission' }, grossRevenue: { $sum: '$quotedPrice' } } }
    ]);

    // Monthly stats (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    
    const monthlyBookings = await Booking.aggregate([
      { $match: { createdAt: { $gte: sixMonthsAgo } } },
      { $group: { 
        _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } },
        count: { $sum: 1 },
        revenue: { $sum: '$platformCommission' }
      }},
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Recent activity
    const recentBookings = await Booking.find()
      .populate('customer', 'name')
      .populate('driver', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: {
        users: { total: totalUsers, drivers: totalDrivers, customers: totalCustomers, activeDrivers, pendingDrivers },
        trips: { total: totalTrips, active: activeTrips, completed: completedTrips },
        bookings: { total: totalBookings, pending: pendingBookings, completed: completedBookings, cancelled: cancelledBookings },
        revenue: {
          platformEarnings: revenueData[0]?.total || 0,
          grossRevenue: revenueData[0]?.grossRevenue || 0
        }
      },
      monthlyBookings,
      recentBookings
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard data' });
  }
});

// @route   GET /api/admin/pending-drivers
// @desc    Get pending driver approvals
// @access  Admin
router.get('/pending-drivers', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const profiles = await DriverProfile.find({ approvalStatus: 'pending' })
      .populate('user', 'name email phone avatar createdAt')
      .sort({ createdAt: 1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await DriverProfile.countDocuments({ approvalStatus: 'pending' });
    res.json({ success: true, profiles, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch pending drivers' });
  }
});

// @route   PUT /api/admin/drivers/:id/approve
// @desc    Approve driver
// @access  Admin
router.put('/drivers/:id/approve', async (req, res) => {
  try {
    const profile = await DriverProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    profile.approvalStatus = 'approved';
    profile.approvedAt = new Date();
    profile.approvedBy = req.user._id;
    profile.rejectionReason = undefined;
    
    // Mark all docs as verified
    if (profile.documents.governmentId) profile.documents.governmentId.verified = true;
    if (profile.documents.vehicleRC) profile.documents.vehicleRC.verified = true;
    if (profile.documents.insurance) profile.documents.insurance.verified = true;
    
    await profile.save();

    const notifService = getNotificationService();
    if (notifService) await notifService.notifyDriverApproved(profile.user);

    res.json({ success: true, message: 'Driver approved', profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to approve driver' });
  }
});

// @route   PUT /api/admin/drivers/:id/reject
// @desc    Reject driver
// @access  Admin
router.put('/drivers/:id/reject', async (req, res) => {
  try {
    const { reason } = req.body;
    const profile = await DriverProfile.findById(req.params.id);
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    profile.approvalStatus = 'rejected';
    profile.rejectionReason = reason || 'Documents incomplete or invalid';
    await profile.save();

    const notifService = getNotificationService();
    if (notifService) await notifService.notifyDriverRejected(profile.user, profile.rejectionReason);

    res.json({ success: true, message: 'Driver rejected', profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to reject driver' });
  }
});

// @route   GET /api/admin/users
// @desc    Get all users
// @access  Admin
router.get('/users', async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const query = { role: { $ne: 'admin' } };
    
    if (role) query.role = role;
    if (status === 'suspended') query.isSuspended = true;
    if (status === 'active') query.isSuspended = false;
    if (search) query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } }
    ];

    const users = await User.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    
    const total = await User.countDocuments(query);
    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
});

// @route   PUT /api/admin/users/:id/suspend
// @desc    Suspend user
// @access  Admin
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.isSuspended = true;
    user.suspendedReason = req.body.reason || 'Policy violation';
    await user.save();

    res.json({ success: true, message: 'User suspended' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to suspend user' });
  }
});

// @route   PUT /api/admin/users/:id/unsuspend
// @desc    Unsuspend user
// @access  Admin
router.put('/users/:id/unsuspend', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    
    user.isSuspended = false;
    user.suspendedReason = undefined;
    await user.save();

    res.json({ success: true, message: 'User unsuspended' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to unsuspend user' });
  }
});

// @route   GET /api/admin/bookings
// @desc    Get all bookings
// @access  Admin
router.get('/bookings', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = status ? { status } : {};
    
    const bookings = await Booking.find(query)
      .populate('customer', 'name email phone')
      .populate('driver', 'name email phone')
      .populate('trip', 'origin destination truckType')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Booking.countDocuments(query);
    res.json({ success: true, bookings, total });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// @route   PUT /api/admin/settings
// @desc    Update platform settings
// @access  Admin
router.put('/settings', async (req, res) => {
  try {
    const { commissionPercent, maxDeviation, defaultDeviation } = req.body;
    
    // In production, these should be stored in a Settings model
    // For now, we use environment variables as a mock
    const settings = {
      commissionPercent: commissionPercent || process.env.PLATFORM_COMMISSION_PERCENT,
      maxDeviation: maxDeviation || process.env.MAX_DEVIATION_KM,
      defaultDeviation: defaultDeviation || process.env.DEFAULT_DEVIATION_KM
    };

    res.json({ success: true, message: 'Settings updated', settings });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update settings' });
  }
});

// @route   GET /api/admin/settings
// @desc    Get platform settings
// @access  Admin
router.get('/settings', async (req, res) => {
  res.json({
    success: true,
    settings: {
      commissionPercent: parseFloat(process.env.PLATFORM_COMMISSION_PERCENT || 8),
      maxDeviation: parseInt(process.env.MAX_DEVIATION_KM || 100),
      defaultDeviation: parseInt(process.env.DEFAULT_DEVIATION_KM || 50)
    }
  });
});

module.exports = router;
