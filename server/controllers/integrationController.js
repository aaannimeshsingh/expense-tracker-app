const Expense = require('../models/Expense');
const Budget = require('../models/Budget');
const ExportHistory = require('../models/ExportHistory');
const { sendExpenseReport } = require('../utils/emailService');

// ============================================
// EMAIL REPORT FUNCTIONALITY
// ============================================

const sendEmailReport = async (req, res) => {
  try {
    const { recipientEmail, reportType, includeCharts, subject } = req.body;

    let startDate, endDate;
    const now = new Date();
    
    switch(reportType) {
      case 'daily':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        endDate = new Date(now.setHours(23, 59, 59, 999));
        break;
      case 'weekly':
        startDate = new Date(now.setDate(now.getDate() - 7));
        endDate = new Date();
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date();
    }

    const expenses = await Expense.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    const budgets = await Budget.find({ user: req.user._id });

    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const categoryTotals = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    const totalBudget = budgets.reduce((sum, b) => sum + b.limit, 0);

    const emailData = {
      reportType,
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      totalExpenses,
      transactionCount: expenses.length,
      categoryBreakdown: categoryTotals,
      totalBudget,
      budgetRemaining: totalBudget - totalExpenses,
      topExpenses: expenses.slice(0, 5),
      subject,
      userName: req.user.name
    };

    const result = await sendExpenseReport(recipientEmail, emailData);

    res.json({
      success: true,
      message: result.simulated 
        ? `📧 Report prepared for ${recipientEmail} (Email simulation mode)`
        : `✅ Report sent successfully to ${recipientEmail}`,
      simulated: result.simulated,
      preview: {
        totalExpenses: totalExpenses.toFixed(2),
        transactionCount: expenses.length,
        categoryBreakdown: categoryTotals
      }
    });

  } catch (error) {
    console.error('Email report error:', error);
    res.status(500).json({ 
      message: 'Failed to send email report', 
      error: error.message 
    });
  }
};

// ============================================
// EMAIL RECEIPT PARSER
// ============================================

const parseEmailReceipt = async (req, res) => {
  try {
    const { emailText } = req.body;

    if (!emailText) {
      return res.status(400).json({ message: 'Email text is required' });
    }

    const amountMatch = emailText.match(/(?:total|amount|sum|price)[:\s]*\$?\s*(\d+\.?\d{0,2})/i);
    const merchantMatch = emailText.match(/(?:from|merchant|store|at)[:\s]*([A-Za-z0-9\s]+)/i);
    const dateMatch = emailText.match(/(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/);

    const amount = amountMatch ? parseFloat(amountMatch[1]) : null;
    const merchant = merchantMatch ? merchantMatch[1].trim() : null;
    
    let date = new Date();
    if (dateMatch) {
      const dateParts = dateMatch[1].split(/[-\/]/);
      try {
        date = new Date(dateParts[2], dateParts[0] - 1, dateParts[1]);
      } catch (e) {
        date = new Date();
      }
    }

    let suggestedCategory = 'Other';
    if (merchant) {
      const lowerMerchant = merchant.toLowerCase();
      if (lowerMerchant.includes('coffee') || lowerMerchant.includes('restaurant') || lowerMerchant.includes('food')) {
        suggestedCategory = 'Food & Drinks';
      } else if (lowerMerchant.includes('uber') || lowerMerchant.includes('taxi') || lowerMerchant.includes('gas')) {
        suggestedCategory = 'Travel';
      } else if (lowerMerchant.includes('amazon') || lowerMerchant.includes('store') || lowerMerchant.includes('shop')) {
        suggestedCategory = 'Shopping';
      } else if (lowerMerchant.includes('electric') || lowerMerchant.includes('water') || lowerMerchant.includes('bill')) {
        suggestedCategory = 'Bills & Utilities';
      } else if (lowerMerchant.includes('netflix') || lowerMerchant.includes('movie') || lowerMerchant.includes('game')) {
        suggestedCategory = 'Entertainment';
      }
    }

    res.json({
      parsed: true,
      data: {
        description: merchant || 'Email Receipt',
        amount: amount,
        date: date.toISOString().substring(0, 10),
        category: suggestedCategory
      },
      confidence: (amount && merchant) ? 'high' : 'medium'
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to parse email', error: error.message });
  }
};

// ============================================
// EXPORT FUNCTIONALITY
// ============================================

const exportExpensesCSV = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    let csv = 'Date,Description,Category,Amount\n';
    expenses.forEach(exp => {
      csv += `${new Date(exp.date).toLocaleDateString()},${exp.description},${exp.category},${exp.amount}\n`;
    });

    await ExportHistory.create({
      user: req.user._id,
      format: 'csv',
      recordCount: expenses.length,
      fileName: `expenses_${Date.now()}.csv`
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${Date.now()}.csv`);
    res.send(csv);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export CSV', error: error.message });
  }
};

const exportExpensesPDF = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const byCategory = expenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + exp.amount;
      return acc;
    }, {});

    await ExportHistory.create({
      user: req.user._id,
      format: 'pdf',
      recordCount: expenses.length,
      fileName: `expenses_report_${Date.now()}.pdf`
    });

    let pdfContent = 'EXPENSE REPORT\n';
    pdfContent += '='.repeat(50) + '\n\n';
    pdfContent += `Generated: ${new Date().toLocaleDateString()}\n`;
    pdfContent += `Total Expenses: $${total.toFixed(2)}\n`;
    pdfContent += `Number of Transactions: ${expenses.length}\n\n`;
    
    pdfContent += 'CATEGORY BREAKDOWN\n';
    pdfContent += '-'.repeat(50) + '\n';
    Object.entries(byCategory).forEach(([cat, amount]) => {
      pdfContent += `${cat}: $${amount.toFixed(2)}\n`;
    });
    
    pdfContent += '\nDETAILED TRANSACTIONS\n';
    pdfContent += '-'.repeat(50) + '\n';
    expenses.slice(0, 20).forEach(exp => {
      pdfContent += `${new Date(exp.date).toLocaleDateString()} - ${exp.description} - ${exp.category} - $${exp.amount.toFixed(2)}\n`;
    });

    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Content-Disposition', `attachment; filename=expense_report_${Date.now()}.txt`);
    res.send(pdfContent);

  } catch (error) {
    console.error('PDF export error:', error);
    res.status(500).json({ message: 'Failed to export PDF', error: error.message });
  }
};

const exportExpensesJSON = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;

    let query = { user: req.user._id };
    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }
    if (category && category !== 'all') {
      query.category = category;
    }

    const expenses = await Expense.find(query).sort({ date: -1 });

    await ExportHistory.create({
      user: req.user._id,
      format: 'json',
      recordCount: expenses.length,
      fileName: `expenses_${Date.now()}.json`
    });

    const jsonData = JSON.stringify({
      exportDate: new Date(),
      totalRecords: expenses.length,
      expenses
    }, null, 2);

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=expenses_${Date.now()}.json`);
    res.send(jsonData);
  } catch (error) {
    res.status(500).json({ message: 'Failed to export JSON', error: error.message });
  }
};

const getExportHistory = async (req, res) => {
  try {
    const history = await ExportHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);
    res.json(history);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch export history', error: error.message });
  }
};

// ============================================
// CALENDAR INTEGRATION
// ============================================

const syncCalendar = async (req, res) => {
  try {
    const { month, year } = req.body;

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const expenses = await Expense.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: 1 });

    const calendar = {};
    expenses.forEach(exp => {
      const dateKey = exp.date.toISOString().substring(0, 10);
      if (!calendar[dateKey]) {
        calendar[dateKey] = [];
      }
      calendar[dateKey].push(exp);
    });

    res.json({
      month,
      year,
      calendar,
      totalExpenses: expenses.length,
      totalAmount: expenses.reduce((sum, exp) => sum + exp.amount, 0)
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to sync calendar', error: error.message });
  }
};

const getCalendarEvents = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const expenses = await Expense.find({
      user: req.user._id,
      date: { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      }
    });

    const events = expenses.map(exp => ({
      id: exp._id,
      title: `${exp.description} - $${exp.amount}`,
      start: exp.date,
      category: exp.category,
      amount: exp.amount
    }));

    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch calendar events', error: error.message });
  }
};

module.exports = {
  sendEmailReport,
  parseEmailReceipt,
  exportExpensesCSV,
  exportExpensesPDF,
  exportExpensesJSON,
  getExportHistory,
  syncCalendar,
  getCalendarEvents
};