import nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

// Email configuration from environment variables
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587');
const SMTP_SECURE = process.env.SMTP_SECURE === 'true'; // true for 465, false for other ports
const SMTP_USER = process.env.SMTP_USER; // Your email address
const SMTP_PASS = process.env.SMTP_PASS; // Your email password or app-specific password
const FROM_EMAIL = process.env.FROM_EMAIL || process.env.SMTP_USER || 'noreply@resumepicker.ai';
const FROM_NAME = process.env.FROM_NAME || 'ResumePicker';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || process.env.SMTP_USER || 'admin@resumepicker.ai';
const APP_URL = process.env.APP_URL || 'http://localhost:5000';

// Common SMTP configurations for popular email providers
const SMTP_PRESETS: Record<string, { host: string; port: number; secure: boolean }> = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false
  },
  zoho: {
    host: 'smtp.zoho.com',
    port: 587,
    secure: false
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = !!(SMTP_USER && SMTP_PASS);
    
    if (!this.isConfigured) {
      console.warn('[EMAIL] SMTP credentials not configured. Email functionality disabled.');
      console.warn('[EMAIL] To enable emails, set these environment variables:');
      console.warn('[EMAIL]   SMTP_USER - Your email address');
      console.warn('[EMAIL]   SMTP_PASS - Your email password (use app-specific password for Gmail)');
      console.warn('[EMAIL]   SMTP_HOST - SMTP server (optional, auto-detected for common providers)');
      console.warn('[EMAIL]   SMTP_PORT - SMTP port (optional, defaults to 587)');
      return;
    }

    this.initializeTransporter();
  }

  private initializeTransporter() {
    if (!SMTP_USER || !SMTP_PASS) return;

    let smtpConfig: any = {
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      },
      // Default to Gmail settings if not specified
      host: SMTP_HOST || 'smtp.gmail.com',
      port: SMTP_PORT || 587,
      secure: SMTP_SECURE || false
    };

    // If SMTP_HOST is not provided, try to auto-detect from email domain
    if (!SMTP_HOST && SMTP_USER) {
      const emailDomain = SMTP_USER.split('@')[1];
      if (emailDomain) {
        const domain = emailDomain.toLowerCase();
        
        // Check for common providers
        if (domain.includes('gmail.com')) {
          smtpConfig.host = SMTP_PRESETS.gmail.host;
          smtpConfig.port = SMTP_PRESETS.gmail.port;
          smtpConfig.secure = SMTP_PRESETS.gmail.secure;
          console.log(`[EMAIL] Auto-detected Gmail SMTP settings`);
        } else if (domain.includes('outlook.com') || domain.includes('hotmail.com')) {
          smtpConfig.host = SMTP_PRESETS.outlook.host;
          smtpConfig.port = SMTP_PRESETS.outlook.port;
          smtpConfig.secure = SMTP_PRESETS.outlook.secure;
          console.log(`[EMAIL] Auto-detected Outlook SMTP settings`);
        } else if (domain.includes('yahoo.com')) {
          smtpConfig.host = SMTP_PRESETS.yahoo.host;
          smtpConfig.port = SMTP_PRESETS.yahoo.port;
          smtpConfig.secure = SMTP_PRESETS.yahoo.secure;
          console.log(`[EMAIL] Auto-detected Yahoo SMTP settings`);
        } else if (domain.includes('zoho.com')) {
          smtpConfig.host = SMTP_PRESETS.zoho.host;
          smtpConfig.port = SMTP_PRESETS.zoho.port;
          smtpConfig.secure = SMTP_PRESETS.zoho.secure;
          console.log(`[EMAIL] Auto-detected Zoho SMTP settings`);
        } else {
          console.log(`[EMAIL] Using default Gmail SMTP settings for ${domain}`);
        }
      }
    }

    console.log(`[EMAIL] SMTP Configuration:`, {
      host: smtpConfig.host,
      port: smtpConfig.port,
      secure: smtpConfig.secure,
      user: SMTP_USER
    });

    this.transporter = nodemailer.createTransport(smtpConfig);
    
    // Verify connection
    this.transporter?.verify((error, success) => {
      if (error) {
        console.error('[EMAIL] SMTP connection failed:', error);
        console.error('[EMAIL] Please check your SMTP credentials and settings');
        if (SMTP_USER?.includes('gmail.com')) {
          console.error('[EMAIL] ================== GMAIL SETUP REQUIRED ==================');
          console.error('[EMAIL] Gmail blocks regular passwords for security reasons.');
          console.error('[EMAIL] You MUST use an App-Specific Password:');
          console.error('[EMAIL] ');
          console.error('[EMAIL] 1. Enable 2-Factor Authentication in your Google Account');
          console.error('[EMAIL] 2. Go to: https://myaccount.google.com/apppasswords');
          console.error('[EMAIL] 3. Select "Mail" as the app');
          console.error('[EMAIL] 4. Generate a 16-character password');
          console.error('[EMAIL] 5. Use this password as SMTP_PASS (not your regular password)');
          console.error('[EMAIL] ');
          console.error('[EMAIL] Example: SMTP_PASS="abcd efgh ijkl mnop" (without spaces)');
          console.error('[EMAIL] =========================================================');
        }
        this.isConfigured = false;
      } else {
        console.log('[EMAIL] SMTP server ready to send emails');
      }
    });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.isConfigured || !this.transporter) {
      console.log('[EMAIL] Would send email:', {
        to: options.to,
        subject: options.subject,
        preview: options.html.substring(0, 200) + '...'
      });
      return false;
    }

    try {
      const mailOptions = {
        from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML for text version
        html: options.html,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log(`[EMAIL] Email sent successfully to ${options.to} (Message ID: ${info.messageId})`);
      return true;
    } catch (error) {
      console.error('[EMAIL] Error sending email:', error);
      return false;
    }
  }

  // Send welcome email with verification link
  async sendWelcomeEmail(user: { email: string; username: string; firstName?: string | null }, verificationToken: string): Promise<boolean> {
    const verificationUrl = `${APP_URL}/verify-email?token=${verificationToken}`;
    const name = user.firstName || user.username;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to ResumePicker, ${name}!</h2>
        
        <p>Thank you for registering with ResumePicker. We're excited to have you on board!</p>
        
        <p>Please verify your email address by clicking the button below:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Verify Email Address
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        
        <p>This link will expire in 24 hours.</p>
        
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't create an account with ResumePicker, please ignore this email.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Welcome to ResumePicker - Please Verify Your Email',
      html
    });
  }

  // Send password reset email
  async sendPasswordResetEmail(user: { email: string; username: string; firstName?: string | null }, resetToken: string): Promise<boolean> {
    const resetUrl = `${APP_URL}/reset-password?token=${resetToken}`;
    const name = user.firstName || user.username;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        
        <p>Hi ${name},</p>
        
        <p>We received a request to reset your password for your ResumePicker account.</p>
        
        <p>Click the button below to reset your password:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #FF6B6B; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        
        <p><strong>This link will expire in 1 hour.</strong></p>
        
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
          If you didn't request a password reset, please ignore this email. Your password won't be changed.
        </p>
        
        <p style="color: #666; font-size: 14px;">
          For security reasons, this link will only work once.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Reset Request - ResumePicker',
      html
    });
  }

  // Send notification to admin when new user signs up
  async sendNewUserNotification(user: { username: string; email: string; firstName?: string | null; lastName?: string | null }): Promise<boolean> {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New User Registration</h2>
        
        <p>A new user has registered on ResumePicker:</p>
        
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Username:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${user.username}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Email:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Name:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${user.firstName || ''} ${user.lastName || ''}</td>
          </tr>
          <tr>
            <td style="padding: 10px; border: 1px solid #ddd; background: #f5f5f5;"><strong>Registration Time:</strong></td>
            <td style="padding: 10px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
        
        <p>You can view all users in the <a href="${APP_URL}/admin">Admin Dashboard</a>.</p>
      </div>
    `;

    return this.sendEmail({
      to: ADMIN_EMAIL,
      subject: `New User Registration: ${user.username}`,
      html
    });
  }

  // Send email verification confirmation
  async sendEmailVerifiedConfirmation(user: { email: string; username: string; firstName?: string | null }): Promise<boolean> {
    const name = user.firstName || user.username;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4CAF50;">Email Verified Successfully!</h2>
        
        <p>Hi ${name},</p>
        
        <p>Your email address has been successfully verified. You now have full access to all ResumePicker features.</p>
        
        <p>Here's what you can do now:</p>
        <ul>
          <li>Upload and manage candidate resumes</li>
          <li>Create job descriptions</li>
          <li>Use AI-powered ranking to find the best candidates</li>
          <li>Export shortlists and manage your hiring pipeline</li>
        </ul>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/dashboard" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Go to Dashboard
          </a>
        </div>
        
        <p>If you have any questions, feel free to contact our support team.</p>
        
        <p>Best regards,<br>The ResumePicker Team</p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Email Verified - Welcome to ResumePicker!',
      html
    });
  }

  // Send password change confirmation
  async sendPasswordChangedNotification(user: { email: string; username: string; firstName?: string | null }): Promise<boolean> {
    const name = user.firstName || user.username;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        
        <p>Hi ${name},</p>
        
        <p>This email confirms that your password for ResumePicker has been successfully changed.</p>
        
        <p><strong>Changed on:</strong> ${new Date().toLocaleString()}</p>
        
        <p>If you did not make this change, please contact us immediately and reset your password.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${APP_URL}/login" 
             style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Login to Your Account
          </a>
        </div>
        
        <hr style="border: 1px solid #eee; margin: 30px 0;">
        
        <p style="color: #666; font-size: 14px;">
          For security reasons, we recommend using a strong, unique password and enabling two-factor authentication when available.
        </p>
      </div>
    `;

    return this.sendEmail({
      to: user.email,
      subject: 'Password Changed - ResumePicker',
      html
    });
  }
}

export const emailService = new EmailService();