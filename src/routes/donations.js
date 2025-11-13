// Donations Routes - Dedicated donations table API
const express = require('express');
const router = express.Router();
const supabaseService = require('../services/supabaseService');

// =============================================
// DONATIONS ROUTES
// =============================================

// GET all donations
router.get('/', async (req, res) => {
  try {
    console.log('💰 Fetching donations...');

    const { data, error } = await supabaseService.client
      .from('donations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations',
      error: error.message
    });
  }
});

// GET donation by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💰 Fetching donation:', id);

    const { data, error } = await supabaseService.client
      .from('donations')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data
    });
  } catch (error) {
    console.error('Error fetching donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation',
      error: error.message
    });
  }
});

// POST create donation
router.post('/', async (req, res) => {
  try {
    console.log('💰 Creating donation:', req.body);

    // Validate required fields
    const { amount, donation_type = 'general', payment_method = 'cash' } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Valid amount is required'
      });
    }

    // Prepare donation data
    const donationData = {
      ...req.body,
      amount: parseFloat(amount),
      donation_date: req.body.donation_date || new Date().toISOString().split('T')[0],
      payment_status: req.body.payment_status || 'completed',
      created_by: req.body.created_by || 'system'
    };

    const { data, error } = await supabaseService.client
      .from('donations')
      .insert(donationData)
      .select('*')
      .single();

    if (error) throw error;

    // Update category collected amount if donation type matches
    if (data.donation_type && data.payment_status === 'completed') {
      await updateCategoryCollectedAmount(data.donation_type);
    }

    res.status(201).json({
      success: true,
      data: data,
      message: 'Donation created successfully'
    });
  } catch (error) {
    console.error('Error creating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation',
      error: error.message
    });
  }
});

// PUT update donation
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💰 Updating donation:', id);

    const { data, error } = await supabaseService.client
      .from('donations')
      .update(req.body)
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      message: 'Donation updated successfully'
    });
  } catch (error) {
    console.error('Error updating donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update donation',
      error: error.message
    });
  }
});

// DELETE donation
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('💰 Deleting donation:', id);

    const { data, error } = await supabaseService.client
      .from('donations')
      .delete()
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    res.json({
      success: true,
      message: 'Donation deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting donation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete donation',
      error: error.message
    });
  }
});

// =============================================
// DONATION CATEGORIES ROUTES
// =============================================

// GET all donation categories
router.get('/categories/all', async (req, res) => {
  try {
    console.log('📁 Fetching donation categories...');

    const { data, error } = await supabaseService.client
      .from('donation_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching donation categories:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donation categories',
      error: error.message
    });
  }
});

// POST create donation category
router.post('/categories', async (req, res) => {
  try {
    console.log('📁 Creating donation category:', req.body);

    const { data, error } = await supabaseService.client
      .from('donation_categories')
      .insert(req.body)
      .select('*')
      .single();

    if (error) throw error;

    res.status(201).json({
      success: true,
      data: data,
      message: 'Donation category created successfully'
    });
  } catch (error) {
    console.error('Error creating donation category:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create donation category',
      error: error.message
    });
  }
});

// =============================================
// REPORTS ROUTES
// =============================================

// GET donations summary
router.get('/reports/summary', async (req, res) => {
  try {
    console.log('📊 Fetching donations summary...');

    // Get total donations
    const { data: donations, error: donationsError } = await supabaseService.client
      .from('donations')
      .select('amount, payment_status, donation_date, donation_type')
      .eq('payment_status', 'completed');

    if (donationsError) throw donationsError;

    // Calculate summary
    const totalAmount = donations.reduce((sum, d) => sum + parseFloat(d.amount), 0);
    const totalCount = donations.length;
    const averageAmount = totalCount > 0 ? totalAmount / totalCount : 0;

    // Get this month's donations
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    const thisMonthDonations = donations.filter(d =>
      d.donation_date && d.donation_date.startsWith(currentMonth)
    );
    const thisMonthAmount = thisMonthDonations.reduce((sum, d) => sum + parseFloat(d.amount), 0);

    // Get donation types breakdown
    const typeBreakdown = {};
    donations.forEach(d => {
      typeBreakdown[d.donation_type] = (typeBreakdown[d.donation_type] || 0) + parseFloat(d.amount);
    });

    res.json({
      success: true,
      data: {
        totalAmount,
        totalCount,
        averageAmount,
        thisMonthAmount,
        thisMonthCount: thisMonthDonations.length,
        typeBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching donations summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch donations summary',
      error: error.message
    });
  }
});

// GET daily donations
router.get('/reports/daily', async (req, res) => {
  try {
    console.log('📅 Fetching daily donations...');

    const { data, error } = await supabaseService.client
      .from('daily_donations_summary')
      .select('*')
      .order('donation_date', { ascending: false })
      .limit(30);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching daily donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily donations',
      error: error.message
    });
  }
});

// GET monthly donations
router.get('/reports/monthly', async (req, res) => {
  try {
    console.log('📅 Fetching monthly donations...');

    const { data, error } = await supabaseService.client
      .from('monthly_donations_summary')
      .select('*')
      .order('month', { ascending: false })
      .limit(12);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching monthly donations:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch monthly donations',
      error: error.message
    });
  }
});

// GET top donors
router.get('/reports/top-donors', async (req, res) => {
  try {
    console.log('🏆 Fetching top donors...');

    const { data, error } = await supabaseService.client
      .from('top_donors')
      .select('*')
      .limit(10);

    if (error) throw error;

    res.json({
      success: true,
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching top donors:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top donors',
      error: error.message
    });
  }
});

// =============================================
// HELPER FUNCTIONS
// =============================================

async function updateCategoryCollectedAmount(donationType) {
  try {
    // Map donation types to category names
    const typeToCategory = {
      'general': 'General Donations',
      'temple_construction': 'Temple Construction',
      'festival': 'Festival Celebrations',
      'puja_sponsorship': 'Puja Sponsorship',
      'annadanam': 'Annadanam',
      'education': 'Education Fund',
      'medical': 'Medical Aid',
      'other': 'General Donations'
    };

    const categoryName = typeToCategory[donationType];
    if (!categoryName) return;

    // Calculate total collected for this type
    const { data: donations } = await supabaseService.client
      .from('donations')
      .select('amount')
      .eq('donation_type', donationType)
      .eq('payment_status', 'completed');

    const totalCollected = donations?.reduce((sum, d) => sum + parseFloat(d.amount), 0) || 0;

    // Update category
    await supabaseService.client
      .from('donation_categories')
      .update({ collected_amount: totalCollected })
      .eq('name', categoryName);

  } catch (error) {
    console.error('Error updating category collected amount:', error);
  }
}

module.exports = router;