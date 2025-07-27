const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const { verifyToken, verifyAdmin } = require('../middleware/auth');
const { 
  validateOrderCreation, 
  validateOrderStatusUpdate, 
  validatePaymentVerification,
  validateOrdersQuery,
  sanitizeInput 
} = require('../middleware/validation');
const paymentService = require('../services/paymentService');
const emailService = require('../services/emailService');
const config = require('../config');

// Create new order
router.post('/create', sanitizeInput, validateOrderCreation, async (req, res) => {
  try {
    const orderData = req.body;
    
    // 🐛 DEBUG: Log what frontend sends
   
    
    // Calculate total amount
    const baseAmount = orderData.product.price * orderData.product.quantity;
    const discountAmount = (baseAmount * (orderData.product.discount || 0)) / 100;
    const totalAmount = baseAmount - discountAmount;
    
    // Create order
    const order = new Order({
      ...orderData,
      totalAmount,
      product: {
        ...orderData.product,
        name: 'Neelkanth Palangtod Capsules'
      }
    });

    // If payment method is Razorpay, create Razorpay order
    if (orderData.payment.method === 'razorpay') {
      const razorpayOrderData = {
        amount: totalAmount,
        orderId: order.orderId,
        customerEmail: orderData.customer.email,
        customerName: orderData.customer.name
      };

      const razorpayResult = await paymentService.createOrder(razorpayOrderData);
      
      if (!razorpayResult.success) {
        return res.status(400).json({
          success: false,
          message: 'Failed to create payment order',
          error: razorpayResult.error
        });
      }

      order.payment.razorpayOrderId = razorpayResult.orderId;
    }

    await order.save();

    // 🐛 DEBUG: Check order before email sending
    console.log('🔍 ORDER CHECK - Before email sending:');
    console.log('Order ID:', order.orderId);
    console.log('Payment method:', order.payment.method);
    console.log('Order status:', order.status);
    console.log('Has formattedOrderDate:', !!order.formattedOrderDate);
    
    // Add formattedOrderDate if missing (common issue!)
    if (!order.formattedOrderDate) {
      order.formattedOrderDate = new Date(order.orderDate).toLocaleDateString('en-IN');
      console.log('🔧 Added missing formattedOrderDate:', order.formattedOrderDate);
    }

    // Send emails asynchronously (non-blocking) - Only for Cash on Delivery
    // For online payments, emails will be sent after payment verification
    if (order.payment.method === 'cod') {
      console.log('✅ COD Order - starting email sequence...');
      
      // Start email sending tasks without waiting for them to complete
      
      emailService.sendAdminOrderNotification(order);
      emailService.sendCustomerOrderConfirmation(order);
      
     
      
    
      
      console.log('✅ COD Order created, all 3 emails queued for sending in background');
    } else {
      console.log('ℹ️  Online payment order created, emails will be sent after payment verification');
      console.log('   Payment method was:', order.payment.method);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully',
      data: {
        orderId: order.orderId,
        totalAmount: order.totalAmount,
        razorpayOrderId: order.payment.razorpayOrderId,
        status: order.status
      }
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create order',
      error: error.message
    });
  }
});

// Verify payment and update order
router.post('/verify-payment', sanitizeInput, validatePaymentVerification, async (req, res) => {
  try {
    const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Find order
    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Use the shared verification function to update the order
    const updateResult = await paymentService.verifyAndUpdateOrder(order, {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    });

    if (!updateResult.success) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed'
      });
    }

    // Send confirmation emails for verified online payments (sequentially)
    if (!order.emailSent.customer) {
      console.log('💳 Online payment verified - starting sequential email sending...');
      
      try {
        // Send emails one by one for verified online payment
        console.log('📧 1. Sending customer confirmation...');
        await emailService.sendCustomerOrderConfirmation(order);
        console.log('✅ Customer email sent');
        
        console.log('📧 2. Sending admin notification...');
        await emailService.sendAdminOrderNotification(order);
        console.log('✅ Admin email sent');
        
        console.log('📧 3. Sending personal notification to:', config.admin.notificationEmail);
        await emailService.sendNewOrderNotification(order, config.admin.notificationEmail);
        console.log('✅ Personal notification email sent');
        
        // Update email sent flag after all emails are sent
        order.emailSent.customer = true;
        order.emailSent.admin = true;
        await order.save();
        
        console.log('🎉 Online payment verified, all 3 emails sent successfully!');
      } catch (emailError) {
        console.error('❌ Email sending error:', emailError.message);
        // Still update flags to avoid retrying failed emails
        order.emailSent.customer = true;
        order.emailSent.admin = true;
        await order.save();
        console.log('⚠️  Payment verified but some emails may have failed');
      }
    } else {
      console.log('Payment verified, but emails already sent for this order');
    }

    res.json({
      success: true,
      message: 'Payment verified successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        paymentStatus: order.payment.status
      }
    });

  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Payment verification failed',
      error: error.message
    });
  }
});

// Get order by ID (public - for customer order tracking)
router.get('/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOne({ orderId }).select('-payment.razorpaySignature -adminNotes');
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve order'
    });
  }
});

// Admin Routes (require authentication)

// Get all orders (admin only)
router.get('/', verifyToken, verifyAdmin, validateOrdersQuery, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      sortBy = 'orderDate', 
      sortOrder = 'desc',
      search 
    } = req.query;

    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Build filter
    const filter = {};
    if (status) filter.status = status;
    if (search) {
      filter.$or = [
        { orderId: { $regex: search, $options: 'i' } },
        { 'customer.name': { $regex: search, $options: 'i' } },
        { 'customer.email': { $regex: search, $options: 'i' } },
        { 'customer.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Order.countDocuments(filter)
    ]);

    res.json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });

  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve orders'
    });
  }
});

// Update order status (admin only)
router.patch('/:orderId/status', verifyToken, verifyAdmin, sanitizeInput, validateOrderStatusUpdate, async (req, res) => {
  try {
    const { orderId } = req.params;
    const { status, trackingNumber, adminNotes } = req.body;

    const order = await Order.findOne({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousStatus = order.status;
    
    // Update order
    order.status = status;
    if (trackingNumber) order.shipping.trackingNumber = trackingNumber;
    if (adminNotes) order.adminNotes = adminNotes;
    
    // Set estimated delivery for shipped orders
    if (status === 'shipped' && !order.shipping.estimatedDelivery) {
      const estimatedDelivery = new Date();
      estimatedDelivery.setDate(estimatedDelivery.getDate() + 7); // 7 days from now
      order.shipping.estimatedDelivery = estimatedDelivery;
    }
    
    // Set actual delivery date for delivered orders
    if (status === 'delivered') {
      order.shipping.actualDelivery = new Date();
    }

    await order.save();

    // Send status update email to customer
    if (status !== previousStatus) {
      emailService.sendOrderStatusUpdate(order, previousStatus);
    }

    res.json({
      success: true,
      message: 'Order status updated successfully',
      data: {
        orderId: order.orderId,
        status: order.status,
        previousStatus
      }
    });

  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update order status'
    });
  }
});

// Get order analytics (admin only)
router.get('/analytics/summary', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchConditions = {
      'payment.status': 'completed' // Only include completed payments
    };
    if (startDate || endDate) {
      matchConditions.orderDate = {};
      if (startDate) matchConditions.orderDate.$gte = new Date(startDate);
      if (endDate) matchConditions.orderDate.$lte = new Date(endDate);
    }

    const analytics = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          avgOrderValue: { $avg: '$totalAmount' },
          totalQuantity: { $sum: '$product.quantity' }
        }
      }
    ]);

    const statusDistribution = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const paymentMethodDistribution = await Order.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$payment.method',
          count: { $sum: 1 },
          revenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    // Recent orders
    const recentOrders = await Order.find(matchConditions)
      .sort({ orderDate: -1 })
      .limit(10)
      .select('orderId customer.name totalAmount status orderDate')
      .lean();

    res.json({
      success: true,
      data: {
        summary: analytics[0] || {
          totalOrders: 0,
          totalRevenue: 0,
          avgOrderValue: 0,
          totalQuantity: 0
        },
        statusDistribution,
        paymentMethodDistribution,
        recentOrders
      }
    });

  } catch (error) {
    console.error('Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve analytics'
    });
  }
});

// Delete order (admin only - for testing/cleanup)
router.delete('/:orderId', verifyToken, verifyAdmin, async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findOneAndDelete({ orderId });
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    res.json({
      success: true,
      message: 'Order deleted successfully'
    });

  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete order'
    });
  }
});

module.exports = router; 