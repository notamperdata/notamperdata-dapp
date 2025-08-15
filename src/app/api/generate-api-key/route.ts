// src/app/api/generate-access-token/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessor } from '@/lib/PaymentProccesor';
import { AccessTokenManager } from '@/lib/AccessTokenManager';
import { sendAccessTokenEmail } from '@/lib/emailService';
import dbConnect from '@/lib/mongodb';

interface GenerateaccessTokenRequest {
  txHash: string;
  email?: string;
}

interface GenerateaccessTokenResponse {
  success: boolean;
  accessToken?: string;
  tokens?: number;
  adaAmount?: number;
  transactionHash?: string;
  error?: string;
  message?: string;
}

/**
 * POST /api/generate-access-token
 * 
 * Generates access token after payment verification
 * Accepts: txHash, optional email
 * Verifies payment and creates access token
 * Optionally sends email notification
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateaccessTokenResponse>> {
  try {
    console.log('🔑 Generate access token - Processing request');

    // Connect to database
    await dbConnect();

    // Parse and validate request
    const requestData: GenerateaccessTokenRequest = await request.json();
    const { txHash, email } = requestData;

    // Validate required fields
    if (!txHash) {
      console.error('❌ Transaction hash missing from request');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Transaction hash is required' 
        },
        { status: 400 }
      );
    }

    // Validate transaction hash format
    if (!/^[a-fA-F0-9]{64}$/.test(txHash)) {
      console.error('❌ Invalid transaction hash format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid transaction hash format. Expected 64 hexadecimal characters.' 
        },
        { status: 400 }
      );
    }

    // Validate email format if provided
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('❌ Invalid email format');
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid email format' 
        },
        { status: 400 }
      );
    }

    console.log(`🔍 Verifying payment for transaction: ${txHash}`);

    // Initialize payment processor and verify payment
    const paymentProcessor = new PaymentProcessor();
    const paymentResult = await paymentProcessor.verifyPayment(txHash);

    if (!paymentResult.valid) {
      console.error(`❌ Payment verification failed: ${paymentResult.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: paymentResult.error || 'Payment verification failed' 
        },
        { status: 400 }
      );
    }

    const { adaAmount } = paymentResult;
    console.log(`✅ Payment verified: ${adaAmount} ADA`);

    // Create access token
    console.log('🔑 Creating access token...');
    const createResult = await AccessTokenManager.createAccessToken(txHash, adaAmount!);

    if (!createResult.success) {
      console.error(`❌ access token creation failed: ${createResult.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: createResult.error || 'Failed to create access token' 
        },
        { status: 500 }
      );
    }

    const accessToken = createResult.accessToken!;
    const tokenAmount = Math.floor(adaAmount! * 1); // 1 ADA = 1 token

    console.log(`✅ access token created successfully: ${accessToken} with ${tokenAmount} tokens`);

    // Send email notification if email provided
    if (email) {
      try {
        console.log(`📧 Sending access token to email: ${email}`);
        
        await sendAccessTokenEmail(email, accessToken, {
          adaAmount: adaAmount!,
          tokenAmount,
          transactionHash: txHash
        });
        
        console.log(`✅ Email sent successfully to ${email}`);
      } catch (emailError) {
        console.warn('⚠️ Email sending failed:', emailError);
        // Don't fail the entire request if email fails
        // access token was created successfully, email is optional
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      accessToken,
      tokens: tokenAmount,
      adaAmount: adaAmount!,
      transactionHash: txHash,
      message: 'access token generated successfully',
      ...(email && { emailSent: true })
    });

  } catch (error) {
    console.error('💥 Generate access token error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during access token generation', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-access-token
 * 
 * Returns information about the access token generation process
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'generate-access-token',
    method: 'POST',
    description: 'Generate access token after payment verification',
    requiredFields: ['txHash'],
    optionalFields: ['email'],
    exchangeRate: '1 ADA = 1 token',
    minimumPayment: '1 ADA',
    response: {
      success: 'boolean',
      accessToken: 'string (ak_randomstring format)',
      tokens: 'number',
      adaAmount: 'number',
      transactionHash: 'string'
    }
  });
}