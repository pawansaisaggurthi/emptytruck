const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, companyName, fcmToken } = req.body;
    const updates = {};
    if (name) updates.name = name;
    if (companyName) updates.companyName = companyName;
    if (fcmToken) updates.fcmToken = fcmToken;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Update failed' });
  }
});

// @route   PUT /api/users/avatar
// @desc    Upload avatar
// @access  Private
router.put('/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file provided' });
    
    const url = req.file.path || req.file.secure_url;
    const publicId = req.file.filename || req.file.public_id;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: { url, publicId } },
      { new: true }
    );
    
    res.json({ success: true, avatarUrl: url, user });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Avatar upload failed' });
  }
});

// @route   PUT /api/users/change-password
// @desc    Change password
// @access  Private
router.put('/change-password', protect, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Both passwords required' });
    }
    
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) return res.status(400).json({ success: false, message: 'Current password incorrect' });
    
    user.password = newPassword;
    await user.save();
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Password change failed' });
  }
});

module.exports = router;
