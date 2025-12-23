const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const sendPasswordResetEmail = async (email, resetToken) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  const clientUrl = process.env.CLIENT_URL || process.env.FRONTEND_URL;
  if (!clientUrl) {
    throw new Error('CLIENT_URL or FRONTEND_URL not configured');
  }

  const resetUrl = `${clientUrl}/reset-password/${resetToken}`;
  
  // Use Resend's default domain for testing, or your verified domain
  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';

  const { data, error } = await resend.emails.send({
    from: `Reddit-Replica <${fromEmail}>`,
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
  });

  if (error) {
    console.error('Resend email error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log('Password reset email sent successfully:', data.id);
  return data;
};

module.exports = { sendPasswordResetEmail };
