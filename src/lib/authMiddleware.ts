/* eslint-disable @typescript-eslint/no-explicit-any */


// src/lib/authMiddleware.ts
import { NextRequest } from 'next/server';
import { AccessTokenManager } from '@/lib/AccessTokenManager';

export interface AuthResult {
  success: boolean;
  accessToken?: string;
  error?: string;
  statusCode?: number;
  remainingTokens?: number;
}

export interface AuthOptions {
  required?: boolean;
  consumeTokens?: number;
  allowDemoKeys?: boolean;
}

/**
 * Extract access token from Authorization header (Bearer token)
 * This follows industry standard security practices
 */
export function extractAccessToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    return token || null;
  }
  return null;
}

/**
 * Validate access token format
 */
export function isValidAccessTokenFormat(accessToken: string): boolean {
  if (!accessToken) return false;
  
  // Standard format: ak_[16 alphanumeric characters]
  if (/^ak_[a-zA-Z0-9]{16}$/.test(accessToken)) {
    return true;
  }
  
  // Demo/test keys (if allowed)
  if (accessToken === 'demo_key_12345' || accessToken === 'test_key_67890') {
    return true;
  }
  
  return false;
}

/**
 * Check if access token is a demo/test key
 */
export function isDemoAccessToken(accessToken: string): boolean {
  return accessToken === 'demo_key_12345' || accessToken === 'test_key_67890';
}

/**
 * Centralized authentication middleware
 * Handles access token extraction, validation, and token consumption
 */
export async function authenticateRequest(
  request: NextRequest,
  options: AuthOptions = {}
): Promise<AuthResult> {
  const {
    required = true,
    consumeTokens = 0,
    allowDemoKeys = false
  } = options;

  try {
    // Extract access token from Authorization header
    const accessToken = extractAccessToken(request);
    
    // Check if access token is required
    if (required && !accessToken) {
      return {
        success: false,
        error: 'Access token is required. Provide via Authorization header: Bearer {accessToken}',
        statusCode: 401
      };
    }
    
    // If access token is optional and not provided, return success
    if (!required && !accessToken) {
      return {
        success: true
      };
    }
    
    // Validate access token format
    if (accessToken && !isValidAccessTokenFormat(accessToken)) {
      return {
        success: false,
        error: 'Invalid access token format. Expected format: ak_[16 alphanumeric characters]',
        statusCode: 401
      };
    }
    
    // Handle demo keys
    if (accessToken && isDemoAccessToken(accessToken)) {
      if (!allowDemoKeys) {
        return {
          success: false,
          error: 'Demo access tokens are not allowed for this endpoint',
          statusCode: 401
        };
      }
      
      // Demo keys have unlimited tokens
      return {
        success: true,
        accessToken,
        remainingTokens: 999999
      };
    }
    
    // For actual access tokens, validate with AccessTokenManager
    if (accessToken) {
      console.log(`🔍 Authenticating access token: ${accessToken.substring(0, 8)}...`);
      
      // Validate and optionally consume tokens
      const validationResult = await AccessTokenManager.validateAndConsumeToken(
        accessToken, 
        consumeTokens
      );
      
      if (!validationResult.valid) {
        console.error(`❌ Access token validation failed: ${validationResult.error}`);
        
        // Determine appropriate status code based on error
        let statusCode = 401;
        if (validationResult.error?.includes('not found')) {
          statusCode = 404;
        } else if (validationResult.error?.includes('disabled')) {
          statusCode = 403;
        } else if (validationResult.error?.includes('Insufficient tokens')) {
          statusCode = 402;
        }
        
        return {
          success: false,
          error: validationResult.error || 'Access token validation failed',
          statusCode
        };
      }
      
      console.log(`✅ Access token validated. Remaining tokens: ${validationResult.remainingTokens}`);
      
      return {
        success: true,
        accessToken,
        remainingTokens: validationResult.remainingTokens
      };
    }
    
    // Should not reach here, but just in case
    return {
      success: false,
      error: 'Unexpected authentication error',
      statusCode: 500
    };
    
  } catch (error) {
    console.error('💥 Authentication error:', error);
    
    return {
      success: false,
      error: 'Internal authentication error',
      statusCode: 500
    };
  }
}

/**
 * Get access token status without consuming tokens
 * Useful for checking token balance before operations
 */
export async function getAccessTokenInfo(
  request: NextRequest
): Promise<AuthResult & { tokenInfo?: any }> {
  try {
    const accessToken = extractAccessToken(request);
    
    if (!accessToken) {
      return {
        success: false,
        error: 'Access token is required',
        statusCode: 401
      };
    }
    
    if (!isValidAccessTokenFormat(accessToken)) {
      return {
        success: false,
        error: 'Invalid access token format',
        statusCode: 401
      };
    }
    
    // Handle demo keys
    if (isDemoAccessToken(accessToken)) {
      return {
        success: true,
        accessToken,
        remainingTokens: 999999,
        tokenInfo: {
          isDemo: true,
          remainingTokens: 999999,
          tokenAmount: 999999,
          usedTokens: 0
        }
      };
    }
    
    // Get status for real access tokens
    const statusResult = await AccessTokenManager.getAccessTokenStatus(accessToken);
    
    if (!statusResult.success) {
      return {
        success: false,
        error: statusResult.error || 'Failed to get access token status',
        statusCode: statusResult.error?.includes('not found') ? 404 : 500
      };
    }
    
    return {
      success: true,
      accessToken,
      remainingTokens: statusResult.data?.remainingTokens,
      tokenInfo: statusResult.data
    };
    
  } catch (error) {
    console.error('💥 Access token info error:', error);
    
    return {
      success: false,
      error: 'Internal error while getting access token info',
      statusCode: 500
    };
  }
}

/**
 * Utility function to create standardized authentication error responses
 */
export function createAuthErrorResponse(authResult: AuthResult) {
  return {
    success: false,
    error: authResult.error,
    statusCode: authResult.statusCode || 401,
    timestamp: new Date().toISOString()
  };
}

/**
 * Helper function for CORS headers that include authentication headers
 */
export function getCorsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400' // 24 hours
  };
}