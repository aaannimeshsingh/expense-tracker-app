// server/models/Budget.js

const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  // Link budget to a specific user
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User',
  },
  // Category this budget applies to
  category: {
    type: String,
    required: true,
  },
  // Monthly spending limit
  monthlyLimit: {
    type: Number,
    required: true,
    min: 0,
  },
  // When to send alert (percentage)
  alertThreshold: {
    type: Number,
    default: 80, // Alert at 80% of budget
    min: 0,
    max: 100,
  },
  // Is this budget active?
  isActive: {
    type: Boolean,
    default: true,
  },
  // Optional: Notes about this budget
  notes: {
    type: String,
    default: '',
  },
}, { 
  timestamps: true // Automatically adds createdAt and updatedAt
});

// Prevent duplicate budgets for same user + category
budgetSchema.index({ user: 1, category: 1 }, { unique: true });

module.exports = mongoose.model('Budget', budgetSchema);