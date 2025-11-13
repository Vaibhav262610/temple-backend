// Broadcasts Controller - MongoDB
const Broadcast = require('../models/Broadcast');
const { body, validationResult } = require('express-validator');

// Get all broadcasts with filtering and pagination
const getBroadcasts = async (req, res) => {
  try {
    const {
      status,
      channel,
      page = 1,
      limit = 50
    } = req.query;

    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (channel && channel !== 'all') {
      query.channel = channel;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const broadcasts = await Broadcast.find(query)
      .populate('template_id', 'name type')
      .populate('created_by', 'full_name email')
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Broadcast.countDocuments(query);

    res.json({
      success: true,
      data: broadcasts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching broadcasts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcasts'
    });
  }
};

// Get broadcast by ID
const getBroadcastById = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findById(id)
      .populate('template_id', 'name type')
      .populate('created_by', 'full_name email');

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found'
      });
    }

    res.json({
      success: true,
      data: broadcast
    });
  } catch (error) {
    console.error('Error fetching broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcast'
    });
  }
};

// Create new broadcast
const createBroadcast = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const broadcastData = {
      ...req.body,
      created_by: req.user?.id || req.body.created_by,
      status: req.body.scheduled_at ? 'scheduled' : 'draft'
    };

    const broadcast = new Broadcast(broadcastData);
    await broadcast.save();

    // Populate the created broadcast
    await broadcast.populate('template_id', 'name type');
    await broadcast.populate('created_by', 'full_name email');

    res.status(201).json({
      success: true,
      message: 'Broadcast created successfully',
      data: broadcast
    });
  } catch (error) {
    console.error('Error creating broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create broadcast'
    });
  }
};

// Update broadcast
const updateBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findByIdAndUpdate(
      id,
      {
        ...req.body,
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('template_id', 'name type')
     .populate('created_by', 'full_name email');

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found'
      });
    }

    res.json({
      success: true,
      message: 'Broadcast updated successfully',
      data: broadcast
    });
  } catch (error) {
    console.error('Error updating broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update broadcast'
    });
  }
};

// Send broadcast (change status to sending)
const sendBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findByIdAndUpdate(
      id,
      {
        status: 'sending',
        sent_at: new Date(),
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('template_id', 'name type')
     .populate('created_by', 'full_name email');

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found'
      });
    }

    // Here you would typically trigger the actual sending process
    // For now, we'll just update the status

    res.json({
      success: true,
      message: 'Broadcast sending initiated',
      data: broadcast
    });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send broadcast'
    });
  }
};

// Cancel broadcast
const cancelBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        updated_at: new Date()
      },
      { new: true, runValidators: true }
    ).populate('template_id', 'name type')
     .populate('created_by', 'full_name email');

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found'
      });
    }

    res.json({
      success: true,
      message: 'Broadcast cancelled successfully',
      data: broadcast
    });
  } catch (error) {
    console.error('Error cancelling broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel broadcast'
    });
  }
};

// Delete broadcast
const deleteBroadcast = async (req, res) => {
  try {
    const { id } = req.params;

    const broadcast = await Broadcast.findByIdAndDelete(id);

    if (!broadcast) {
      return res.status(404).json({
        success: false,
        message: 'Broadcast not found'
      });
    }

    res.json({
      success: true,
      message: 'Broadcast deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting broadcast:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete broadcast'
    });
  }
};

// Get broadcast statistics
const getBroadcastStats = async (req, res) => {
  try {
    const { start_date, end_date } = req.query;

    const matchStage = {};

    if (start_date || end_date) {
      matchStage.created_at = {};
      if (start_date) matchStage.created_at.$gte = new Date(start_date);
      if (end_date) matchStage.created_at.$lte = new Date(end_date);
    }

    const stats = await Broadcast.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalBroadcasts: { $sum: 1 },
          sentBroadcasts: {
            $sum: { $cond: [{ $in: ['$status', ['sent', 'sending']] }, 1, 0] }
          },
          draftBroadcasts: {
            $sum: { $cond: [{ $eq: ['$status', 'draft'] }, 1, 0] }
          },
          scheduledBroadcasts: {
            $sum: { $cond: [{ $eq: ['$status', 'scheduled'] }, 1, 0] }
          },
          failedBroadcasts: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          },
          totalRecipients: { $sum: '$total_recipients' },
          totalSent: { $sum: '$sent_count' },
          totalDelivered: { $sum: '$delivered_count' },
          totalOpened: { $sum: '$opened_count' },
          totalClicked: { $sum: '$clicked_count' }
        }
      }
    ]);

    res.json({
      success: true,
      data: stats[0] || {
        totalBroadcasts: 0,
        sentBroadcasts: 0,
        draftBroadcasts: 0,
        scheduledBroadcasts: 0,
        failedBroadcasts: 0,
        totalRecipients: 0,
        totalSent: 0,
        totalDelivered: 0,
        totalOpened: 0,
        totalClicked: 0
      }
    });
  } catch (error) {
    console.error('Error fetching broadcast stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch broadcast statistics'
    });
  }
};

module.exports = {
  getBroadcasts,
  getBroadcastById,
  createBroadcast,
  updateBroadcast,
  sendBroadcast,
  cancelBroadcast,
  deleteBroadcast,
  getBroadcastStats
};
