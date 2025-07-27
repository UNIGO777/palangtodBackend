const Razorpay = require('razorpay');
const crypto = require('crypto');
const config = require('../config');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: config.razorpay.keyId,
      key_secret: config.razorpay.keySecret
    });
  }

  // Create Razorpay order
  async createOrder(orderData) {
    try {
      const options = {
        amount: orderData.amount * 100, // Amount in paise
        currency: 'INR',
        receipt: orderData.orderId,
        notes: {
          orderId: orderData.orderId,
          customerEmail: orderData.customerEmail,
          customerName: orderData.customerName
        }
      };

      const razorpayOrder = await this.razorpay.orders.create(options);
      
      return {
        success: true,
        orderId: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt
      };
    } catch (error) {
      console.error('Razorpay order creation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Verify payment signature
  verifyPaymentSignature(paymentData) {
    try {
      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = paymentData;
      
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac('sha256', config.razorpay.keySecret)
        .update(body.toString())
        .digest('hex');

      return {
        success: expectedSignature === razorpay_signature,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Get payment details
  async getPaymentDetails(paymentId) {
    try {
      const payment = await this.razorpay.payments.fetch(paymentId);
      return {
        success: true,
        payment: {
          id: payment.id,
          amount: payment.amount / 100, // Convert back to rupees
          currency: payment.currency,
          status: payment.status,
          method: payment.method,
          createdAt: new Date(payment.created_at * 1000),
          email: payment.email,
          contact: payment.contact
        }
      };
    } catch (error) {
      console.error('Get payment details error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Refund payment
  async refundPayment(paymentId, amount = null) {
    try {
      const refundData = {
        payment_id: paymentId
      };
      
      if (amount) {
        refundData.amount = amount * 100; // Amount in paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);
      
      return {
        success: true,
        refund: {
          id: refund.id,
          amount: refund.amount / 100,
          status: refund.status,
          createdAt: new Date(refund.created_at * 1000)
        }
      };
    } catch (error) {
      console.error('Refund error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Capture payment (for authorized payments)
  async capturePayment(paymentId, amount) {
    try {
      const capture = await this.razorpay.payments.capture(paymentId, amount * 100);
      
      return {
        success: true,
        payment: {
          id: capture.id,
          amount: capture.amount / 100,
          status: capture.status
        }
      };
    } catch (error) {
      console.error('Capture payment error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Generate payment link (for COD or failed payments)
  async generatePaymentLink(orderData) {
    try {
      const options = {
        amount: orderData.amount * 100,
        currency: 'INR',
        accept_partial: false,
        first_min_partial_amount: 100,
        description: `Payment for ${orderData.productName}`,
        customer: {
          name: orderData.customerName,
          email: orderData.customerEmail,
          contact: orderData.customerPhone
        },
        notify: {
          sms: true,
          email: true
        },
        reminder_enable: true,
        notes: {
          orderId: orderData.orderId
        },
        callback_url: `${config.frontendUrl}/payment-success`,
        callback_method: 'get'
      };

      const paymentLink = await this.razorpay.paymentLink.create(options);
      
      return {
        success: true,
        paymentLink: {
          id: paymentLink.id,
          short_url: paymentLink.short_url,
          status: paymentLink.status
        }
      };
    } catch (error) {
      console.error('Payment link generation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Webhook signature verification
  verifyWebhookSignature(body, signature, secret = null) {
    try {
      const webhookSecret = secret || config.razorpay.webhookSecret;
      const expectedSignature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      return expectedSignature === signature;
    } catch (error) {
      console.error('Webhook verification error:', error);
      return false;
    }
  }
  
  // Process payment verification and update order
  async verifyAndUpdateOrder(order, paymentDetails) {
    try {
      if (!order || !paymentDetails) {
        return {
          success: false,
          message: 'Missing order or payment details'
        };
      }
      
      // If we have signature, verify it
      if (paymentDetails.razorpay_signature) {
        const verificationResult = this.verifyPaymentSignature({
          razorpay_order_id: paymentDetails.razorpay_order_id || order.payment.razorpayOrderId,
          razorpay_payment_id: paymentDetails.razorpay_payment_id,
          razorpay_signature: paymentDetails.razorpay_signature
        });
        
        if (!verificationResult.success) {
          order.payment.status = 'failed';
          await order.save();
          
          return {
            success: false,
            message: 'Payment signature verification failed'
          };
        }
      }
      
      // Update order with payment details
      order.payment.status = 'completed';
      if (paymentDetails.razorpay_payment_id) {
        order.payment.razorpayPaymentId = paymentDetails.razorpay_payment_id;
      }
      if (paymentDetails.razorpay_signature) {
        order.payment.razorpaySignature = paymentDetails.razorpay_signature;
      }
      order.status = 'confirmed';
      
      await order.save();
      
      return {
        success: true,
        message: 'Payment verified and order updated successfully',
        order
      };
    } catch (error) {
      console.error('Order update error:', error);
      return {
        success: false,
        message: 'Failed to update order',
        error: error.message
      };
    }
  }
  
  // Check order payment status for abandoned payments
  async checkOrderPaymentStatus(razorpayOrderId) {
    try {
      // Fetch order from Razorpay
      const order = await this.razorpay.orders.fetch(razorpayOrderId);
      
      // If order is paid, get payment details
      if (order.status === 'paid') {
        // Get list of payments for this order
        const payments = await this.razorpay.orders.fetchPayments(razorpayOrderId);
        
        // Find the successful payment
        const successfulPayment = payments.items.find(payment => payment.status === 'captured');
        
        if (successfulPayment) {
          return {
            success: true,
            status: 'paid',
            paymentId: successfulPayment.id,
            amount: successfulPayment.amount / 100,
            method: successfulPayment.method
          };
        }
      }
      
      return {
        success: true,
        status: order.status,
        orderId: order.id
      };
    } catch (error) {
      console.error('Check payment status error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

module.exports = new PaymentService(); 