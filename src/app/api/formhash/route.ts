import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FormHash from '@/models/FormHash';

// Improved error handling in API route
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hash, metadata } = body;
    
    // Basic validation with clear error messages
    if (!hash) {
      console.log('Missing hash in request');
      return NextResponse.json(
        { error: 'Missing required field: hash' },
        { status: 400 }
      );
    }
    
    if (!metadata || !metadata.formId || !metadata.responseId) {
      console.log('Missing required metadata fields');
      return NextResponse.json(
        { error: 'Missing required metadata fields (formId, responseId)' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Store in database
    const formHash = new FormHash({
      hash,
      metadata
    });
    
    await formHash.save();
    console.log(`Hash stored successfully: ${hash}`);
    
    // Return success with useful information
    return NextResponse.json({
      success: true,
      message: 'Hash stored successfully',
      id: formHash._id,
      timestamp: new Date().toISOString()
    });
  } catch (error:any) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error', message: error.message },
      { status: 500 }
    );
  }
}