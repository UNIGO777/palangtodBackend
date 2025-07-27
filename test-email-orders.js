const emailService = require('./services/emailService');
const config = require('./config');

// Test order data
const testOrder = {
  orderId: 'TEST-' + Date.now(),
  customer: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+91-9876543210',
    address: {
      street: '123 Test Street',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      country: 'India'
    }
  },
  product: {
    name: 'Neelkanth Palangtod Capsules',
    quantity: 2,
    price: 999,
    discount: 10
  },
  totalAmount: 1798,
  payment: {
    method: 'razorpay',
    status: 'completed'
  },
  status: 'confirmed',
  orderDate: new Date(),
  formattedOrderDate: new Date().toLocaleDateString('en-IN'),
  emailSent: {
    customer: false,
    admin: false
  }
};

async function testEmailService() {
  console.log('🧪 Testing Email Service...\n');
  
  try {
    // Test connection first
    console.log('1️⃣ Testing SMTP Connection...');
    await emailService.testConnection();
    console.log('✅ SMTP Connection successful\n');
    
    // Test customer email
    console.log('2️⃣ Testing Customer Order Confirmation Email...');
    const customerResult = await emailService.sendCustomerOrderConfirmation(testOrder);
    console.log('📧 Customer email result:', customerResult);
    console.log('');
    
    // Test admin email  
    console.log('3️⃣ Testing Admin Order Notification Email...');
    const adminResult = await emailService.sendAdminOrderNotification(testOrder);
    console.log('📧 Admin email result:', adminResult);
    console.log('');
    
    // Test notification email
    console.log('4️⃣ Testing Custom Notification Email...');
    const notificationResult = await emailService.sendNewOrderNotification(testOrder, config.admin.notificationEmail);
    console.log('📧 Notification email result:', notificationResult);
    console.log('');
    
    console.log('🎉 All email tests completed!');
    console.log('Check your email inbox and spam folder for test emails.');
    
  } catch (error) {
    console.error('❌ Email test failed:', error);
  }
  
  // Wait a bit for async tasks to complete
  setTimeout(() => {
    process.exit(0);
  }, 5000);
}

// Run the test
testEmailService(); 