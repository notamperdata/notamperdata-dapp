// src/components/wallet/WalletButton.tsx
'use client';

import React from 'react';
import { Wallet, ChevronDown, LogOut } from 'lucide-react';

interface WalletAPI {
  getBalance(): Promise<string>;
  getChangeAddress(): Promise<string>;
  getNetworkId(): Promise<number>;
  signTx(tx: string, partialSign?: boolean): Promise<string>;
  submitTx(tx: string): Promise<string>;
  getUtxos(amount?: string): Promise<string[]>;
  enable(): Promise<WalletAPI>;
  isEnabled(): Promise<boolean>;
}

interface ConnectedWallet {
  name: string;
  api: WalletAPI;
  address: string;
  balance?: string;
  networkId?: number;
}

interface WalletButtonProps {
  connectedWallet: ConnectedWallet | null;
  onToggleModal: () => void;
  onDisconnect: () => void;
}

export default function WalletButton({ connectedWallet, onToggleModal, onDisconnect }: WalletButtonProps) {
  const formatBalance = (balance: string): string => {
    try {
      const ada = parseFloat(balance);
      if (isNaN(ada)) return '0.00 ADA';
      return `${ada.toFixed(2)} ADA`;
    } catch {
      return '0.00 ADA';
    }
  };

  const formatAddress = (address: string): string => {
    if (address.length <= 20) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  if (connectedWallet) {
    return (
      <div className="relative">
        <button
          onClick={onToggleModal}
          className="flex items-center space-x-3 bg-green-50 hover:bg-green-100 border border-green-200 hover:border-green-300 rounded-lg px-4 py-2 transition-colors group"
        >
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-green-600" />
          </div>
          
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-green-900">
                {connectedWallet.name}
              </span>
              <ChevronDown className="w-4 h-4 text-green-600 group-hover:text-green-700" />
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-green-700">
              {connectedWallet.balance && (
                <span className="font-medium">
                  {formatBalance(connectedWallet.balance)}
                </span>
              )}
              <span className="text-green-600">
                {formatAddress(connectedWallet.address)}
              </span>
            </div>
          </div>
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onToggleModal}
      className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 transition-colors font-medium"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}