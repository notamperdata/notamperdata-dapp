// app/api/health/route.ts
import { NextRequest, NextResponse } from 'next/server';

/**
 * Health check endpoint for API connectivity and authentication testing.
 * Returns server status and validates API key if provided.
 */

interface HealthResponse {
  status: 'healthy' | 'error';
  timestamp: string;
  version: string;
  environment: string;
  database?: {
    connected: boolean;
    latency?: number;
  };
  authentication?: {
    validated: boolean;
    message: string;
  };
  uptime: number;
}

// Store server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * Validate API key (placeholder implementation)
 * In production, this would check against your API key database/service
 */
function validateApiKey(apiKey: string): { valid: boolean; message: string } {
  if (!apiKey) {
    return { valid: false, message: 'No API key provided' };
  }

  // Placeholder validation - replace with your actual API key validation logic
  // For now, we'll accept any key that starts with 'ak_' and is at least 20 characters
  if (apiKey.startsWith('ak_') && apiKey.length >= 20) {
    return { valid: true, message: 'API key is valid' };
  }

  // Check for test/demo keys
  if (apiKey === 'demo_key_12345' || apiKey === 'test_key_67890') {
    return { valid: true, message: 'Demo API key accepted' };
  }

  return { valid: false, message: 'Invalid API key format or unauthorized key' };
}

/**
 * Test database connectivity
 */
async function testDatabaseConnection(): Promise<{ connected: boolean; latency?: number }> {
  try {
    const startTime = Date.now();
    
    // Try to import and connect to the database
    const dbConnect = (await import('@/lib/mongodb')).default;
    await dbConnect();
    
    const latency = Date.now() - startTime;
    return { connected: true, latency };
  } catch (error) {
    console.error('Database health check failed:', error);
    return { connected: false };
  }
}

export async function GET(request: NextRequest) {
  try {
    const startTime = Date.now();
    
    // Extract API key from headers
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    let apiKey: string | null = null;
    
    // Try to extract API key from Authorization header (Bearer token)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    }
    // Fallback to X-API-Key header
    else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    }

    // Test database connection
    const dbStatus = await testDatabaseConnection();
    
    // Validate API key if provided
    let authStatus: { validated: boolean; message: string } | undefined;
    if (apiKey) {
      const validation = validateApiKey(apiKey);
      authStatus = {
        validated: validation.valid,
        message: validation.message
      };
    }

    const processingTime = Date.now() - startTime;
    const uptime = Math.floor((Date.now() - serverStartTime) / 1000);

    const response: HealthResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      database: dbStatus,
      uptime: uptime
    };

    // Add authentication status if API key was provided
    if (authStatus) {
      response.authentication = authStatus;
    }

    // Determine response status code
    let statusCode = 200;
    
    // If database is not connected, return 503 (Service Unavailable)
    if (!dbStatus.connected) {
      response.status = 'error';
      statusCode = 503;
    }
    
    // If API key was provided but invalid, return 401 (Unauthorized)
    if (authStatus && !authStatus.validated) {
      statusCode = 401;
    }
    
    // If API key was provided but lacks permissions, you could return 403
    // This is where you'd add role-based checks in production

    return NextResponse.json(response, { 
      status: statusCode,
      headers: {
        'X-Response-Time': `${processingTime}ms`,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorResponse: HealthResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      uptime: Math.floor((Date.now() - serverStartTime) / 1000)
    };

    return NextResponse.json(errorResponse, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  // POST method for more detailed health checks or authentication testing
  try {
    const body = await request.json().catch(() => ({}));
    const { includeDetailed = false } = body;
    
    // Extract API key
    const authHeader = request.headers.get('authorization');
    const apiKeyHeader = request.headers.get('x-api-key');
    
    let apiKey: string | null = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      apiKey = authHeader.substring(7);
    } else if (apiKeyHeader) {
      apiKey = apiKeyHeader;
    }

    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        message: 'API key is required for detailed health check',
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Validate API key
    const validation = validateApiKey(apiKey);
    if (!validation.valid) {
      return NextResponse.json({
        status: 'error',
        message: validation.message,
        timestamp: new Date().toISOString()
      }, { status: 401 });
    }

    // Perform detailed health checks
    const dbStatus = await testDatabaseConnection();
    
    const detailedResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.1.0',
      environment: process.env.NODE_ENV || 'development',
      authentication: {
        validated: true,
        message: validation.message
      },
      database: dbStatus,
      uptime: Math.floor((Date.now() - serverStartTime) / 1000),
      ...(includeDetailed && {
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          memory: process.memoryUsage(),
          pid: process.pid
        }
      })
    };

    return NextResponse.json(detailedResponse, {
      status: dbStatus.connected ? 200 : 503
    });
  } catch (error) {
    console.error('Detailed health check error:', error);
    
    return NextResponse.json({
      status: 'error',
      message: 'Internal server error during health check',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}