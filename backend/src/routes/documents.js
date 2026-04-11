const express = require('express');
const router = express.Router();
const multer = require('multer');
const { protect, authorize } = require('../middleware/auth');
const { uploadToCloudinary } = require('../utils/cloudinary');
const DriverProfile = require('../models/DriverProfile');

// Use memory storage — files go to buffer, then Cloudinary
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only images and PDFs are allowed'));
    }
  },
});

// @route   POST /api/documents/upload
// @desc    Upload a driver document (aadhaar, license, vehicleRC, insurance, profilePhoto)
// @access  Private (driver)
router.post('/upload', protect, authorize('driver'), upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    const { docType } = req.body;
    const validDocTypes = ['aadhaar', 'license', 'vehicleRC', 'insurance', 'profilePhoto'];

    if (!docType || !validDocTypes.includes(docType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid document type. Must be one of: ${validDocTypes.join(', ')}`
      });
    }

    // Upload to Cloudinary
    const fileName = `${req.user._id}_${docType}_${Date.now()}`;
    const result = await uploadToCloudinary(req.file.buffer, `drivers/${req.user._id}`, fileName);

    // Find or create driver profile
    let driverProfile = await DriverProfile.findOne({ user: req.user._id });
    if (!driverProfile) {
      driverProfile = new DriverProfile({ user: req.user._id });
    }

    // Save document URL
    if (!driverProfile.documents) driverProfile.documents = {};
    driverProfile.documents[docType] = {
      url: result.secure_url,
      publicId: result.public_id,
      uploadedAt: new Date(),
      verified: false,
    };

    // Check if all required docs are uploaded
    const requiredDocs = ['aadhaar', 'license', 'vehicleRC'];
    const allUploaded = requiredDocs.every(doc => driverProfile.documents[doc]?.url);

    if (allUploaded && driverProfile.approvalStatus === 'pending') {
      driverProfile.approvalStatus = 'under_review';
    }

    await driverProfile.save();

    res.json({
      success: true,
      message: `${docType} uploaded successfully`,
      document: {
        type: docType,
        url: result.secure_url,
        publicId: result.public_id,
      },
      approvalStatus: driverProfile.approvalStatus,
    });

  } catch (err) {
    console.error('Document upload error:', err);
    res.status(500).json({ success: false, message: err.message || 'Upload failed' });
  }
});

// @route   GET /api/documents/my-documents
// @desc    Get driver's uploaded documents
// @access  Private (driver)
router.get('/my-documents', protect, authorize('driver'), async (req, res) => {
  try {
    const driverProfile = await DriverProfile.findOne({ user: req.user._id });
    if (!driverProfile) {
      return res.json({ success: true, documents: {}, approvalStatus: 'pending' });
    }

    res.json({
      success: true,
      documents: driverProfile.documents || {},
      approvalStatus: driverProfile.approvalStatus,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

// @route   GET /api/documents/driver/:driverId
// @desc    Admin views a driver's documents
// @access  Private (admin)
router.get('/driver/:driverId', protect, authorize('admin'), async (req, res) => {
  try {
    const driverProfile = await DriverProfile.findOne({ user: req.params.driverId })
      .populate('user', 'name email phone');

    if (!driverProfile) {
      return res.status(404).json({ success: false, message: 'Driver profile not found' });
    }

    res.json({
      success: true,
      driverProfile,
      documents: driverProfile.documents || {},
    });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch documents' });
  }
});

module.exports = router;
