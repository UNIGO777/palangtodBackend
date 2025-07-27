/**
 * SMTP Email Configuration Checker
 * This script helps diagnose email configuration issues
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

// Get configuration from .env file
const email = {
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT) || 587,
  user: process.env.EMAIL_USER || 'user@example.com',
  pass: process.env.EMAIL_PASS || 'password',
  from: process.env.EMAIL_FROM || 'noreply@example.com'
};

// Display configuration
console.log('\n==== Email Configuration ====');
console.log(`Host: ${email.host}`);
console.log(`Port: ${email.port} (${typeof email.port})`);
console.log(`User: ${email.user}`);
console.log(`From: ${email.from}`);
console.log(`Password: ${'*'.repeat(email.pass ? email.pass.length : 0)}`);
console.log('============================\n');

// Test different configurations
async function runTests() {
  console.log('Testing email configurations...\n');
  
  const configs = [
    {
      name: "Configuration 1: Port 465 with secure:true",
      config: {
        host: email.host,
        port: 465,
        secure: true,
        auth: { user: email.user, pass: email.pass }
      }
    },
    {
      name: "Configuration 2: Port 465 with secure:false",
      config: {
        host: email.host,
        port: 465,
        secure: false,
        auth: { user: email.user, pass: email.pass }
      }
    },
    {
      name: "Configuration 3: Port 587 with secure:false",
      config: {
        host: email.host,
        port: 587,
        secure: false,
        auth: { user: email.user, pass: email.pass }
      }
    },
    {
      name: "Configuration 4: Port 587 with secure:true",
      config: {
        host: email.host,
        port: 587,
        secure: true,
        auth: { user: email.user, pass: email.pass }
      }
    }
  ];

  for (const testCase of configs) {
    console.log(`\n🔍 Testing ${testCase.name}:`);
    console.log(`   - Host: ${testCase.config.host}`);
    console.log(`   - Port: ${testCase.config.port}`);
    console.log(`   - Secure: ${testCase.config.secure}`);
    
    try {
      const transporter = nodemailer.createTransport(testCase.config);
      
      // Add longer timeout for verification
      const verifyPromise = transporter.verify();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Connection timeout (10s)')), 10000)
      );
      
      await Promise.race([verifyPromise, timeoutPromise]);
      
      console.log(`✅ SUCCESS! Connection established with ${testCase.name}`);
      
      // Remember the successful configuration
      global.workingConfig = testCase.config;
      
      // Try sending a test email
      console.log('\n💌 Trying to send a test email with working configuration...');
      
      try {
        const result = await transporter.sendMail({
          from: email.from,
          to: "naman13399@gmail.com",  // Change to your test recipient
          subject: `Email Test - ${testCase.name}`,
          text: `This is a test email sent using:\n${JSON.stringify(testCase.config, null, 2)}\n\nTimestamp: ${new Date().toISOString()}`
        });
        
        console.log(`✅ Email sent successfully! Message ID: ${result.messageId}`);
        
        // We found a working configuration - print the exact settings to use
        console.log('\n==== WORKING CONFIGURATION ====');
        console.log(`Use these settings in your application:`);
        console.log(`host: "${testCase.config.host}",`);
        console.log(`port: ${testCase.config.port},`);
        console.log(`secure: ${testCase.config.secure}`);
        console.log('=============================\n');
        
        // Exit after finding a working configuration
        process.exit(0);
      } catch (error) {
        console.error(`❌ Email sending failed: ${error.message}`);
      }
    } catch (error) {
      console.error(`❌ Failed with error: ${error.message}`);
    }
  }
  
  console.log('\n❌ None of the tested configurations worked. Please check your credentials and server settings.');
}

// Run the tests
runTests().catch(err => {
  console.error('Testing failed:', err);
  process.exit(1);
}); 