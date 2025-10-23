// /server/controllers/aiController.js

const Expense = require('../models/Expense');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    // Use gemini-2.0-flash-exp (latest experimental) or gemini-1.5-flash-latest
    model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    console.log('✅ Gemini AI initialized for AI features');
  } catch (error) {
    console.log('⚠️ Gemini failed to initialize:', error.message);
  }
} else {
  console.log('ℹ️ No GEMINI_API_KEY found. AI features will use keyword matching only.');
}

// ----------------------------------------------------------------------
// Expense Categorization Logic
// ----------------------------------------------------------------------
exports.suggestCategory = async (req, res) => {
  try {
    const { description } = req.body;

    if (!description) {
      return res.status(400).json({ message: 'Description is required' });
    }

    const keywords = {
      'Food & Drinks': ['restaurant', 'coffee', 'mcdonald', 'lunch', 'dinner', 'grocery', 'food', 'pizza', 'starbucks'],
      'Travel': ['uber', 'lyft', 'taxi', 'train', 'flight', 'hotel', 'gas', 'fuel', 'airbnb'],
      'Shopping': ['amazon', 'ebay', 'store', 'mall', 'clothing', 'electronics', 'target', 'walmart'],
      'Bills & Utilities': ['electric', 'internet', 'rent', 'insurance', 'utility', 'water', 'phone'],
      'Entertainment': ['movie', 'cinema', 'concert', 'netflix', 'spotify', 'gym', 'theater'],
      'Personal': ['haircut', 'pharmacy', 'medical', 'dentist', 'salon']
    };

    const lowerDesc = description.toLowerCase();
    
    for (const [category, words] of Object.entries(keywords)) {
      if (words.some(word => lowerDesc.includes(word))) {
        return res.json({ 
          category,
          confidence: 0.9
        });
      }
    }

    // Use Gemini if available
    if (model) {
      try {
        const categories = Object.keys(keywords).concat(['Other']).join(', ');
        const prompt = `Categorize this expense into ONE of these categories: ${categories}. 
        Expense description: "${description}"
        Respond with ONLY the category name, nothing else.`;
        
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const suggestedCategory = response.text().trim();

        return res.json({ 
          category: suggestedCategory,
          confidence: 0.85
        });
      } catch (aiError) {
        console.error('Gemini error:', aiError.message);
      }
    }

    return res.json({ 
      category: 'Other',
      confidence: 0.5
    });

  } catch (error) {
    console.error('Categorization error:', error);
    res.status(500).json({ 
      category: 'Other',
      confidence: 0.5
    });
  }
};

// ----------------------------------------------------------------------
// Helper Functions
// ----------------------------------------------------------------------
const calculatePrediction = (expenses) => {
  const monthlyTotals = {};
  expenses.forEach(expense => {
    const month = new Date(expense.date).toISOString().substring(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + expense.amount;
  });

  const totals = Object.values(monthlyTotals);
  const average = totals.reduce((sum, val) => sum + val, 0) / totals.length;
  
  const recentMonths = totals.slice(0, 2);
  const olderMonths = totals.slice(2);
  
  const recentAvg = recentMonths.reduce((sum, val) => sum + val, 0) / recentMonths.length;
  const olderAvg = olderMonths.length > 0 
    ? olderMonths.reduce((sum, val) => sum + val, 0) / olderMonths.length 
    : recentAvg;
  
  let trend = 'stable';
  const percentChange = ((recentAvg - olderAvg) / olderAvg) * 100;
  
  if (percentChange > 10) trend = 'up';
  else if (percentChange < -10) trend = 'down';
  
  const variance = totals.reduce((sum, val) => sum + Math.pow(val - average, 2), 0) / totals.length;
  const stdDev = Math.sqrt(variance);
  const confidenceLevel = stdDev / average;
  
  let confidence = 'medium';
  if (confidenceLevel < 0.2) confidence = 'high';
  else if (confidenceLevel > 0.5) confidence = 'low';
  
  const weights = [0.5, 0.3, 0.2]; 
  let predictedAmount = 0;
  for (let i = 0; i < Math.min(3, totals.length); i++) {
    predictedAmount += totals[i] * (weights[i] || 0);
  }
  
  return {
    amount: Math.round(predictedAmount),
    confidence,
    trend,
    percentChange: Math.round(percentChange)
  };
};

const generateInsights = (expenses) => {
  const insights = [];
  
  if (expenses.length === 0) {
    return [{
      type: 'info',
      message: 'Start tracking expenses to get personalized insights',
      action: 'Add your first expense to begin'
    }];
  }

  const categoryTotals = {};
  expenses.forEach(expense => {
    categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
  });

  const highestCategory = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])[0];
  
  if (highestCategory) {
    const percentage = ((highestCategory[1] / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100).toFixed(1);
    insights.push({
      type: 'warning',
      message: `${highestCategory[0]} is your highest spending category at ${percentage}% of total expenses`,
      action: 'Consider setting a budget limit for this category'
    });
  }

  const recentExpenses = expenses.slice(0, 30);
  const avgExpense = recentExpenses.reduce((sum, e) => sum + e.amount, 0) / recentExpenses.length;
  const highExpenses = recentExpenses.filter(e => e.amount > avgExpense * 2);
  
  if (highExpenses.length > 0) {
    insights.push({
      type: 'alert',
      message: `${highExpenses.length} unusually high transaction(s) detected recently`,
      action: 'Review these transactions to ensure they align with your budget'
    });
  }

  const currentMonth = new Date().toISOString().substring(0, 7);
  const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
  
  const currentMonthTotal = expenses
    .filter(e => new Date(e.date).toISOString().substring(0, 7) === currentMonth)
    .reduce((sum, e) => sum + e.amount, 0);
  
  const lastMonthTotal = expenses
    .filter(e => new Date(e.date).toISOString().substring(0, 7) === lastMonth)
    .reduce((sum, e) => sum + e.amount, 0);
  
  if (lastMonthTotal > 0) {
    const change = ((currentMonthTotal - lastMonthTotal) / lastMonthTotal) * 100;
    if (Math.abs(change) > 15) {
      insights.push({
        type: change > 0 ? 'warning' : 'success',
        message: `Your spending ${change > 0 ? 'increased' : 'decreased'} by ${Math.abs(change).toFixed(1)}% compared to last month`,
        action: change > 0 ? 'Consider reviewing your budget limits' : 'Great job managing your expenses!'
      });
    }
  }

  return insights;
};

// ----------------------------------------------------------------------
// Prediction & Insights
// ----------------------------------------------------------------------
exports.predictSpending = async (req, res) => {
  try {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const expenses = await Expense.find({ 
      user: req.user._id,
      date: { $gte: sixMonthsAgo }
    }).sort({ date: -1 });

    const prediction = calculatePrediction(expenses);
    const insights = generateInsights(expenses);

    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
    
    const currentMonthTotal = expenses
      .filter(e => new Date(e.date).toISOString().substring(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);
    
    const lastMonthTotal = expenses
      .filter(e => new Date(e.date).toISOString().substring(0, 7) === lastMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    res.json({
      predictedAmount: prediction.amount,
      confidence: prediction.confidence,
      trend: prediction.trend,
      percentChange: prediction.percentChange,
      insights,
      currentMonth: {
        total: Math.round(currentMonthTotal),
        transactionCount: expenses.filter(e => new Date(e.date).toISOString().substring(0, 7) === currentMonth).length
      },
      lastMonth: {
        total: Math.round(lastMonthTotal),
        transactionCount: expenses.filter(e => new Date(e.date).toISOString().substring(0, 7) === lastMonth).length
      }
    });
  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      message: 'Failed to generate prediction', 
      error: error.message 
    });
  }
};

exports.getInsights = async (req, res) => {
  try {
    const expenses = await Expense.find({ user: req.user._id })
      .sort({ date: -1 })
      .limit(365);

    const insights = generateInsights(expenses);

    res.json({ insights });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({ 
      message: 'Failed to generate insights', 
      error: error.message 
    });
  }
};

// ----------------------------------------------------------------------
// 🤖 AI Chat Assistant (Using Gemini AI)
// ----------------------------------------------------------------------
exports.chatAssistant = async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user._id;

    if (!message) {
      return res.status(400).json({ response: 'Please provide a message.' });
    }

    const expenses = await Expense.find({ user: userId })
      .sort({ date: -1 })
      .limit(100);

    // Calculate stats for context
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentMonth = new Date().toISOString().substring(0, 7);
    const thisMonthExpenses = expenses
      .filter(e => new Date(e.date).toISOString().substring(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const categoryTotals = {};
    expenses.forEach(expense => {
      categoryTotals[expense.category] = (categoryTotals[expense.category] || 0) + expense.amount;
    });

    // Prepare expense data for AI
    const expenseSummary = expenses.slice(0, 20).map(e => 
      `${new Date(e.date).toLocaleDateString()}: $${e.amount} - ${e.description} (${e.category})`
    ).join('\n');

    const categoryBreakdown = Object.entries(categoryTotals)
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');

    // Use Gemini AI if available
    if (model) {
      try {
        const prompt = `You are a helpful financial assistant. The user has the following expense data:

Total expenses: $${totalExpenses.toFixed(2)}
This month's expenses: $${thisMonthExpenses.toFixed(2)}
Categories breakdown: ${categoryBreakdown}

Recent transactions:
${expenseSummary}

User's question: ${message}

Provide a helpful, friendly, and concise response. Use emojis where appropriate. Keep your response under 200 words.`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        return res.json({ response: aiResponse });
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
        // Fall back to rule-based if AI fails
      }
    }

    // Fallback: Rule-based responses
    const lowerMessage = message.toLowerCase();
    let response = '';

    if (lowerMessage.match(/(spend|spent).*month|month.*spend|how much.*month/)) {
      const transactionCount = expenses.filter(e => 
        new Date(e.date).toISOString().substring(0, 7) === currentMonth
      ).length;
      response = `💰 This month you've spent $${thisMonthExpenses.toFixed(2)} across ${transactionCount} transactions.`;
    }
    else if (lowerMessage.match(/average|daily|per day/)) {
      const daysInMonth = new Date().getDate();
      const dailyAvg = (thisMonthExpenses / daysInMonth).toFixed(2);
      response = `📊 Your average daily spending this month is $${dailyAvg} (based on ${daysInMonth} days).`;
    }
    else if (lowerMessage.match(/category|categories|biggest|highest|most|where.*spend/)) {
      const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      response = `📊 Your top spending category is "${highestCategory?.[0]}" with $${highestCategory?.[1]?.toFixed(2)} spent.`;
    }
    else {
      response = `👋 I'm your AI Financial Assistant! Try asking:\n\n💰 "How much did I spend this month?"\n📊 "What's my biggest category?"\n📈 "What's my average daily spending?"\n💡 "Any budget tips?"`;
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      response: '❌ Sorry, I encountered an error. Please try again later.' 
    });
  }
};