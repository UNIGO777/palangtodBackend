const cron = require('node-cron');
const Order = require('../models/Order');
const paymentService = require('./paymentService');
const emailService = require('./emailService');
const config = require('../config');

class CronService {
  constructor() {
    this.jobs = [];
  }

  // Initialize cron jobs
  init() {
    this.setupAbandonedPaymentChecker();
    console.log('Cron service initialized');
  }

  // Check for abandoned payments
  setupAbandonedPaymentChecker() {
    // Run every minute to check for specific time intervals
    const job = cron.schedule('* * * * *', async () => {
      try {
        console.log('Running abandoned payment check...');
        
        // Check orders created within specific time windows
        const now = Date.now();
        
        // First check: 3 minutes after creation
        const threeMinCheckTime = new Date(now - 3 * 60 * 1000);
        const threeMinWindow = new Date(now - (3 * 60 * 1000 + 30 * 1000)); // 3 minutes ± 30 seconds
        
        // Second check: 7 minutes after creation (3 + 4)
        const sevenMinCheckTime = new Date(now - 7 * 60 * 1000);
        const sevenMinWindow = new Date(now - (7 * 60 * 1000 + 30 * 1000)); // 7 minutes ± 30 seconds
        
        // Third check: 12 minutes after creation (3 + 4 + 5)
        const twelveMinCheckTime = new Date(now - 12 * 60 * 1000);
        const twelveMinWindow = new Date(now - (12 * 60 * 1000 + 30 * 1000)); // 12 minutes ± 30 seconds
        
        // Query for orders that need to be checked (within a time window)
        const pendingOrders = await Order.find({
          'payment.method': 'razorpay',
          'payment.status': 'pending',
          $or: [
            // First check
            {
              orderDate: { $lte: threeMinCheckTime, $gte: threeMinWindow },
              'payment.checkCount': { $lt: 1 }
            },
            // Second check
            {
              orderDate: { $lte: sevenMinCheckTime, $gte: sevenMinWindow },
              'payment.checkCount': { $eq: 1 }
            },
            // Third check
            {
              orderDate: { $lte: twelveMinCheckTime, $gte: twelveMinWindow },
              'payment.checkCount': { $eq: 2 }
            }
          ]
        });

        console.log(`Found ${pendingOrders.length} pending orders to check`);

        for (const order of pendingOrders) {
          try {
            // Skip if no razorpay order ID
            if (!order.payment.razorpayOrderId) continue;
            
            // Increment check count
            if (!order.payment.checkCount) {
              order.payment.checkCount = 1;
            } else {
              order.payment.checkCount += 1;
            }

            console.log(`Checking order ${order.orderId} (attempt ${order.payment.checkCount})`);

            // Check payment status with Razorpay
            const paymentDetails = await paymentService.checkOrderPaymentStatus(order.payment.razorpayOrderId);
            
            if (paymentDetails.success && paymentDetails.status === 'paid') {
              // Use the shared verification function to update the order
              const updateResult = await paymentService.verifyAndUpdateOrder(order, {
                razorpay_payment_id: paymentDetails.paymentId
              });
              
              if (updateResult.success) {
                // Send all confirmation emails sequentially
                if (!order.emailSent.customer) {
                  console.log(`🔄 Cron job - sending emails for abandoned payment order: ${order.orderId}`);
                  
                  try {
                    // Send emails one by one
                    console.log('📧 1. Sending customer confirmation...');
                    await emailService.sendCustomerOrderConfirmation(order);
                    
                    console.log('📧 2. Sending admin notification...');
                    await emailService.sendAdminOrderNotification(order);
                    
                    console.log('📧 3. Sending personal notification...');
                    await emailService.sendNewOrderNotification(order, config.admin.notificationEmail);
                    
                    // Update email sent flag after all emails are sent
                    order.emailSent.customer = true;
                    order.emailSent.admin = true;
                    await order.save();
                    
                    console.log(`✅ All emails sent successfully for order: ${order.orderId}`);
                  } catch (emailError) {
                    console.error(`❌ Email error for order ${order.orderId}:`, emailError.message);
                    // Still update flags to avoid retrying
                    order.emailSent.customer = true;
                    order.emailSent.admin = true;
                    await order.save();
                  }
                }
                
                console.log(`Updated abandoned payment for order: ${order.orderId} and sent notifications`);
              }
            } else {
              // Just update the check count
              await order.save();
            }
          } catch (error) {
            console.error(`Error processing order ${order.orderId}:`, error);
          }
        }
      } catch (error) {
        console.error('Abandoned payment checker error:', error);
      }
    });

    this.jobs.push(job);
  }

  // Stop all cron jobs
  stopAll() {
    this.jobs.forEach(job => job.stop());
    console.log('All cron jobs stopped');
  }
}

module.exports = new CronService(); 