const nodemailer = require('nodemailer');

const createTransporter = () => {
  // Validate required environment variables
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Warning: EMAIL_USER or EMAIL_PASS not configured. Password reset emails will fail.');
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

const sendPasswordResetEmail = async (email, resetToken) => {
  const transporter = createTransporter();
  
  if (!transporter) {
    console.error('Email transporter not configured. Check EMAIL_USER and EMAIL_PASS environment variables.');
    throw new Error('Email service not configured');
  }

  if (!process.env.CLIENT_URL) {
    console.error('CLIENT_URL environment variable not set');
    throw new Error('Client URL not configured');
  }

  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  
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
    await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${email}`);
  } catch (error) {
    console.error('Failed to send password reset email:', error.message);
    throw new Error('Failed to send password reset email');
  }
};

module.exports = { sendPasswordResetEmail };
