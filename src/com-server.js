require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

const app = express();

// Middleware
app.use(helmet());

const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173', 'http://localhost:3000'];
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(compression());
app.use(morgan('dev'));

// Auth middleware attaches req.user with roles
const authMiddleware = require('./middleware/authMiddleware');
app.use(authMiddleware);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Community Module API is running',
    timestamp: new Date().toISOString(),
    module: 'Communities'
  });
});

// Test database connection
app.get('/test-db', async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    
    const { data, error } = await supabase
      .from('communities')
      .select('count')
      .limit(1);

    if (error) throw error;

    res.json({
      success: true,
      message: 'Database connection successful',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message
    });
  }
});

// Import and use community routes
const communityRoutes = require('./routes/communityRoutes');
app.use('/api/communities', communityRoutes);

// Auth routes
const authRoutes = require('./routes/authRoutes');
app.use('/api/auth', authRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.code) {
    switch (err.code) {
      case '23505':
        return res.status(409).json({
          success: false,
          message: 'Duplicate entry. Resource already exists.',
          error: err.detail || err.message
        });
      case '23503':
        return res.status(400).json({
          success: false,
          message: 'Referenced resource does not exist.',
          error: err.detail || err.message
        });
      case 'PGRST116':
        return res.status(404).json({
          success: false,
          message: 'Resource not found.',
          error: err.message
        });
    }
  }

  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║   🕉️  Temple Steward - Community Module API       ║
  ╠════════════════════════════════════════════════════╣
  ║   📍 Port: ${PORT}                                   ║
  ║   🌍 Environment: ${process.env.NODE_ENV || 'development'}               ║
  ║   🕐 Started: ${new Date().toLocaleString()}        ║
  ╚════════════════════════════════════════════════════╝
  `);
});

process.on('SIGTERM', () => {
  console.log('\nSIGTERM received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT received, closing server gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

module.exports = app;
