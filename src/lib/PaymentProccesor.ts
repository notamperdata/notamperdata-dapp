// src/lib/paymentProcessor.ts
import { 
  Lucid, 
  Blockfrost, 
  LucidEvolution
} from '@lucid-evolution/lucid';
import { loadContractConfig, networkUrls, getNetworkType } from '@/lib/contract';

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
  private lucid: LucidEvolution | null = null;
  private config: ReturnType<typeof loadContractConfig>;
  private platformAddress: string;
  private blockfrostProjectId: string;
  private blockfrostUrl: string;

  constructor() {
    this.config = loadContractConfig();
    this.platformAddress = process.env.PLATFORM_WALLET_ADDRESS || this.config.contractAddress;
    this.blockfrostProjectId = this.config.blockfrostProjectId;
    this.blockfrostUrl = networkUrls[this.config.network];

    console.log(`Payment processor initialized for network: ${this.config.network}`);
    console.log(`Platform address: ${this.platformAddress}`);
  }

  /**
   * Initialize Lucid connection (lazy initialization)
   */
  private async initializeLucid(): Promise<void> {
    if (this.lucid) return;

    try {
      const network = getNetworkType(this.config.network);

      this.lucid = await Lucid(
        new Blockfrost(this.blockfrostUrl, this.blockfrostProjectId),
        network
      );

      console.log('Lucid initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Lucid:', error);
      throw new Error('Failed to initialize blockchain connection');
    }
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
      if (!txHash || !/^[a-fA-F0-9]{64}$/.test(txHash)) {
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

      const adaAmount = Number(totalLovelace) / 1_000_000; // Convert lovelace to ADA

      console.log(`Total lovelace found: ${totalLovelace}`);
      console.log(`ADA amount: ${adaAmount}`);

      // Validate minimum payment
      if (adaAmount < 1) {
        return { 
          valid: false, 
          error: `Minimum 1 ADA payment required. Received: ${adaAmount} ADA` 
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
        }
        
        if (error.message.includes('network')) {
          return { 
            valid: false, 
            error: 'Network error. Please check your connection.' 
          };
        }
      }

      return { 
        valid: false, 
        error: 'Failed to verify payment transaction' 
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
      const response = await fetch(`${this.blockfrostUrl}/txs/${txHash}/utxos`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return { 
            success: false, 
            error: 'Transaction not found. Please wait for confirmation and try again.' 
          };
        }
        
        if (response.status === 429) {
          return { 
            success: false, 
            error: 'Rate limit exceeded. Please try again later.' 
          };
        }

        const errorText = await response.text();
        console.error(`Blockfrost UTXOs API error: ${response.status} - ${errorText}`);
        return { 
          success: false, 
          error: `Blockchain API error: ${response.status}` 
        };
      }

      const data: BlockfrostTxUtxos = await response.json();
      return { success: true, data };

    } catch (error) {
      console.error('Error fetching transaction UTXOs:', error);
      return { 
        success: false, 
        error: 'Failed to fetch transaction details from blockchain' 
      };
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
      const response = await fetch(`${this.blockfrostUrl}/txs/${txHash}`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        console.warn(`Could not fetch transaction details: ${response.status}`);
        return { success: false, error: `API error: ${response.status}` };
      }

      const data: BlockfrostTxDetails = await response.json();
      return { success: true, data };

    } catch (error) {
      console.warn('Error fetching transaction details:', error);
      return { success: false, error: 'Failed to fetch transaction details' };
    }
  }

  /**
   * Get current blockchain tip height
   */
  private async getCurrentBlockHeight(): Promise<number | null> {
    try {
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
      console.warn('Error fetching current block height:', error);
      return null;
    }
  }

  /**
   * Validate platform address format
   */
  static isValidCardanoAddress(address: string): boolean {
    // Basic Cardano address validation
    return address.startsWith('addr_test') || 
           address.startsWith('addr') || 
           address.startsWith('stake_test') || 
           address.startsWith('stake');
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
    return this.config.network;
  }

  /**
   * Validate minimum payment amount
   */
  static isValidPaymentAmount(adaAmount: number): boolean {
    return adaAmount >= 1 && Number.isFinite(adaAmount) && adaAmount > 0;
  }

  /**
   * Convert ADA to Lovelace
   */
  static adaToLovelace(ada: number): bigint {
    return BigInt(Math.floor(ada * 1_000_000));
  }

  /**
   * Convert Lovelace to ADA
   */
  static lovelaceToAda(lovelace: bigint | string): number {
    return Number(lovelace) / 1_000_000;
  }

  /**
   * Batch verify multiple payments (useful for processing queued payments)
   */
  async batchVerifyPayments(txHashes: string[]): Promise<Map<string, PaymentVerificationResult>> {
    const results = new Map<string, PaymentVerificationResult>();
    
    // Process in chunks to avoid rate limiting
    const chunkSize = 5;
    for (let i = 0; i < txHashes.length; i += chunkSize) {
      const chunk = txHashes.slice(i, i + chunkSize);
      
      const chunkPromises = chunk.map(async (txHash) => {
        const result = await this.verifyPayment(txHash);
        return { txHash, result };
      });

      const chunkResults = await Promise.all(chunkPromises);
      chunkResults.forEach(({ txHash, result }) => {
        results.set(txHash, result);
      });

      // Rate limiting delay between chunks
      if (i + chunkSize < txHashes.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }

  /**
   * Health check for payment processor
   * Tests connectivity to Blockfrost API
   */
  async healthCheck(): Promise<{ healthy: boolean; error?: string; network?: string }> {
    try {
      const response = await fetch(`${this.blockfrostUrl}/health`, {
        headers: {
          'project_id': this.blockfrostProjectId
        }
      });

      if (!response.ok) {
        return {
          healthy: false,
          error: `Blockfrost API error: ${response.status}`,
          network: this.config.network
        };
      }

      return {
        healthy: true,
        network: this.config.network
      };

    } catch (error) {
      console.error('Payment processor health check failed:', error);
      return {
        healthy: false,
        error: 'Failed to connect to blockchain API',
        network: this.config.network
      };
    }
  }
}