require('dotenv').config();
require('express-async-errors');

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { cacheMiddleware, performanceMonitor } = require('./middleware/performance');

const config = require('./config');
const Admin = require('./models/Admin');
const Product = require('./models/Product');
const emailService = require('./services/emailService');
const cronService = require('./services/cronService');
const taskQueue = require('./services/taskQueueService');

// Import routes
const orderRoutes = require('./routes/orders');
const adminRoutes = require('./routes/admin');
const productRoutes = require('./routes/products');
const statusRoutes = require('./routes/status');

const app = express();

// Trust proxy (important for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Compression middleware with optimized settings
app.use(compression({
  level: 6, // Default is 6, higher level = more compression but slower
  threshold: 1024, // Only compress responses larger than 1KB
  filter: (req, res) => {
    // Don't compress responses with this header
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Use compression filter function
    return compression.filter(req, res);
  }
}));

// Logging middleware
if (config.nodeEnv === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return callback(null, true);
    
    // In development, allow localhost
    if (config.nodeEnv === 'development') {
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        return callback(null, true);
      }
    }
    
    // Allow frontend URL
    if (origin === config.frontendUrl) {
      return callback(null, true);
    }
    
    // Reject other origins
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimitWindow * 60 * 1000, // Convert minutes to milliseconds
  max: config.rateLimitMaxRequests,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all requests
app.use(limiter);

// Add performance monitoring
app.use(performanceMonitor);

// Stricter rate limiting for auth routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.'
  },
  skipSuccessfulRequests: true,
});

// Body parsing middleware - optimized size
app.use(express.json({ limit: '1mb' })); // Reduced from 10mb for better performance
app.use(express.urlencoded({ extended: false, limit: '1mb' })); // Using extended:false for better performance

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    taskQueue: taskQueue.getStatus()
  });
});

// API routes
app.use('/api/orders', orderRoutes);
app.use('/api/admin', authLimiter, adminRoutes);
app.use('/api/products', productRoutes);
app.use('/api/status', statusRoutes);

// Apply caching to public GET endpoints
app.get('/api/products/default', cacheMiddleware(60)); // Cache for 1 minute
app.get('/health', cacheMiddleware(300)); // Cache for 5 minutes

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Palank Top Backend API',
    version: '1.0.0',
    docs: '/api/docs'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Mongoose validation error
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  // Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`
    });
  }
  
  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expired'
    });
  }
  
  // CORS errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Access denied by CORS policy'
    });
  }
  
  // Default error
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'Internal server error',
    ...(config.nodeEnv === 'development' && { stack: error.stack })
  });
});

// Database connection
const connectDB = async () => {
  try {
    // Set MongoDB connection options for better performance
    const mongoOptions = {
      maxPoolSize: 50, // Increase connection pool size (default is 5)
      minPoolSize: 10, // Maintain minimum connections in the pool
      socketTimeoutMS: 30000, // Socket timeout
      connectTimeoutMS: 30000, // Connection timeout
      serverSelectionTimeoutMS: 5000, // Server selection timeout
      heartbeatFrequencyMS: 10000, // Heartbeat frequency
      maxIdleTimeMS: 45000, // Maximum idle time for connections
    };
    
    const conn = await mongoose.connect(config.mongodbUri, mongoOptions);
    mongoose.set('debug', config.nodeEnv === 'development');
    console.log(`MongoDB Connected: ${conn.connection.host} (Pool size: ${mongoOptions.maxPoolSize})`);
    
    // Create default admin if it doesn't exist
    await Admin.createDefaultAdmin();
    console.log('Default admin ensured');
    
    // Create default product if it doesn't exist
    const defaultProduct = await Product.getDefaultProduct();
    console.log('Default product ensured');
    
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

// Initialize services
const initializeServices = async () => {
  try {
    // Initialize email service
    await emailService.testConnection();
    console.log('Email service initialized successfully');
    
    // Initialize cron jobs
    cronService.init();
    console.log('Cron service initialized');
  } catch (error) {
    console.error('Service initialization failed:', error);
    console.log('Server will continue running with limited functionality');
    // Continue execution even if services fail
  }
};

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\nReceived ${signal}. Shutting down gracefully...`);
  
  // Stop cron jobs
  cronService.stopAll();
  console.log('Cron jobs stopped');
  
  // Log task queue status before shutdown
  const queueStatus = taskQueue.getStatus();
  console.log(`Task queue status: ${queueStatus.queueLength} pending, ${queueStatus.activeTasks} active tasks`);
  
  server.close(() => {
    console.log('HTTP server closed');
    
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close server after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Start server
const startServer = async () => {
  try {
    await connectDB();
    await initializeServices();
    
    const server = app.listen(config.port, () => {
      console.log(`
🚀 Server is running on port ${config.port}
📝 Environment: ${config.nodeEnv}
🗄️  Database: Connected
📧 Email Service: ${emailService ? 'Ready' : 'Not configured'}
🔒 CORS Origin: ${config.frontendUrl}
⏰ Started at: ${new Date().toISOString()}
      `);
    });
    
    // Store server reference for graceful shutdown
    global.server = server;
    
    return server;
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
if (require.main === module) {
  startServer();
}

module.exports = app; 