// /server/routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getUserNotifications,
  markAsRead,
} = require('../controllers/notificationController');

// @route   GET /api/notifications
// @desc    Get logged-in user's notifications
// @access  Private
router.get('/', protect, getUserNotifications);

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a notification as read
// @access  Private
router.patch('/:id/read', protect, markAsRead);

module.exports = router;
