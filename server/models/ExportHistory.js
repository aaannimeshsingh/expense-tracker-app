const mongoose = require('mongoose');

const exportHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  },
  format: {
    type: String,
    enum: ['csv', 'pdf', 'json', 'excel'],
    required: true
  },
  recordCount: {
    type: Number,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  downloadCount: {
    type: Number,
    default: 1
  }
}, { timestamps: true });

module.exports = mongoose.model('ExportHistory', exportHistorySchema);