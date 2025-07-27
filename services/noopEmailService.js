/**
 * NoOp Email Service
 * A dummy email service that doesn't actually send emails but simulates success
 * Useful for development/testing environments where SMTP isn't available
 */

const emailLogger = require('./emailLogger');

class NoopEmailService {
  constructor() {
    this.active = false;
    console.log('NoOp Email Service initialized (email sending will be simulated)');
  }

  /**
   * Activate the NoOp service as a fallback
   */
  activate() {
    this.active = true;
    console.log('NoOp Email Service activated as fallback');
  }

  /**
   * Simulate sending mail
   * @param {Object} mailOptions - Mail options
   * @param {Object} metadata - Additional metadata
   * @returns {Promise<Object>} Simulated result
   */
  async sendMail(mailOptions, metadata = {}) {
    // Log the simulated email sending
    const messageId = `noop-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@simulated.local`;
    
    console.log(`[NoOp Email] SIMULATED sending email to: ${mailOptions.to}`);
    console.log(`[NoOp Email] Subject: ${mailOptions.subject}`);
    
    // Log the simulated delivery
    await emailLogger.logEmailAttempt({
      ...metadata,
      to: mailOptions.to,
      subject: mailOptions.subject,
      success: true,
      messageId,
      simulated: true
    });
    
    return {
      success: true,
      messageId,
      simulated: true
    };
  }

  /**
   * All email template methods to simulate the real email service
   */
  getCustomerOrderTemplate(order) {
    return `[NoOp Email] Simulated order confirmation template for ${order.orderId}`;
  }

  getAdminOrderTemplate(order) {
    return `[NoOp Email] Simulated admin notification template for ${order.orderId}`;
  }

  getStatusUpdateTemplate(order, previousStatus) {
    return `[NoOp Email] Simulated status update template for ${order.orderId} from ${previousStatus} to ${order.status}`;
  }
}

module.exports = new NoopEmailService(); 