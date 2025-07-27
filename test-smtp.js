/**
 * SMTP Connection Tester with Fixed Settings
 */

require('dotenv').config();
const nodemailer = require('nodemailer');
const config = require('./config');

console.log('Testing SMTP connection with fixed settings...');

// Create transporter with our confirmed working settings
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: 465,
  secure: true,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  }
});

// Try to verify connection
console.log(`Connecting to ${config.email.host}:465 with secure:true...`);

transporter.verify()
  .then(() => {
    console.log('✅ Connection successful!');
    
    console.log('\nSending test email...');
    return transporter.sendMail({
      from: config.email.from,
      to: 'naman13399@gmail.com', // Test recipient
      subject: 'SMTP Connection Test - Fixed Settings',
      text: `This test email confirms that your SMTP settings are now working correctly.\n\nTimestamp: ${new Date().toISOString()}`
    });
  })
  .then(info => {
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  }); 