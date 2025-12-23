const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;
  
  const msg = {
    to: email,
    from: process.env.SENDGRID_FROM_EMAIL, // Your verified sender email
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #ff4500;">Password Reset Request</h2>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <a href="${resetUrl}" style="display: inline-block; background-color: #ff4500; color: white; padding: 12px 24px; text-decoration: none; border-radius: 24px; margin: 16px 0;">Reset Password</a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="color: #888; font-size: 12px;">This email was sent from Reddit-Replica</p>
      </div>
    `,
  };

  await sgMail.send(msg);
};

module.exports = { sendPasswordResetEmail };
