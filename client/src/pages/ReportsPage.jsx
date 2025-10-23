import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Download, Filter, Sparkles, TrendingUp, AlertCircle, Brain, Lightbulb, Target } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const ReportsPage = () => {
  const { user } = useAuth();
  const [expenses, setExpenses] = useState([]);
  const [timeRange, setTimeRange] = useState('monthly');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [categories, setCategories] = useState([]);
  
  // AI Features State
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const [predictions, setPredictions] = useState([]);

  const COLORS = ['#4F46E5', '#22C55E', '#EAB308', '#EC4899', '#3B82F6', '#F97316', '#8B5CF6'];

  useEffect(() => {
    fetchExpenses();
  }, [timeRange, selectedCategory, dateRange]);

  useEffect(() => {
    if (expenses.length > 0) {
      detectAnomalies();
      generatePredictions();
    }
  }, [expenses]);

  const fetchExpenses = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      const { data } = await axios.get('http://localhost:5001/api/expenses', config);
      setExpenses(data);

      // Extract unique categories
      const uniqueCats = [...new Set(data.map(exp => exp.category))];
      setCategories(uniqueCats);
    } catch (err) {
      console.error('Error fetching expenses:', err);
    }
  };

  // AI Insights Generation (CORRECTED API CALL & DATA MAPPING)
  const generateAIInsights = async () => {
    setLoadingInsights(true);
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      
      // 💡 CHANGE: Switched to GET request to match the detailed backend route
      const { data } = await axios.get(
        'http://localhost:5001/api/analytics/insights',
        config
      );
      
      // 💡 CHANGE: Map server response to frontend state structure and add safe defaults
      const totalSpent = data.thisMonthTotal || 0;
      const topCat = data.topCategories[0] || { category: 'N/A', amount: 0 };
      const changePercentage = data.changePercentage || 0;
      const trend = changePercentage >= 0 ? 'increasing' : 'decreasing';
      const avgPerDay = data.averageTransaction || 0;

      setAiInsights({
        summary: `Your spending this month is $${totalSpent.toFixed(2)}. Compared to last month, your spending is ${trend} by ${Math.abs(changePercentage).toFixed(1)}%.`,
        topSpendingCategory: topCat.category,
        topSpendingAmount: topCat.amount,
        averagePerDay: avgPerDay.toFixed(2), // Already safe due to (avgPerDay || 0) above
        trend: trend,
        trendPercent: Math.abs(changePercentage).toFixed(1),
        // Use the insights messages from the server as recommendations
        recommendations: data.insights.map(i => i.message),
        // Simple savings opportunity calculation based on current month's total
        savingsOpportunity: (totalSpent * 0.05).toFixed(2) 
      });

    } catch (err) {
      console.error('Error generating AI insights:', err);
      // Fallback to client-side insights if API fails
      generateClientSideInsights(); 
    } finally {
      setLoadingInsights(false);
    }
  };


  // Client-side AI-like insights (fallback)
  const generateClientSideInsights = () => {
    const totalSpent = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
    const avgPerDay = totalSpent / Math.max(filteredExpenses.length, 1);
    
    // Find highest spending category
    const topCategory = totalByCategory.reduce((max, cat) => 
      cat.total > max.total ? cat : max, totalByCategory[0] || { category: 'N/A', total: 0 }
    );

    // Calculate trend
    const recentExpenses = filteredExpenses.slice(-7);
    const olderExpenses = filteredExpenses.slice(-14, -7);
    const recentAvg = recentExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0) / Math.max(recentExpenses.length, 1);
    const olderAvg = olderExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0) / Math.max(olderExpenses.length, 1);
    const trend = recentAvg > olderAvg ? 'increasing' : 'decreasing';
    const trendPercent = olderAvg > 0 ? Math.abs(((recentAvg - olderAvg) / olderAvg) * 100).toFixed(1) : '0.0';

    setAiInsights({
      summary: `You've spent $${totalSpent.toFixed(2)} across ${filteredExpenses.length} transactions. Your spending is ${trend} by ${trendPercent}% compared to the previous period. (Client-side Fallback)`,
      topSpendingCategory: topCategory.category,
      topSpendingAmount: topCategory.total,
      averagePerDay: avgPerDay.toFixed(2),
      trend: trend,
      trendPercent: trendPercent,
      recommendations: [
        topCategory.total > totalSpent * 0.4 ? `Consider reducing spending in ${topCategory.category} category` : null,
        trend === 'increasing' ? 'Your spending is trending upward. Review recent purchases.' : 'Great job! Your spending is trending downward.',
        avgPerDay > 50 ? 'Try meal prepping to reduce food expenses' : null,
      ].filter(Boolean),
      savingsOpportunity: (topCategory.total * 0.15).toFixed(2)
    });
  };

  // Anomaly Detection
  const detectAnomalies = () => {
    if (filteredExpenses.length < 5) return;

    const amounts = filteredExpenses.map(exp => Number(exp.amount));
    const mean = amounts.reduce((sum, amt) => sum + amt, 0) / amounts.length;
    const variance = amounts.reduce((sum, amt) => sum + Math.pow(amt - mean, 2), 0) / amounts.length;
    const stdDev = Math.sqrt(variance);
    const threshold = mean + (2 * stdDev);

    const detected = filteredExpenses.filter(exp => Number(exp.amount) > threshold).map(exp => ({
      ...exp,
      deviation: ((Number(exp.amount) - mean) / mean * 100).toFixed(1)
    }));

    setAnomalies(detected.slice(0, 3));
  };

  // Predictive Analytics
  const generatePredictions = () => {
    if (filteredExpenses.length < 3) return;

    // Simple linear regression for next 3 months
    const monthlyData = Object.entries(
      filteredExpenses.reduce((acc, exp) => {
        const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: 'numeric' });
        acc[month] = (acc[month] || 0) + Number(exp.amount);
        return acc;
      }, {})
    ).map(([month, total]) => ({ month, total }));

    if (monthlyData.length < 2) return;

    // Calculate trend
    const recentMonths = monthlyData.slice(-3);
    const avgIncrease = recentMonths.length > 1 
      ? (recentMonths[recentMonths.length - 1].total - recentMonths[0].total) / recentMonths.length 
      : 0;

    const lastMonth = recentMonths[recentMonths.length - 1];
    const nextMonths = ['Next Month', 'Month +2', 'Month +3'];
    
    const predicted = nextMonths.map((label, idx) => ({
      month: label,
      predicted: Math.max(0, lastMonth.total + (avgIncrease * (idx + 1))),
      isPrediction: true
    }));

    setPredictions(predicted);
  };

  const filteredExpenses = expenses.filter(exp => {
    const expDate = new Date(exp.date);
    const inDateRange =
      (!dateRange.start || expDate >= new Date(dateRange.start)) &&
      (!dateRange.end || expDate <= new Date(dateRange.end));
    const inCategory = selectedCategory ? exp.category === selectedCategory : true;
    return inDateRange && inCategory;
  });

  const totalByCategory = categories.map(cat => ({
    category: cat,
    total: filteredExpenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + Number(e.amount), 0),
  }));

  const totalByMonth = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      const month = new Date(exp.date).toLocaleString('default', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + Number(exp.amount);
      return acc;
    }, {})
  ).map(([month, total]) => ({ month, total, isPrediction: false }));

  const combinedData = [...totalByMonth, ...predictions];

  const exportToCSV = () => {
    const csvRows = [
      ['Description', 'Amount', 'Category', 'Date'],
      ...filteredExpenses.map(exp => [exp.description, exp.amount, exp.category, exp.date]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map(e => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', 'expense_report.csv');
    document.body.appendChild(link);
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white p-8 rounded-xl shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center space-x-2">
            <Filter className="w-6 h-6 text-indigo-600" />
            <span>Expense Reports & Analytics</span>
          </h1>
          <div className="flex space-x-3">
            <button
              onClick={generateAIInsights}
              disabled={loadingInsights}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {loadingInsights ? 'Analyzing...' : 'AI Insights'}
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Filters Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="timeRange" className="block text-sm font-medium text-gray-700 mb-1">Time Range</label>
            <select
              id="timeRange"
              name="timeRange"
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="yearly">Yearly</option>
            </select>
          </div>

          <div>
            <label htmlFor="selectedCategory" className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select
              id="selectedCategory"
              name="selectedCategory"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              autoComplete="off"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              autoComplete="off"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="px-3 py-2 border border-gray-300 rounded-lg w-full focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* AI Insights Panel */}
      {aiInsights && (
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Brain className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-bold text-gray-900">AI-Powered Insights</h2>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <p className="text-gray-700 leading-relaxed">{aiInsights.summary}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Target className="w-5 h-5 text-indigo-600" />
                <p className="text-sm text-gray-600">Top Category</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{aiInsights.topSpendingCategory}</p>
              {/* 💡 FIX 1: Add (|| 0) to ensure a number is passed to toFixed() */}
              <p className="text-sm text-gray-500">${Number(aiInsights.topSpendingAmount || 0).toFixed(2)}</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <TrendingUp className={`w-5 h-5 ${aiInsights.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`} />
                <p className="text-sm text-gray-600">Spending Trend</p>
              </div>
              <p className={`text-xl font-bold ${aiInsights.trend === 'increasing' ? 'text-red-600' : 'text-green-600'}`}>
                {aiInsights.trend === 'increasing' ? '↑' : '↓'} {aiInsights.trendPercent}%
              </p>
              <p className="text-sm text-gray-500 capitalize">{aiInsights.trend}</p>
            </div>

            <div className="bg-white rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Lightbulb className="w-5 h-5 text-yellow-600" />
                <p className="text-sm text-gray-600">Savings Opportunity</p>
              </div>
              <p className="text-xl font-bold text-green-600">
                 {/* 💡 FIX 2: Add (|| 0) to ensure a number is passed to toFixed() */}
                ${Number(aiInsights.savingsOpportunity || 0).toFixed(2)}
              </p>
              <p className="text-sm text-gray-500">Potential monthly savings</p>
            </div>
          </div>

          {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
            <div className="bg-white rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
                <Sparkles className="w-4 h-4 mr-2 text-purple-600" />
                Smart Recommendations
              </h3>
              <ul className="space-y-2">
                {aiInsights.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-gray-700">
                    <span className="text-purple-600 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Anomaly Detection */}
      {anomalies.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-6">
          <div className="flex items-center space-x-2 mb-4">
            <AlertCircle className="w-6 h-6 text-yellow-600" />
            <h2 className="text-xl font-bold text-gray-900">Unusual Spending Detected</h2>
          </div>
          <div className="space-y-3">
            {anomalies.map((anomaly, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-gray-900">{anomaly.description}</p>
                  <p className="text-sm text-gray-600">
                    {new Date(anomaly.date).toLocaleDateString()} • {anomaly.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-600">${Number(anomaly.amount).toFixed(2)}</p>
                  <p className="text-xs text-gray-500">{anomaly.deviation}% above average</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Trend with Predictions */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-indigo-600" />
            Expense Trend & Forecast
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="total" 
                stroke="#4F46E5" 
                strokeWidth={2}
                dot={{ fill: '#4F46E5' }}
              />
              <Line 
                type="monotone" 
                dataKey="predicted" 
                stroke="#EC4899" 
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ fill: '#EC4899' }}
              />
            </LineChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Solid line: Actual • Dashed line: AI Prediction
          </p>
        </div>

        {/* Category Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-lg font-semibold mb-4 text-gray-700">Spending by Category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={totalByCategory}
                dataKey="total"
                nameKey="category"
                outerRadius={100}
                fill="#4F46E5"
                label
              >
                {totalByCategory.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;