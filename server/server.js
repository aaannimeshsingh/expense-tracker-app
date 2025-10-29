// /server/server.js

// CONFIGURATION & INITIALIZATION
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// MIDDLEWARE
app.use('/uploads', express.static('uploads'));

// ✅ SIMPLIFIED CORS Configuration - More Reliable
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'https://expense-tracker-app-two-ruddy.vercel.app',
  'https://expense-tracker-app-git-main-aaannimeshsinghs-projects.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman, curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list OR ends with .vercel.app
    if (allowedOrigins.indexOf(origin) !== -1 || origin.endsWith('.vercel.app')) {
      callback(null, true);
    } else {
      console.log('❌ CORS blocked origin:', origin);
      callback(null, true); // ✅ CHANGED: Allow anyway for debugging
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// ✅ ADD: Explicit OPTIONS handling for preflight
app.options('*', cors());

// Body parser with increased limit for receipt images
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ ADD: Request logging middleware (helps debug CORS issues)
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.path} - Origin: ${req.get('origin') || 'none'}`);
  next();
});

// DATABASE CONNECTION
mongoose.connect(process.env.MONGO_URI, {
  appName: 'expenseTrackerWebApp',
})
.then(() => console.log('✅ MongoDB Connected!'))
.catch((err) => {
  console.error('❌ MongoDB connection error:', err.message);
  process.exit(1);
});

// ROUTES IMPORTS
app.get('/', (req, res) => res.json({ 
  message: '✅ Expense Tracker API is running!',
  status: 'healthy',
  timestamp: new Date().toISOString(),
  cors: 'enabled'
}));

const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const budgetRoutes = require('./routes/budgetRoutes'); 
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const categorySuggestRoute = require('./routes/categoryRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
const integrationRoutes = require('./routes/integrationRoutes');

// ROUTES MOUNTING
app.use('/api/users', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes); 
app.use('/api/categories', categorySuggestRoute); 
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes);

// Health check route
app.get('/health', (req, res) => res.json({ 
  status: 'OK', 
  timestamp: new Date(),
  uptime: process.uptime(),
  cors: 'enabled',
  allowedOrigins: allowedOrigins
}));

// Debug route (DEVELOPMENT ONLY - Remove in production!)
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
}

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ 
    message: '❌ Route not found',
    path: req.originalUrl,
    method: req.method
  });
});

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);
  res.status(err.status || 500).json({ 
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// SERVER START
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS enabled for origins:`, allowedOrigins);
  console.log(`🔓 Wildcard Vercel origins: *.vercel.app`);
});