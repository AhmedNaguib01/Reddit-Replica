const nodemailer = require('nodemailer');

// Create transporter with better error handling
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    // Check if email credentials are configured
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.warn('Email credentials not configured. Password reset emails will be simulated.');
      return null;
    }
    
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;
  
  const transport = getTransporter();
  
  // If no transporter (credentials not configured), log the reset URL for development
  if (!transport) {
    console.log('=== PASSWORD RESET (Email not configured) ===');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=============================================');
    return; // Don't throw error, just skip sending
  }
  
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
    await transport.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    // Log the reset URL so it can still be used in development
    console.log('=== PASSWORD RESET (Email failed) ===');
    console.log(`Email: ${email}`);
    console.log(`Reset URL: ${resetUrl}`);
    console.log('=====================================');
    // Don't throw - let the flow continue so user gets success message
    // This prevents email enumeration attacks
  }
};

module.exports = { sendPasswordResetEmail };
