require('dotenv').config();

module.exports = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // Database
  mongodbUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/palank-top-db',
  
  // JWT
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
  jwtExpire: process.env.JWT_EXPIRE || '7d',
  
  // Razorpay
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_your_key_id',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'your_key_secret'
  },
  
  // Email
  email: {
    from: process.env.EMAIL_FROM || 'noreply@neelkanthpharmacy.com',
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  },
  
  // Admin
  admin: {
    email: process.env.ADMIN_EMAIL || 'admin@neelkanthpharmacy.com',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    notificationEmail: process.env.ADMIN_NOTIFICATION_EMAIL || 'naman13399@gmail.com'
  },
  
  // Frontend
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  
  // Security
  bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW) || 15,
  rateLimitMaxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100
}; 