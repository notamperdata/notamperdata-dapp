// src/lib/emailService.ts
/**
 * Email service for sending API key notifications
 * Simple implementation without external dependencies
 * Can be extended with email providers when needed
 */

export interface ApiKeyEmailData {
  adaAmount: number;
  tokenAmount: number;
  transactionHash: string;
}

interface EmailConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
}

/**
 * Get email configuration from environment variables
 */
function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || 'noreply@notamperdata.com';
  const fromName = process.env.FROM_NAME || 'NoTamperData';

  if (!apiKey) {
    console.warn('⚠️ Email service not configured - missing API key');
    return null;
  }

  return {
    apiKey,
    fromEmail,
    fromName
  };
}

/**
 * Generate HTML email template for API key delivery
 */
function generateApiKeyEmailTemplate(
  apiKey: string, 
  data: ApiKeyEmailData
): { subject: string; html: string; text: string } {
  const { adaAmount, tokenAmount, transactionHash } = data;
  
  const subject = 'Your NoTamperData API Key';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Your NoTamperData API Key</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #0033AD, #0066FF); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
        .api-key-box { background: #fff; border: 2px solid #0033AD; border-radius: 8px; padding: 20px; margin: 20px 0; font-family: monospace; word-break: break-all; font-size: 16px; font-weight: bold; color: #0033AD; }
        .details { background: #fff; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
        .detail-row:last-child { border-bottom: none; }
        .warning { background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 15px; border-radius: 8px; margin: 20px 0; }
        .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🔑 Your NoTamperData API Key</h1>
        <p>Your payment has been processed successfully!</p>
      </div>
      
      <div class="content">
        <h2>API Key Details</h2>
        
        <div class="api-key-box">
          ${apiKey}
        </div>
        
        <div class="warning">
          <strong>⚠️ Important:</strong> Store this API key securely. You will need it to access NoTamperData storage services. This email is the only time we will send you this key.
        </div>
        
        <div class="details">
          <h3>Payment Summary</h3>
          <div class="detail-row">
            <span><strong>ADA Paid:</strong></span>
            <span>${adaAmount} ADA</span>
          </div>
          <div class="detail-row">
            <span><strong>Tokens Received:</strong></span>
            <span>${tokenAmount} tokens</span>
          </div>
          <div class="detail-row">
            <span><strong>Exchange Rate:</strong></span>
            <span>1 ADA = 1 token</span>
          </div>
          <div class="detail-row">
            <span><strong>Transaction Hash:</strong></span>
            <span style="font-family: monospace; font-size: 12px; word-break: break-all;">${transactionHash}</span>
          </div>
        </div>
        
        <h3>Using Your API Key</h3>
        <p>Include your API key in your requests using one of these methods:</p>
        <ul>
          <li><strong>Authorization Header:</strong> <code>Authorization: Bearer ${apiKey}</code></li>
          <li><strong>API Key Header:</strong> <code>X-API-Key: ${apiKey}</code></li>
        </ul>
        
        <h3>API Usage</h3>
        <ul>
          <li><strong>Storage Cost:</strong> 1 token per hash storage request</li>
          <li><strong>Verification:</strong> Free (no API key required)</li>
          <li><strong>Status Check:</strong> Check your remaining tokens anytime</li>
        </ul>
        
        <h3>Getting Started</h3>
        <ol>
          <li>Visit our documentation at <a href="https://notamperdata.vercel.app/docs">notamperdata.vercel.app/docs</a></li>
          <li>Install our Google Forms add-on from the Workspace Marketplace</li>
          <li>Configure the add-on with your API key</li>
          <li>Start storing form response hashes on the blockchain!</li>
        </ol>
      </div>
      
      <div class="footer">
        <p>Need help? Contact us at <a href="mailto:johnndigirigi01@gmail.com">johnndigirigi01@gmail.com</a></p>
        <p>© 2025 NoTamperData - Blockchain-based form verification</p>
      </div>
    </body>
    </html>
  `;
  
  const text = `
Your NoTamperData API Key

API Key: ${apiKey}

IMPORTANT: Store this API key securely. You will need it to access NoTamperData storage services.

Payment Summary:
- ADA Paid: ${adaAmount} ADA
- Tokens Received: ${tokenAmount} tokens
- Exchange Rate: 1 ADA = 1 token
- Transaction Hash: ${transactionHash}

Using Your API Key:
Include your API key in requests using:
- Authorization Header: Authorization: Bearer ${apiKey}
- API Key Header: X-API-Key: ${apiKey}

API Usage:
- Storage Cost: 1 token per hash storage request
- Verification: Free (no API key required)
- Status Check: Check your remaining tokens anytime

Getting Started:
1. Visit our documentation at https://notamperdata.vercel.app/docs
2. Install our Google Forms add-on from the Workspace Marketplace
3. Configure the add-on with your API key
4. Start storing form response hashes on the blockchain!

Need help? Contact us at johnndigirigi01@gmail.com

© 2025 NoTamperData - Blockchain-based form verification
  `;

  return { subject, html, text };
}

/**
 * Send API key notification email using fetch (no external dependencies)
 * This is a placeholder implementation that logs the email content
 * Replace this with actual email service integration when needed
 */
export async function sendApiKeyEmail(
  email: string,
  apiKey: string,
  data: ApiKeyEmailData
): Promise<void> {
  console.log(`📧 Preparing to send API key email to: ${email}`);

  // Get email configuration
  const config = getEmailConfig();
  if (!config) {
    console.warn('⚠️ Email service not configured - API key will be returned but not emailed');
    return;
  }

  // Generate email content
  const { subject, html, text } = generateApiKeyEmailTemplate(apiKey, data);

  // For now, we'll log the email content instead of actually sending it
  // Replace this with actual email service integration
  console.log('📧 Email content prepared:', {
    to: email,
    subject,
    htmlLength: html.length,
    textLength: text.length
  });

  // TODO: Implement actual email sending when email service is configured
  // Example implementations:
  
  // For SendGrid (when @sendgrid/mail is installed):
  // const sgMail = require('@sendgrid/mail');
  // sgMail.setApiKey(config.apiKey);
  // await sgMail.send({ to: email, from: config.fromEmail, subject, html, text });

  // For Resend (when resend is installed):
  // const { Resend } = require('resend');
  // const resend = new Resend(config.apiKey);
  // await resend.emails.send({ from: config.fromEmail, to: email, subject, html, text });

  // For now, simulate email sending
  await new Promise(resolve => setTimeout(resolve, 100));
  
  console.log(`✅ Email prepared for delivery to: ${email}`);
  console.log('📧 To enable actual email delivery, install and configure an email service provider');
}

/**
 * Validate email address format
 * @param email - Email address to validate
 * @returns boolean indicating if email is valid
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Get email service status and configuration
 */
export function getEmailServiceStatus(): {
  configured: boolean;
  provider: string;
  fromEmail?: string;
  fromName?: string;
} {
  const config = getEmailConfig();
  const provider = process.env.EMAIL_PROVIDER || 'placeholder';

  return {
    configured: !!config,
    provider,
    fromEmail: config?.fromEmail,
    fromName: config?.fromName
  };
}