const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  suggestCategory,
  predictSpending,
  getInsights,
  chatAssistant  // ✅ Changed from aiChat to chatAssistant
} = require('../controllers/aiController');

// @route   POST /api/ai/chat
// @desc    AI chat assistant
// @access  Private
router.post('/chat', protect, chatAssistant);  // ✅ Changed here too

// @route   GET /api/ai/predict
// @desc    AI spending predictions
// @access  Private
router.get('/predict', protect, predictSpending);

// @route   GET /api/ai/insights
// @desc    Get AI-powered insights
// @access  Private
router.get('/insights', protect, getInsights);

// @route   POST /api/ai/categorize
// @desc    Suggest category for expense
// @access  Private
router.post('/categorize', protect, suggestCategory);

module.exports = router;