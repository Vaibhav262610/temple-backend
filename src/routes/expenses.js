// Expenses Routes - Dedicated expenses table management
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// =============================================
// EXPENSES ROUTES
// =============================================

// GET all expenses
router.get('/', async (req, res) => {
  try {
    console.log('💸 Fetching expenses...');

    const { data, error } = await supabaseService.client
      .from('expenses')
      .select(`
                *,
                budget_categories (
                    id,
                    name,
                    category_type
                )
            `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses',
      error: error.message
    });
  }
});

// GET expense by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💸 Fetching expense:', id);

    const { data, error } = await supabaseService.client
      .from('expenses')
      .select(`
                *,
                budget_categories (
                    id,
                    name,
                    category_type
                ),
                expense_attachments (
                    id,
                    file_name,
                    file_path,
                    file_type,
                    file_size,
                    uploaded_at
                )
            `)
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense',
      error: error.message
    });
  }
});

// POST create expense
router.post('/', async (req, res) => {
  try {
    console.log('💸 Creating expense:', req.body);

    // Validate required fields
    const { description, amount } = req.body;
    if (!description || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Description and amount are required'
      });
    }

    if (amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be greater than 0'
      });
    }

    const { data, error } = await supabaseService.client
      .from('expenses')
      .insert(req.body)
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data,
      message: 'Expense created successfully'
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create expense',
      error: error.message
    });
  }
});

// PUT update expense
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💸 Updating expense:', id);

    const { data, error } = await supabaseService.client
      .from('expenses')
      .update(req.body)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update expense',
      error: error.message
    });
  }
});

// DELETE expense
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💸 Deleting expense:', id);

    const { data, error } = await supabaseService.client
      .from('expenses')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete expense',
      error: error.message
    });
  }
});

// =============================================
// EXPENSE REPORTS ROUTES
// =============================================

// GET expense summary
router.get('/reports/summary', async (req, res) => {
  try {
    console.log('📊 Fetching expense summary...');

    const { data: expenses, error } = await supabaseService.client
      .from('expenses')
      .select('expense_type, amount, payment_status, expense_date');

    if (error) throw error;

    const totalExpenses = expenses
      .filter(e => e.payment_status === 'completed')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    const pendingExpenses = expenses
      .filter(e => e.payment_status === 'pending')
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // This month expenses
    const now = new Date();
    const thisMonthExpenses = expenses
      .filter(e => {
        const expenseDate = new Date(e.expense_date);
        return expenseDate.getMonth() === now.getMonth() &&
          expenseDate.getFullYear() === now.getFullYear() &&
          e.payment_status === 'completed';
      })
      .reduce((sum, e) => sum + parseFloat(e.amount), 0);

    // Category breakdown
    const categoryBreakdown = {};
    expenses.forEach(expense => {
      if (expense.payment_status === 'completed') {
        const category = expense.expense_type || 'other';
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { count: 0, total: 0 };
        }
        categoryBreakdown[category].count += 1;
        categoryBreakdown[category].total += parseFloat(expense.amount);
      }
    });

    res.json({
      success: true,
      data: {
        totalExpenses,
        pendingExpenses,
        thisMonthExpenses,
        expenseCount: expenses.length,
        completedCount: expenses.filter(e => e.payment_status === 'completed').length,
        pendingCount: expenses.filter(e => e.payment_status === 'pending').length,
        categoryBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense summary',
      error: error.message
    });
  }
});

// GET expenses by category
router.get('/reports/by-category', async (req, res) => {
  try {
    console.log('📊 Fetching expenses by category...');

    const { data: expenses, error } = await supabaseService.client
      .from('expenses')
      .select('expense_type, amount, payment_status')
      .eq('payment_status', 'completed');

    if (error) throw error;

    const categoryReport = {};
    expenses.forEach(expense => {
      const category = expense.expense_type || 'other';
      if (!categoryReport[category]) {
        categoryReport[category] = {
          category,
          totalAmount: 0,
          expenseCount: 0,
          expenses: []
        };
      }

      categoryReport[category].totalAmount += parseFloat(expense.amount);
      categoryReport[category].expenseCount += 1;
      categoryReport[category].expenses.push(expense);
    });

    res.json({
      success: true,
      data: Object.values(categoryReport)
    });
  } catch (error) {
    console.error('Error fetching category report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category report',
      error: error.message
    });
  }
});

// GET monthly expense report
router.get('/reports/monthly', async (req, res) => {
  try {
    console.log('📊 Fetching monthly expense report...');

    const { data: expenses, error } = await supabaseService.client
      .from('expenses')
      .select('*')
      .eq('payment_status', 'completed')
      .order('expense_date', { ascending: false });

    if (error) throw error;

    // Group by month
    const monthlyReport = {};
    expenses.forEach(expense => {
      const date = new Date(expense.expense_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthlyReport[monthKey]) {
        monthlyReport[monthKey] = {
          month: monthKey,
          totalAmount: 0,
          expenseCount: 0,
          expenses: []
        };
      }

      monthlyReport[monthKey].totalAmount += parseFloat(expense.amount);
      monthlyReport[monthKey].expenseCount += 1;
      monthlyReport[monthKey].expenses.push(expense);
    });

    res.json({
      success: true,
      data: Object.values(monthlyReport).sort((a, b) => b.month.localeCompare(a.month))
    });
  } catch (error) {
    console.error('Error fetching monthly report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly report',
      error: error.message
    });
  }
});

// =============================================
// EXPENSE ATTACHMENTS ROUTES
// =============================================

// GET attachments for an expense
router.get('/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📎 Fetching attachments for expense:', id);

    const { data, error } = await supabaseService.client
      .from('expense_attachments')
      .select('*')
      .eq('expense_id', id)
      .order('uploaded_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching expense attachments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense attachments',
      error: error.message
    });
  }
});

// POST add attachment to expense
router.post('/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('📎 Adding attachment to expense:', id);

    const attachmentData = {
      ...req.body,
      expense_id: id
    };

    const { data, error } = await supabaseService.client
      .from('expense_attachments')
      .insert(attachmentData)
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data,
      message: 'Attachment added successfully'
    });
  } catch (error) {
    console.error('Error adding expense attachment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add expense attachment',
      error: error.message
    });
  }
});

module.exports = router;