// /server/controllers/notificationController.js
const Notification = require('../models/Notification');

// Get all notifications for the logged-in user
exports.getUserNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch notifications', error: error.message });
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (!notification) return res.status(404).json({ message: 'Notification not found' });

    if (notification.user.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    notification.read = true;
    await notification.save();
    res.json(notification);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update notification', error: error.message });
  }
};

// Optional helper to create a notification (can be reused in other controllers)
exports.createNotification = async (userId, message) => {
  try {
    const notification = await Notification.create({ user: userId, message });
    return notification;
  } catch (err) {
    console.error('Notification creation failed:', err.message);
  }
};
