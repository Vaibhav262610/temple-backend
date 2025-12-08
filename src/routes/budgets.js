// Budgets Routes - Budget Management API
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// GET all budgets
router.get('/', async (req, res) => {
    try {
        console.log('💰 Fetching budgets...');

        const { data, error } = await supabaseService.client
            .from('budgets')
            .select('*')
            .eq('is_active', true)
            .order('category', { ascending: true });

        if (error) {
            // If table doesn't exist, return empty array
            if (error.message.includes('does not exist')) {
                return res.json({
                    success: true,
                    data: [],
                    message: 'Budgets table not created yet'
                });
            }
            throw error;
        }

        res.json({
            success: true,
            data: data || []
        });
    } catch (error) {
        console.error('Error fetching budgets:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budgets',
            error: error.message
        });
    }
});

// GET budget by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const { data, error } = await supabaseService.client
            .from('budgets')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data
        });
    } catch (error) {
        console.error('Error fetching budget:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget',
            error: error.message
        });
    }
});

// POST create budget
router.post('/', async (req, res) => {
    try {
        console.log('💰 Creating budget:', req.body);

        const { category, budgeted_amount, period, description, start_date, end_date } = req.body;

        if (!category || !budgeted_amount) {
            return res.status(400).json({
                success: false,
                message: 'Category and budgeted_amount are required'
            });
        }

        const budgetData = {
            category,
            budgeted_amount: parseFloat(budgeted_amount),
            spent_amount: 0,
            period: period || 'monthly',
            description: description || null,
            start_date: start_date || new Date().toISOString().split('T')[0],
            end_date: end_date || null,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('budgets')
            .insert(budgetData)
            .select('*')
            .single();

        if (error) {
            console.error('❌ Database error:', error);
            throw error;
        }

        console.log('✅ Budget created:', data);

        res.status(201).json({
            success: true,
            data: data,
            message: 'Budget created successfully'
        });
    } catch (error) {
        console.error('Error creating budget:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create budget',
            error: error.message
        });
    }
});

// PUT update budget
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('💰 Updating budget:', id);

        const updateData = {
            ...req.body,
            updated_at: new Date().toISOString()
        };

        const { data, error } = await supabaseService.client
            .from('budgets')
            .update(updateData)
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: 'Budget updated successfully'
        });
    } catch (error) {
        console.error('Error updating budget:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget',
            error: error.message
        });
    }
});

// PUT update spent amount (called when expense is added)
router.put('/:id/spend', async (req, res) => {
    try {
        const { id } = req.params;
        const { amount } = req.body;

        console.log('💰 Adding expense to budget:', id, 'Amount:', amount);

        // Get current budget
        const { data: budget, error: fetchError } = await supabaseService.client
            .from('budgets')
            .select('spent_amount')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const newSpentAmount = (budget.spent_amount || 0) + parseFloat(amount);

        const { data, error } = await supabaseService.client
            .from('budgets')
            .update({
                spent_amount: newSpentAmount,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            data: data,
            message: 'Budget spent amount updated'
        });
    } catch (error) {
        console.error('Error updating budget spent amount:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update budget',
            error: error.message
        });
    }
});

// DELETE budget (soft delete)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        console.log('💰 Deleting budget:', id);

        const { data, error } = await supabaseService.client
            .from('budgets')
            .update({ is_active: false, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        res.json({
            success: true,
            message: 'Budget deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting budget:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete budget',
            error: error.message
        });
    }
});

// GET budget summary with expenses
router.get('/summary/all', async (req, res) => {
    try {
        console.log('📊 Fetching budget summary...');

        // Get all active budgets
        const { data: budgets, error: budgetError } = await supabaseService.client
            .from('budgets')
            .select('*')
            .eq('is_active', true);

        if (budgetError) throw budgetError;

        // Get all expenses
        const { data: expenses, error: expenseError } = await supabaseService.client
            .from('expenses')
            .select('expense_type, amount');

        if (expenseError && !expenseError.message.includes('does not exist')) {
            throw expenseError;
        }

        // Calculate actual spending by category
        const actualSpending = (expenses || []).reduce((acc, expense) => {
            const category = expense.expense_type || 'other';
            acc[category] = (acc[category] || 0) + parseFloat(expense.amount || 0);
            return acc;
        }, {});

        // Merge budgets with actual spending
        const budgetSummary = (budgets || []).map(budget => ({
            ...budget,
            actual_spent: actualSpending[budget.category] || 0,
            variance: (actualSpending[budget.category] || 0) - budget.budgeted_amount,
            utilization_percent: budget.budgeted_amount > 0
                ? ((actualSpending[budget.category] || 0) / budget.budgeted_amount) * 100
                : 0
        }));

        res.json({
            success: true,
            data: budgetSummary,
            totals: {
                total_budgeted: budgets?.reduce((sum, b) => sum + parseFloat(b.budgeted_amount), 0) || 0,
                total_spent: Object.values(actualSpending).reduce((sum, amt) => sum + amt, 0),
            }
        });
    } catch (error) {
        console.error('Error fetching budget summary:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch budget summary',
            error: error.message
        });
    }
});

module.exports = router;
