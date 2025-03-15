// app/api/formhash/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FormHash from '@/models/FormHash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hash, metadata } = body;
    
    // Basic validation
    if (!hash || !metadata) {
      return NextResponse.json(
        { error: 'Missing required fields' },
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
    
    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Hash stored successfully',
      id: formHash._id
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}