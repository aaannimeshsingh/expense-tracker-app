// /server/controllers/budgetController.js

const Budget = require('../models/Budget');
const Expense = require('../models/Expense');

// @desc    Get all active budgets for logged-in user
// @route   GET /api/budgets
exports.getBudgets = async (req, res) => {
    try {
        const budgets = await Budget.find({ 
            user: req.user._id, 
            isActive: true 
        }).sort({ category: 1 });
        
        res.json(budgets);
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({ 
            message: 'Error fetching budgets', 
            error: error.message 
        });
    }
};

// @desc    Create a new budget
// @route   POST /api/budgets
exports.createBudget = async (req, res) => {
    try {
        const { category, monthlyLimit, alertThreshold, notes } = req.body;
        
        // Validation
        if (!category || !monthlyLimit) {
            return res.status(400).json({ 
                message: 'Category and monthly limit are required' 
            });
        }
        
        if (monthlyLimit <= 0) {
            return res.status(400).json({ 
                message: 'Monthly limit must be greater than 0' 
            });
        }
        
        // Check if budget already exists for this category
        const existingBudget = await Budget.findOne({
            user: req.user._id,
            category: category
        });
        
        if (existingBudget) {
            return res.status(400).json({ 
                message: 'Budget already exists for this category. Please update it instead.' 
            });
        }
        
        // Create new budget
        const budget = await Budget.create({
            user: req.user._id,
            category,
            monthlyLimit,
            alertThreshold: alertThreshold || 80,
            notes: notes || ''
        });
        
        res.status(201).json(budget);
        
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).json({ 
            message: 'Error creating budget', 
            error: error.message 
        });
    }
};

// @desc    Get current month's budget status with spending details
// @route   GET /api/budgets/status
exports.getBudgetStatus = async (req, res) => {
    try {
        // Get all active budgets
        const budgets = await Budget.find({ 
            user: req.user._id, 
            isActive: true 
        });
        
        if (budgets.length === 0) {
            return res.json({
                message: 'No budgets set',
                budgetStatus: []
            });
        }
        
        // Get current month date range
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        
        // Calculate spending for each budget category
        const budgetStatus = await Promise.all(
            budgets.map(async (budget) => {
                // Get all expenses for this category in current month
                const expenses = await Expense.find({
                    user: req.user._id,
                    category: budget.category,
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                });
                
                // Calculate total spent
                const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
                
                // Calculate percentage
                const percentage = (totalSpent / budget.monthlyLimit) * 100;
                const remaining = budget.monthlyLimit - totalSpent;
                
                // Determine alert level
                let alertLevel = 'safe'; // green
                if (percentage >= budget.alertThreshold) {
                    alertLevel = 'high'; // red
                } else if (percentage >= 70) {
                    alertLevel = 'medium'; // yellow
                }
                
                return {
                    budgetId: budget._id,
                    category: budget.category,
                    limit: budget.monthlyLimit,
                    spent: parseFloat(totalSpent.toFixed(2)),
                    remaining: parseFloat(Math.max(0, remaining).toFixed(2)),
                    percentage: parseFloat(percentage.toFixed(1)),
                    alertLevel: alertLevel,
                    exceedsLimit: totalSpent > budget.monthlyLimit,
                    transactionCount: expenses.length,
                    alertThreshold: budget.alertThreshold
                };
            })
        );
        
        // Sort by percentage (highest first)
        budgetStatus.sort((a, b) => b.percentage - a.percentage);
        
        res.json({
            month: startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
            totalBudgets: budgets.length,
            budgetStatus: budgetStatus
        });
        
    } catch (error) {
        console.error('Error fetching budget status:', error);
        res.status(500).json({ 
            message: 'Error fetching budget status', 
            error: error.message 
        });
    }
};

// @desc    Update an existing budget
// @route   PUT /api/budgets/:id
exports.updateBudget = async (req, res) => {
    try {
        const budget = await Budget.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        });
        
        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }
        
        const { monthlyLimit, alertThreshold, isActive, notes } = req.body;
        
        // Update fields
        if (monthlyLimit !== undefined) {
            if (monthlyLimit <= 0) {
                return res.status(400).json({ 
                    message: 'Monthly limit must be greater than 0' 
                });
            }
            budget.monthlyLimit = monthlyLimit;
        }
        
        if (alertThreshold !== undefined) {
            if (alertThreshold < 0 || alertThreshold > 100) {
                return res.status(400).json({ 
                    message: 'Alert threshold must be between 0 and 100' 
                });
            }
            budget.alertThreshold = alertThreshold;
        }
        
        if (isActive !== undefined) {
            budget.isActive = isActive;
        }
        
        if (notes !== undefined) {
            budget.notes = notes;
        }
        
        await budget.save();
        res.json(budget);
        
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({ 
            message: 'Error updating budget', 
            error: error.message 
        });
    }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
exports.deleteBudget = async (req, res) => {
    try {
        const budget = await Budget.findOne({ 
            _id: req.params.id, 
            user: req.user._id 
        });
        
        if (!budget) {
            return res.status(404).json({ message: 'Budget not found' });
        }
        
        await Budget.deleteOne({ _id: req.params.id });
        res.json({ message: 'Budget deleted successfully' });
        
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({ 
            message: 'Error deleting budget', 
            error: error.message 
        });
    }
};

// @desc    Get overall budget summary
// @route   GET /api/budgets/summary
exports.getBudgetSummary = async (req, res) => {
    try {
        const budgets = await Budget.find({ 
            user: req.user._id, 
            isActive: true 
        });
        
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const startOfMonth = new Date(currentYear, currentMonth, 1);
        const endOfMonth = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59);
        
        // Get all expenses for current month
        const allExpenses = await Expense.find({
            user: req.user._id,
            date: {
                $gte: startOfMonth,
                $lte: endOfMonth
            }
        });
        
        const totalBudget = budgets.reduce((sum, b) => sum + b.monthlyLimit, 0);
        const totalSpent = allExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalRemaining = Math.max(0, totalBudget - totalSpent);
        const overallPercentage = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
        
        res.json({
            totalBudget: parseFloat(totalBudget.toFixed(2)),
            totalSpent: parseFloat(totalSpent.toFixed(2)),
            totalRemaining: parseFloat(totalRemaining.toFixed(2)),
            overallPercentage: parseFloat(overallPercentage.toFixed(1)),
            budgetCount: budgets.length,
            isOverBudget: totalSpent > totalBudget
        });
        
    } catch (error) {
        console.error('Error fetching budget summary:', error);
        res.status(500).json({ 
            message: 'Error fetching budget summary', 
            error: error.message 
        });
    }
};