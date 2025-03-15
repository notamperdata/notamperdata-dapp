// app/api/verify/route.ts
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import FormHash from '@/models/FormHash';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { hash } = body;
    
    // Basic validation
    if (!hash) {
      return NextResponse.json(
        { error: 'Missing hash' },
        { status: 400 }
      );
    }
    
    await dbConnect();
    
    // Look up hash in database
    const formHash = await FormHash.findOne({ hash });
    
    if (!formHash) {
      return NextResponse.json(
        { verified: false, message: 'Hash not found in records' },
        { status: 404 }
      );
    }
    
    // Return verification result
    return NextResponse.json({
      verified: true,
      message: 'Hash verified successfully',
      metadata: formHash.metadata,
      storedAt: formHash.receivedAt
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}