import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { DollarSign, TrendingUp, CreditCard, PlusCircle, Edit, Trash2, Search, Target, AlertTriangle } from 'lucide-react';

const DashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [filteredExpenses, setFilteredExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState({ start: '', end: '' });
  const [stats, setStats] = useState({
    total: 0,
    count: 0,
    thisMonth: 0,
  });

  // NEW: Budget state
  const [budgetSummary, setBudgetSummary] = useState(null);
  const [budgetStatus, setBudgetStatus] = useState([]);

  useEffect(() => {
    fetchExpenses();
    fetchBudgetData(); // NEW: Fetch budget data
  }, []);

  useEffect(() => {
    applyFilters();
  }, [expenses, searchTerm, categoryFilter, dateFilter]);

  const fetchExpenses = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      const { data } = await axios.get('http://localhost:5001/api/expenses', config);
      setExpenses(data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      setLoading(false);
    }
  };

  // NEW: Fetch budget data
  const fetchBudgetData = async () => {
    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      
      const [summaryRes, statusRes] = await Promise.all([
        axios.get('http://localhost:5001/api/budgets/summary', config),
        axios.get('http://localhost:5001/api/budgets/status', config)
      ]);
      
      setBudgetSummary(summaryRes.data);
      setBudgetStatus(statusRes.data.budgetStatus || []);
      
    } catch (error) {
      console.error('Error fetching budget data:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(exp => 
        exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exp.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    // Date range filter
    if (dateFilter.start && dateFilter.end) {
      filtered = filtered.filter(exp => {
        const expDate = new Date(exp.date);
        return expDate >= new Date(dateFilter.start) && expDate <= new Date(dateFilter.end);
      });
    }

    setFilteredExpenses(filtered);
    calculateStats(filtered);
  };

  const calculateStats = (expenseData) => {
    const total = expenseData.reduce((sum, exp) => sum + exp.amount, 0);
    const currentMonth = new Date().getMonth();
    const thisMonth = expenseData
      .filter(exp => new Date(exp.date).getMonth() === currentMonth)
      .reduce((sum, exp) => sum + exp.amount, 0);

    setStats({
      total: total.toFixed(2),
      count: expenseData.length,
      thisMonth: thisMonth.toFixed(2),
    });
  };

  const deleteExpense = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) return;

    try {
      const config = {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      };
      await axios.delete(`http://localhost:5001/api/expenses/${id}`, config);
      fetchExpenses();
      fetchBudgetData(); // Refresh budget data after deletion
    } catch (error) {
      console.error('Error deleting expense:', error);
      alert('Failed to delete expense');
    }
  };

  const categories = [...new Set(expenses.map(exp => exp.category))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-gray-900">${stats.total}</p>
            </div>
            <div className="bg-indigo-100 p-3 rounded-full">
              <DollarSign className="w-8 h-8 text-indigo-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">This Month</p>
              <p className="text-3xl font-bold text-gray-900">${stats.thisMonth}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
              <p className="text-3xl font-bold text-gray-900">{stats.count}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <CreditCard className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* NEW: Budget Overview Widget */}
      {budgetSummary && budgetSummary.budgetCount > 0 && (
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-xl font-bold mb-1">Budget Overview</h3>
              <p className="text-indigo-100 text-sm">Your spending this month</p>
            </div>
            <button
              onClick={() => navigate('/budgets')}
              className="px-4 py-2 bg-white text-indigo-600 rounded-lg hover:bg-indigo-50 transition font-medium text-sm"
            >
              Manage Budgets
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-indigo-100 text-sm mb-1">Total Budget</p>
              <p className="text-2xl font-bold">${budgetSummary.totalBudget}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-indigo-100 text-sm mb-1">Spent</p>
              <p className="text-2xl font-bold">${budgetSummary.totalSpent}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-indigo-100 text-sm mb-1">Remaining</p>
              <p className="text-2xl font-bold">${budgetSummary.totalRemaining}</p>
            </div>
          </div>

          {/* Budget Progress Bar */}
          <div className="bg-white/20 rounded-full h-4 mb-3">
            <div
              className={`h-4 rounded-full transition-all duration-300 ${
                budgetSummary.isOverBudget ? 'bg-red-400' : 'bg-green-400'
              }`}
              style={{ width: `${Math.min(budgetSummary.overallPercentage, 100)}%` }}
            ></div>
          </div>
          
          <p className="text-sm text-indigo-100">
            {budgetSummary.overallPercentage.toFixed(1)}% of total budget used
            {budgetSummary.isOverBudget && ' - Over budget!'}
          </p>

          {/* Budget Alerts */}
          {budgetStatus.length > 0 && (
            <div className="mt-4 space-y-2">
              {budgetStatus
                .filter(b => b.alertLevel === 'high' || b.alertLevel === 'medium')
                .slice(0, 2)
                .map(budget => (
                  <div key={budget.budgetId} className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-5 h-5 text-yellow-300" />
                      <div>
                        <p className="font-medium text-sm">{budget.category}</p>
                        <p className="text-xs text-indigo-100">
                          ${budget.spent} / ${budget.limit} ({budget.percentage}%)
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      budget.alertLevel === 'high' ? 'bg-red-400' : 'bg-yellow-400'
                    } text-white`}>
                      {budget.alertLevel === 'high' ? 'Alert!' : 'Warning'}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* No Budget CTA */}
      {budgetSummary && budgetSummary.budgetCount === 0 && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-100 p-3 rounded-full">
                <Target className="w-8 h-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">Set Your Budget Goals</h3>
                <p className="text-gray-600 text-sm">Track your spending and stay within budget limits</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/budgets')}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium"
            >
              Create Budget
            </button>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              id="searchExpenses"
              name="searchExpenses"
              placeholder="Search expenses..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              autoComplete="off"
            />
          </div>

          {/* Category Filter */}
          <select
            id="categoryFilter"
            name="categoryFilter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Date Range - Start */}
          <input
            type="date"
            id="filterStartDate"
            name="filterStartDate"
            value={dateFilter.start}
            onChange={(e) => setDateFilter({ ...dateFilter, start: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Start Date"
            autoComplete="off"
          />

          {/* Date Range - End */}
          <input
            type="date"
            id="filterEndDate"
            name="filterEndDate"
            value={dateFilter.end}
            onChange={(e) => setDateFilter({ ...dateFilter, end: e.target.value })}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="End Date"
            autoComplete="off"
          />
        </div>
      </div>

      {/* Recent Expenses */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">
            Expenses ({filteredExpenses.length})
          </h2>
          <button
            onClick={() => navigate('/add-expense')}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
          >
            <PlusCircle className="w-5 h-5 mr-2" />
            Add New
          </button>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg mb-4">
              {searchTerm || categoryFilter !== 'all' || dateFilter.start || dateFilter.end
                ? 'No expenses match your filters'
                : 'No expenses recorded yet'}
            </p>
            {!searchTerm && categoryFilter === 'all' && !dateFilter.start && !dateFilter.end && (
              <button
                onClick={() => navigate('/add-expense')}
                className="inline-flex items-center px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition duration-200"
              >
                <PlusCircle className="w-5 h-5 mr-2" />
                Add Your First Expense
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Description</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Category</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Amount</th>
                  <th className="text-right py-3 px-4 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense._id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(expense.date).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-gray-900 font-medium">
                      {expense.description}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
                        {expense.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-gray-900">
                      ${expense.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => navigate(`/add-expense/${expense._id}`)}
                        className="text-indigo-600 hover:text-indigo-800 mr-3"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => deleteExpense(expense._id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;