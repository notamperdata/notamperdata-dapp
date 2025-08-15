// src/lib/AccessTokenManager.ts
import crypto from 'crypto';
import AccessToken from '@/models/AccessToken';

export interface AccessTokenCreateResult {
  success: boolean;
  accessToken?: string;
  error?: string;
}

export interface AccessTokenValidationResult {
  valid: boolean;
  remainingTokens?: number;
  error?: string;
}

export interface AccessTokenStatusResult {
  success: boolean;
  data?: {
    accessTokenId: string;
    adaAmount: number;
    tokenAmount: number;
    remainingTokens: number;
    usedTokens: number;
    isActive: boolean;
    createdAt: Date;
    lastUsedAt?: Date;
  };
  error?: string;
}

export class AccessTokenManager {
  // Exchange rate: 1 ADA = 1 token
  private static readonly ADA_TO_TOKEN_RATE = 1;
  
  // Minimum payment amount in ADA
  private static readonly MIN_ADA_AMOUNT = 1;

  /**
   * Generate access token ID in format ak_randomstring
   * Uses 16 random hexadecimal characters after 'ak_'
   */
  static generateAccessTokenId(): string {
    const randomBytes = crypto.randomBytes(8); // 8 bytes = 16 hex chars
    const randomString = randomBytes.toString('hex');
    return `ak_${randomString}`;
  }

  /**
   * Create access token after successful payment verification
   * @param txHash - Cardano transaction hash
   * @param adaAmount - Amount of ADA paid
   * @returns Promise with creation result
   */
  static async createAccessToken(
    txHash: string,
    adaAmount: number
  ): Promise<AccessTokenCreateResult> {
    try {
      console.log(`Creating access token for tx: ${txHash}, amount: ${adaAmount} ADA`);

      // Validate inputs
      if (!txHash || !/^[a-fA-F0-9]{64}$/.test(txHash)) {
        return { success: false, error: 'Invalid transaction hash format' };
      }

      if (!adaAmount || adaAmount < this.MIN_ADA_AMOUNT) {
        return { 
          success: false, 
          error: `Minimum ${this.MIN_ADA_AMOUNT} ADA required` 
        };
      }

      // Check if transaction already used
      const existingToken = await AccessToken.findOne({ txHash });
      if (existingToken) {
        console.log(`Transaction ${txHash} already used for access token ${existingToken.accessTokenId}`);
        return { 
          success: false, 
          error: 'Transaction hash already used for access token generation' 
        };
      }

      // Calculate tokens (1 ADA = 1 token, rounded down)
      const tokenAmount = Math.floor(adaAmount * this.ADA_TO_TOKEN_RATE);
      
      if (tokenAmount < 1) {
        return { 
          success: false, 
          error: 'Payment amount too small to generate tokens' 
        };
      }

      // Generate unique access token ID
      let accessTokenId: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        accessTokenId = this.generateAccessTokenId();
        attempts++;
        
        if (attempts > maxAttempts) {
          return { 
            success: false, 
            error: 'Failed to generate unique access token after multiple attempts' 
          };
        }
      } while (await AccessToken.findOne({ accessTokenId }));

      // Create new access token record
      const newAccessToken = new AccessToken({
        accessTokenId,
        txHash,
        adaAmount,
        tokenAmount,
        remainingTokens: tokenAmount,
        isActive: true
      });

      await newAccessToken.save();

      console.log(`Access token created successfully: ${accessTokenId} with ${tokenAmount} tokens`);

      return { 
        success: true, 
        accessToken: accessTokenId 
      };

    } catch (error) {
      console.error('Error creating access token:', error);
      
      // Handle specific MongoDB errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          return { 
            success: false, 
            error: 'Transaction already processed or access token collision' 
          };
        }
        
        if (error.message.includes('validation')) {
          return { 
            success: false, 
            error: 'Invalid data format provided' 
          };
        }
      }

      return { 
        success: false, 
        error: 'Internal error during access token creation' 
      };
    }
  }

  /**
   * Validate access token and consume specified number of tokens
   * @param accessTokenId - The access token to validate
   * @param tokensToConsume - Number of tokens to consume (default: 1)
   * @returns Promise with validation result
   */
  static async validateAndConsumeToken(
    accessTokenId: string,
    tokensToConsume: number = 1
  ): Promise<AccessTokenValidationResult> {
    try {
      console.log(`Validating access token: ${accessTokenId}, consuming ${tokensToConsume} tokens`);

      // Validate access token format
      if (!accessTokenId || !/^ak_[a-zA-Z0-9]{16}$/.test(accessTokenId)) {
        return { 
          valid: false, 
          error: 'Invalid access token format. Expected format: ak_[16 alphanumeric characters]' 
        };
      }

      // Validate token consumption amount
      if (!Number.isInteger(tokensToConsume) || tokensToConsume < 1) {
        return { 
          valid: false, 
          error: 'Invalid token consumption amount' 
        };
      }

      // Find active access token with sufficient tokens
      const foundToken = await AccessToken.findOne({
        accessTokenId,
        isActive: true,
        remainingTokens: { $gte: tokensToConsume }
      });

      if (!foundToken) {
        // Check if key exists but is inactive or has no tokens
        const inactiveToken = await AccessToken.findOne({ accessTokenId });
        
        if (!inactiveToken) {
          return { 
            valid: false, 
            error: 'Access token not found' 
          };
        }
        
        if (!inactiveToken.isActive) {
          return { 
            valid: false, 
            error: 'Access token is disabled' 
          };
        }
        
        if (inactiveToken.remainingTokens < tokensToConsume) {
          return { 
            valid: false, 
            error: `Insufficient tokens. Required: ${tokensToConsume}, Available: ${inactiveToken.remainingTokens}` 
          };
        }
      }

      // Consume tokens atomically
      const updateResult = await AccessToken.findOneAndUpdate(
        {
          accessTokenId,
          isActive: true,
          remainingTokens: { $gte: tokensToConsume }
        },
        {
          $inc: { remainingTokens: -tokensToConsume },
          $set: { lastUsedAt: new Date() }
        },
        {
          new: true, // Return updated document
          runValidators: true
        }
      );

      if (!updateResult) {
        return { 
          valid: false, 
          error: 'Failed to consume tokens. Token may have been used by another request.' 
        };
      }

      console.log(`Tokens consumed successfully. Remaining: ${updateResult.remainingTokens}`);

      return {
        valid: true,
        remainingTokens: updateResult.remainingTokens
      };

    } catch (error) {
      console.error('Error validating access token:', error);
      return { 
        valid: false, 
        error: 'Internal error during access token validation' 
      };
    }
  }

  /**
   * Get access token status and usage information
   * @param accessTokenId - The access token to check
   * @returns Promise with status result
   */
  static async getAccessTokenStatus(accessTokenId: string): Promise<AccessTokenStatusResult> {
    try {
      console.log(`Getting status for access token: ${accessTokenId}`);

      // Validate access token format
      if (!accessTokenId || !/^ak_[a-zA-Z0-9]{16}$/.test(accessTokenId)) {
        return { 
          success: false, 
          error: 'Invalid access token format' 
        };
      }

      const foundToken = await AccessToken.findOne({ accessTokenId });
      
      if (!foundToken) {
        return { 
          success: false, 
          error: 'Access token not found' 
        };
      }

      const usedTokens = foundToken.tokenAmount - foundToken.remainingTokens;

      return {
        success: true,
        data: {
          accessTokenId: foundToken.accessTokenId,
          adaAmount: foundToken.adaAmount,
          tokenAmount: foundToken.tokenAmount,
          remainingTokens: foundToken.remainingTokens,
          usedTokens: usedTokens,
          isActive: foundToken.isActive,
          createdAt: foundToken.createdAt,
          lastUsedAt: foundToken.lastUsedAt
        }
      };

    } catch (error) {
      console.error('Error getting access token status:', error);
      return { 
        success: false, 
        error: 'Internal error while retrieving access token status' 
      };
    }
  }

  /**
   * Disable an access token (soft delete)
   * @param accessTokenId - The access token to disable
   * @returns Promise with result
   */
  static async disableAccessToken(accessTokenId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Disabling access token: ${accessTokenId}`);

      const result = await AccessToken.findOneAndUpdate(
        { accessTokenId },
        { 
          isActive: false,
          lastUsedAt: new Date()
        },
        { new: true }
      );

      if (!result) {
        return { 
          success: false, 
          error: 'Access token not found' 
        };
      }

      console.log(`Access token ${accessTokenId} disabled successfully`);
      return { success: true };

    } catch (error) {
      console.error('Error disabling access token:', error);
      return { 
        success: false, 
        error: 'Internal error while disabling access token' 
      };
    }
  }

  /**
   * Get platform statistics
   * @returns Promise with platform stats
   */
  static async getPlatformStats() {
    try {
      const stats = await AccessToken.getUsageStats();
      return {
        success: true,
        data: stats[0] || {
          totalKeys: 0,
          activeKeys: 0,
          totalTokensSold: 0,
          totalTokensUsed: 0,
          totalRevenue: 0
        }
      };
    } catch (error) {
      console.error('Error getting platform stats:', error);
      return {
        success: false,
        error: 'Failed to retrieve platform statistics'
      };
    }
  }

  /**
   * Utility method to validate if access token format is correct
   * @param accessTokenId - Access token to validate
   * @returns boolean indicating if format is valid
   */
  static isValidAccessTokenFormat(accessTokenId: string): boolean {
    return /^ak_[a-zA-Z0-9]{16}$/.test(accessTokenId);
  }

  /**
   * Calculate token amount from ADA payment
   * @param adaAmount - Amount of ADA paid
   * @returns Number of tokens that will be granted
   */
  static calculateTokenAmount(adaAmount: number): number {
    return Math.floor(adaAmount * this.ADA_TO_TOKEN_RATE);
  }
}