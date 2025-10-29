import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import {
  Mail,
  Download,
  Calendar,
  FileText,
  CheckCircle,
  Loader2,
  Send,
  Bot,
  Sparkles
} from 'lucide-react';

const IntegrationsPage = () => {
  const { user } = useAuth();
  
  // ✅ FIXED: Use environment variable for API URL
  const API_URL = import.meta.env.VITE_API_URL || 'https://expense-tracker-app-nsco.onrender.com';
  
  const [activeTab, setActiveTab] = useState('ai-chat');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // AI Chatbot State
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your AI Financial Assistant. Ask me about your expenses, budgets, or financial insights!' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Email Report State
  const [emailForm, setEmailForm] = useState({
    recipientEmail: '',
    reportType: 'monthly',
    includeCharts: true,
    subject: 'Your Expense Report'
  });

  // Export State
  const [exportHistory, setExportHistory] = useState([]);
  const [exportFilters, setExportFilters] = useState({
    startDate: '',
    endDate: '',
    category: 'all'
  });

  // Calendar State
  const [calendarData, setCalendarData] = useState({});
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [calendarLoading, setCalendarLoading] = useState(false);

  // 🐛 DEBUG: Log API URL (remove after testing)
  useEffect(() => {
    console.log('🌐 API_URL:', API_URL);
    console.log('🔧 Environment:', import.meta.env.MODE);
  }, []);

  useEffect(() => {
    fetchExportHistory();
    if (activeTab === 'calendar') {
      fetchCalendarData();
    }
  }, [activeTab, selectedMonth, selectedYear]);

  // ============================================
  // AI CHATBOT FUNCTIONS
  // ============================================

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = { role: 'user', content: chatInput };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      // ✅ FIXED: Use API_URL variable
      const { data } = await axios.post(
        `${API_URL}/api/ai/chat`,
        { message: chatInput, history: chatMessages },
        config
      );

      const assistantMessage = { role: 'assistant', content: data.response };
      setChatMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      console.error('AI Chat error:', err);
      const errorMessage = { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try asking something about your expenses, like "What did I spend the most on?" or "Show me my budget status."' 
      };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const quickQuestions = [
    "What did I spend the most on this month?",
    "Am I over budget?",
    "Show me spending trends",
    "What's my average daily spending?"
  ];

  const handleQuickQuestion = (question) => {
    setChatInput(question);
  };

  // ============================================
  // EMAIL REPORT FUNCTIONS
  // ============================================

  const handleEmailReport = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      // ✅ FIXED: Use API_URL variable
      const { data } = await axios.post(
        `${API_URL}/api/integrations/email/send-report`,
        emailForm,
        config
      );

      setMessage('✅ Report sent successfully to ' + emailForm.recipientEmail);
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send email report');
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // CALENDAR FUNCTIONS
  // ============================================

  const fetchCalendarData = async () => {
    setCalendarLoading(true);
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user.token}`
        }
      };

      // ✅ FIXED: Use API_URL variable
      const { data } = await axios.post(
        `${API_URL}/api/integrations/calendar/sync`,
        { month: selectedMonth + 1, year: selectedYear },
        config
      );

      setCalendarData(data.calendar || {});
    } catch (err) {
      console.error('Error fetching calendar data:', err);
    } finally {
      setCalendarLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month, year) => {
    return new Date(year, month, 1).getDay();
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  // ============================================
  // EXPORT FUNCTIONS
  // ============================================

  const fetchExportHistory = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${user.token}` } };
      // ✅ FIXED: Use API_URL variable
      const { data } = await axios.get(`${API_URL}/api/integrations/export/history`, config);
      setExportHistory(data);
    } catch (err) {
      console.error('Error fetching export history:', err);
    }
  };

  const handleExport = async (format) => {
    setLoading(true);
    setError('');
    setMessage('');

    try {
      const config = {
        headers: { Authorization: `Bearer ${user.token}` },
        params: exportFilters,
        responseType: 'blob'
      };

      // ✅ FIXED: Use API_URL variable
      const { data } = await axios.get(
        `${API_URL}/api/integrations/export/${format}`,
        config
      );
      
      const url = window.URL.createObjectURL(new Blob([data]));
      const link = document.createElement('a');
      link.href = url;
      
      const extension = format === 'json' ? 'json' : format === 'pdf' ? 'txt' : 'csv';
      link.setAttribute('download', `expenses_${Date.now()}.${extension}`);
      
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage(`✅ ${format.toUpperCase()} downloaded successfully!`);

      fetchExportHistory();
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error('Export error:', err);
      setError(err.response?.data?.message || `Failed to export ${format}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Integrations Hub</h1>
        <p className="text-gray-600">AI-powered features and smart integrations</p>
      </div>

      {/* Success/Error Messages */}
      {message && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 rounded-md">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'ai-chat', label: 'AI Assistant', icon: Bot },
              { id: 'email-report', label: 'Email Reports', icon: Mail },
              { id: 'calendar', label: 'Calendar View', icon: Calendar },
              { id: 'export', label: 'Export Data', icon: Download }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 transition ${
                  activeTab === tab.id
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* AI CHATBOT TAB */}
          {activeTab === 'ai-chat' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-lg border border-indigo-200">
                <div className="flex items-center space-x-3 mb-4">
                  <Bot className="w-8 h-8 text-indigo-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">AI Financial Assistant</h3>
                    <p className="text-sm text-gray-600">Ask questions about your expenses and get insights</p>
                  </div>
                </div>

                {/* Chat Messages */}
                <div className="bg-white rounded-lg p-4 h-96 overflow-y-auto mb-4 space-y-4">
                  {chatMessages.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-3 rounded-lg ${
                          msg.role === 'user'
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}
                      >
                        <div className="flex items-start space-x-2">
                          {msg.role === 'assistant' && <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />}
                          <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-start">
                      <div className="bg-gray-100 px-4 py-3 rounded-lg flex items-center space-x-2">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-sm text-gray-600">AI is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Questions */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600 mb-2">Quick questions:</p>
                  <div className="flex flex-wrap gap-2">
                    {quickQuestions.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleQuickQuestion(q)}
                        className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs hover:bg-indigo-200 transition"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Chat Input */}
                <form onSubmit={handleChatSubmit} className="flex space-x-2">
                  <input
                    type="text"
                    id="ai-chat-input"
                    name="ai-chat-input"
                    placeholder="Ask your financial assistant..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isChatLoading}
                    autoComplete="off"
                  />
                  <button
                    type="submit"
                    disabled={isChatLoading || !chatInput.trim()}
                    className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* EMAIL REPORT TAB */}
          {activeTab === 'email-report' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-3 mb-4">
                  <Mail className="w-8 h-8 text-blue-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Email Expense Reports</h3>
                    <p className="text-sm text-gray-600">Send detailed expense reports to any email</p>
                  </div>
                </div>

                <form onSubmit={handleEmailReport} className="space-y-4">
                  <div>
                    <label htmlFor="recipient-email" className="block text-sm font-medium text-gray-700 mb-2">
                      Recipient Email
                    </label>
                    <input
                      type="email"
                      id="recipient-email"
                      name="recipient-email"
                      placeholder="recipient@example.com"
                      value={emailForm.recipientEmail}
                      onChange={(e) => setEmailForm({ ...emailForm, recipientEmail: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="report-type" className="block text-sm font-medium text-gray-700 mb-2">
                      Report Type
                    </label>
                    <select
                      id="report-type"
                      name="report-type"
                      value={emailForm.reportType}
                      onChange={(e) => setEmailForm({ ...emailForm, reportType: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 bg-white"
                    >
                      <option value="daily">Daily Report</option>
                      <option value="weekly">Weekly Report</option>
                      <option value="monthly">Monthly Report</option>
                      <option value="yearly">Yearly Report</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="email-subject" className="block text-sm font-medium text-gray-700 mb-2">
                      Subject Line
                    </label>
                    <input
                      type="text"
                      id="email-subject"
                      name="email-subject"
                      value={emailForm.subject}
                      onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      autoComplete="off"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeCharts"
                      checked={emailForm.includeCharts}
                      onChange={(e) => setEmailForm({ ...emailForm, includeCharts: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="includeCharts" className="text-sm text-gray-700">
                      Include charts and visualizations
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-5 h-5" />
                        <span>Send Report</span>
                      </>
                    )}
                  </button>
                </form>

                <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-blue-900 mb-2">📧 Email Report Preview:</p>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Total expenses breakdown by category</li>
                        <li>• Budget comparison and alerts</li>
                        <li>• Spending trends and charts</li>
                        <li>• Top expenses and insights</li>
                      </ul>
                      <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          ⚠️ <strong>Note:</strong> Email sending is currently in demo mode. The report is prepared but not actually sent via email. 
                          To enable real email sending, you need to configure an email service (like Gmail SMTP, SendGrid, or AWS SES) in the backend.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CALENDAR TAB */}
          {activeTab === 'calendar' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-orange-50 to-yellow-50 p-6 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <Calendar className="w-8 h-8 text-orange-600" />
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">Calendar View</h3>
                      <p className="text-sm text-gray-600">View your expenses in a calendar format</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={handlePrevMonth}
                      className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition"
                    >
                      ← Prev
                    </button>
                    <span className="text-lg font-semibold text-gray-900">
                      {monthNames[selectedMonth]} {selectedYear}
                    </span>
                    <button
                      onClick={handleNextMonth}
                      className="px-4 py-2 bg-white border border-orange-300 text-orange-700 rounded-lg hover:bg-orange-50 transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>

                {calendarLoading ? (
                  <div className="flex items-center justify-center h-96 bg-white rounded-lg">
                    <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
                  </div>
                ) : (
                  <div className="bg-white rounded-lg p-4">
                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-2">
                      {/* Day Headers */}
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center font-semibold text-gray-700 py-2">
                          {day}
                        </div>
                      ))}

                      {/* Empty cells for days before month starts */}
                      {Array.from({ length: getFirstDayOfMonth(selectedMonth, selectedYear) }).map((_, idx) => (
                        <div key={`empty-${idx}`} className="h-24 bg-gray-50 rounded-lg"></div>
                      ))}

                      {/* Calendar Days */}
                      {Array.from({ length: getDaysInMonth(selectedMonth, selectedYear) }).map((_, dayIndex) => {
                        const day = dayIndex + 1;
                        const dateKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const dayExpenses = calendarData[dateKey] || [];
                        const dayTotal = dayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                        const isToday = 
                          day === new Date().getDate() && 
                          selectedMonth === new Date().getMonth() && 
                          selectedYear === new Date().getFullYear();

                        return (
                          <div
                            key={day}
                            className={`h-24 border rounded-lg p-2 ${
                              isToday 
                                ? 'bg-orange-100 border-orange-400 border-2' 
                                : dayExpenses.length > 0 
                                  ? 'bg-orange-50 border-orange-200' 
                                  : 'bg-white border-gray-200'
                            } hover:shadow-md transition cursor-pointer`}
                          >
                            <div className="flex justify-between items-start">
                              <span className={`text-sm font-semibold ${isToday ? 'text-orange-700' : 'text-gray-700'}`}>
                                {day}
                              </span>
                              {dayExpenses.length > 0 && (
                                <span className="text-xs bg-orange-600 text-white px-1.5 py-0.5 rounded-full">
                                  {dayExpenses.length}
                                </span>
                              )}
                            </div>
                            {dayExpenses.length > 0 && (
                              <div className="mt-1">
                                <p className="text-xs font-semibold text-orange-700">
                                  ${dayTotal.toFixed(2)}
                                </p>
                                <div className="mt-1 space-y-0.5">
                                  {dayExpenses.slice(0, 2).map((exp, idx) => (
                                    <p key={idx} className="text-xs text-gray-600 truncate">
                                      {exp.description}
                                    </p>
                                  ))}
                                  {dayExpenses.length > 2 && (
                                    <p className="text-xs text-gray-500">
                                      +{dayExpenses.length - 2} more
                                    </p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Calendar Summary */}
                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Expenses This Month</p>
                        <p className="text-2xl font-bold text-orange-700">
                          ${Object.values(calendarData).flat().reduce((sum, exp) => sum + exp.amount, 0).toFixed(2)}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Total Transactions</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {Object.values(calendarData).flat().length}
                        </p>
                      </div>
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-1">Days with Expenses</p>
                        <p className="text-2xl font-bold text-orange-700">
                          {Object.keys(calendarData).length}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-lg border border-green-200">
                <div className="flex items-center space-x-3 mb-4">
                  <Download className="w-8 h-8 text-green-600" />
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Export Your Data</h3>
                    <p className="text-sm text-gray-600">Download your expenses in various formats</p>
                  </div>
                </div>

                {/* Export Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <input
                    type="date"
                    id="export-start-date"
                    name="export-start-date"
                    value={exportFilters.startDate}
                    onChange={(e) => setExportFilters({ ...exportFilters, startDate: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    autoComplete="off"
                  />
                  <input
                    type="date"
                    id="export-end-date"
                    name="export-end-date"
                    value={exportFilters.endDate}
                    onChange={(e) => setExportFilters({ ...exportFilters, endDate: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500"
                    autoComplete="off"
                  />
                  <select
                    id="export-category"
                    name="export-category"
                    value={exportFilters.category}
                    onChange={(e) => setExportFilters({ ...exportFilters, category: e.target.value })}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-green-500 focus:border-green-500 bg-white"
                  >
                    <option value="all">All Categories</option>
                    <option value="Food & Drinks">Food & Drinks</option>
                    <option value="Travel">Travel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills & Utilities">Bills & Utilities</option>
                    <option value="Entertainment">Entertainment</option>
                  </select>
                </div>

                {/* Export Buttons */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => handleExport('csv')}
                    disabled={loading}
                    className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Export CSV</span>
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    disabled={loading}
                    className="px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Export PDF</span>
                  </button>
                  <button
                    onClick={() => handleExport('json')}
                    disabled={loading}
                    className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-5 h-5" />
                    <span>Export JSON</span>
                  </button>
                </div>
              </div>

              {/* Export History */}
              <div>
                <h3 className="text-lg font-bold text-gray-900 mb-4">Export History</h3>
                {exportHistory.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Download className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                    <p className="text-gray-500">No exports yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {exportHistory.map(exp => (
                      <div key={exp._id} className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className={`p-3 rounded-full ${
                            exp.format === 'csv' ? 'bg-green-100' :
                            exp.format === 'pdf' ? 'bg-red-100' : 'bg-blue-100'
                          }`}>
                            <FileText className={`w-5 h-5 ${
                              exp.format === 'csv' ? 'text-green-600' :
                              exp.format === 'pdf' ? 'text-red-600' : 'text-blue-600'
                            }`} />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">{exp.fileName}</p>
                            <p className="text-sm text-gray-500">
                              {exp.recordCount} records • {new Date(exp.createdAt).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium uppercase">
                          {exp.format}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default IntegrationsPage;