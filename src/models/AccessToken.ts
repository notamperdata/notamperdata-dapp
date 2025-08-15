// src/models/accessToken.ts
import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IaccessToken extends Document {
  accessTokenId: string;        // Format: ak_randomstring (16 chars after ak_)
  txHash: string;          // Cardano transaction hash (64 hex chars)
  adaAmount: number;       // ADA amount paid (decimal)
  tokenAmount: number;     // Total tokens purchased (integer)
  remainingTokens: number; // Tokens remaining (integer)
  isActive: boolean;       // Whether access token is active
  createdAt: Date;         // Creation timestamp
  lastUsedAt?: Date;       // Last usage timestamp
  
  // Instance methods
  hasTokens(): boolean;
  consumeTokens(amount?: number): boolean;
}

// Interface for static methods
export interface IaccessTokenModel extends Model<IaccessToken> {
  findActiveKey(accessTokenId: string): Promise<IaccessToken | null>;
  getUsageStats(): Promise<Array<{
    _id: null;
    totalKeys: number;
    activeKeys: number;
    totalTokensSold: number;
    totalTokensUsed: number;
    totalRevenue: number;
  }>>;
}

const accessTokenSchema = new Schema<IaccessToken>({
  accessTokenId: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^ak_[a-zA-Z0-9]{16}$/.test(v);
      },
      message: 'access token must be in format ak_[16 alphanumeric characters]'
    }
  },
  txHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
    validate: {
      validator: function(v: string) {
        return /^[a-fA-F0-9]{64}$/.test(v);
      },
      message: 'Transaction hash must be 64 hexadecimal characters'
    }
  },
  adaAmount: {
    type: Number,
    required: true,
    min: [1, 'Minimum 1 ADA required'],
    validate: {
      validator: function(v: number) {
        return v > 0 && Number.isFinite(v);
      },
      message: 'ADA amount must be a positive finite number'
    }
  },
  tokenAmount: {
    type: Number,
    required: true,
    min: [1, 'Minimum 1 token required'],
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v > 0;
      },
      message: 'Token amount must be a positive integer'
    }
  },
  remainingTokens: {
    type: Number,
    required: true,
    min: [0, 'Remaining tokens cannot be negative'],
    validate: {
      validator: function(v: number) {
        return Number.isInteger(v) && v >= 0;
      },
      message: 'Remaining tokens must be a non-negative integer'
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastUsedAt: {
    type: Date,
    index: true
  }
});

// Compound indexes for performance optimization
accessTokenSchema.index({ accessTokenId: 1, isActive: 1 });
accessTokenSchema.index({ txHash: 1, isActive: 1 });
accessTokenSchema.index({ remainingTokens: 1, isActive: 1 });
accessTokenSchema.index({ createdAt: -1 }); // For chronological queries

// Pre-save middleware to ensure remainingTokens <= tokenAmount
accessTokenSchema.pre('save', function(next) {
  if (this.remainingTokens > this.tokenAmount) {
    this.remainingTokens = this.tokenAmount;
  }
  next();
});

// Instance method to check if access token has tokens
accessTokenSchema.methods.hasTokens = function(): boolean {
  return this.isActive && this.remainingTokens > 0;
};

// Instance method to consume tokens
accessTokenSchema.methods.consumeTokens = function(amount: number = 1): boolean {
  if (!this.hasTokens() || this.remainingTokens < amount) {
    return false;
  }
  
  this.remainingTokens -= amount;
  this.lastUsedAt = new Date();
  return true;
};

// Static method to find active access token
accessTokenSchema.statics.findActiveKey = function(accessTokenId: string) {
  return this.findOne({
    accessTokenId,
    isActive: true,
    remainingTokens: { $gt: 0 }
  });
};

// Static method to get usage statistics
accessTokenSchema.statics.getUsageStats = function() {
  return this.aggregate([
    {
      $group: {
        _id: null,
        totalKeys: { $sum: 1 },
        activeKeys: {
          $sum: {
            $cond: [
              { $and: [{ $eq: ["$isActive", true] }, { $gt: ["$remainingTokens", 0] }] },
              1,
              0
            ]
          }
        },
        totalTokensSold: { $sum: "$tokenAmount" },
        totalTokensUsed: { $sum: { $subtract: ["$tokenAmount", "$remainingTokens"] } },
        totalRevenue: { $sum: "$adaAmount" }
      }
    }
  ]);
};

// Check if the model is already defined to prevent overwriting
const accessToken = (mongoose.models.accessToken as IaccessTokenModel) || 
  mongoose.model<IaccessToken, IaccessTokenModel>('accessToken', accessTokenSchema);

export default accessToken;