const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  sendEmailReport,
  parseEmailReceipt,
  exportExpensesCSV,
  exportExpensesPDF,
  exportExpensesJSON,
  getExportHistory,
  syncCalendar,
  getCalendarEvents
} = require('../controllers/integrationController');

// ============================================
// EMAIL REPORT ROUTES
// ============================================

// @route   POST /api/integrations/email/send-report
// @desc    Send expense report via email
// @access  Private
router.post('/email/send-report', protect, sendEmailReport);

// ============================================
// EMAIL RECEIPT PARSER ROUTES
// ============================================

// @route   POST /api/integrations/email/parse
// @desc    Parse email receipt and extract expense data
// @access  Private
router.post('/email/parse', protect, parseEmailReceipt);

// ============================================
// EXPORT ROUTES
// ============================================

// @route   GET /api/integrations/export/csv
// @desc    Export expenses to CSV
// @access  Private
router.get('/export/csv', protect, exportExpensesCSV);

// @route   GET /api/integrations/export/pdf
// @desc    Export expenses to PDF
// @access  Private
router.get('/export/pdf', protect, exportExpensesPDF);

// @route   GET /api/integrations/export/json
// @desc    Export expenses to JSON
// @access  Private
router.get('/export/json', protect, exportExpensesJSON);

// @route   GET /api/integrations/export/history
// @desc    Get export history
// @access  Private
router.get('/export/history', protect, getExportHistory);

// ============================================
// CALENDAR INTEGRATION ROUTES
// ============================================

// @route   POST /api/integrations/calendar/sync
// @desc    Sync expenses with calendar
// @access  Private
router.post('/calendar/sync', protect, syncCalendar);

// @route   GET /api/integrations/calendar/events
// @desc    Get calendar events with expenses
// @access  Private
router.get('/calendar/events', protect, getCalendarEvents);

module.exports = router;