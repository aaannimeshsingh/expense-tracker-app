import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PlusCircle, Save, Sparkles, Upload, X, Image as ImageIcon, Scan, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Tesseract from 'tesseract.js';

const ExpenseFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, api } = useAuth(); // ✅ Get api instance
  
  const [expense, setExpense] = useState({
    description: '',
    amount: '',
    category: '',
    date: new Date().toISOString().substring(0, 10),
    receipt: null,
  });
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [receiptPreview, setReceiptPreview] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanDetails, setScanDetails] = useState(null);

  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);

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
    if (id && user?.token) {
      fetchExpense();
    }
  }, [id, user?.token]);

  const fetchExpense = async () => {
    try {
      // ✅ Use api instance
      const { data } = await api.get(`/api/expenses/${id}`);
      setExpense({
        description: data.description,
        amount: data.amount,
        category: data.category,
        date: new Date(data.date).toISOString().substring(0, 10),
        receipt: data.receipt,
      });
      if (data.receipt) {
        setReceiptPreview(data.receipt);
      }
    } catch (err) {
      console.error('❌ Error fetching expense:', err);
      setError('Failed to load expense');
    }
  };

  // 🆕 IMPROVED Receipt Scanner with better extraction
  const scanReceipt = async (imageData) => {
    setIsScanning(true);
    setScanProgress(0);
    setError('');
    setScanDetails(null);

    try {
      // Perform OCR with better settings
      const result = await Tesseract.recognize(imageData, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setScanProgress(Math.round(m.progress * 100));
          }
        },
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz .,/$:-',
      });

      const text = result.data.text;
      console.log('📄 OCR Raw Text:', text);

      // Extract information with improved patterns
      const extractedData = extractReceiptData(text);
      
      setScanDetails({
        rawText: text,
        extracted: extractedData,
        confidence: result.data.confidence
      });

      // Auto-fill form if we found good data
      if (extractedData.amount || extractedData.merchant) {
        setExpense(prev => ({
          ...prev,
          description: extractedData.merchant || prev.description,
          amount: extractedData.amount || prev.amount,
          date: extractedData.date || prev.date,
        }));

        // Get AI category suggestion
        if (extractedData.merchant) {
          getSuggestion(extractedData.merchant);
        }

        setMessage(`✅ Scanned: ${extractedData.merchant ? 'Merchant ✓' : ''} ${extractedData.amount ? 'Amount ✓' : ''} ${extractedData.date ? 'Date ✓' : ''}`);
      } else {
        setError('⚠️ Could not extract clear data. Please verify the fields below.');
      }

    } catch (err) {
      console.error('❌ OCR Error:', err);
      setError('Failed to scan receipt. Please try again or enter manually.');
    } finally {
      setIsScanning(false);
      setScanProgress(0);
    }
  };

  // 🧠 IMPROVED Data extraction with multiple patterns
  const extractReceiptData = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    console.log('📋 Lines:', lines);
    
    // Extract AMOUNT - Multiple patterns
    let amount = null;
    const amountPatterns = [
      /(?:total|amount|sum|price|charge|paid|subtotal|balance)[:\s]*\$?\s*(\d+[.,]\d{2})/i,
      /\$\s*(\d+[.,]\d{2})/,
      /(\d+[.,]\d{2})\s*(?:usd|dollar|rs|inr|₹|\$)/i,
      /(?:grand|sub)?[\s-]?total[:\s]*(\d+[.,]\d{2})/i,
    ];

    for (const pattern of amountPatterns) {
      const match = text.match(pattern);
      if (match) {
        amount = parseFloat(match[1].replace(',', '.'));
        console.log('💰 Found amount:', amount, 'using pattern:', pattern);
        break;
      }
    }

    // If no pattern matched, look for any number with 2 decimals
    if (!amount) {
      const allNumbers = text.match(/\d+[.,]\d{2}/g);
      if (allNumbers && allNumbers.length > 0) {
        // Take the largest number as likely total
        amount = Math.max(...allNumbers.map(n => parseFloat(n.replace(',', '.'))));
        console.log('💰 Found amount (fallback):', amount);
      }
    }

    // Extract MERCHANT - First few lines (usually merchant name)
    let merchant = null;
    const merchantPatterns = [
      /(?:from|merchant|store|at|shop)[:\s]*([A-Za-z0-9\s&'-]+)/i,
      /^([A-Za-z0-9\s&'-]{3,30})(?:\n|$)/m, // First line if reasonable length
    ];

    for (const pattern of merchantPatterns) {
      const match = text.match(pattern);
      if (match) {
        merchant = match[1].trim();
        console.log('🏪 Found merchant:', merchant);
        break;
      }
    }

    // Fallback: Use first non-empty line as merchant
    if (!merchant && lines.length > 0) {
      merchant = lines[0].trim();
      if (merchant.length > 40) merchant = merchant.substring(0, 40); // Limit length
      console.log('🏪 Found merchant (fallback):', merchant);
    }

    // Extract DATE - Multiple formats
    let date = null;
    const datePatterns = [
      /(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/,
      /(\d{4}[-\/]\d{1,2}[-\/]\d{1,2})/,
      /(\d{1,2}\s+(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{2,4})/i,
      /(?:date|dated)[:\s]*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
    ];

    for (const pattern of datePatterns) {
      const match = text.match(pattern);
      if (match) {
        try {
          const dateStr = match[1];
          let parsedDate = new Date();

          // Try parsing different formats
          if (dateStr.includes('/') || dateStr.includes('-')) {
            const parts = dateStr.split(/[-\/]/);
            if (parts.length === 3) {
              // Determine format (MM/DD/YYYY vs DD/MM/YYYY)
              if (parts[2].length === 4) {
                // MM/DD/YYYY or DD/MM/YYYY
                parsedDate = new Date(parts[2], parts[0] - 1, parts[1]);
                // Validate
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = new Date(parts[2], parts[1] - 1, parts[0]);
                }
              } else {
                // MM/DD/YY or DD/MM/YY
                const year = parseInt(parts[2]) + 2000;
                parsedDate = new Date(year, parts[0] - 1, parts[1]);
                if (isNaN(parsedDate.getTime())) {
                  parsedDate = new Date(year, parts[1] - 1, parts[0]);
                }
              }
            }
          }

          if (!isNaN(parsedDate.getTime())) {
            date = parsedDate.toISOString().substring(0, 10);
            console.log('📅 Found date:', date);
            break;
          }
        } catch (e) {
          console.log('Date parsing failed for:', match[1]);
        }
      }
    }

    return { 
      merchant, 
      amount, 
      date,
      confidence: (merchant ? 1 : 0) + (amount ? 1 : 0) + (date ? 1 : 0)
    };
  };

  // Handle receipt upload
  const handleReceiptUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, JPEG)');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image size should be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      setExpense({ ...expense, receipt: base64String });
      setReceiptPreview(base64String);
      setError('');

      // Automatically scan the receipt
      await scanReceipt(base64String);
    };
    reader.readAsDataURL(file);
  };

  const removeReceipt = () => {
    setExpense({ ...expense, receipt: null });
    setReceiptPreview(null);
    setScanDetails(null);
  };

  const getSuggestion = async (description) => {
    if (description.length < 3) {
      setAiSuggestion(null);
      return;
    }

    setIsLoadingSuggestion(true);
    try {
      // ✅ Use api instance
      const { data } = await api.post('/api/categories/suggest', { description });
      setAiSuggestion(data);

      if (data.confidence > 0.7 && !expense.category) {
        setExpense(prev => ({ ...prev, category: data.category }));
      }
    } catch (err) {
      console.error('❌ Error getting AI suggestion:', err);
    } finally {
      setIsLoadingSuggestion(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setExpense({ ...expense, [name]: value });

    if (name === 'description') getSuggestion(value);
  };

  const applySuggestion = () => {
    if (aiSuggestion) setExpense(prev => ({ ...prev, category: aiSuggestion.category }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user?.token) {
      setError('Please log in to save expenses');
      return;
    }

    setLoading(true);
    setMessage('');
    setError('');

    try {
      // ✅ Use api instance - no need for manual headers
      if (id) {
        await api.put(`/api/expenses/${id}`, expense);
        setMessage('Expense updated successfully!');
      } else {
        await api.post('/api/expenses', expense);
        setMessage('Expense saved successfully!');
      }

      setTimeout(() => {
        setExpense({
          description: '',
          amount: '',
          category: '',
          date: new Date().toISOString().substring(0, 10),
          receipt: null,
        });
        setReceiptPreview(null);
        setScanDetails(null);
        navigate('/', { replace: true });
      }, 1500);
    } catch (err) {
      console.error('❌ Error saving expense:', err);
      
      if (err.response?.status === 401) {
        setError('Session expired. Please log in again.');
      } else {
        setError(err.response?.data?.message || 'Failed to save expense. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white p-8 rounded-xl shadow-2xl">
        <h1 className="text-3xl font-bold text-gray-900 mb-6 flex items-center space-x-2">
          <PlusCircle className="w-7 h-7 text-indigo-600" />
          <span>{id ? 'Edit Expense' : 'Record New Expense'}</span>
        </h1>

        {message && (
          <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4 rounded-md" role="alert">
            {message}
          </div>
        )}

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4 rounded-md" role="alert">
            {error}
          </div>
        )}

        {/* AI Scanning Progress */}
        {isScanning && (
          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4 rounded-md">
            <div className="flex items-center space-x-3">
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">🤖 AI is scanning your receipt...</p>
                <div className="mt-2 bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${scanProgress}%` }}
                  ></div>
                </div>
                <p className="text-xs text-blue-600 mt-1">{scanProgress}% complete</p>
              </div>
            </div>
          </div>
        )}

        {/* Scan Results */}
        {scanDetails && scanDetails.confidence > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <div className="flex items-start space-x-2">
              <Sparkles className="w-5 h-5 text-green-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-green-900">Scan Results:</p>
                <ul className="text-sm text-green-700 mt-1 space-y-1">
                  {scanDetails.extracted.merchant && <li>✓ Merchant: {scanDetails.extracted.merchant}</li>}
                  {scanDetails.extracted.amount && <li>✓ Amount: ${scanDetails.extracted.amount.toFixed(2)}</li>}
                  {scanDetails.extracted.date && <li>✓ Date: {scanDetails.extracted.date}</li>}
                </ul>
                {scanDetails.confidence < 3 && (
                  <p className="text-xs text-orange-600 mt-2">
                    <AlertCircle className="w-3 h-3 inline mr-1" />
                    Please verify the extracted data
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Smart Receipt Upload */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-4 rounded-lg border-2 border-purple-200">
            <div className="flex items-center justify-between mb-3">
              <label htmlFor="receiptUpload" className="text-sm font-semibold text-purple-900 flex items-center">
                <Scan className="w-5 h-5 mr-2 text-purple-600" />
                🤖 Smart Receipt Scanner (AI-Powered)
              </label>
              <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">Enhanced OCR</span>
            </div>
            <p className="text-xs text-purple-700 mb-3">Upload a receipt - AI will extract merchant, amount, and date automatically!</p>
            
            {!receiptPreview ? (
              <label htmlFor="receiptUpload" className="flex flex-col items-center justify-center w-full h-32 border-2 border-purple-300 border-dashed rounded-lg cursor-pointer hover:bg-purple-100 transition">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 text-purple-500 mb-2" />
                  <p className="text-sm text-purple-700">
                    <span className="font-semibold">Click to upload receipt</span> or drag and drop
                  </p>
                  <p className="text-xs text-purple-500">PNG, JPG, JPEG (MAX. 5MB)</p>
                </div>
                <input
                  type="file"
                  id="receiptUpload"
                  name="receiptUpload"
                  accept="image/*"
                  onChange={handleReceiptUpload}
                  className="hidden"
                  disabled={isScanning}
                />
              </label>
            ) : (
              <div className="relative border-2 border-purple-300 rounded-lg p-4 bg-white">
                <button
                  type="button"
                  onClick={removeReceipt}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition z-10"
                  aria-label="Remove receipt"
                  disabled={isScanning}
                >
                  <X className="w-4 h-4" />
                </button>
                <img
                  src={receiptPreview}
                  alt="Receipt preview"
                  className="w-full h-48 object-contain rounded"
                />
                <p className="text-sm text-purple-700 mt-2 flex items-center">
                  <ImageIcon className="w-4 h-4 mr-1" />
                  Receipt uploaded & scanned
                </p>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <input
              type="text"
              name="description"
              id="description"
              value={expense.description}
              onChange={handleChange}
              placeholder="e.g., Starbucks coffee, Uber ride, Amazon purchase"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
              autoComplete="off"
              required
            />
            
            {isLoadingSuggestion && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg animate-pulse">
                <p className="text-sm text-gray-500">🤖 AI is analyzing...</p>
              </div>
            )}

            {aiSuggestion && !isLoadingSuggestion && (
              <div className="mt-2 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <p className="text-sm text-indigo-700">
                      AI Suggests: <strong>{aiSuggestion.category}</strong>
                      <span className="text-xs ml-2 text-indigo-500">
                        ({(aiSuggestion.confidence * 100).toFixed(0)}% confident)
                      </span>
                    </p>
                  </div>
                  {expense.category !== aiSuggestion.category && (
                    <button
                      type="button"
                      onClick={applySuggestion}
                      className="text-xs px-3 py-1 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition"
                    >
                      Apply
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">
                Amount ($)
              </label>
              <input
                type="number"
                name="amount"
                id="amount"
                value={expense.amount}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                placeholder="0.00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                name="date"
                id="date"
                value={expense.date}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category {aiSuggestion && '(AI suggested above)'}
            </label>
            <select
              name="category"
              id="category"
              value={expense.category}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 transition duration-150 bg-white"
              required
            >
              <option value="" disabled>Select a Category</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading || isScanning || !user?.token}
            className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-lg shadow-md text-base font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5 mr-2" />
            {loading ? 'Saving...' : id ? 'Update Expense' : 'Save Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ExpenseFormPage;