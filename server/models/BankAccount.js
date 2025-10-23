// ==========================================
// server/models/BankAccount.js
// ==========================================

const mongoose = require('mongoose');

const bankAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  bankName: {
    type: String,
    required: true
  },
  accountNumber: {
    type: String,
    required: true
  },
  accountType: {
    type: String,
    enum: ['Checking', 'Savings', 'Credit Card'],
    default: 'Checking'
  },
  balance: {
    type: Number,
    default: 0
  },
  lastSynced: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

module.exports = mongoose.model('BankAccount', bankAccountSchema);