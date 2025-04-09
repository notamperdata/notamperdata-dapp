// app/api/createhash/route.ts
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

/**
 * Creates a deterministic hash from input data, matching the algorithm 
 * used in the Google Forms add-on and verification UI.
 * 
 * @param data - The data to hash
 * @returns SHA-256 hash of the data as a hex string
 */
function createDeterministicHash(data: unknown): string {
  // Convert to string in a deterministic way (stable ordering of keys)
  const jsonString = JSON.stringify(data, function(key, value) {
    // Handle arrays to ensure consistent ordering
    if (Array.isArray(value)) {
      // Sort simple arrays by their string representation
      if (value.every(item => typeof item !== 'object')) {
        return [...value].sort();
      }
      
      // For arrays of objects, sort by stringifying their contents
      return value.map(item => JSON.stringify(item)).sort().map(item => {
        try {
          return JSON.parse(item);
        } catch (_error) {
            console.log(_error)
          return item;
        }
      });
    }
    
    // Handle objects to ensure consistent key ordering
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((obj: Record<string, unknown>, k) => {
        obj[k] = value[k];
        return obj;
      }, {});
    }
    
    return value;
  });
  
  // Create SHA-256 hash of the JSON string
  const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
  return hash;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, plainText } = body;
    
    if (!data && !plainText) {
      return NextResponse.json(
        { error: 'Missing data or plainText field' },
        { status: 400 }
      );
    }
    
    // If plainText is provided, use it directly
    // Otherwise, use the data object
    const valueToHash = plainText || data;
    
    // Generate hash
    const hash = createDeterministicHash(valueToHash);
    
    // Create template metadata
    const metadata = {
      formId: "template-form-id",
      responseId: `test-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    // Return generated hash and template metadata
    return NextResponse.json({
      success: true,
      hash: hash,
      metadata: metadata,
      originalValue: valueToHash
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Error generating hash', message: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const textParam = request.nextUrl.searchParams.get('text');
  
  if (!textParam) {
    return NextResponse.json(
      { error: 'Missing text parameter' },
      { status: 400 }
    );
  }
  
  try {
    // Generate hash from URL parameter
    const hash = createDeterministicHash(textParam);
    
    // Create template metadata
    const metadata = {
      formId: "template-form-id",
      responseId: `test-${Date.now()}`,
      timestamp: new Date().toISOString()
    };
    
    // Return generated hash and template metadata
    return NextResponse.json({
      success: true,
      hash: hash,
      metadata: metadata,
      originalValue: textParam
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Error generating hash', message: (error as Error).message },
      { status: 500 }
    );
  }
}