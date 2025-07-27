const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const { 
  verifyToken, 
  verifyAdmin, 
  verifySuperAdmin,
  verifyRefreshToken,
  generateToken, 
  generateRefreshToken 
} = require('../middleware/auth');
const { validateAdminLogin, sanitizeInput } = require('../middleware/validation');

// Admin login
router.post('/login', sanitizeInput, validateAdminLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find admin
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Check if account is locked
    if (admin.isLocked) {
      return res.status(423).json({
        success: false,
        message: 'Account is temporarily locked due to multiple failed login attempts'
      });
    }

    // Verify password
    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      // Increment login attempts
      await admin.incLoginAttempts();
      
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Reset login attempts on successful login
    if (admin.loginAttempts > 0) {
      await admin.resetLoginAttempts();
    }

    // Update last login
    await admin.updateLastLogin();

    // Generate tokens
    const token = generateToken(admin._id, admin.email, admin.role);
    const refreshToken = generateRefreshToken(admin._id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        admin: {
          id: admin._id,
          email: admin.email,
          name: admin.name,
          role: admin.role,
          lastLogin: admin.lastLogin
        },
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
});

// Refresh token
router.post('/refresh-token', verifyRefreshToken, async (req, res) => {
  try {
    const admin = req.admin.details;
    
    const newToken = generateToken(admin._id, admin.email, admin.role);
    const newRefreshToken = generateRefreshToken(admin._id);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken: newRefreshToken
      }
    });

  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

// Get current admin profile
router.get('/profile', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const admin = req.admin.details;

    res.json({
      success: true,
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
        createdAt: admin.createdAt
      }
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
});

// Update admin profile
router.patch('/profile', verifyToken, verifyAdmin, sanitizeInput, async (req, res) => {
  try {
    const { name, email } = req.body;
    const admin = req.admin.details;

    // Check if email is already taken by another admin
    if (email && email !== admin.email) {
      const existingAdmin = await Admin.findOne({ email, _id: { $ne: admin._id } });
      if (existingAdmin) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Update admin
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const updatedAdmin = await Admin.findByIdAndUpdate(
      admin._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedAdmin._id,
        email: updatedAdmin.email,
        name: updatedAdmin.name,
        role: updatedAdmin.role
      }
    });

  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
});

// Change password
router.patch('/change-password', verifyToken, verifyAdmin, sanitizeInput, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin.id);

    // Verify current password
    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    admin.password = newPassword;
    await admin.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
});

// Super Admin Routes

// Get all admins (super admin only)
router.get('/users', verifyToken, verifyAdmin, verifySuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find()
      .select('-password')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: admins
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get admins'
    });
  }
});

// Create new admin (super admin only)
router.post('/users', verifyToken, verifyAdmin, verifySuperAdmin, sanitizeInput, async (req, res) => {
  try {
    const { email, password, name, role = 'admin' } = req.body;

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'Admin with this email already exists'
      });
    }

    // Create new admin
    const admin = new Admin({
      email,
      password,
      name,
      role
    });

    await admin.save();

    res.status(201).json({
      success: true,
      message: 'Admin created successfully',
      data: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create admin'
    });
  }
});

// Update admin (super admin only)
router.patch('/users/:adminId', verifyToken, verifyAdmin, verifySuperAdmin, sanitizeInput, async (req, res) => {
  try {
    const { adminId } = req.params;
    const { name, email, role, isActive } = req.body;

    // Don't allow super admin to deactivate themselves
    if (adminId === req.admin.id && isActive === false) {
      return res.status(400).json({
        success: false,
        message: 'Cannot deactivate your own account'
      });
    }

    const admin = await Admin.findByIdAndUpdate(
      adminId,
      { name, email, role, isActive },
      { new: true, runValidators: true }
    ).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin updated successfully',
      data: admin
    });

  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update admin'
    });
  }
});

// Delete admin (super admin only)
router.delete('/users/:adminId', verifyToken, verifyAdmin, verifySuperAdmin, async (req, res) => {
  try {
    const { adminId } = req.params;

    // Don't allow super admin to delete themselves
    if (adminId === req.admin.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const admin = await Admin.findByIdAndDelete(adminId);
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin deleted successfully'
    });

  } catch (error) {
    console.error('Delete admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete admin'
    });
  }
});

// Admin logout (optional - mainly for logging purposes)
router.post('/logout', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // In a real implementation, you might want to blacklist the token
    // For now, we'll just log the logout
    console.log(`Admin ${req.admin.email} logged out at ${new Date()}`);

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

module.exports = router; 