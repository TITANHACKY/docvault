import nodemailer from "nodemailer";

/**
 * Configure your SMTP settings here or via environment variables.
 * For production, consider using a service like Resend, SendGrid, or Postmark.
 */
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || "587"),
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password?token=${token}`;

  // In development, we can just log the link
  if (process.env.NODE_ENV === "development" || !process.env.EMAIL_SERVER_USER) {
    console.log("-----------------------------------------");
    console.log(`Password reset requested for: ${email}`);
    console.log(`Reset Link: ${resetUrl}`);
    console.log("-----------------------------------------");
    return;
  }

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || '"DocVault" <noreply@docvault.dev>',
    to: email,
    subject: "Reset your DocVault password",
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #3b82f6;">Reset Your Password</h2>
        <p>You requested a password reset for your DocVault account. Click the button below to set a new password:</p>
        <div style="margin: 32px 0;">
          <a href="${resetUrl}" style="background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Reset Password</a>
        </div>
        <p>If you didn't request this, you can safely ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #6b7280;">This link will expire in 1 hour.</p>
      </div>
    `,
  });
}
