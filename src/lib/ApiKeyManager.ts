// src/lib/apiKeyManager.ts
import crypto from 'crypto';
import ApiKey, { IApiKey, IApiKeyModel } from '@/models/ApiKey';

export interface ApiKeyCreateResult {
  success: boolean;
  apiKey?: string;
  error?: string;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  remainingTokens?: number;
  error?: string;
}

export interface ApiKeyStatusResult {
  success: boolean;
  data?: {
    apiKeyId: string;
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

export class ApiKeyManager {
  // Exchange rate: 1 ADA = 1 token
  private static readonly ADA_TO_TOKEN_RATE = 1;
  
  // Minimum payment amount in ADA
  private static readonly MIN_ADA_AMOUNT = 1;

  /**
   * Generate API key ID in format ak_randomstring
   * Uses 16 random hexadecimal characters after 'ak_'
   */
  static generateApiKeyId(): string {
    const randomBytes = crypto.randomBytes(8); // 8 bytes = 16 hex chars
    const randomString = randomBytes.toString('hex');
    return `ak_${randomString}`;
  }

  /**
   * Create API key after successful payment verification
   * @param txHash - Cardano transaction hash
   * @param adaAmount - Amount of ADA paid
   * @returns Promise with creation result
   */
  static async createApiKey(
    txHash: string,
    adaAmount: number
  ): Promise<ApiKeyCreateResult> {
    try {
      console.log(`Creating API key for tx: ${txHash}, amount: ${adaAmount} ADA`);

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
      const existingKey = await ApiKey.findOne({ txHash });
      if (existingKey) {
        console.log(`Transaction ${txHash} already used for API key ${existingKey.apiKeyId}`);
        return { 
          success: false, 
          error: 'Transaction hash already used for API key generation' 
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

      // Generate unique API key ID
      let apiKeyId: string;
      let attempts = 0;
      const maxAttempts = 10;

      do {
        apiKeyId = this.generateApiKeyId();
        attempts++;
        
        if (attempts > maxAttempts) {
          return { 
            success: false, 
            error: 'Failed to generate unique API key after multiple attempts' 
          };
        }
      } while (await ApiKey.findOne({ apiKeyId }));

      // Create new API key record
      const newApiKey = new ApiKey({
        apiKeyId,
        txHash,
        adaAmount,
        tokenAmount,
        remainingTokens: tokenAmount,
        isActive: true
      });

      await newApiKey.save();

      console.log(`API key created successfully: ${apiKeyId} with ${tokenAmount} tokens`);

      return { 
        success: true, 
        apiKey: apiKeyId 
      };

    } catch (error) {
      console.error('Error creating API key:', error);
      
      // Handle specific MongoDB errors
      if (error instanceof Error) {
        if (error.message.includes('duplicate key')) {
          return { 
            success: false, 
            error: 'Transaction already processed or API key collision' 
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
        error: 'Internal error during API key creation' 
      };
    }
  }

  /**
   * Validate API key and consume specified number of tokens
   * @param apiKeyId - The API key to validate
   * @param tokensToConsume - Number of tokens to consume (default: 1)
   * @returns Promise with validation result
   */
  static async validateAndConsumeToken(
    apiKeyId: string,
    tokensToConsume: number = 1
  ): Promise<ApiKeyValidationResult> {
    try {
      console.log(`Validating API key: ${apiKeyId}, consuming ${tokensToConsume} tokens`);

      // Validate API key format
      if (!apiKeyId || !/^ak_[a-zA-Z0-9]{16}$/.test(apiKeyId)) {
        return { 
          valid: false, 
          error: 'Invalid API key format. Expected format: ak_[16 alphanumeric characters]' 
        };
      }

      // Validate token consumption amount
      if (!Number.isInteger(tokensToConsume) || tokensToConsume < 1) {
        return { 
          valid: false, 
          error: 'Invalid token consumption amount' 
        };
      }

      // Find active API key with sufficient tokens
      const apiKey = await ApiKey.findOne({
        apiKeyId,
        isActive: true,
        remainingTokens: { $gte: tokensToConsume }
      });

      if (!apiKey) {
        // Check if key exists but is inactive or has no tokens
        const inactiveKey = await ApiKey.findOne({ apiKeyId });
        
        if (!inactiveKey) {
          return { 
            valid: false, 
            error: 'API key not found' 
          };
        }
        
        if (!inactiveKey.isActive) {
          return { 
            valid: false, 
            error: 'API key is disabled' 
          };
        }
        
        if (inactiveKey.remainingTokens < tokensToConsume) {
          return { 
            valid: false, 
            error: `Insufficient tokens. Required: ${tokensToConsume}, Available: ${inactiveKey.remainingTokens}` 
          };
        }
      }

      // Consume tokens atomically
      const updateResult = await ApiKey.findOneAndUpdate(
        {
          apiKeyId,
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
          error: 'Failed to consume tokens. Key may have been used by another request.' 
        };
      }

      console.log(`Tokens consumed successfully. Remaining: ${updateResult.remainingTokens}`);

      return {
        valid: true,
        remainingTokens: updateResult.remainingTokens
      };

    } catch (error) {
      console.error('Error validating API key:', error);
      return { 
        valid: false, 
        error: 'Internal error during API key validation' 
      };
    }
  }

  /**
   * Get API key status and usage information
   * @param apiKeyId - The API key to check
   * @returns Promise with status result
   */
  static async getApiKeyStatus(apiKeyId: string): Promise<ApiKeyStatusResult> {
    try {
      console.log(`Getting status for API key: ${apiKeyId}`);

      // Validate API key format
      if (!apiKeyId || !/^ak_[a-zA-Z0-9]{16}$/.test(apiKeyId)) {
        return { 
          success: false, 
          error: 'Invalid API key format' 
        };
      }

      const apiKey = await ApiKey.findOne({ apiKeyId });
      
      if (!apiKey) {
        return { 
          success: false, 
          error: 'API key not found' 
        };
      }

      const usedTokens = apiKey.tokenAmount - apiKey.remainingTokens;

      return {
        success: true,
        data: {
          apiKeyId: apiKey.apiKeyId,
          adaAmount: apiKey.adaAmount,
          tokenAmount: apiKey.tokenAmount,
          remainingTokens: apiKey.remainingTokens,
          usedTokens: usedTokens,
          isActive: apiKey.isActive,
          createdAt: apiKey.createdAt,
          lastUsedAt: apiKey.lastUsedAt
        }
      };

    } catch (error) {
      console.error('Error getting API key status:', error);
      return { 
        success: false, 
        error: 'Internal error while retrieving API key status' 
      };
    }
  }

  /**
   * Disable an API key (soft delete)
   * @param apiKeyId - The API key to disable
   * @returns Promise with result
   */
  static async disableApiKey(apiKeyId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`Disabling API key: ${apiKeyId}`);

      const result = await ApiKey.findOneAndUpdate(
        { apiKeyId },
        { 
          isActive: false,
          lastUsedAt: new Date()
        },
        { new: true }
      );

      if (!result) {
        return { 
          success: false, 
          error: 'API key not found' 
        };
      }

      console.log(`API key ${apiKeyId} disabled successfully`);
      return { success: true };

    } catch (error) {
      console.error('Error disabling API key:', error);
      return { 
        success: false, 
        error: 'Internal error while disabling API key' 
      };
    }
  }

  /**
   * Get platform statistics
   * @returns Promise with platform stats
   */
  static async getPlatformStats() {
    try {
      const stats = await ApiKey.getUsageStats();
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
   * Utility method to validate if API key format is correct
   * @param apiKeyId - API key to validate
   * @returns boolean indicating if format is valid
   */
  static isValidApiKeyFormat(apiKeyId: string): boolean {
    return /^ak_[a-zA-Z0-9]{16}$/.test(apiKeyId);
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