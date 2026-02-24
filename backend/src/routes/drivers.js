const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const DriverProfile = require('../models/DriverProfile');
const { protect, authorize } = require('../middleware/auth');
const { uploadDocuments, uploadAvatar } = require('../middleware/upload');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });
  next();
};

// @route   POST /api/drivers/profile
// @desc    Create/Update driver profile
// @access  Private (driver)
router.post('/profile', protect, authorize('driver'), [
  body('truckType').notEmpty(),
  body('truckNumber').notEmpty(),
  body('licenseNumber').notEmpty(),
  body('truckCapacity').isNumeric()
], validate, async (req, res) => {
  try {
    const { truckType, truckNumber, licenseNumber, truckCapacity, truckLength, truckWidth, bankDetails } = req.body;

    let profile = await DriverProfile.findOne({ user: req.user._id });
    
    if (profile) {
      // Update existing
      Object.assign(profile, { truckType, truckNumber, licenseNumber, truckCapacity, truckLength, truckWidth });
      if (bankDetails) profile.bankDetails = bankDetails;
      // Reset to pending if key details changed
      if (profile.isModified('truckNumber') || profile.isModified('licenseNumber')) {
        profile.approvalStatus = 'pending';
      }
      await profile.save();
    } else {
      profile = await DriverProfile.create({
        user: req.user._id,
        truckType, truckNumber, licenseNumber, truckCapacity,
        truckLength, truckWidth, bankDetails
      });
    }

    res.json({ success: true, message: 'Driver profile saved', profile });
  } catch (err) {
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      return res.status(400).json({ success: false, message: `${field} already registered` });
    }
    res.status(500).json({ success: false, message: 'Failed to save profile' });
  }
});

// @route   POST /api/drivers/documents
// @desc    Upload driver documents
// @access  Private (driver)
router.post('/documents', protect, authorize('driver'), 
  uploadDocuments.fields([
    { name: 'governmentId', maxCount: 1 },
    { name: 'vehicleRC', maxCount: 1 },
    { name: 'insurance', maxCount: 1 },
    { name: 'profilePhoto', maxCount: 1 },
    { name: 'truckPhoto', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      let profile = await DriverProfile.findOne({ user: req.user._id });
      if (!profile) {
        return res.status(400).json({ success: false, message: 'Create driver profile first' });
      }

      if (req.files) {
        if (req.files.governmentId) {
          profile.documents.governmentId = {
            url: req.files.governmentId[0].path || req.files.governmentId[0].secure_url,
            publicId: req.files.governmentId[0].filename || req.files.governmentId[0].public_id,
            verified: false
          };
        }
        if (req.files.vehicleRC) {
          profile.documents.vehicleRC = {
            url: req.files.vehicleRC[0].path || req.files.vehicleRC[0].secure_url,
            publicId: req.files.vehicleRC[0].filename || req.files.vehicleRC[0].public_id,
            verified: false
          };
        }
        if (req.files.insurance) {
          profile.documents.insurance = {
            url: req.files.insurance[0].path || req.files.insurance[0].secure_url,
            publicId: req.files.insurance[0].filename || req.files.insurance[0].public_id,
            verified: false
          };
        }
        if (req.files.profilePhoto) {
          profile.documents.profilePhoto = {
            url: req.files.profilePhoto[0].path || req.files.profilePhoto[0].secure_url,
            publicId: req.files.profilePhoto[0].filename || req.files.profilePhoto[0].public_id
          };
          // Also update user avatar
          await User.findByIdAndUpdate(req.user._id, {
            avatar: {
              url: profile.documents.profilePhoto.url,
              publicId: profile.documents.profilePhoto.publicId
            }
          });
        }
        if (req.files.truckPhoto) {
          profile.documents.truckPhoto = {
            url: req.files.truckPhoto[0].path || req.files.truckPhoto[0].secure_url,
            publicId: req.files.truckPhoto[0].filename || req.files.truckPhoto[0].public_id
          };
        }
      }

      // Check if all required docs are uploaded
      const hasAllDocs = profile.documents.governmentId?.url && 
                         profile.documents.vehicleRC?.url && 
                         profile.documents.insurance?.url;
      
      if (hasAllDocs && profile.approvalStatus === 'pending') {
        // Keep as pending, admin will review
      }

      await profile.save();
      res.json({ success: true, message: 'Documents uploaded', profile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Document upload failed' });
    }
  }
);

// @route   GET /api/drivers/profile
// @desc    Get own driver profile
// @access  Private (driver)
router.get('/profile', protect, authorize('driver'), async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id })
      .populate('user', 'name email phone avatar averageRating totalRatings');
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    res.json({ success: true, profile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
});

// @route   GET /api/drivers/:id
// @desc    Get driver public profile
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.params.id })
      .populate('user', 'name avatar averageRating totalRatings isOnline createdAt');
    
    if (!profile || profile.approvalStatus !== 'approved') {
      return res.status(404).json({ success: false, message: 'Driver not found' });
    }

    // Hide sensitive documents from public view
    const publicProfile = {
      ...profile.toObject(),
      documents: {
        profilePhoto: profile.documents.profilePhoto,
        truckPhoto: profile.documents.truckPhoto
      }
    };

    res.json({ success: true, profile: publicProfile });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch driver profile' });
  }
});

// @route   PUT /api/drivers/toggle-online
// @desc    Toggle driver online/offline status
// @access  Private (driver)
router.put('/toggle-online', protect, authorize('driver'), async (req, res) => {
  try {
    const profile = await DriverProfile.findOne({ user: req.user._id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
    
    if (profile.approvalStatus !== 'approved') {
      return res.status(403).json({ success: false, message: 'Account not approved' });
    }

    profile.isOnline = !profile.isOnline;
    await profile.save();

    await User.findByIdAndUpdate(req.user._id, { isOnline: profile.isOnline });

    res.json({ success: true, isOnline: profile.isOnline, message: `You are now ${profile.isOnline ? 'online' : 'offline'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to toggle status' });
  }
});

module.exports = router;
