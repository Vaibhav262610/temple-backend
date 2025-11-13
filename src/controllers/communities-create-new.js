// Create new community - Fixed Version
const Community = require('../models/Community');
const { validationResult } = require('express-validator');

const createCommunity = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    // Generate slug from name
    const slug = req.body.name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '') // Remove special characters except spaces and hyphens
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single hyphen
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

    const communityData = {
      id: req.body.id || `community-${Date.now()}`,
      name: req.body.name,
      slug: slug,
      description: req.body.description,
      logo_url: req.body.logo_url,
      owner_id: req.body.owner_id,
      status: req.body.status || 'active',
      created_at: req.body.created_at || new Date(),
      updated_at: req.body.updated_at || new Date()
    };

    const community = new Community(communityData);
    await community.save();

    // Populate the created community
    await community.populate('owner_id', 'full_name email');

    res.status(201).json({
      success: true,
      message: 'Community created successfully',
      data: community
    });
  } catch (error) {
    console.error('Error creating community:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Community slug already exists'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to create community'
    });
  }
};

module.exports = { createCommunity };
