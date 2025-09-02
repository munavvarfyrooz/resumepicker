import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const SMTP_HOST = process.env.SMTP_HOST || 'email-smtp.ap-south-1.amazonaws.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || 'dev@resumepicker.com';
const FROM_NAME = process.env.FROM_NAME || 'ResumePicker';

console.log('Testing email configuration...');
console.log('SMTP Host:', SMTP_HOST);
console.log('SMTP Port:', SMTP_PORT);
console.log('SMTP User:', SMTP_USER);
console.log('From Email:', FROM_EMAIL);

if (!SMTP_USER || !SMTP_PASS) {
  console.error('ERROR: SMTP_USER and SMTP_PASS must be set in .env file');
  process.exit(1);
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: false,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS
  }
});

// Verify connection
console.log('\nVerifying SMTP connection...');
try {
  await transporter.verify();
  console.log('✅ SMTP connection successful!');
} catch (error) {
  console.error('❌ SMTP connection failed:', error.message);
  process.exit(1);
}

// Send test email
console.log('\nSending test email...');
try {
  const info = await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: 'munavvarfyrooz@gmail.com', // Using admin email from .env
    subject: 'Test Email from ResumePicker',
    text: 'This is a test email to verify SMTP configuration.',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Email Configuration Test Successful!</h2>
        <p>This test email confirms that your SMTP settings are working correctly.</p>
        <p><strong>Configuration Details:</strong></p>
        <ul>
          <li>SMTP Host: ${SMTP_HOST}</li>
          <li>SMTP Port: ${SMTP_PORT}</li>
          <li>From: ${FROM_EMAIL}</li>
          <li>Timestamp: ${new Date().toLocaleString()}</li>
        </ul>
        <p style="color: #666; font-size: 14px; margin-top: 20px;">
          If you received this email, your email service is configured correctly.
        </p>
      </div>
    `
  });
  
  console.log('✅ Test email sent successfully!');
  console.log('Message ID:', info.messageId);
  console.log('Check the inbox for munavvarfyrooz@gmail.com');
} catch (error) {
  console.error('❌ Failed to send test email:', error.message);
  if (error.responseCode === 535) {
    console.error('\nAuthentication failed. Please check:');
    console.error('1. Your SMTP_USER and SMTP_PASS are correct');
    console.error('2. For AWS SES, ensure you have the correct SMTP credentials');
    console.error('3. Your sending domain/email is verified in SES');
  }
}