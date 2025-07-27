/**
 * Email Fallback Service
 * Provides alternative email delivery methods when the primary method fails
 */

const nodemailer = require('nodemailer');
const config = require('../config');
const emailLogger = require('./emailLogger');

class EmailFallbackService {
  constructor() {
    // Initialize fallback transporter (with different settings)
    this.fallbackTransporter = this.createFallbackTransporter();
    
    // Keep track of fallback usage
    this.fallbackUsed = 0;
    this.fallbackSuccess = 0;
  }

  /**
   * Create a fallback transporter with different settings
   * @returns {Object} Nodemailer transporter
   */
  createFallbackTransporter() {
    // By default, use a backup SMTP with same credentials but different settings
    // This could be customized to use a completely different provider
    // Based on our email testing, use a more reliable fallback configuration
    return nodemailer.createTransport({
      host: config.email.host,
      port: 465, // Always use 465 for fallback (confirmed working)
      secure: true, // Always use secure:true for port 465
      auth: {
        user: config.email.user,
        pass: config.email.pass
      },
      connectionTimeout: 15000,    // Longer timeout
      greetingTimeout: 10000,      // Longer timeout
      socketTimeout: 15000,        // Longer timeout
      tls: {
        rejectUnauthorized: false  // Less strict TLS for fallback
      }
    });
  }

  /**
   * Send email using fallback transport
   * @param {Object} mailOptions - Nodemailer mail options
   * @param {Object} metadata - Additional email metadata
   * @returns {Promise<Object>} Result of sending
   */
  async sendMail(mailOptions, metadata = {}) {
    this.fallbackUsed++;
    
    try {
      const result = await this.fallbackTransporter.sendMail(mailOptions);
      this.fallbackSuccess++;
      
      // Log successful fallback delivery
      await emailLogger.logEmailAttempt({
        ...metadata,
        to: mailOptions.to,
        subject: mailOptions.subject,
        success: true,
        messageId: result.messageId,
        usingFallback: true
      });
      
      return {
        success: true,
        messageId: result.messageId,
        usingFallback: true
      };
    } catch (error) {
      // Log fallback failure
      await emailLogger.logEmailAttempt({
        ...metadata,
        to: mailOptions.to,
        subject: mailOptions.subject,
        success: false,
        error: error.message,
        usingFallback: true
      });
      
      return {
        success: false,
        error: error.message,
        usingFallback: true
      };
    }
  }

  /**
   * Get fallback service statistics
   * @returns {Object} Stats about fallback usage
   */
  getStats() {
    return {
      fallbackAttempts: this.fallbackUsed,
      fallbackSuccess: this.fallbackSuccess,
      fallbackRate: this.fallbackUsed ? ((this.fallbackSuccess / this.fallbackUsed) * 100).toFixed(2) + '%' : '0%'
    };
  }

  /**
   * Test the fallback connection
   * @returns {Promise<boolean>} Whether connection succeeded
   */
  async testConnection() {
    try {
      await this.fallbackTransporter.verify();
      console.log('Fallback email service is ready');
      return true;
    } catch (error) {
      console.error('Fallback email service error:', error);
      return false;
    }
  }
}

module.exports = new EmailFallbackService(); 