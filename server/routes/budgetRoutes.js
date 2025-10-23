// /server/routes/budgetRoutes.js

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const budgetController = require('../controllers/budgetController'); // ⬅️ Import the controller

// All routes are now protected and use the controller functions
router.route('/')
    .get(protect, budgetController.getBudgets)
    .post(protect, budgetController.createBudget);

router.route('/status')
    .get(protect, budgetController.getBudgetStatus);

router.route('/summary')
    .get(protect, budgetController.getBudgetSummary);

router.route('/:id')
    .put(protect, budgetController.updateBudget)
    .delete(protect, budgetController.deleteBudget);

module.exports = router;