// src/lib/PaymentProcessor.ts
import { 
  PAYMENT_CONSTANTS, 
  paymentValidation, 
  paymentUtils, 
  transactionMetadata,
  NetworkType} from '@/lib/paymentConfig';

export interface PaymentVerificationResult {
  valid: boolean;
  adaAmount?: number;
  error?: string;
  transactionDetails?: {
    hash: string;
    blockHeight?: number;
    confirmations?: number;
    timestamp?: number;
  };
}

export interface PaymentProcessResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  metadata?: {
    amount: number;
    recipient: string;
    timestamp: number;
  };
}

export interface PaymentRequest {
  walletApi: any;
  amount: number;
  platformAddress: string;
  email?: string;
  metadata?: Record<string, any>;
}

interface BlockfrostTxOutput {
  address: string;
  amount: Array<{
    unit: string;
    quantity: string;
  }>;
  output_index: number;
  data_hash?: string;
}

interface BlockfrostTxUtxos {
  hash: string;
  inputs: BlockfrostTxOutput[];
  outputs: BlockfrostTxOutput[];
}

interface BlockfrostTxDetails {
  hash: string;
  block: string;
  block_height: number;
  block_time: number;
  slot: number;
  index: number;
  output_amount: Array<{
    unit: string;
    quantity: string;
  }>;
  fees: string;
  deposit: string;
  size: number;
  invalid_before?: string;
  invalid_hereafter?: string;
  utxo_count: number;
  withdrawal_count: number;
  mir_cert_count: number;
  delegation_count: number;
  stake_cert_count: number;
  pool_update_count: number;
  pool_retire_count: number;
  asset_mint_or_burn_count: number;
  redeemer_count: number;
  valid_contract: boolean;
}

export class PaymentProcessor {
  private platformAddress: string;
  private blockfrostProjectId: string;
  private blockfrostUrl: string;
  private network: NetworkType;
  private networkId: number;

  constructor() {
    this.network = (process.env.NEXT_PUBLIC_CARDANO_NETWORK as NetworkType) || 'Preview';
    
    // Convert NetworkType to networkId
    this.networkId = this.network === 'Mainnet' ? 1 : 0;
    
    // Use networkId instead of NetworkType for utility functions
    this.platformAddress = paymentUtils.getPlatformAddress(this.networkId);
    this.blockfrostProjectId = process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID || '';
    this.blockfrostUrl = paymentUtils.getBlockfrostUrl(this.networkId);

    console.log(`Payment processor initialized for network: ${this.network}`);
    console.log(`Platform address: ${this.platformAddress}`);

    if (!this.blockfrostProjectId) {
      console.warn('Blockfrost project ID not configured');
    }
  }

  /**
   * Process payment by building and submitting a simple ADA transfer
   * @param request - Payment request details
   * @returns Promise with payment result
   */
  async processPayment(request: PaymentRequest): Promise<PaymentProcessResult> {
    try {
      console.log('Processing payment request:', {
        amount: request.amount,
        platformAddress: request.platformAddress,
        email: request.email
      });

      // Validate payment request
      const validationResult = this.validatePaymentRequest(request);
      if (!validationResult.valid) {
        return {
          success: false,
          error: validationResult.error
        };
      }

      // Build the transaction using the wallet's built-in capabilities
      const txHash = await this.buildAndSubmitTransaction(request);

      console.log(`Payment transaction submitted successfully: ${txHash}`);

      return {
        success: true,
        transactionHash: txHash,
        metadata: {
          amount: request.amount,
          recipient: request.platformAddress,
          timestamp: Date.now()
        }
      };

    } catch (error) {
      console.error('Payment processing failed:', error);
      
      let errorMessage = 'Payment processing failed';
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient funds in wallet';
        } else if (error.message.includes('user rejected') || error.message.includes('cancelled')) {
          errorMessage = 'Transaction was rejected by user';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error occurred';
        } else {
          errorMessage = error.message;
        }
      }

      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Build and submit a simple ADA transfer transaction
   * @param request - Payment request details
   * @returns Promise with transaction hash
   */
  private async buildAndSubmitTransaction(request: PaymentRequest): Promise<string> {
    try {
      // Get wallet UTXOs to check balance
      const utxos = await request.walletApi.getUtxos();
      if (!utxos || utxos.length === 0) {
        throw new Error('No UTXOs available in wallet');
      }

      // Convert amount to lovelace
      const lovelaceAmount = paymentUtils.adaToLovelace(request.amount);

      // For simple transfers, we'll use the wallet's native transaction building
      // Most Cardano wallets have built-in methods for simple transfers
      
      // Check if wallet supports direct transfer
      if (request.walletApi.transfer) {
        // Some wallets support direct transfer methods
        const txHash = await request.walletApi.transfer({
          to: request.platformAddress,
          amount: lovelaceAmount.toString(),
          metadata: request.metadata ? transactionMetadata.createPaymentMetadata(
            request.amount, 
            request.email, 
            this.networkId, // Pass networkId instead of metadata object
            request.metadata
          ) : undefined
        });
        return txHash;
      }

      // Fallback: Build transaction manually using wallet's transaction builder
      const txBuilder = await this.buildTransactionWithWallet(request);
      
      // Sign the transaction
      const signedTx = await request.walletApi.signTx(txBuilder, false);
      
      // Submit the transaction
      const txHash = await request.walletApi.submitTx(signedTx);
      
      return txHash;

    } catch (error) {
      console.error('Transaction building/submission failed:', error);
      throw new Error(`Failed to process transaction: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build transaction using wallet's transaction building capabilities
   * @param request - Payment request details
   * @returns Promise with unsigned transaction
   */
  private async buildTransactionWithWallet(request: PaymentRequest): Promise<string> {
    // This is a simplified approach - different wallets have different APIs
    // In a production environment, you might need to handle different wallet types
    
    const lovelaceAmount = paymentUtils.adaToLovelace(request.amount);
    
    // Basic transaction structure for most Cardano wallets
    const txData = {
      outputs: [{
        address: request.platformAddress,
        amount: {
          lovelace: lovelaceAmount.toString()
        }
      }],
      metadata: request.metadata ? transactionMetadata.createPaymentMetadata(
        request.amount, 
        request.email, 
        this.networkId, // Pass networkId instead of metadata object
        request.metadata
      ) : undefined
    };

    // Most wallets have a buildTx or similar method
    if (request.walletApi.buildTx) {
      return await request.walletApi.buildTx(txData);
    }

    // Fallback for wallets that use different methods
    throw new Error('Wallet does not support required transaction building methods');
  }

  /**
   * Validate payment request
   * @param request - Payment request to validate
   * @returns Validation result
   */
  private validatePaymentRequest(request: PaymentRequest): { valid: boolean; error?: string } {
    // Check wallet API
    if (!request.walletApi) {
      return { valid: false, error: 'Wallet API not provided' };
    }

    // Check amount
    if (!paymentValidation.isValidAmount(request.amount)) {
      return { 
        valid: false, 
        error: `Payment amount must be between ${PAYMENT_CONSTANTS.MIN_PAYMENT_AMOUNT} and ${PAYMENT_CONSTANTS.MAX_PAYMENT_AMOUNT} ADA` 
      };
    }

    // Check platform address
    if (!request.platformAddress || !paymentValidation.isValidAddress(request.platformAddress)) {
      return { valid: false, error: 'Invalid platform address' };
    }

    // Check email format if provided
    if (request.email && !paymentValidation.isValidEmail(request.email)) {
      return { valid: false, error: 'Invalid email format' };
    }

    return { valid: true };
  }

  /**
   * Verify payment transaction and extract ADA amount sent to platform
   * @param txHash - Cardano transaction hash to verify
   * @returns Promise with verification result
   */
  async verifyPayment(txHash: string): Promise<PaymentVerificationResult> {
    try {
      console.log(`Verifying payment transaction: ${txHash}`);
      console.log(`Expected platform address: ${this.platformAddress}`);

      // Validate transaction hash format
      if (!paymentUtils.isValidTxHash(txHash)) {
        return { 
          valid: false, 
          error: 'Invalid transaction hash format. Expected 64 hexadecimal characters.' 
        };
      }

      // Get transaction UTXOs from Blockfrost
      const utxoResult = await this.getTransactionUtxos(txHash);
      if (!utxoResult.success) {
        return { 
          valid: false, 
          error: utxoResult.error 
        };
      }

      const txUtxos = utxoResult.data!;

      // Get additional transaction details
      const detailsResult = await this.getTransactionDetails(txHash);
      const txDetails = detailsResult.success ? detailsResult.data : null;

      // Find outputs sent to platform address
      const platformOutputs = txUtxos.outputs.filter(output => 
        output.address === this.platformAddress
      );

      if (platformOutputs.length === 0) {
        console.log(`No outputs found for platform address: ${this.platformAddress}`);
        console.log('Available output addresses:', txUtxos.outputs.map(o => o.address));
        return { 
          valid: false, 
          error: 'No payment found to platform address' 
        };
      }

      // Calculate total ADA sent to platform address
      const totalLovelace = platformOutputs.reduce((sum, output) => {
        const lovelaceAsset = output.amount.find(asset => asset.unit === 'lovelace');
        const lovelaceAmount = lovelaceAsset ? BigInt(lovelaceAsset.quantity) : BigInt(0);
        return sum + lovelaceAmount;
      }, BigInt(0));

      const adaAmount = paymentUtils.lovelaceToAda(totalLovelace);

      console.log(`Total lovelace found: ${totalLovelace}`);
      console.log(`ADA amount: ${adaAmount}`);

      // Validate minimum payment
      if (!paymentValidation.isValidAmount(adaAmount)) {
        return { 
          valid: false, 
          error: `Payment amount ${adaAmount} ADA is outside valid range (${PAYMENT_CONSTANTS.MIN_PAYMENT_AMOUNT}-${PAYMENT_CONSTANTS.MAX_PAYMENT_AMOUNT} ADA)` 
        };
      }

      // Calculate confirmations if we have block details
      let confirmations: number | undefined;
      if (txDetails?.block_height) {
        try {
          const currentTip = await this.getCurrentBlockHeight();
          if (currentTip) {
            confirmations = currentTip - txDetails.block_height + 1;
          }
        } catch (error) {
          console.warn('Could not calculate confirmations:', error);
        }
      }

      console.log(`Payment verified successfully: ${adaAmount} ADA`);

      return {
        valid: true,
        adaAmount,
        transactionDetails: {
          hash: txHash,
          blockHeight: txDetails?.block_height,
          confirmations,
          timestamp: txDetails?.block_time
        }
      };

    } catch (error) {
      console.error('Error verifying payment:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('rate limit')) {
          return { 
            valid: false, 
            error: 'Rate limit exceeded. Please try again later.'
          };
        } else if (error.message.includes('not found')) {
          return { 
            valid: false, 
            error: 'Transaction not found. Please check the transaction hash.'
          };
        }
      }

      return { 
        valid: false, 
        error: 'Error occurred while verifying payment. Please try again.'
      };
    }
  }

  /**
   * Get transaction UTXOs from Blockfrost API
   */
  private async getTransactionUtxos(txHash: string): Promise<{
    success: boolean;
    data?: BlockfrostTxUtxos;
    error?: string;
  }> {
    try {
      if (!this.blockfrostProjectId) {
        return { success: false, error: 'Blockfrost project ID not configured' };
      }

      const response = await fetch(`${this.blockfrostUrl}/txs/${txHash}/utxos`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { success: false, error: 'Transaction not found' };
        }
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error('Error fetching transaction UTXOs:', error);
      return { success: false, error: 'Failed to fetch transaction data' };
    }
  }

  /**
   * Get transaction details from Blockfrost API
   */
  private async getTransactionDetails(txHash: string): Promise<{
    success: boolean;
    data?: BlockfrostTxDetails;
    error?: string;
  }> {
    try {
      if (!this.blockfrostProjectId) {
        return { success: false, error: 'Blockfrost project ID not configured' };
      }

      const response = await fetch(`${this.blockfrostUrl}/txs/${txHash}`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        return { success: false, error: `API error: ${response.status}` };
      }

      const data = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error('Error fetching transaction details:', error);
      return { success: false, error: 'Failed to fetch transaction details' };
    }
  }

  /**
   * Get current blockchain tip height
   */
  private async getCurrentBlockHeight(): Promise<number | null> {
    try {
      if (!this.blockfrostProjectId) {
        return null;
      }

      const response = await fetch(`${this.blockfrostUrl}/blocks/latest`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      return data.height;

    } catch (error) {
      console.error('Error fetching current block height:', error);
      return null;
    }
  }

  /**
   * Check if transaction is confirmed (has at least 1 confirmation)
   */
  async isTransactionConfirmed(txHash: string): Promise<boolean> {
    try {
      const result = await this.getTransactionDetails(txHash);
      return result.success && !!result.data?.block_height;
    } catch (error) {
      console.error('Error checking transaction confirmation:', error);
      return false;
    }
  }

  /**
   * Get platform address being used
   */
  getPlatformAddress(): string {
    return this.platformAddress;
  }

  /**
   * Get network being used
   */
  getNetwork(): string {
    return this.network;
  }

  /**
   * Health check for payment processor
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string; network?: string }> {
    try {
      if (!this.blockfrostProjectId) {
        return {
          healthy: false,
          error: 'Blockfrost project ID not configured',
          network: this.network
        };
      }

      const response = await fetch(`${this.blockfrostUrl}/health`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `Blockfrost API error: ${response.status}`,
          network: this.network
        };
      }

      return {
        healthy: true,
        network: this.network
      };

    } catch (error) {
      console.error('Payment processor health check failed:', error);
      return {
        healthy: false,
        error: 'Failed to connect to blockchain API',
        network: this.network
      };
    }
  }
}