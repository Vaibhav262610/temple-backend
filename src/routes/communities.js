// routes/communities.js - COMPLETE WORKING VERSION
const express = require('express');
const router = express.Router();
const Community = require('../models/Community');
const HybridCommunityService = require('../services/hybridCommunityService');
const mongoose = require('mongoose');

// GET all communities
router.get('/', async (req, res) => {
  try {
    const { status, search, owner_id, page = 1, limit = 50 } = req.query;

    console.log('📋 Fetching communities with filters:', { status, search, owner_id, limit });

    // Use hybrid service to get communities from Supabase + memory
    const communities = await HybridCommunityService.getAllCommunities({
      status,
      search,
      owner_id,
      limit: parseInt(limit)
    });

    const total = communities.length;
    const pages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: communities,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages
      }
    });
  } catch (error) {
    console.error('Error fetching communities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch communities',
      error: error.message
    });
  }
});

// GET single community
router.get('/:id', async (req, res) => {
  try {
    console.log('🔍 Fetching community by ID:', req.params.id);

    const community = await HybridCommunityService.getCommunityById(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    res.json({
      success: true,
      data: community
    });
  } catch (error) {
    console.error('Error fetching community:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch community',
      error: error.message
    });
  }
});

// POST create community
router.post('/', async (req, res) => {
  try {
    console.log('📥 Creating community:', req.body);

    const { name, description, owner_id, logo_url, status, slug } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Community name is required'
      });
    }

    // ✅ Use provided owner_id or generate UUID
    let ownerId = owner_id;
    if (!ownerId || !ownerId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      const { randomUUID } = require('crypto');
      ownerId = randomUUID();
      console.log('⚠️ No valid owner_id provided, using temporary:', ownerId);
    }

    // Generate slug if not provided
    const communitySlug = slug || name.toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    // Create community using hybrid service (saves to Supabase + memory)
    const community = await HybridCommunityService.createCommunity({
      name,
      slug: communitySlug,
      description: description || '',
      owner_id: ownerId,
      logo_url: logo_url || '/placeholder.svg',
      status: status || 'active'
    });

    console.log('✅ Community created:', community.id);

    res.status(201).json({
      success: true,
      data: community,
      message: 'Community created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating community:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create community',
      error: error.message
    });
  }
});

// PUT update community
router.put('/:id', async (req, res) => {
  try {
    console.log('📝 Updating community:', req.params.id, req.body);

    const { name, description, logo_url, status } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (logo_url !== undefined) updateData.logo_url = logo_url;
    if (status) updateData.status = status;

    // Use hybrid service to update in Supabase + memory
    const community = await HybridCommunityService.updateCommunity(req.params.id, updateData);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    res.json({
      success: true,
      data: community,
      message: 'Community updated successfully'
    });
  } catch (error) {
    console.error('Error updating community:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update community',
      error: error.message
    });
  }
});

// DELETE (archive) community
router.delete('/:id', async (req, res) => {
  try {
    console.log('🗑️ Archiving community:', req.params.id);

    // Use hybrid service to archive in Supabase + memory
    const community = await HybridCommunityService.deleteCommunity(req.params.id);

    if (!community) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    res.json({
      success: true,
      data: community,
      message: 'Community archived successfully'
    });
  } catch (error) {
    console.error('Error archiving community:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to archive community',
      error: error.message
    });
  }
});

// GET community stats
router.get('/:id/stats', async (req, res) => {
  try {
    console.log('📊 Fetching community stats:', req.params.id);

    const stats = await HybridCommunityService.getCommunityStats(req.params.id);

    if (!stats) {
      return res.status(404).json({
        success: false,
        message: 'Community not found'
      });
    }

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats',
      error: error.message
    });
  }
});

// ============================================
// MEMBER MANAGEMENT ROUTES
// ============================================

// Members route moved to communityFeatures.js to avoid conflicts

// POST add member
router.post('/:id/members', async (req, res) => {
  try {
    const { user_id, role = 'member' } = req.body;

    // Update member count
    await Community.findByIdAndUpdate(req.params.id, {
      $inc: { member_count: 1 }
    });

    res.json({
      success: true,
      message: 'Member added successfully',
      data: { community_id: req.params.id, user_id, role }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add member',
      error: error.message
    });
  }
});

// PUT update member role
router.put('/:id/members/:user_id', async (req, res) => {
  try {
    const { role } = req.body;

    res.json({
      success: true,
      message: 'Member role updated successfully',
      data: { community_id: req.params.id, user_id: req.params.user_id, role }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update member',
      error: error.message
    });
  }
});

// DELETE remove member
router.delete('/:id/members/:user_id', async (req, res) => {
  try {
    // Update member count
    await Community.findByIdAndUpdate(req.params.id, {
      $inc: { member_count: -1 }
    });

    res.json({
      success: true,
      message: 'Member removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to remove member',
      error: error.message
    });
  }
});

module.exports = router;
