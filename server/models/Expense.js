// server/models/Expense.js

const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    description: { type: String, required: true },
    amount: { type: Number, required: true },
    category: { type: String, required: true },
    date: { type: Date, default: Date.now },
    // 🆕 NEW: Receipt field to store base64 image
    receipt: { 
        type: String, 
        default: null 
    },
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);