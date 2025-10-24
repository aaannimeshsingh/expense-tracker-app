// /server/server.js

// CONFIGURATION & INITIALIZATION
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

// MIDDLEWARE
app.use('/uploads', express.static('uploads'));

// CORS Configuration
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  exposedHeaders: ['Authorization'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
}));

// Body parser
app.use(express.json());

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
app.get('/', (req, res) => res.send('API is running...'));

const authRoutes = require('./routes/authRoutes');
const expenseRoutes = require('./routes/expenseRoutes');
const budgetRoutes = require('./routes/budgetRoutes'); 
const aiRoutes = require('./routes/aiRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const categorySuggestRoute = require('./routes/categoryRoutes'); 
const notificationRoutes = require('./routes/notificationRoutes');
const integrationRoutes = require('./routes/integrationRoutes'); // 🆕 NEW

// ROUTES MOUNTING
app.use('/api/users', authRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/budgets', budgetRoutes); 
app.use('/api/ai', aiRoutes);
app.use('/api/analytics', analyticsRoutes); 
app.use('/api/categories', categorySuggestRoute); 
app.use('/api/notifications', notificationRoutes);
app.use('/api/integrations', integrationRoutes); // 🆕 NEW

// Health check route
app.get('/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Debug route to view all data (DEVELOPMENT ONLY - Remove in production!)
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

// GLOBAL ERROR HANDLER
app.use((err, req, res, next) => {
  console.error('💥 Server Error:', err.stack);
  res.status(500).json({ message: err.message || 'Internal Server Error' });
});

// SERVER START
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

