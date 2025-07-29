// src/app/api/generate-api-key/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PaymentProcessor } from '@/lib/PaymentProccesor';
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import dbConnect from '@/lib/mongodb';

interface GenerateApiKeyRequest {
  txHash: string;
  email?: string;
}

interface GenerateApiKeyResponse {
  success: boolean;
  apiKey?: string;
  tokens?: number;
  adaAmount?: number;
  transactionHash?: string;
  error?: string;
  message?: string;
}

/**
 * POST /api/generate-api-key
 * 
 * Generates API key after payment verification
 * Accepts: txHash, optional email
 * Verifies payment and creates API key
 * Optionally sends email notification
 */
export async function POST(request: NextRequest): Promise<NextResponse<GenerateApiKeyResponse>> {
  try {
    console.log('🔑 Generate API Key - Processing request');

    // Connect to database
    await dbConnect();

    // Parse and validate request
    const requestData: GenerateApiKeyRequest = await request.json();
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

    // Create API key
    console.log('🔑 Creating API key...');
    const createResult = await ApiKeyManager.createApiKey(txHash, adaAmount!);

    if (!createResult.success) {
      console.error(`❌ API key creation failed: ${createResult.error}`);
      return NextResponse.json(
        { 
          success: false, 
          error: createResult.error || 'Failed to create API key' 
        },
        { status: 500 }
      );
    }

    const apiKey = createResult.apiKey!;
    const tokenAmount = Math.floor(adaAmount! * 1); // 1 ADA = 1 token

    console.log(`✅ API key created successfully: ${apiKey} with ${tokenAmount} tokens`);

    // Send email notification if email provided
    if (email) {
      try {
        console.log(`📧 Sending API key to email: ${email}`);
        
        // Import email service dynamically to avoid errors if not configured
        const { sendApiKeyEmail } = await import('@/lib/emailService');
        await sendApiKeyEmail(email, apiKey, {
          adaAmount: adaAmount!,
          tokenAmount,
          transactionHash: txHash
        });
        
        console.log(`✅ Email sent successfully to ${email}`);
      } catch (emailError) {
        console.warn('⚠️ Email sending failed:', emailError);
        // Don't fail the entire request if email fails
        // API key was created successfully, email is optional
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      apiKey,
      tokens: tokenAmount,
      adaAmount: adaAmount!,
      transactionHash: txHash,
      message: 'API key generated successfully',
      ...(email && { emailSent: true })
    });

  } catch (error) {
    console.error('💥 Generate API key error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Internal server error during API key generation', 
        message: errorMessage
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/generate-api-key
 * 
 * Returns information about the API key generation process
 */
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    endpoint: 'generate-api-key',
    method: 'POST',
    description: 'Generate API key after payment verification',
    requiredFields: ['txHash'],
    optionalFields: ['email'],
    exchangeRate: '1 ADA = 1 token',
    minimumPayment: '1 ADA',
    response: {
      success: 'boolean',
      apiKey: 'string (ak_randomstring format)',
      tokens: 'number',
      adaAmount: 'number',
      transactionHash: 'string'
    }
  });
}