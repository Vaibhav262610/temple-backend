// Main Server File - Supabase Backend
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') }); // Load .env from root directory
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

// Import routes
const userRoutes = require('./routes/users');
const communityRoutes = require('./routes/communities');
const communityFeaturesRoutes = require('./routes/communityFeatures');
const applicationRoutes = require('./routes/applications');
const frontendCompatibleRoutes = require('./routes/applications-frontend-compatible');
const reportsRoutes = require('./routes/reports');
const debugRoutes = require('./routes/debug');
// const donationRoutes = require('./routes/donations'); // Temporarily disabled - MongoDB not connected
// const expenseRoutes = require('./routes/expenses'); // Temporarily disabled - MongoDB not connected
const eventRoutes = require('./routes/events');
const taskRoutes = require('./routes/tasks');
const volunteerRoutes = require('./routes/volunteers-simple');
const broadcastRoutes = require('./routes/broadcasts');
const templateRoutes = require('./routes/templates');
const pujaRoutes = require('./routes/pujas');
const financeRoutes = require('./routes/finance');
const budgetRequestRoutes = require('./routes/budgetRequests');
const communicationRoutes = require('./routes/communications');
const donationsRoutes = require('./routes/donations');
const expensesRoutes = require('./routes/expenses');

// Import Supabase-backed models
require('./models/User');
require('./models/Community');
require('./models/CommunityMember');
require('./models/CommunityApplication');
require('./models/CommunityTask');
require('./models/CommunityEvent');
require('./models/CommunityPost');
require('./models/CommunityAnnouncement');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));
app.use(cors({
  origin: [
    'http://localhost:8080',
    'http://localhost:8081',
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:4173',
    'https://temple-management-woad.vercel.app',
    'https://temple-management-woad.vercel.app/'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    database: 'Supabase',
    version: '1.0.0',
    models: {
      community: 'Community',
      members: 'CommunityMember',
      applications: 'CommunityApplication',
      tasks: 'CommunityTask',
      events: 'CommunityEvent'
    }
  });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/communities', communityRoutes); // Basic community CRUD
app.use('/api/communities', communityFeaturesRoutes); // Members, Applications, Tasks
app.use('/api', applicationRoutes); // Standalone application routes
app.use('/api', frontendCompatibleRoutes); // Frontend-compatible routes
app.use('/api', reportsRoutes); // Reports and calendar routes
app.use('/api', debugRoutes); // Debug routes for troubleshooting
app.use('/api', eventRoutes); // Events management routes
app.use('/api', taskRoutes); // Tasks management routes
// app.use('/api/donations', donationRoutes); // Temporarily disabled - MongoDB not connected
// app.use('/api/expenses', expenseRoutes); // Temporarily disabled - MongoDB not connected
app.use('/api/volunteers', volunteerRoutes);
app.use('/api/broadcasts', broadcastRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/pujas', pujaRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/budget-requests', budgetRequestRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/donations', donationsRoutes);
app.use('/api/expenses', expensesRoutes);

// Temporary schema check endpoint (remove in production)
// app.use('/api/debug', require('../check-schema-endpoint'));

// Test route for community features
app.get('/api/test/community-routes', (req, res) => {
  res.json({
    success: true,
    message: 'Community features routes are active',
    availableEndpoints: [
      'GET /api/communities/:id/members',
      'POST /api/communities/:id/members',
      'PUT /api/communities/:id/members/:memberId',
      'DELETE /api/communities/:id/members/:memberId',
      'POST /api/communities/:id/members/email',
      'GET /api/communities/:id/leads',
      'GET /api/communities/:id/applications',
      'POST /api/communities/:id/applications',
      'PUT /api/communities/:id/applications/:applicationId/approve',
      'PUT /api/communities/:id/applications/:applicationId/reject',
      'GET /api/communities/:id/tasks',
      'POST /api/communities/:id/tasks',
      'PUT /api/communities/:id/tasks/:taskId',
      'DELETE /api/communities/:id/tasks/:taskId'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ GLOBAL ERROR HANDLER:', err);
  console.error('❌ Error Code:', err.code);
  console.error('❌ Error Message:', err.message);
  console.error('❌ Error Details:', err.details);
  console.error('❌ Error Hint:', err.hint);

  // Supabase database errors - show detailed information
  if (err.code && err.code.startsWith('23')) {
    return res.status(400).json({
      success: false,
      message: `Database Error (${err.code})`,
      error: err.message,
      details: err.details,
      hint: err.hint,
      code: err.code,
      supabase_error: err
    });
  }

  // Supabase unique constraint error
  if (err.code === '23505') {
    return res.status(400).json({
      success: false,
      message: 'Duplicate entry',
      error: err.message,
      details: err.details,
      hint: err.hint
    });
  }

  // Supabase foreign key error
  if (err.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Invalid reference',
      error: err.message
    });
  }

  // JWT error
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }

  // JWT expired error
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }

  // Default error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err.message
    })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    method: req.method
  });
});

// Start server
const server = app.listen(PORT, async () => {
  console.log('\n🎉 ========================================');
  console.log(`🚀 Temple Steward Backend Server Started!`);
  console.log('==========================================');
  console.log(`📊 Database: Supabase (Hybrid Mode)`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`✅ Health Check: http://localhost:${PORT}/health`);
  console.log(`🧪 Test Routes: http://localhost:${PORT}/api/test/community-routes`);
  console.log('\n📂 Active Models:');
  console.log('   ✓ User (Hybrid: Supabase + Memory)');
  console.log('   ✓ Community (Hybrid: Supabase + Memory)');
  console.log('   ✓ CommunityMember (Supabase)');
  console.log('   ✓ CommunityApplication (Supabase)');
  console.log('   ✓ CommunityTask (Supabase)');
  console.log('   ✓ CommunityEvent (Supabase)');
  console.log('   ✓ CommunityPost (Supabase)');
  console.log('   ✓ CommunityAnnouncement (Supabase)');
  console.log('==========================================\n');

  // Initialize default communities
  try {
    const HybridCommunityService = require('./services/hybridCommunityService');
    await HybridCommunityService.initializeDefaultCommunities();
  } catch (error) {
    console.log('⚠️ Failed to initialize communities:', error.message);
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️  SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('❌ UNHANDLED REJECTION! Shutting down...');
  console.error(err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;