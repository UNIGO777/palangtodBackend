const jwt = require('jsonwebtoken');
const config = require('../config');
const Admin = require('../models/Admin');

// Verify JWT token
const verifyToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    req.admin = decoded;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired.'
      });
    }
    
    console.error('Auth middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during authentication.'
    });
  }
};

// Check if admin exists and is active
const verifyAdmin = async (req, res, next) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin not found.'
      });
    }

    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated.'
      });
    }

    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts.'
      });
    }

    req.admin.details = admin;
    next();
  } catch (error) {
    console.error('Admin verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Error verifying admin status.'
    });
  }
};

// Check for super admin role
const verifySuperAdmin = (req, res, next) => {
  if (req.admin.details.role !== 'super-admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Super admin privileges required.'
    });
  }
  next();
};

// Generate JWT token
const generateToken = (adminId, email, role) => {
  return jwt.sign(
    {
      id: adminId,
      email: email,
      role: role
    },
    config.jwtSecret,
    {
      expiresIn: config.jwtExpire
    }
  );
};

// Refresh token validation
const verifyRefreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.'
      });
    }

    const decoded = jwt.verify(refreshToken, config.jwtSecret + '_refresh');
    const admin = await Admin.findById(decoded.id).select('-password');
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token.'
      });
    }

    req.admin = {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      details: admin
    };
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid refresh token.'
    });
  }
};

// Generate refresh token
const generateRefreshToken = (adminId) => {
  return jwt.sign(
    { id: adminId },
    config.jwtSecret + '_refresh',
    { expiresIn: '30d' }
  );
};

module.exports = {
  verifyToken,
  verifyAdmin,
  verifySuperAdmin,
  verifyRefreshToken,
  generateToken,
  generateRefreshToken
}; 