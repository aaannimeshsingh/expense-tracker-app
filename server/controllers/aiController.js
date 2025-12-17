const Expense = require('../models/Expense');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Initialize Gemini AI
let genAI = null;
let model = null;

if (process.env.GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
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
// 🤖 AI Chat Assistant (FIXED - Handles General Questions)
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

    // Calculate comprehensive stats for context
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const currentMonth = new Date().toISOString().substring(0, 7);
    const lastMonth = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().substring(0, 7);
    
    const thisMonthExpenses = expenses
      .filter(e => new Date(e.date).toISOString().substring(0, 7) === currentMonth)
      .reduce((sum, e) => sum + e.amount, 0);

    const lastMonthExpenses = expenses
      .filter(e => new Date(e.date).toISOString().substring(0, 7) === lastMonth)
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
      .sort((a, b) => b[1] - a[1])
      .map(([cat, amt]) => `${cat}: $${amt.toFixed(2)}`)
      .join(', ');

    // Use Gemini AI if available
    if (model) {
      try {
        const prompt = `You are a helpful, friendly financial assistant helping users manage their expenses and budgets.

**User's Financial Data:**
- Total expenses (all time): $${totalExpenses.toFixed(2)}
- This month's expenses: $${thisMonthExpenses.toFixed(2)}
- Last month's expenses: $${lastMonthExpenses.toFixed(2)}
- Month-over-month change: ${lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1) : 0}%
- Categories breakdown: ${categoryBreakdown}
- Number of transactions: ${expenses.length}

**Recent transactions:**
${expenseSummary}

**User's question:** ${message}

**Instructions:**
1. Answer the user's question directly and helpfully
2. If it's about their expenses, use the data provided above
3. If it's a general question (like "what is AI", "tell me a joke", "how are you"), answer it naturally without forcing expense data into the response
4. Be conversational, encouraging, and use relevant emojis (💰 📊 💡 ✅ ⚠️ 📈 📉)
5. Keep responses under 200 words but fully answer their question
6. If the question is completely unrelated to finances, it's okay to have a friendly conversation

Provide a complete, helpful response:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const aiResponse = response.text();

        return res.json({ response: aiResponse });
      } catch (aiError) {
        console.error('Gemini AI error:', aiError);
        // Fall through to rule-based responses
      }
    }

    // 🔥 ENHANCED FALLBACK: Handle general questions properly
    const lowerMessage = message.toLowerCase();
    let response = '';

    // ========================================
    // 🆕 GENERAL QUESTIONS (Handle first!)
    // ========================================
    
    // Simple greetings
    if (lowerMessage.match(/^(hi|hello|hey|sup|yo|greetings)$/i)) {
      response = `👋 Hello! I'm your AI Financial Assistant! I can help you with:\n\n` +
        `💰 Expense tracking and analysis\n` +
        `📊 Budget management\n` +
        `📈 Spending trends\n` +
        `💡 Money-saving tips\n\n` +
        `What would you like to know?`;
    }
    // How are you / Status
    else if (lowerMessage.match(/how are you|how's it going|what's up|how do you do/i)) {
      response = `😊 I'm doing great, thanks for asking! I'm here and ready to help you manage your finances. ` +
        `${expenses.length > 0 ? `I see you have ${expenses.length} expenses tracked - would you like me to analyze them?` : 'Ready to start tracking your expenses?'}`;
    }
    // What can you do / Help / Capabilities
    else if (lowerMessage.match(/what can you do|help me|capabilities|features|what do you know/i)) {
      response = `🤖 I'm your AI financial assistant! Here's what I can do:\n\n` +
        `💰 **Expense Analysis:**\n` +
        `• "How much did I spend this month?"\n` +
        `• "What's my biggest expense category?"\n` +
        `• "Show me spending trends"\n\n` +
        `📊 **Budget Help:**\n` +
        `• "Am I over budget?"\n` +
        `• "How can I save money?"\n\n` +
        `📈 **Insights:**\n` +
        `• "Compare this month to last month"\n` +
        `• "What's my average daily spending?"\n\n` +
        `Just ask me anything about your finances!`;
    }
    // Tell a joke
    else if (lowerMessage.match(/tell.*joke|make me laugh|funny|humor/i)) {
      const jokes = [
        "Why don't expenses ever get invited to parties? Because they always bring everyone down! 💸😄",
        "What did the dollar say to the cent? You don't make any cents! 😂",
        "Why did the budget go to therapy? It had too many issues! 💰🛋️",
        "What's a financial advisor's favorite type of music? Account-ancy! 🎵📊",
        "Why did the expense report go to the doctor? It had too many deductions! 🏥💰"
      ];
      response = jokes[Math.floor(Math.random() * jokes.length)];
    }
    // General knowledge questions (not finance-related)
    else if (lowerMessage.match(/what is|tell me about|explain|define/i) && 
             !lowerMessage.match(/budget|expense|spending|money|financial|save|cost|price/i)) {
      response = `🤔 That's an interesting question! While I'm primarily focused on helping you with financial matters, ` +
        `I can give you a brief answer:\n\n` +
        `I'm an AI assistant specialized in personal finance and expense tracking. ` +
        `For detailed information on general topics, you might want to search online or ask a general AI assistant.\n\n` +
        `💡 **But I'm great at helping with:**\n` +
        `• Expense tracking & budgeting\n` +
        `• Spending analysis & insights\n` +
        `• Financial planning tips\n\n` +
        `Is there anything about your expenses or budget I can help you with?`;
    }
    // Who are you / About
    else if (lowerMessage.match(/who are you|what are you|your name/i)) {
      response = `🤖 I'm your AI Financial Assistant! I'm here to help you:\n\n` +
        `✅ Track and analyze your expenses\n` +
        `✅ Manage your budgets\n` +
        `✅ Get insights on spending patterns\n` +
        `✅ Find ways to save money\n\n` +
        `I use AI to understand your questions and provide personalized financial advice based on your actual spending data!\n\n` +
        `${expenses.length > 0 ? `I can see you have ${expenses.length} expenses tracked. Want me to analyze them?` : 'Ready to help you start tracking!'}`;
    }
    // Thank you
    else if (lowerMessage.match(/thank|thanks|appreciate/i)) {
      response = `😊 You're welcome! Feel free to ask me anything else about your finances. I'm here to help you manage your money better!`;
    }
    // Goodbye
    else if (lowerMessage.match(/bye|goodbye|see you|later/i)) {
      response = `👋 Goodbye! Come back anytime you need help with your finances. Have a great day! 💰✨`;
    }
    
    // ========================================
    // 💰 EXPENSE-SPECIFIC QUESTIONS
    // ========================================
    
    // Monthly spending
    else if (lowerMessage.match(/(how much|what.*spent|total.*spend|spending).*month|month.*(spend|spent|total)/i)) {
      const transactionCount = expenses.filter(e => 
        new Date(e.date).toISOString().substring(0, 7) === currentMonth
      ).length;
      const comparison = lastMonthExpenses > 0 
        ? ` That's ${((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)}% ${thisMonthExpenses > lastMonthExpenses ? 'more' : 'less'} than last month.`
        : '';
      response = `💰 This month you've spent **$${thisMonthExpenses.toFixed(2)}** across ${transactionCount} transactions.${comparison}`;
    }
    // Budget questions
    else if (lowerMessage.match(/budget|over.*budget|under.*budget|within.*budget/i)) {
      response = `💡 I don't have access to your budget limits right now, but here's your spending:\n\n` +
        `💰 This month: $${thisMonthExpenses.toFixed(2)}\n` +
        `📊 Last month: $${lastMonthExpenses.toFixed(2)}\n\n` +
        `Tip: Set budget limits in the Budgets section to track your progress!`;
    }
    // Average spending
    else if (lowerMessage.match(/average|daily|per day|typical/i)) {
      const daysInMonth = new Date().getDate();
      const dailyAvg = (thisMonthExpenses / daysInMonth).toFixed(2);
      response = `📊 **Your Spending Averages:**\n\n` +
        `• Daily (this month): $${dailyAvg}\n` +
        `• Monthly (overall): $${(totalExpenses / Math.max(1, Math.ceil(expenses.length / 30))).toFixed(2)}\n\n` +
        `${thisMonthExpenses > lastMonthExpenses ? '⚠️ You\'re spending more this month.' : '✅ Great job staying consistent!'}`;
    }
    // Category questions
    else if (lowerMessage.match(/category|categories|biggest|highest|most|where.*spend|what.*spend.*on/i)) {
      const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
      const topThree = sortedCategories.slice(0, 3);
      
      response = `📊 **Your Top Spending Categories:**\n\n` +
        topThree.map((cat, idx) => 
          `${idx + 1}. **${cat[0]}**: $${cat[1].toFixed(2)} (${((cat[1] / totalExpenses) * 100).toFixed(1)}%)`
        ).join('\n');
    }
    // Savings/tips
    else if (lowerMessage.match(/save|saving|tip|advice|help|reduce|cut|lower/i)) {
      const highestCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
      response = `💡 **Personalized Savings Tips:**\n\n` +
        `1. **Focus on ${highestCategory[0]}** - Your highest category\n` +
        `2. **Track small purchases** - They add up quickly!\n` +
        `3. **Set category budgets** - Use our Budget feature\n` +
        `4. **Review weekly** - Stay aware of your spending\n\n` +
        `${thisMonthExpenses > lastMonthExpenses ? '⚠️ Your spending increased this month.' : '✅ Keep it up!'}`;
    }
    // Trends
    else if (lowerMessage.match(/trend|compare|comparison|last month|previous|increase|decrease/i)) {
      const change = lastMonthExpenses > 0 
        ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses * 100).toFixed(1)
        : 0;
      const direction = change > 0 ? '📈 increased' : change < 0 ? '📉 decreased' : '➡️ stayed stable';
      
      response = `📈 **Spending Trends:**\n\n` +
        `• This month: $${thisMonthExpenses.toFixed(2)}\n` +
        `• Last month: $${lastMonthExpenses.toFixed(2)}\n` +
        `• Change: ${direction} by ${Math.abs(change)}%`;
    }
    // Recent expenses
    else if (lowerMessage.match(/recent|latest|last|newest/i)) {
      const recentExpenses = expenses.slice(0, 5);
      response = `📝 **Your Recent Expenses:**\n\n` +
        recentExpenses.map(e => 
          `• $${e.amount.toFixed(2)} - ${e.description} (${e.category})`
        ).join('\n');
    }
    // Total/summary
    else if (lowerMessage.match(/total|overall|summary|all.*time/i)) {
      response = `📊 **Your Expense Summary:**\n\n` +
        `• Total expenses: $${totalExpenses.toFixed(2)}\n` +
        `• Total transactions: ${expenses.length}\n` +
        `• Top category: ${Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}`;
    }
    
    // ========================================
    // 🆕 INTELLIGENT DEFAULT CASE
    // ========================================
    else {
      // Check if it seems finance-related
      if (lowerMessage.match(/expense|spend|money|budget|save|cost|price|pay|bill|financial/i)) {
        // Finance-related but unclear - show overview
        response = `🤔 I want to help, but I'm not quite sure what you're asking. Here's a quick overview:\n\n` +
          `💰 This month: $${thisMonthExpenses.toFixed(2)}\n` +
          `📊 Top category: ${Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'}\n\n` +
          `Try asking:\n` +
          `• "What did I spend the most on?"\n` +
          `• "Show me spending trends"\n` +
          `• "How can I save money?"`;
      } else {
        // Completely off-topic - friendly redirect
        response = `😊 I'm your financial assistant, so I'm best at answering questions about expenses, budgets, and money management.\n\n` +
          `💡 **I can help you with:**\n` +
          `• "How much did I spend this month?"\n` +
          `• "What's my budget status?"\n` +
          `• "Give me savings tips"\n` +
          `• "Show spending trends"\n\n` +
          `For general questions unrelated to finances, you might want to search online or ask a general AI assistant. But I'm always here for your financial questions! 💰`;
      }
    }

    res.json({ response });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ 
      response: '❌ Sorry, I encountered an error. Please try again!' 
    });
  }
};