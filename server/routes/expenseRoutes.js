const express = require('express');
const router = express.Router();
const Expense = require('../models/Expense');
const { protect } = require('../middleware/authMiddleware');
const { createNotification } = require('../controllers/notificationController');

// @route   GET /api/expenses
// @desc    Get all expenses for the authenticated user
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch expenses.', error: error.message });
    }
});


// @route   GET /api/expenses/:id
// @desc    Get a single expense by ID
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (expense) {
            // Check if the expense belongs to the authenticated user
            if (expense.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this expense.' });
            }
            res.json(expense);
        } else {
            res.status(404).json({ message: 'Expense not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to fetch expense.', error: error.message });
    }
});

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private
router.post('/', protect, async (req, res) => {
    const { description, amount, category, date } = req.body;

    if (!description || !amount || !category || !date) {
        return res.status(400).json({ message: 'Please include all required fields.' });
    }

    try {
        const newExpense = await Expense.create({
            user: req.user._id,
            description,
            amount,
            category,
            date: new Date(date)
        });

        res.status(201).json(newExpense);
    } catch (error) {
        res.status(500).json({ message: 'Failed to create expense.', error: error.message });
    }
});

// @route   PUT /api/expenses/:id
// @desc    Update an existing expense
// @access  Private
router.put('/:id', protect, async (req, res) => {
    const { description, amount, category, date } = req.body;

    try {
        const expense = await Expense.findById(req.params.id);

        if (expense) {
            // Check if the expense belongs to the authenticated user
            if (expense.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to update this expense.' });
            }

            expense.description = description || expense.description;
            expense.amount = amount || expense.amount;
            expense.category = category || expense.category;
            expense.date = date ? new Date(date) : expense.date;

            const updatedExpense = await expense.save();
            res.json(updatedExpense);
        } else {
            res.status(404).json({ message: 'Expense not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to update expense.', error: error.message });
    }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete an expense
// @access  Private
router.delete('/:id', protect, async (req, res) => {
    try {
        const expense = await Expense.findById(req.params.id);

        if (expense) {
            // Check if the expense belongs to the authenticated user
            if (expense.user.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to delete this expense.' });
            }

            await Expense.deleteOne({ _id: req.params.id });
            res.json({ message: 'Expense removed successfully.' });
        } else {
            res.status(404).json({ message: 'Expense not found.' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete expense.', error: error.message });
    }
});

module.exports = router;