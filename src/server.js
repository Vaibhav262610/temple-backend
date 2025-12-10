// Main Server File - Supabase Backend
require('dotenv').config({ path: require('path').join(__dirname, '../.env') }); // Load .env from temple-backend directory
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Import routes
const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const communityRoutes = require('./routes/communities');
const communityFeaturesRoutes = require('./routes/communityFeatures');
const applicationRoutes = require('./routes/applications');
const frontendCompatibleRoutes = require('./routes/applications-frontend-compatible');
const reportsRoutes = require('./routes/reports');
const debugRoutes = require('./routes/debug');
const eventsWithUploadRoutes = require('./routes/eventsWithUpload');
const publicEventsRoutes = require('./routes/publicEvents');
const taskRoutes = require('./routes/tasks');
const volunteerRoutes = require('./routes/volunteers-simple');
const broadcastRoutes = require('./routes/broadcasts');
const templateRoutes = require('./routes/templates');
const pujaRoutes = require('./routes/pujas');
const financeRoutes = require('./routes/finance');
const budgetRequestRoutes = require('./routes/budgetRequests');
const budgetsRoutes = require('./routes/budgets');
const communicationRoutes = require('./routes/communications');
const donationsRoutes = require('./routes/donations');
const expensesRoutes = require('./routes/expenses');
const cmsRoutes = require('./routes/cms');
const galleryRoutes = require('./routes/gallery');
const brochuresRoutes = require('./routes/brochures');
const priestsRoutes = require('./routes/priests');
const priestBookingsRoutes = require('./routes/priestBookings');

// Import auth middleware
const { requireAuth } = require('./middleware/authMiddleware');

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

// Trust proxy for Railway/Vercel deployments (required for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());
app.use(morgan('combined'));

// CORS configuration - MUST be before rate limiting to handle preflight requests
const allowedOrigins = [
  // Production
  'https://temple-management-cms.vercel.app',
  'https://temple-management-woad.vercel.app',
  // Development (always allow for local testing against production API)
  'http://localhost:8080',
  'http://localhost:8081',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:4173',
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, Postman in dev)
    if (!origin) {
      return callback(null, true);
    }

    // Allow localhost origins (for development)
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      return callback(null, true);
    }

    // Check against allowed origins
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // Allow Vercel preview deployments (your app's preview URLs)
    if (origin.includes('vercel.app') && origin.includes('temple-management')) {
      return callback(null, true);
    }

    console.log('❌ CORS blocked origin:', origin);
    callback(new Error('Not allowed by CORS'));
  }, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'X-Reques                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         t-Id'],
  maxAge: 86400 // 24 hours
}));

// Handle preflight requests explicitly
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting - prevent abuse (after CORS)
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 500 : 1000, // Higher limits
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
});

// Stricter rate limit for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 20 : 100, // Higher for dev
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS', // Skip preflight requests
});

// Apply rate limiting
app.use('/api', generalLimiter);
app.use('/api/users/login', authLimiter);
app.use('/api/users/register', authLimiter);

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

// =============================================
// PUBLIC ROUTES (No authentication required)
// =============================================
app.use('/api/users', userRoutes); // Has its own auth for protected routes
app.use('/api/public/events', publicEventsRoutes); // Public events for website

// Public CMS endpoints (for main website to fetch banners, pujas, etc.)
// These routes do NOT require authentication
app.use('/api/cms/public', cmsRoutes); // All /public/* routes in cmsRoutes
app.post('/api/cms/contact', cmsRoutes); // Contact form submission

// =============================================
// PROTECTED ROUTES (Authentication required)
// =============================================
app.use('/api/admin', requireAuth, adminRoutes);
app.use('/api/communities', requireAuth, communityRoutes); // Basic community CRUD
app.use('/api/communities', requireAuth, communityFeaturesRoutes); // Members, Applications, Tasks
app.use('/api', requireAuth, applicationRoutes); // Standalone application routes
app.use('/api', requireAuth, frontendCompatibleRoutes); // Frontend-compatible routes
app.use('/api', requireAuth, reportsRoutes); // Reports and calendar routes
app.use('/api/events', requireAuth, eventsWithUploadRoutes); // Events with image upload
app.use('/api', requireAuth, taskRoutes); // Tasks management routes
app.use('/api/volunteers', requireAuth, volunteerRoutes);
app.use('/api/broadcasts', requireAuth, broadcastRoutes);
app.use('/api/templates', requireAuth, templateRoutes);
app.use('/api/pujas', requireAuth, pujaRoutes);
app.use('/api/finance', requireAuth, financeRoutes);
app.use('/api/budget-requests', requireAuth, budgetRequestRoutes);
app.use('/api/budgets', requireAuth, budgetsRoutes);
app.use('/api/communications', requireAuth, communicationRoutes);
app.use('/api/donations', requireAuth, donationsRoutes);
app.use('/api/expenses', requireAuth, expensesRoutes);
app.use('/api/cms', requireAuth, cmsRoutes); // Protected CMS routes (admin panel)
app.use('/api/cms/gallery', requireAuth, galleryRoutes);
app.use('/api/brochures', requireAuth, brochuresRoutes);
app.use('/api/priests', requireAuth, priestsRoutes);
app.use('/api/priest-bookings', requireAuth, priestBookingsRoutes);

// Debug routes - only in development
if (process.env.NODE_ENV !== 'production') {
  app.use('/api', debugRoutes);
}

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