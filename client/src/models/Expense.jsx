const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    // Link the expense to the User model using the Object ID
    user: { 
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User', 
    },
    description: { 
        type: String, 
        required: true,
        trim: true 
    },
    amount: { 
        type: Number, 
        required: true,
        min: 0.01 
    },
    category: { 
        type: String, 
        required: true 
    },
    date: { 
        type: Date, 
        required: true,
        default: Date.now 
    },
    // Optional reference for AI insights later
    ai_category_match: {
        type: Boolean,
        default: false
    }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);