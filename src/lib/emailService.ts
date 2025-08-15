// src/lib/emailService.ts
/**
 * Email service for sending Access_Tokens to users
 * This is a stub implementation - replace with actual email provider
 */

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
  const emailaccessToken = process.env.EMAIL_Access_Token;
  
  if (!emailProvider || !emailaccessToken) {
    console.warn('Email service not configured. Skipping email send.');
    console.log('To enable email, set EMAIL_PROVIDER and EMAIL_Access_Token environment variables');
    return;
  }

  // Implement actual email sending based on provider
  switch (emailProvider) {
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

// SendGrid implementation stub
async function sendViaSendGrid(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  // TODO: Implement SendGrid integration
  console.log('SendGrid email would be sent to:', email);
  
  // Example implementation (requires @sendgrid/mail package):
  /*
  const sgMail = require('@sendgrid/mail');
  sgMail.setaccessToken(process.env.SENDGRID_Access_Token);
  
  const msg = {
    to: email,
    from: 'noreply@notamperdata.com',
    subject: 'Your NoTamperData access token',
    text: `Your access token: ${accessToken}`,
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
  // TODO: Implement Mailgun integration
  console.log('Mailgun email would be sent to:', email);
}

// SMTP implementation stub
async function sendViaSMTP(
  email: string,
  accessToken: string,
  data: accessTokenEmailData
): Promise<void> {
  // TODO: Implement SMTP integration using nodemailer
  console.log('SMTP email would be sent to:', email);
}

// Generate email HTML content
function generateEmailHTML(accessToken: string, data: accessTokenEmailData): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Your NoTamperData access token</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0033AD; color: white; padding: 20px; text-align: center; }
        .content { background: #f9f9f9; padding: 20px; }
        .access-token { background: #fff; border: 2px solid #0033AD; padding: 15px; margin: 20px 0; font-family: monospace; font-size: 16px; }
        .footer { text-align: center; margin-top: 20px; color: #666; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Your NoTamperData access token</h1>
        </div>
        <div class="content">
          <p>Thank you for your purchase!</p>
          <p>Your access token is:</p>
          <div class="access-token">${accessToken}</div>
          <h3>Transaction Details:</h3>
          <ul>
            <li>Amount Paid: ${data.adaAmount} ADA</li>
            <li>Tokens Received: ${data.tokenAmount}</li>
            <li>Transaction Hash: ${data.transactionHash}</li>
          </ul>
          <p>Store this access token securely. You'll need it to access the NoTamperData API.</p>
        </div>
        <div class="footer">
          <p>&copy; 2025 NoTamperData</p>
        </div>
      </div>
    </body>
    </html>
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
    return !!(process.env.EMAIL_PROVIDER && process.env.EMAIL_Access_Token);
  },

  /**
   * Get configured email provider
   */
  getEmailProvider: (): string | undefined => {
    return process.env.EMAIL_PROVIDER;
  }
};