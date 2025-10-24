import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { DollarSign, TrendingUp, AlertTriangle, Target, Plus, Edit, Trash2, CheckCircle } from 'lucide-react';

const BudgetPage = () => {
  const { user } = useAuth();
  const [budgets, setBudgets] = useState([]);
  const [budgetStatus, setBudgetStatus] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  
  const [formData, setFormData] = useState({
    category: '',
    monthlyLimit: '',
    alertThreshold: 80,
    notes: ''
  });

  const categories = [
    'Food & Drinks', 
    'Travel', 
    'Shopping', 
    'Bills & Utilities', 
    'Entertainment', 
    'Personal', 
    'Other'
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      const [budgetsRes, statusRes, summaryRes] = await Promise.all([
        axios.get('https://expense-tracker-app-nsco.onrender.com/api/budgets', config),
        axios.get('https://expense-tracker-app-nsco.onrender.com/api/budgets/status', config),
        axios.get('https://expense-tracker-app-nsco.onrender.com/api/budgets/summary', config)
      ]);
      
      setBudgets(budgetsRes.data);
      setBudgetStatus(statusRes.data.budgetStatus || []);
      setSummary(summaryRes.data);
      
    } catch (error) {
      console.error('Error fetching budget data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const config = {
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}` 
        }
      };
      
      if (editingBudget) {
        // Update existing budget
        await axios.put(
          `https://expense-tracker-app-nsco.onrender.com/api/budgets/${editingBudget._id}`,
          formData,
          config
        );
        alert('Budget updated successfully!');
      } else {
        // Create new budget
        await axios.post(
          'https://expense-tracker-app-nsco.onrender.com/api/budgets',
          formData,
          config
        );
        alert('Budget created successfully!');
      }
      
      // Reset form and refresh data
      setFormData({
        category: '',
        monthlyLimit: '',
        alertThreshold: 80,
        notes: ''
      });
      setEditingBudget(null);
      setShowForm(false);
      fetchData();
      
    } catch (error) {
      console.error('Error saving budget:', error);
      alert(error.response?.data?.message || 'Failed to save budget');
    }
  };

  const handleEdit = (budget) => {
    setEditingBudget(budget);
    setFormData({
      category: budget.category,
      monthlyLimit: budget.monthlyLimit,
      alertThreshold: budget.alertThreshold,
      notes: budget.notes || ''
    });
    setShowForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this budget?')) return;
    
    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` }
      };
      
      await axios.delete(`https://expense-tracker-app-nsco.onrender.com/api/budgets/${id}`, config);
      alert('Budget deleted successfully!');
      fetchData();
      
    } catch (error) {
      console.error('Error deleting budget:', error);
      alert('Failed to delete budget');
    }
  };

  const getAlertColor = (alertLevel) => {
    switch (alertLevel) {
      case 'high': return 'bg-red-100 text-red-700';
      case 'medium': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-green-100 text-green-700';
    }
  };

  const getProgressColor = (alertLevel) => {
    switch (alertLevel) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      default: return 'bg-green-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Budget Management</h1>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setEditingBudget(null);
            setFormData({
              category: '',
              monthlyLimit: '',
              alertThreshold: 80,
              notes: ''
            });
          }}
          className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          {showForm ? 'Cancel' : 'Add Budget'}
        </button>
      </div>

      {/* Budget Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Budget</p>
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${summary.totalBudget}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Total Spent</p>
              <DollarSign className="w-5 h-5 text-red-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${summary.totalSpent}</p>
            <p className="text-xs text-gray-500 mt-1">
              {summary.overallPercentage}% of budget
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Remaining</p>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">${summary.totalRemaining}</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-600">Status</p>
              {summary.isOverBudget ? (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              ) : (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </div>
            <p className={`text-lg font-bold ${summary.isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {summary.isOverBudget ? 'Over Budget' : 'On Track'}
            </p>
          </div>
        </div>
      )}

      {/* Budget Form (CORRECTED) */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {editingBudget ? 'Edit Budget' : 'Create New Budget'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label 
                  htmlFor="budgetCategory" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Category
                </label>
                <select
                  // ADDED: id and name
                  id="budgetCategory"
                  name="budgetCategory"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  required
                  disabled={editingBudget}
                >
                  <option value="">Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label 
                  htmlFor="monthlyLimit" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Monthly Limit ($)
                </label>
                <input
                  // ADDED: id and name
                  id="monthlyLimit"
                  name="monthlyLimit"
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={formData.monthlyLimit}
                  onChange={(e) => setFormData({ ...formData, monthlyLimit: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="500.00"
                  required
                />
              </div>

              <div>
                <label 
                  htmlFor="alertThreshold" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Alert Threshold (%)
                </label>
                <input
                  // ADDED: id and name
                  id="alertThreshold"
                  name="alertThreshold"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.alertThreshold}
                  onChange={(e) => setFormData({ ...formData, alertThreshold: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  You'll get alerts when spending reaches this percentage
                </p>
              </div>

              <div>
                <label 
                  htmlFor="budgetNotes" 
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Notes (Optional)
                </label>
                <input
                  // ADDED: id and name (changed from notes to budgetNotes for uniqueness)
                  id="budgetNotes"
                  name="budgetNotes"
                  type="text"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Trying to save more this month"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              {editingBudget ? 'Update Budget' : 'Create Budget'}
            </button>
          </form>
        </div>
      )}

      {/* Budget Status List */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Budget Status</h2>
        
        {budgetStatus.length === 0 ? (
          <div className="text-center py-12">
            <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">No budgets set yet</p>
            <p className="text-gray-400 text-sm">Create your first budget to start tracking your spending</p>
          </div>
        ) : (
          <div className="space-y-4">
            {budgetStatus.map((status) => (
              <div key={status.budgetId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-lg">{status.category}</h3>
                    <p className="text-sm text-gray-600">
                      ${status.spent} of ${status.limit} spent
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getAlertColor(status.alertLevel)}`}>
                      {status.percentage}%
                    </span>
                    <button
                      onClick={() => handleEdit(budgets.find(b => b._id === status.budgetId))}
                      className="text-indigo-600 hover:text-indigo-800"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(status.budgetId)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                  <div
                    className={`h-3 rounded-full transition-all duration-300 ${getProgressColor(status.alertLevel)}`}
                    style={{ width: `${Math.min(status.percentage, 100)}%` }}
                  ></div>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {status.transactionCount} transaction{status.transactionCount !== 1 ? 's' : ''}
                  </span>
                  <span className={status.remaining > 0 ? 'text-green-600' : 'text-red-600'}>
                    ${status.remaining} {status.remaining > 0 ? 'remaining' : 'over budget'}
                  </span>
                </div>

                {status.exceedsLimit && (
                  <div className="mt-3 p-2 bg-red-50 border-l-4 border-red-500 rounded">
                    <p className="text-sm text-red-700 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      You've exceeded your budget for this category!
                    </p>
                  </div>
                )}

                {status.alertLevel === 'medium' && !status.exceedsLimit && (
                  <div className="mt-3 p-2 bg-yellow-50 border-l-4 border-yellow-500 rounded">
                    <p className="text-sm text-yellow-700 flex items-center">
                      <AlertTriangle className="w-4 h-4 mr-2" />
                      You're approaching your budget limit
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default BudgetPage;