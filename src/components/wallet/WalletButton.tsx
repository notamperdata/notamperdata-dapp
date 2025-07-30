// Updated src/components/wallet/WalletButton.tsx
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

  // Handle button click with proper event handling - use useCallback to prevent re-renders
  const handleButtonClick = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('WalletButton clicked');
    onToggleModal();
  }, [onToggleModal]);

  if (connectedWallet) {
    return (
      <div className="relative">
        <button
          onClick={handleButtonClick}
          className="flex items-center space-x-3 bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border border-green-300 hover:border-green-400 rounded-lg px-4 py-2 transition-all duration-200 group shadow-sm hover:shadow-md"
        >
          <div className="w-8 h-8 bg-gradient-to-br from-green-100 to-emerald-100 rounded-full flex items-center justify-center">
            <Wallet className="w-4 h-4 text-green-700" />
          </div>
          
          <div className="text-left">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold text-green-900">
                {connectedWallet.name}
              </span>
              <ChevronDown className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-colors" />
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-green-700">
              {connectedWallet.balance && (
                <span className="font-medium">
                  {formatBalance(connectedWallet.balance)}
                </span>
              )}
              <span className="text-green-600 font-mono">
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
      onClick={handleButtonClick}
      className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg px-4 py-2 transition-all duration-200 font-medium shadow-md hover:shadow-lg transform hover:scale-105"
    >
      <Wallet className="w-4 h-4" />
      <span>Connect Wallet</span>
      <ChevronDown className="w-4 h-4" />
    </button>
  );
}