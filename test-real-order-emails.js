const emailService = require('./services/emailService');
const config = require('./config');

// Test order data - exactly like a real order
const realOrderTest = {
  orderId: 'ORD-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9),
  customer: {
    name: 'Real Test Customer',
    email: 'customer@example.com', // This gets emails ✅
    phone: '+919876543210',
    address: {
      street: '123 Real Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400001',
      country: 'India'
    }
  },
  product: {
    name: 'Neelkanth Palangtod Capsules',
    quantity: 1,
    price: 999,
    discount: 10
  },
  totalAmount: 899,
  payment: {
    method: 'cod', // COD order to trigger immediate emails
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

async function testRealOrderFlow() {
  console.log('🧪 Testing REAL ORDER EMAIL FLOW...\n');
  
  try {
    console.log('📦 Simulating order placement...');
    console.log('📋 Order ID:', realOrderTest.orderId);
    console.log('💳 Payment method:', realOrderTest.payment.method);
    console.log('');
    
    // Test all three emails exactly like in routes/orders.js
    console.log('📧 Starting email sending sequence...\n');
    
    // 1. Customer Email (✅ Working)
    console.log('1️⃣ Sending customer confirmation email...');
    const customerResult = await emailService.sendCustomerOrderConfirmation(realOrderTest);
    console.log('   Result:', customerResult?.success ? '✅ Queued' : '❌ Failed');
    
    // 2. Admin Email (❌ Not working) 
    console.log('2️⃣ Sending admin notification email...');
    const adminResult = await emailService.sendAdminOrderNotification(realOrderTest);
    console.log('   Result:', adminResult?.success ? '✅ Queued' : '❌ Failed');
    
    // 3. Your Personal Notification Email (❌ Not working)
    console.log('3️⃣ Sending personal notification email to:', config.admin.notificationEmail);
    const notificationResult = await emailService.sendNewOrderNotification(realOrderTest, config.admin.notificationEmail);
    console.log('   Result:', notificationResult?.success ? '✅ Queued' : '❌ Failed');
    
    console.log('\n📊 SUMMARY:');
    console.log('Customer email:    ', customerResult?.success ? '✅ Working' : '❌ Failed');
    console.log('Admin email:       ', adminResult?.success ? '✅ Working' : '❌ Failed');
    console.log('Notification email:', notificationResult?.success ? '✅ Working' : '❌ Failed');
    
    // Wait for background processing
    setTimeout(() => {
      console.log('\n🔍 Check these email addresses:');
      console.log('📧 Customer:', realOrderTest.customer.email, '(should receive order confirmation)');
      console.log('📧 Admin:', 'naman13399@gmail.com', '(should receive admin notification)');
      console.log('📧 Personal:', config.admin.notificationEmail, '(should receive order alert)');
      console.log('\n📂 Remember to check spam/promotions folders!');
      process.exit(0);
    }, 15000);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testRealOrderFlow(); 