const express = require('express');
const router = express.Router();
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const emailLogger = require('../services/emailLogger');
const emailFallback = require('../services/emailFallbackService');
const taskQueue = require('../services/taskQueueService');

/**
 * @route   GET /api/status/email-mode
 * @desc    Check if email is being simulated (development mode)
 * @access  Public
 */
router.get('/email-mode', (req, res) => {
  const noopEmailService = require('../services/noopEmailService');
  const config = require('../config');
  
  res.json({
    success: true,
    mode: noopEmailService.active ? 'simulated' : 'real',
    environment: config.nodeEnv,
    emailHost: config.email.host ? config.email.host : '(not configured)'
  });
});

/**
 * @route   GET /api/status/check
 * @desc    Basic system health check (public)
 * @access  Public
 */
router.get('/check', async (req, res) => {
  try {
    const queueStatus = taskQueue.getStatus();
    
    res.json({
      success: true,
      message: 'System operational',
      timestamp: new Date().toISOString(),
      email: {
        deliveryStatus: emailLogger.getStats().total > 0 
          ? (emailLogger.getStats().failed === 0 ? 'operational' : 'issues detected')
          : 'no data',
        tasksQueued: queueStatus.queueLength,
        tasksProcessing: queueStatus.activeTasks
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'System status check failed'
    });
  }
});

/**
 * @route   GET /api/status/email
 * @desc    Get email delivery status and metrics
 * @access  Admin only
 */
router.get('/email', verifyToken, verifyAdmin, async (req, res) => {
  try {
    // Get recent logs and statistics
    const recentLogs = emailLogger.getRecentLogs(10);
    const emailStats = emailLogger.getStats();
    const fallbackStats = emailFallback.getStats();
    const queueStats = taskQueue.getStatus();
    
    res.json({
      success: true,
      data: {
        emailStats,
        fallbackStats,
        queueStats,
        recentLogs
      }
    });
  } catch (error) {
    console.error('Error fetching email status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email status'
    });
  }
});

/**
 * @route   GET /api/status/system
 * @desc    Get system health metrics
 * @access  Admin only
 */
router.get('/system', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const memoryUsage = process.memoryUsage();
    const uptime = process.uptime();
    
    res.json({
      success: true,
      data: {
        uptime: {
          seconds: uptime,
          formatted: formatUptime(uptime)
        },
        memory: {
          rss: formatBytes(memoryUsage.rss),
          heapTotal: formatBytes(memoryUsage.heapTotal),
          heapUsed: formatBytes(memoryUsage.heapUsed),
          external: formatBytes(memoryUsage.external)
        },
        taskQueue: taskQueue.getStatus()
      }
    });
  } catch (error) {
    console.error('Error fetching system status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch system status'
    });
  }
});

/**
 * Format bytes to human readable format
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format uptime to human readable format
 */
function formatUptime(seconds) {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return `${days}d ${hours}h ${minutes}m ${secs}s`;
}

module.exports = router; 