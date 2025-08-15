// src/app/api/confirm/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { AccessTokenManager } from '@/lib/AccessTokenManager';
import { sendAccessTokenEmail } from '@/lib/emailService';
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
    
    // Create access token using AccessTokenManager
    const accessTokenResult = await AccessTokenManager.createAccessToken(
      body.txHash,
      body.adaAmount
    );
    
    if (!accessTokenResult.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: accessTokenResult.error || 'Failed to create access token' 
        },
        { status: 500 }
      );
    }
    
    let emailSent = false;
    
    // Send email if provided
    if (body.email && accessTokenResult.accessToken) {
      try {
        await sendAccessTokenEmail(body.email, accessTokenResult.accessToken, {
          adaAmount: body.adaAmount,
          tokenAmount: body.tokenAmount || body.adaAmount, // 1:1 ratio
          transactionHash: body.txHash
        });
        emailSent = true;
        console.log('Access token sent to email:', body.email);
      } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Don't fail the request if email fails
        // Access token is still created successfully
      }
    }
    
    // Return success response
    return NextResponse.json({
      success: true,
      accessToken: accessTokenResult.accessToken,
      tokenAmount: body.tokenAmount || body.adaAmount,
      emailSent,
      message: 'Access token created successfully',
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
            error: 'Transaction already processed. Please check your existing access tokens.' 
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
    const accessToken = searchParams.get('accessToken');
    
    if (!txHash && !accessToken) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either txHash or accessToken parameter is required' 
        },
        { status: 400 }
      );
    }
    
    // Connect to database
    await dbConnect();
    
    if (accessToken) {
      // Get access token status
      const status = await AccessTokenManager.getAccessTokenStatus(accessToken);
      
      if (!status.success) {
        return NextResponse.json(
          { 
            success: false, 
            error: status.error || 'Access token not found' 
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        success: true,
        data: status.data
      });
    }
    
    // For transaction hash lookup, we would need to add a method to AccessTokenManager
    // to find access token by transaction hash
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