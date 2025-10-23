// server/routes/categoryRoutes.js

const express = require('express');
const router = express.Router();

// This object contains keywords for each category
// When someone types "starbucks", it will match "Food & Drinks"
const categorySuggestions = {
  'Food & Drinks': [
    'starbucks', 'coffee', 'restaurant', 'food', 'lunch', 'dinner', 
    'breakfast', 'cafe', 'pizza', 'burger', 'meal', 'grocery', 
    'groceries', 'supermarket', 'mcdonalds', 'kfc', 'subway',
    'dominos', 'eat', 'snack', 'drink', 'tea', 'juice'
  ],
  'Travel': [
    'uber', 'lyft', 'ola', 'gas', 'fuel', 'flight', 'hotel', 
    'airbnb', 'taxi', 'train', 'bus', 'parking', 'toll',
    'petrol', 'diesel', 'metro', 'railway'
  ],
  'Shopping': [
    'amazon', 'flipkart', 'store', 'clothes', 'shopping', 'mall', 
    'purchase', 'buy', 'retail', 'dress', 'shoes', 'bag',
    'myntra', 'ajio', 'shop'
  ],
  'Bills & Utilities': [
    'electric', 'electricity', 'water', 'internet', 'phone', 
    'utility', 'bill', 'rent', 'mortgage', 'wifi', 'broadband',
    'mobile', 'recharge', 'postpaid', 'jio', 'airtel'
  ],
  'Entertainment': [
    'movie', 'cinema', 'netflix', 'spotify', 'concert', 'game', 
    'party', 'club', 'bar', 'theater', 'prime', 'hotstar',
    'youtube', 'subscription', 'music', 'pvr', 'inox'
  ],
  'Personal': [
    'gym', 'fitness', 'haircut', 'salon', 'pharmacy', 'medicine', 
    'doctor', 'health', 'hospital', 'clinic', 'medical',
    'cosmetic', 'beauty', 'spa'
  ],
  'Other': []
};

// This function analyzes the description and finds the best category
const suggestCategory = (description) => {
  // Convert to lowercase for easier matching
  const lowerDesc = description.toLowerCase();
  
  // Loop through each category and its keywords
  for (const [category, keywords] of Object.entries(categorySuggestions)) {
    // Check if any keyword matches
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword)) {
        return {
          category: category,
          confidence: 0.85 + Math.random() * 0.1, // 85-95% confidence
          matchedKeyword: keyword
        };
      }
    }
  }
  
  // If no match found, return "Other"
  return {
    category: 'Other',
    confidence: 0.5,
    matchedKeyword: null
  };
};

// API Route: POST /api/categories/suggest
// This is what the frontend will call
router.post('/suggest', (req, res) => {
  try {
    const { description } = req.body;
    
    // Check if description was provided
    if (!description) {
      return res.status(400).json({ 
        message: 'Description is required' 
      });
    }
    
    // Get the AI suggestion
    const suggestion = suggestCategory(description);
    
    // Send back the suggestion
    res.json(suggestion);
    
  } catch (error) {
    console.error('Error in category suggestion:', error);
    res.status(500).json({ 
      message: 'Error suggesting category', 
      error: error.message 
    });
  }
});

module.exports = router;