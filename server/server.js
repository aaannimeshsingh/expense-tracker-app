// server/server.js - PRODUCTION READY

require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Static files
app.use('/uploads', express.static('uploads'));

// CORS Configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.CLIENT_URL, // Add this to .env
  /\.vercel\.app$/, // Allow all Vercel deployments
].filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Check if origin matches allowed origins or regex patterns
    const isAllowed = allowedOrigins.some(allowed => {
      if (allowed instanceof RegExp) {
        return allowed.test(origin);
      }
      return allowed === origin;
    });
    
    if (isAllowed) {
      callback(null, true);
    } else {
      console.warn('⚠️ Blocked origin:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parser (increased limit for receipt images)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging (only in development)
if (process.env.NODE_ENV !== 'production') {
  app.use((req, res, next) => {
    console.log(`📥 ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
    next();
  });
}

// ============================================
// DATABASE CONNECTION
// ============================================

mongoose.connect(process.env.MONGO_URI, {
  appName: 'expenseTrackerWebApp',
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => res.json({ 
  status: 'healthy',
  message: '✅ Expense Tracker API is running!',
  timestamp: new Date().toISOString(),
  version: '1.0.0',
  environment: process.env.NODE_ENV || 'development'
}));

app.get('/health', (req, res) => res.json({ 
  status: 'OK', 
  timestamp: new Date(),
  uptime: process.uptime(),
  environment: process.env.NODE_ENV || 'development'
}));

// API Routes
const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const categorySuggestRoute = require('./routes/categoryRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const integrationRoutes = require('./routes/integrationRoutes');

app.use('/api/users', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/categories', categorySuggestRoute);
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);

// ============================================
// DEBUG ROUTES (DEVELOPMENT ONLY)
// ============================================

if (process.env.NODE_ENV !== 'production') {
  app.get('/api/debug/all-data', async (req, res) => {
    try {
      const User = require('./models/User');
      const Expense = require('./models/Expense');
      
      const users = await User.find().select('-password');
      const expenses = await Expense.find().populate('user', 'name email');
      
      res.json({
        totalUsers: users.length,
        totalExpenses: expenses.length,
        users,
        expenses,
      });
    } catch (error) {
      res.status(500).json({ message: 'Error fetching data', error: error.message });
    }
  });
  
  console.log('🔧 Debug routes enabled (development mode)');
}

// ============================================
// ERROR HANDLERS
// ============================================

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    message: '❌ Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err);
  
  // Don't leak error details in production
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    ...(isDevelopment && { 
      stack: err.stack,
      details: err.details 
    })
  });
});

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, closing server gracefully...');
  mongoose.connection.close(false, () => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, closing server gracefully...');
  mongoose.connection.close(false, () => {
    console.log('✅ MongoDB connection closed');
    process.exit(0);
  });
});

// ============================================
// SERVER START
// ============================================

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log('🚀 ====================================');
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for origins:`, allowedOrigins.filter(o => !(o instanceof RegExp)));
  console.log(`🔓 Wildcard patterns: *.vercel.app`);
  console.log('🚀 ====================================');
});

module.exports = app; // Export for testing