// src/lib/emailService.ts
/**
 * Email service for sending Access_Tokens to users
 * Updated to support MailerSend integration
 */

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

export interface accessTokenEmailData {
  adaAmount: number;
  tokenAmount: number;
  transactionHash: string;
}

/**
 * Send access token to user via email
 * @param email - Recipient email address
 * @param accessToken - Generated access token
 * @param data - Payment details
 */
export async function sendAccessTokenEmail(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error('Invalid email address');
  }

  console.log('Email service called:', {
    to: email,
    accessToken: accessToken.substring(0, 10) + '...',
    data
  });

  // Check for email service configuration
  const emailProvider = process.env.EMAIL_PROVIDER;
  const emailApiKey = process.env.EMAIL_API_KEY;
  
  if (!emailProvider || !emailApiKey) {
    console.warn('Email service not configured. Skipping email send.');
    console.log('To enable email, set EMAIL_PROVIDER and EMAIL_API_KEY environment variables');
    return;
  }

  // Implement actual email sending based on provider
  switch (emailProvider) {
    case 'mailersend':
      await sendViaMailerSend(email, accessToken, data);
      break;
    case 'sendgrid':
      await sendViaSendGrid(email, accessToken, data);
      break;
    case 'mailgun':
      await sendViaMailgun(email, accessToken, data);
      break;
    case 'smtp':
      await sendViaSMTP(email, accessToken, data);
      break;
    default:
      console.warn(`Unknown email provider: ${emailProvider}`);
      return;
  }
}

// MailerSend implementation
async function sendViaMailerSend(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  try {
    // Initialize MailerSend with API key
    const mailerSend = new MailerSend({
      apiKey: process.env.EMAIL_API_KEY || process.env.MAILERSEND_API_KEY!,
    });

    // Set up sender (must be verified domain)
    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL || 'noreply@yourdomain.com',
      process.env.MAILERSEND_FROM_NAME || 'NoTamperData'
    );

    // Set up recipient
    const recipients = [new Recipient(email, 'Customer')];

    // Create email parameters
    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setSubject('Your NoTamperData Access Token')
      .setHtml(generateEmailHTML(accessToken, data))
      .setText(generateEmailText(accessToken, data));

    // Send the email
    const response = await mailerSend.email.send(emailParams);
    
    console.log('✅ Email sent successfully via MailerSend:', {
      messageId: response.body?.message_id,
      recipient: email
    });

  } catch (error) {
    console.error('❌ Failed to send email via MailerSend:', error);
    throw new Error(`MailerSend email failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// SendGrid implementation stub (for backward compatibility)
async function sendViaSendGrid(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  console.log('SendGrid email would be sent to:', email);
  
  // Example implementation (requires @sendgrid/mail package):
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  
  const msg = {
    to: email,
    from: 'noreply@yourdomain.com',
    subject: 'Your NoTamperData access token',
    text: generateEmailText(accessToken, data),
    html: generateEmailHTML(accessToken, data)
  };
  
  await sgMail.send(msg);
  */
}

// Mailgun implementation stub
async function sendViaMailgun(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  console.log('Mailgun email would be sent to:', email);
}

// SMTP implementation stub
async function sendViaSMTP(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  console.log('SMTP email would be sent to:', email);
}

// Generate email HTML content
function generateEmailHTML(accessToken: string, data: accessTokenEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your NoTamperData Access Token</title>
      <style>
        body { 
          font-family: Arial, sans-serif; 
          line-height: 1.6; 
          color: #333; 
          margin: 0; 
          padding: 0; 
          background-color: #f4f4f4; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 0 10px rgba(0,0,0,0.1); 
        }
        .header { 
          background: linear-gradient(135deg, #0033AD, #0052CC); 
          color: white; 
          padding: 30px 20px; 
          text-align: center; 
        }
        .header h1 { 
          margin: 0; 
          font-size: 24px; 
        }
        .content { 
          padding: 30px 20px; 
        }
        .access-token { 
          background: #f8f9fa; 
          border: 2px solid #0033AD; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 20px 0; 
          font-family: 'Courier New', monospace; 
          font-size: 16px; 
          word-break: break-all; 
          text-align: center; 
          font-weight: bold; 
        }
        .details { 
          background: #f8f9fa; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 20px 0; 
        }
        .details h3 { 
          margin-top: 0; 
          color: #0033AD; 
        }
        .details ul { 
          list-style: none; 
          padding: 0; 
        }
        .details li { 
          padding: 8px 0; 
          border-bottom: 1px solid #e9ecef; 
        }
        .details li:last-child { 
          border-bottom: none; 
        }
        .footer { 
          text-align: center; 
          padding: 20px; 
          background-color: #f8f9fa; 
          color: #666; 
          font-size: 14px; 
        }
        .warning {
          background: #fff3cd;
          border: 1px solid #ffecb5;
          border-radius: 8px;
          padding: 15px;
          margin: 20px 0;
          color: #856404;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🔐 Your NoTamperData Access Token</h1>
        </div>
        
        <div class="content">
          <p>Thank you for your purchase! Your payment has been confirmed and your access token is ready.</p>
          
          <div class="access-token">
            ${accessToken}
          </div>
          
          <div class="warning">
            <strong>⚠️ Important:</strong> Store this access token securely. You'll need it to access the NoTamperData API. Do not share this token with anyone.
          </div>
          
          <div class="details">
            <h3>📋 Transaction Details</h3>
            <ul>
              <li><strong>Amount Paid:</strong> ${data.adaAmount} ADA</li>
              <li><strong>Tokens Received:</strong> ${data.tokenAmount}</li>
              <li><strong>Transaction Hash:</strong> ${data.transactionHash}</li>
              <li><strong>Date:</strong> ${new Date().toLocaleString()}</li>
            </ul>
          </div>
          
          <p>You can now use this access token to authenticate with the NoTamperData API. Check our documentation for integration examples.</p>
        </div>
        
        <div class="footer">
          <p>&copy; 2025 NoTamperData. All rights reserved.</p>
          <p>This is an automated message. Please do not reply to this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Generate email text content (fallback for plain text email clients)
function generateEmailText(accessToken: string, data: accessTokenEmailData): string {
  return `
Your NoTamperData Access Token

Thank you for your purchase! Your payment has been confirmed.

ACCESS TOKEN: ${accessToken}

IMPORTANT: Store this access token securely. You'll need it to access the NoTamperData API.

Transaction Details:
- Amount Paid: ${data.adaAmount} ADA
- Tokens Received: ${data.tokenAmount}
- Transaction Hash: ${data.transactionHash}
- Date: ${new Date().toLocaleString()}

You can now use this access token to authenticate with the NoTamperData API.

---
© 2025 NoTamperData. All rights reserved.
This is an automated message. Please do not reply to this email.
  `;
}

// Export additional utility functions
export const emailUtils = {
  /**
   * Validate email format
   */
  isValidEmail: (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  /**
   * Check if email service is configured
   */
  isEmailServiceConfigured: (): boolean => {
    return !!(process.env.EMAIL_PROVIDER && process.env.EMAIL_API_KEY);
  },

  /**
   * Get configured email provider
   */
  getEmailProvider: (): string | undefined => {
    return process.env.EMAIL_PROVIDER;
  },

  /**
   * Check if MailerSend is properly configured
   */
  isMailerSendConfigured: (): boolean => {
    return !!(
      process.env.EMAIL_PROVIDER === 'mailersend' &&
      (process.env.EMAIL_API_KEY || process.env.MAILERSEND_API_KEY) &&
      (process.env.MAILERSEND_FROM_EMAIL || process.env.EMAIL_FROM)
    );
  }
};