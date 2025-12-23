const nodemailer = require('nodemailer');

// Create transporter lazily to ensure env vars are loaded
// Use explicit SMTP config instead of 'service' for better cloud compatibility
const createTransporter = () => {
  // Validate required env vars
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('Email configuration missing: EMAIL_USER or EMAIL_PASS not set');
    return null;
  }

  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Use STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    // Timeout settings to prevent hanging requests
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 15000,
    // Required for some cloud environments
    tls: {
      rejectUnauthorized: false, // Allow self-signed certs (Railway/cloud compatibility)
      ciphers: 'SSLv3'
    },
    debug: process.env.NODE_ENV !== 'production',
    logger: process.env.NODE_ENV !== 'production'
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    throw new Error('Email service not configured. Please check EMAIL_USER and EMAIL_PASS environment variables.');
  }

  // Verify connection before sending
  try {
    await transporter.verify();
    console.log('SMTP connection verified successfully');
  } catch (verifyError) {
    console.error('SMTP connection verification failed:', verifyError.message);
    throw new Error(`Email service connection failed: ${verifyError.message}`);
  }

  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
  if (!clientUrl) {
    console.error('CLIENT_URL or FRONTEND_URL not set');
    throw new Error('Client URL not configured');
  }

  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
  
  const mailOptions = {
    from: `"Reddit-Replica" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4500;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #ff4500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; margin: 16px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">This email was sent from Reddit Clone</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Password reset email sent successfully:', info.messageId);
    return info;
  } catch (sendError) {
    console.error('Failed to send password reset email:', sendError);
    throw new Error(`Failed to send email: ${sendError.message}`);
  } finally {
    transporter.close();
  }
};

module.exports = { sendPasswordResetEmail };
