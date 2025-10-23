const asyncHandler = require('express-async-handler');
const Expense = require('../models/Expense');

// @desc    Generate AI insights for expenses
// @route   POST /api/analytics/insights
// @access  Private
const generateInsights = asyncHandler(async (req, res) => {
  const { expenses, totalByCategory, timeRange } = req.body;

  if (!expenses || expenses.length === 0) {
    return res.status(400).json({ message: 'No expense data provided' });
  }

  // Calculate insights
  const totalSpent = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const avgPerTransaction = totalSpent / expenses.length;

  // Find top spending category
  const topCategory = totalByCategory.reduce(
    (max, cat) => (cat.total > max.total ? cat : max),
    totalByCategory[0] || { category: 'N/A', total: 0 }
  );

  // Calculate trend
  const sortedExpenses = expenses.sort((a, b) => new Date(a.date) - new Date(b.date));
  const midPoint = Math.floor(sortedExpenses.length / 2);
  const firstHalf = sortedExpenses.slice(0, midPoint);
  const secondHalf = sortedExpenses.slice(midPoint);

  const firstHalfAvg = firstHalf.reduce((sum, exp) => sum + Number(exp.amount), 0) / firstHalf.length;
  const secondHalfAvg = secondHalf.reduce((sum, exp) => sum + Number(exp.amount), 0) / secondHalf.length;

  const trend = secondHalfAvg > firstHalfAvg ? 'increasing' : 'decreasing';
  const trendPercent = Math.abs(((secondHalfAvg - firstHalfAvg) / firstHalfAvg) * 100).toFixed(1);

  // Generate recommendations
  const recommendations = [];
  
  if (topCategory.total > totalSpent * 0.4) {
    recommendations.push(`${topCategory.category} represents ${((topCategory.total / totalSpent) * 100).toFixed(0)}% of your spending. Consider setting a budget limit.`);
  }

  if (trend === 'increasing') {
    recommendations.push('Your spending is trending upward. Review recent purchases and identify areas to cut back.');
  } else {
    recommendations.push('Great job! Your spending is trending downward. Keep up the good habits!');
  }

  if (avgPerTransaction > 100) {
    recommendations.push('Your average transaction is quite high. Look for ways to reduce large purchases.');
  }

  // Calculate savings opportunity (15% of top category spending)
  const savingsOpportunity = (topCategory.total * 0.15).toFixed(2);

  const insights = {
    summary: `You've spent $${totalSpent.toFixed(2)} across ${expenses.length} transactions. Your spending is ${trend} by ${trendPercent}% compared to the previous period.`,
    topSpendingCategory: topCategory.category,
    topSpendingAmount: topCategory.total,
    averagePerDay: (totalSpent / 30).toFixed(2), // Assuming monthly view
    averagePerTransaction: avgPerTransaction.toFixed(2),
    trend: trend,
    trendPercent: trendPercent,
    recommendations: recommendations,
    savingsOpportunity: savingsOpportunity,
    totalSpent: totalSpent.toFixed(2),
    totalTransactions: expenses.length
  };

  res.json(insights);
});

// @desc    Get spending trends
// @route   GET /api/analytics/trends
// @access  Private
const getSpendingTrends = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ user: req.user._id }).sort({ date: 1 });

  // Group by month
  const monthlyData = expenses.reduce((acc, exp) => {
    const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!acc[month]) {
      acc[month] = { month, total: 0, count: 0 };
    }
    acc[month].total += Number(exp.amount);
    acc[month].count += 1;
    return acc;
  }, {});

  const trends = Object.values(monthlyData);

  res.json(trends);
});

// @desc    Detect spending anomalies
// @route   GET /api/analytics/anomalies
// @access  Private
const detectAnomalies = asyncHandler(async (req, res) => {
  const expenses = await Expense.find({ user: req.user._id });

  if (expenses.length < 5) {
    return res.json({ anomalies: [] });
  }

  const amounts = expenses.map(exp => Number(exp.amount));
  const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
  const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
  const stdDev = Math.sqrt(variance);
  const threshold = mean + (2 * stdDev);

  const anomalies = expenses
    .filter(exp => Number(exp.amount) > threshold)
    .map(exp => ({
      ...exp.toObject(),
      deviation: ((Number(exp.amount) - mean) / mean * 100).toFixed(1),
      averageSpending: mean.toFixed(2)
    }));

  res.json({ anomalies: anomalies.slice(0, 5) });
});

module.exports = {
  generateInsights,
  getSpendingTrends,
  detectAnomalies
};