const fs = require('fs').promises;
const path = require('path');

/**
 * Email Logger Service
 * Logs email delivery attempts and results for auditing and troubleshooting
 */
class EmailLogger {
  constructor() {
    this.logDir = path.join(__dirname, '../logs');
    this.logFile = path.join(this.logDir, 'email-logs.json');
    this.memoryLogs = [];
    this.maxMemoryLogs = 100;
    this.initialized = false;
  }

  /**
   * Initialize the logger
   */
  async init() {
    try {
      // Ensure log directory exists
      try {
        await fs.mkdir(this.logDir, { recursive: true });
      } catch (err) {
        if (err.code !== 'EEXIST') {
          console.error('Failed to create log directory:', err);
        }
      }

      // Check if log file exists, if not create it
      try {
        await fs.access(this.logFile);
      } catch (err) {
        // File doesn't exist, create it with empty array
        await fs.writeFile(this.logFile, JSON.stringify([], null, 2));
      }

      this.initialized = true;
      console.log('Email logger initialized');
    } catch (err) {
      console.error('Failed to initialize email logger:', err);
    }
  }

  /**
   * Log an email attempt
   * @param {Object} emailData - Email data and metadata
   */
  async logEmailAttempt(emailData) {
    const logEntry = {
      id: `email_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: emailData.type || 'unknown',
      to: emailData.to,
      subject: emailData.subject,
      orderId: emailData.orderId,
      status: emailData.success ? 'success' : 'failed',
      messageId: emailData.messageId || null,
      error: emailData.error || null,
      retryCount: emailData.retryCount || 0
    };

    // Add to memory logs
    this.memoryLogs.unshift(logEntry);
    
    // Keep memory logs at reasonable size
    if (this.memoryLogs.length > this.maxMemoryLogs) {
      this.memoryLogs = this.memoryLogs.slice(0, this.maxMemoryLogs);
    }

    // Only write to file if initialized
    if (this.initialized) {
      try {
        // Read current logs
        const logsContent = await fs.readFile(this.logFile, 'utf8');
        let logs = [];
        
        try {
          logs = JSON.parse(logsContent);
        } catch (err) {
          console.error('Error parsing logs file, starting fresh:', err);
        }

        // Add new log entry
        logs.unshift(logEntry);
        
        // Keep file size reasonable (max 500 entries)
        if (logs.length > 500) {
          logs = logs.slice(0, 500);
        }

        // Write back to file
        await fs.writeFile(this.logFile, JSON.stringify(logs, null, 2));
      } catch (err) {
        console.error('Failed to write to email log file:', err);
      }
    }

    return logEntry;
  }

  /**
   * Get recent email logs
   * @param {number} limit - Number of logs to retrieve
   * @returns {Array} Recent email logs
   */
  getRecentLogs(limit = 50) {
    return this.memoryLogs.slice(0, limit);
  }

  /**
   * Get email delivery statistics
   * @returns {Object} Email delivery stats
   */
  getStats() {
    const total = this.memoryLogs.length;
    const success = this.memoryLogs.filter(log => log.status === 'success').length;
    const failed = total - success;
    
    return {
      total,
      success,
      failed,
      successRate: total ? ((success / total) * 100).toFixed(2) + '%' : '0%',
      lastAttempt: this.memoryLogs[0]?.timestamp || null
    };
  }
}

module.exports = new EmailLogger(); 