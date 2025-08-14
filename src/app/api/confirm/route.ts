// src/app/api/payment/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { ApiKeyManager } from '@/lib/ApiKeyManager';
import { sendApiKeyEmail } from '@/lib/emailService';
import dbConnect from '@/lib/mongodb';

interface PaymentConfirmRequest {
  txHash: string;
  adaAmount: number;
  tokenAmount: number;
  email?: string;
  networkId?: number;
}

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body: PaymentConfirmRequest = await request.json();
    
    // Validate required fields
    if (!body.txHash || !body.adaAmount) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: txHash and adaAmount are required' 
        },
        { status: 400 }
      );
    }
    
    // Validate transaction hash format
    if (!/^[a-fA-F0-9]{64}$/.test(body.txHash)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid transaction hash format' 
        },
        { status: 400 }
      );
    }
    
    // Validate amount
    if (body.adaAmount < 1 || body.adaAmount > 1000) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid payment amount. Must be between 1 and 1000 ADA' 
        },
        { status: 400 }
      );
    }
    
    console.log('Processing payment confirmation:', {
      txHash: body.txHash,
      adaAmount: body.adaAmount,
      networkId: body.networkId || 0
    });
    
    // Connect to database
    await dbConnect();
    
    // Create API key using ApiKeyManager
    const apiKeyResult = await ApiKeyManager.createApiKey(
      body.txHash,
      body.adaAmount
    );
    
    if (!apiKeyResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: apiKeyResult.error || 'Failed to create API key' 
        },
        { status: 500 }
      );
    }
    
    let emailSent = false;
    
    // Send email if provided
    if (body.email && apiKeyResult.apiKey) {
      try {
        await sendApiKeyEmail(body.email, apiKeyResult.apiKey, {
          adaAmount: body.adaAmount,
          tokenAmount: body.tokenAmount || body.adaAmount, // 1:1 ratio
          transactionHash: body.txHash
        });
        emailSent = true;
        console.log('API key sent to email:', body.email);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
        // API key is still created successfully
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      apiKey: apiKeyResult.apiKey,
      tokenAmount: body.tokenAmount || body.adaAmount,
      emailSent,
      message: 'API key created successfully',
      network: {
        id: body.networkId || 0,
        name: body.networkId === 1 ? 'Mainnet' : 'Preview Testnet'
      }
    });
    
  } catch (error) {
    console.error('Payment confirmation error:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('duplicate')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Transaction already processed. Please check your existing API keys.' 
          },
          { status: 409 }
        );
      }
      
      if (error.message.includes('database')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database connection error. Please try again later.' 
          },
          { status: 503 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process payment confirmation',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// GET method to check payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const txHash = searchParams.get('txHash');
    const apiKey = searchParams.get('apiKey');
    
    if (!txHash && !apiKey) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either txHash or apiKey parameter is required' 
        },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    if (apiKey) {
      // Get API key status
      const status = await ApiKeyManager.getApiKeyStatus(apiKey);
      
      if (!status.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: status.error || 'API key not found' 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: status.data
      });
    }
    
    // For transaction hash lookup, we would need to add a method to ApiKeyManager
    // to find API key by transaction hash
    return NextResponse.json(
      { 
        success: false, 
        error: 'Transaction lookup not implemented yet' 
      },
      { status: 501 }
    );
    
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to check payment status' 
      },
      { status: 500 }
    );
  }
}