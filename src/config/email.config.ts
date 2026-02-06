/**
 * Email Configuration
 * Defines email provider settings
 */
export default {
  email: {
    // Provider: 'sendgrid' | 'nodemailer' | 'mock' | 'console'
    provider: process.env.EMAIL_PROVIDER || 'console',

    // SendGrid Configuration
    sendgrid: {
      apiKey: process.env.SENDGRID_API_KEY,
      fromEmail: process.env.SENDGRID_FROM_EMAIL,
      fromName: process.env.SENDGRID_FROM_NAME || 'Payment Gateway',
    },

    // Nodemailer Configuration (SMTP)
    nodemailer: {
      host: process.env.NODEMAILER_HOST,
      port: parseInt(process.env.NODEMAILER_PORT || '587', 10),
      secure: process.env.NODEMAILER_SECURE === 'true', // true for 465, false for other ports
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS,
      fromEmail: process.env.NODEMAILER_FROM_EMAIL,
      fromName: process.env.NODEMAILER_FROM_NAME || 'Payment Gateway',
    },

    // Common settings
    defaultFrom: process.env.EMAIL_FROM || 'noreply@paymentgateway.com',
    replyTo: process.env.EMAIL_REPLY_TO || 'support@paymentgateway.com',
  },
};
