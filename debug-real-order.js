const express = require('express');
const router = express.Router();
const Order = require('./models/Order');
const emailService = require('./services/emailService');
const config = require('./config');

// Debug function to simulate exactly what happens in routes/orders.js
async function debugRealOrderFlow(orderData) {
  console.log('🐛 DEBUGGING REAL ORDER FLOW...\n');
  
  try {
    console.log('📋 Raw order data received:');
    console.log(JSON.stringify(orderData, null, 2));
    console.log('');
    
    // Calculate total amount (same as real order)
    const baseAmount = orderData.product.price * orderData.product.quantity;
    const discountAmount = (baseAmount * (orderData.product.discount || 0)) / 100;
    const totalAmount = baseAmount - discountAmount;
    
    console.log('💰 Calculated total amount:', totalAmount);
    console.log('');
    
    // Create order object (same as real order)
    const order = new Order({
      ...orderData,
      totalAmount,
      product: {
        ...orderData.product,
        name: 'Neelkanth Palangtod Capsules'
      }
    });
    
    console.log('📦 Created order object:');
    console.log('Order ID:', order.orderId);
    console.log('Payment method:', order.payment.method);
    console.log('Customer email:', order.customer.email);
    console.log('Order has formattedOrderDate:', !!order.formattedOrderDate);
    console.log('Order status:', order.status);
    console.log('');
    
    // Check email conditions
    console.log('🔍 Email sending conditions:');
    console.log('Payment method is COD:', order.payment.method === 'cod');
    console.log('Should send emails immediately:', order.payment.method === 'cod');
    console.log('Admin notification email target:', config.admin.notificationEmail);
    console.log('');
    
    if (order.payment.method === 'cod') {
      console.log('✅ COD order - sending emails...\n');
      
      // Add formattedOrderDate if missing (this might be the issue!)
      if (!order.formattedOrderDate) {
        order.formattedOrderDate = new Date(order.orderDate).toLocaleDateString('en-IN');
        console.log('🔧 Added missing formattedOrderDate:', order.formattedOrderDate);
      }
      
      // Test each email individually
      console.log('1️⃣ Testing customer email...');
      try {
        const customerResult = await emailService.sendCustomerOrderConfirmation(order);
        console.log('   Customer email result:', customerResult?.success ? '✅ Success' : '❌ Failed');
      } catch (error) {
        console.log('   Customer email error:', error.message);
      }
      
      console.log('2️⃣ Testing admin email...');
      try {
        const adminResult = await emailService.sendAdminOrderNotification(order);
        console.log('   Admin email result:', adminResult?.success ? '✅ Success' : '❌ Failed');
      } catch (error) {
        console.log('   Admin email error:', error.message);
      }
      
      console.log('3️⃣ Testing notification email...');
      try {
        const notificationResult = await emailService.sendNewOrderNotification(order, config.admin.notificationEmail);
        console.log('   Notification email result:', notificationResult?.success ? '✅ Success' : '❌ Failed');
      } catch (error) {
        console.log('   Notification email error:', error.message);
      }
    } else {
      console.log('ℹ️  Online payment order - emails will be sent after verification');
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  }
}

// Test with realistic order data that matches frontend
const realisticOrderData = {
  customer: {
    name: 'John Doe',
    email: 'customer@test.com',
    phone: '9876543210',
    address: {
      street: '123 Main Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  },
  product: {
    quantity: 1,
    price: 999,
    discount: 10
  },
  payment: {
    method: 'cod'
  },
  notes: 'Test order'
};

// Run the debug
console.log('🧪 Starting Real Order Debug...\n');
debugRealOrderFlow(realisticOrderData)
  .then(() => {
    setTimeout(() => {
      console.log('\n✅ Debug completed!');
      process.exit(0);
    }, 10000);
  })
  .catch((error) => {
    console.error('Debug failed:', error);
    process.exit(1);
  }); 