import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { 
  Brain, TrendingUp, TrendingDown, AlertTriangle, 
  CheckCircle, Info, Lightbulb, DollarSign, 
  Calendar, Target, RefreshCw, Sparkles 
} from 'lucide-react';

const InsightsPage = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [insights, setInsights] = useState([]);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInsights();
  }, []);

  const fetchInsights = async () => {
    setLoading(true);
    setError('');
    
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };

      // Fetch AI insights
      const insightsResponse = await axios.get('http://localhost:5001/api/ai/insights', config);
      setInsights(insightsResponse.data.insights);

      // 🔧 FIXED: Changed from /predict-spending to /predict
      const predictionResponse = await axios.get('http://localhost:5001/api/ai/predict', config);
      setPrediction(predictionResponse.data);

      setLoading(false);
    } catch (err) {
      console.error('Error fetching insights:', err);
      setError('Failed to load AI insights');
      setLoading(false);
    }
  };

  const refreshInsights = async () => {
    setRefreshing(true);
    await fetchInsights();
    setRefreshing(false);
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'warning': return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'alert': return <AlertTriangle className="w-6 h-6 text-red-600" />;
      case 'success': return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'info': return <Info className="w-6 h-6 text-blue-600" />;
      default: return <Lightbulb className="w-6 h-6 text-indigo-600" />;
    }
  };

  const getInsightBgColor = (type) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'alert': return 'bg-red-50 border-red-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-indigo-50 border-indigo-200';
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 mb-4"></div>
        <p className="text-gray-600">Analyzing your spending patterns...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-6 rounded-lg">
        <p className="text-red-700">{error}</p>
        <button
          onClick={fetchInsights}
          className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-3 rounded-xl">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">AI Financial Insights</h1>
            <p className="text-gray-600">Powered by intelligent analysis of your spending patterns</p>
          </div>
        </div>
        <button
          onClick={refreshInsights}
          disabled={refreshing}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200 disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Prediction Card */}
      {prediction && (
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-2xl p-8 text-white">
          <div className="flex items-center mb-4">
            <Sparkles className="w-8 h-8 mr-3" />
            <h2 className="text-2xl font-bold">Next Month Prediction</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center mb-2">
                <DollarSign className="w-6 h-6 mr-2" />
                <p className="text-sm opacity-90">Predicted Spending</p>
              </div>
              <p className="text-4xl font-bold">${prediction.predictedAmount}</p>
              <p className="text-sm mt-2 opacity-75">
                Confidence: <span className="font-semibold uppercase">{prediction.confidence}</span>
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center mb-2">
                <Calendar className="w-6 h-6 mr-2" />
                <p className="text-sm opacity-90">Current Month</p>
              </div>
              <p className="text-4xl font-bold">${prediction.currentMonth?.total || 0}</p>
              <p className="text-sm mt-2 opacity-75">
                {prediction.currentMonth?.transactionCount || 0} transactions
              </p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6">
              <div className="flex items-center mb-2">
                {prediction.trend === 'up' ? (
                  <TrendingUp className="w-6 h-6 mr-2" />
                ) : prediction.trend === 'down' ? (
                  <TrendingDown className="w-6 h-6 mr-2" />
                ) : (
                  <Target className="w-6 h-6 mr-2" />
                )}
                <p className="text-sm opacity-90">Trend</p>
              </div>
              <p className="text-4xl font-bold uppercase">{prediction.trend}</p>
              <p className="text-sm mt-2 opacity-75">
                {prediction.percentChange > 0 ? '+' : ''}{prediction.percentChange}% vs last month
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Insights List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Smart Recommendations ({insights.length})
        </h2>

        {insights.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 text-lg mb-2">No insights available yet</p>
            <p className="text-gray-500">Add more expenses to get personalized recommendations</p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight, index) => (
              <div
                key={index}
                className={`border-l-4 rounded-lg p-6 transition-all duration-200 hover:shadow-md ${getInsightBgColor(insight.type)}`}
              >
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    {getInsightIcon(insight.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-gray-900 font-medium text-lg mb-2">
                      {insight.message}
                    </p>
                    <div className="bg-white/50 rounded-lg p-3 mt-3">
                      <p className="text-sm text-gray-700 flex items-center">
                        <Lightbulb className="w-4 h-4 mr-2 text-indigo-600" />
                        <span className="font-medium">Action:</span>
                        <span className="ml-2">{insight.action}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Monthly Comparison */}
      {prediction && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">This Month</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                <span className="text-gray-700">Total Spending</span>
                <span className="text-2xl font-bold text-green-600">
                  ${prediction.currentMonth?.total || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                <span className="text-gray-700">Transactions</span>
                <span className="text-2xl font-bold text-blue-600">
                  {prediction.currentMonth?.transactionCount || 0}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Last Month</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Total Spending</span>
                <span className="text-2xl font-bold text-gray-600">
                  ${prediction.lastMonth?.total || 0}
                </span>
              </div>
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-700">Transactions</span>
                <span className="text-2xl font-bold text-gray-600">
                  {prediction.lastMonth?.transactionCount || 0}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* How It Works */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Info className="w-6 h-6 mr-2 text-indigo-600" />
          How AI Insights Work
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4">
            <div className="bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Brain className="w-6 h-6 text-indigo-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Pattern Analysis</h4>
            <p className="text-sm text-gray-600">
              Analyzes your spending patterns across categories and time periods
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Predictions</h4>
            <p className="text-sm text-gray-600">
              Uses statistical models to forecast your future spending
            </p>
          </div>
          <div className="bg-white rounded-lg p-4">
            <div className="bg-pink-100 w-12 h-12 rounded-full flex items-center justify-center mb-3">
              <Lightbulb className="w-6 h-6 text-pink-600" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Smart Tips</h4>
            <p className="text-sm text-gray-600">
              Provides actionable recommendations to improve your finances
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsPage;