const emailService = require('./services/emailService');
const config = require('./config');

// Test order data
const testOrder = {
  orderId: 'NOTIF-TEST-' + Date.now(),
  customer: {
    name: 'Test Customer',
    email: 'test@example.com',
    phone: '+919876543210',
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
    method: 'cod',
    status: 'confirmed'
  },
  status: 'confirmed',
  orderDate: new Date(),
  formattedOrderDate: new Date().toLocaleDateString('en-IN'),
  emailSent: {
    customer: false,
    admin: false
  }
};

async function testNotificationEmail() {
  console.log('🧪 Testing Notification Email to naman13399@gmail.com...\n');
  
  try {
    console.log('📧 Email target:', config.admin.notificationEmail);
    console.log('📋 Test order ID:', testOrder.orderId);
    console.log('');
    
    // Test the notification email directly
    console.log('🔄 Sending notification email...');
    const result = await emailService.sendNewOrderNotification(testOrder, config.admin.notificationEmail);
    
    console.log('📊 Notification email result:', result);
    
    // Wait a bit for background processing
    setTimeout(() => {
      console.log('\n✅ Test completed! Check your email: naman13399@gmail.com');
      console.log('📂 Also check spam/junk folder');
      process.exit(0);
    }, 10000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testNotificationEmail(); 