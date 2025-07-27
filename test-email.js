require('dotenv').config();
const nodemailer = require('nodemailer');
const config = require('./config');

// Create transporter for both secure and non-secure configurations
const secureTransporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: true,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  },
  debug: true, // Enable debug output
  logger: true // Log information to console
});

const nonSecureTransporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: false,
  auth: {
    user: config.email.user,
    pass: config.email.pass
  },
  debug: true, // Enable debug output
  logger: true // Log information to console
});

// Log email configuration
console.log('Email Configuration:');
console.log(`Host: ${config.email.host}`);
console.log(`Port: ${config.email.port}`);
console.log(`User: ${config.email.user}`);
console.log(`From: ${config.email.from}`);

// Test secure connection
console.log('\nTesting SECURE connection (secure: true)...');
secureTransporter.verify()
  .then(() => {
    console.log('✅ Secure connection successful!');
    testSend(secureTransporter, 'secure');
  })
  .catch(error => {
    console.error('❌ Secure connection failed:', error);
    
    // Try non-secure connection
    console.log('\nTrying NON-SECURE connection (secure: false)...');
    nonSecureTransporter.verify()
      .then(() => {
        console.log('✅ Non-secure connection successful!');
        testSend(nonSecureTransporter, 'non-secure');
      })
      .catch(error => {
        console.error('❌ Non-secure connection also failed:', error);
        console.log('\nBoth connection methods failed. Please check your credentials and server settings.');
      });
  });

// Test sending an email
function testSend(transporter, mode) {
  console.log(`\nTrying to send a test email using ${mode} connection...`);
  
  const mailOptions = {
    from: config.email.from,
    to: 'naman13399@gmail.com', // Send to your test email
    subject: `Test Email from Node.js Server (${mode} mode)`,
    html: `
      <h1>SMTP Test Email</h1>
      <p>This is a test email sent from your Node.js server using ${mode} connection mode.</p>
      <p>If you received this email, your SMTP configuration is working correctly!</p>
      <hr>
      <p>Server time: ${new Date().toString()}</p>
    `
  };

  transporter.sendMail(mailOptions)
    .then(info => {
      console.log('✅ Email sent successfully!');
      console.log('Message ID:', info.messageId);
      console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed to send email:', error);
      process.exit(1);
    });
} 