// server/controllers/expenseController.js

const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');

// @desc    Get all expenses for logged-in user
// @route   GET /api/expenses
// @access  Private
const getExpenses = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ user: req.user._id }).sort({ date: -1 });
  res.json(expenses);
});

// @desc    Get single expense
// @route   GET /api/expenses/:id
// @access  Private
const getExpenseById = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  if (expense.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to view this expense');
  }

  res.json(expense);
});

// @desc    Create new expense
// @route   POST /api/expenses
// @access  Private
const createExpense = asyncHandler(async (req, res) => {
  const { description, amount, category, date, receipt } = req.body;

  if (!description || !amount || !category || !date) {
    res.status(400);
    throw new Error('Please provide all required fields');
  }

  const expense = await Expense.create({
    user: req.user._id,
    description,
    amount,
    category,
    date,
    receipt: receipt || null // 🆕 Store base64 receipt
  });

  res.status(201).json(expense);
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private
const updateExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  if (expense.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to update this expense');
  }

  const { description, amount, category, date, receipt } = req.body;

  expense.description = description || expense.description;
  expense.amount = amount || expense.amount;
  expense.category = category || expense.category;
  expense.date = date || expense.date;
  
  // 🆕 Update receipt if provided
  if (receipt !== undefined) {
    expense.receipt = receipt;
  }

  const updatedExpense = await expense.save();
  res.json(updatedExpense);
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private
const deleteExpense = asyncHandler(async (req, res) => {
  const expense = await Expense.findById(req.params.id);

  if (!expense) {
    res.status(404);
    throw new Error('Expense not found');
  }

  if (expense.user.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized to delete this expense');
  }

  await expense.deleteOne();
  res.json({ message: 'Expense removed', id: req.params.id });
});

// @desc    Get expense statistics
// @route   GET /api/expenses/stats/summary
// @access  Private
const getExpenseStats = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ user: req.user._id });

  const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
  
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const thisMonth = expenses
    .filter(exp => {
      const expDate = new Date(exp.date);
      return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
    })
    .reduce((sum, exp) => sum + exp.amount, 0);

  const byCategory = expenses.reduce((acc, exp) => {
    acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
    return acc;
  }, {});

  res.json({
    total: total.toFixed(2),
    count: expenses.length,
    thisMonth: thisMonth.toFixed(2),
    byCategory
  });
});

module.exports = {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpenseStats
};