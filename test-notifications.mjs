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
const APP_URL = process.env.APP_URL || 'https://resumepicker.com';
const ADMIN_EMAILS = process.env.ADMIN_EMAILS ? 
  process.env.ADMIN_EMAILS.split(',').map(email => email.trim()) : 
  ['dev@resumepicker.com', 'munavvarfyrooz@gmail.com'];

console.log('Testing notification emails...\n');

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

// Test data
const testUser = {
  username: 'testuser123',
  email: 'munavvarfyrooz@gmail.com',
  firstName: 'Test',
  lastName: 'User'
};

console.log('Testing notifications for:', testUser.email);
console.log('Admin emails:', ADMIN_EMAILS.join(', '));
console.log('=' .repeat(50));

async function sendEmail(to, subject, html) {
  try {
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: to,
      subject: subject,
      html: html,
      text: html.replace(/<[^>]*>/g, '')
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Test 1: New User Registration Notification (to admins)
console.log('\n1. Testing New User Registration Notification (to admins)...');
const newUserHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">New User Registration</h2>
    <p>A new user has registered on ResumePicker:</p>
    <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Username:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${testUser.username}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Email:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${testUser.email}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Name:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${testUser.firstName} ${testUser.lastName}</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Registration Time:</strong></td>
        <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
      </tr>
    </table>
    <p style="color: #ff0000; font-weight: bold;">This is a TEST notification</p>
  </div>
`;

for (const adminEmail of ADMIN_EMAILS) {
  const result = await sendEmail(adminEmail, '[TEST] New User Registration: ' + testUser.username, newUserHtml);
  if (result.success) {
    console.log(`✅ Sent to ${adminEmail} (ID: ${result.messageId})`);
  } else {
    console.log(`❌ Failed to send to ${adminEmail}: ${result.error}`);
  }
}

// Test 2: Welcome Email with Verification
console.log('\n2. Testing Welcome Email with Verification Link...');
const verificationToken = 'test-verification-token-' + Date.now();
const welcomeHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Welcome to ResumePicker, ${testUser.firstName}!</h2>
    <p>Thank you for registering with ResumePicker. We're excited to have you on board!</p>
    <p>Please verify your email address by clicking the button below:</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/verify-email?token=${verificationToken}" 
         style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Verify Email Address
      </a>
    </div>
    <p style="color: #ff0000; font-weight: bold;">This is a TEST email - the verification link won't work</p>
  </div>
`;

const welcomeResult = await sendEmail(testUser.email, '[TEST] Welcome to ResumePicker - Please Verify Your Email', welcomeHtml);
console.log(welcomeResult.success ? `✅ Welcome email sent (ID: ${welcomeResult.messageId})` : `❌ Failed: ${welcomeResult.error}`);

// Test 3: Password Reset Email
console.log('\n3. Testing Password Reset Email...');
const resetToken = 'test-reset-token-' + Date.now();
const resetHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">Password Reset Request</h2>
    <p>Hi ${testUser.firstName},</p>
    <p>We received a request to reset your password for your ResumePicker account.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${APP_URL}/reset-password?token=${resetToken}" 
         style="background-color: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
        Reset Password
      </a>
    </div>
    <p style="color: #ff0000; font-weight: bold;">This is a TEST email - the reset link won't work</p>
  </div>
`;

const resetResult = await sendEmail(testUser.email, '[TEST] Password Reset Request - ResumePicker', resetHtml);
console.log(resetResult.success ? `✅ Password reset email sent (ID: ${resetResult.messageId})` : `❌ Failed: ${resetResult.error}`);

// Test 4: Support Email
console.log('\n4. Testing Support Email (to admins)...');
const supportHtml = `
  <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
    <h2 style="color: #333;">New Support Request</h2>
    <p><strong>From:</strong> ${testUser.firstName} ${testUser.lastName} (${testUser.username})</p>
    <p><strong>Email:</strong> ${testUser.email}</p>
    <p><strong>Category:</strong> Technical Issue</p>
    <p><strong>Subject:</strong> Test Support Request</p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e0e0e0;">
    <h3>Message:</h3>
    <div style="background-color: #f5f5f5; padding: 15px; border-radius: 5px;">
      This is a TEST support request to verify the notification system is working correctly.<br>
      Test performed at: ${new Date().toLocaleString()}
    </div>
    <p style="color: #ff0000; font-weight: bold;">This is a TEST support request</p>
  </div>
`;

const supportResult = await sendEmail('dev@resumepicker.com', '[TEST] [Support] Test Support Request', supportHtml);
console.log(supportResult.success ? `✅ Support email sent (ID: ${supportResult.messageId})` : `❌ Failed: ${supportResult.error}`);

console.log('\n' + '=' .repeat(50));
console.log('Notification testing complete!');
console.log('\nEmails sent:');
console.log('- New user notification: Sent to all admin emails');
console.log('- Welcome email: Sent to', testUser.email);
console.log('- Password reset: Sent to', testUser.email);
console.log('- Support request: Sent to dev@resumepicker.com');
console.log('\nAll test emails are marked with [TEST] in the subject line');

process.exit(0);