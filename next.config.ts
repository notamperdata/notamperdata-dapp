import type { NextConfig } from "next";
import webpack from "webpack";

type SupportedNetwork = 'Preview' | 'Preprod' | 'Mainnet';

const resolveNetwork = (value?: string): SupportedNetwork => {
  const normalized = (value || 'Preview').toLowerCase();
  if (normalized === 'mainnet') return 'Mainnet';
  if (normalized === 'preprod') return 'Preprod';
  return 'Preview';
};

const resolvedNetwork = resolveNetwork(process.env.CARDANO_NETWORK);

const projectIdByNetwork: Record<SupportedNetwork, string | undefined> = {
  Preview: process.env.BLOCKFROST_PROJECT_ID_PREVIEW,
  Preprod: process.env.BLOCKFROST_PROJECT_ID_PREPROD,
  Mainnet: process.env.BLOCKFROST_PROJECT_ID_MAINNET
};

const resolvedPublicBlockfrostProjectId =
  projectIdByNetwork[resolvedNetwork] || process.env.BLOCKFROST_PROJECT_ID;

const nextConfig: NextConfig = {
  // Explicitly define environment variables for production
  env: {
    // Add MONGODB_URI to the environment variables
    MONGODB_URI: process.env.MONGODB_URI,
    BLOCKFROST_PROJECT_ID: process.env.BLOCKFROST_PROJECT_ID,
    BLOCKFROST_PROJECT_ID_PREVIEW: process.env.BLOCKFROST_PROJECT_ID_PREVIEW,
    BLOCKFROST_PROJECT_ID_PREPROD: process.env.BLOCKFROST_PROJECT_ID_PREPROD,
    BLOCKFROST_PROJECT_ID_MAINNET: process.env.BLOCKFROST_PROJECT_ID_MAINNET,
    PLATFORM_WALLET_MNEMONIC: process.env.PLATFORM_WALLET_MNEMONIC,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    CARDANO_NETWORK: process.env.CARDANO_NETWORK,
    // Add client-side accessible network variable
    NEXT_PUBLIC_CARDANO_NETWORK: resolvedNetwork,
    NEXT_PUBLIC_BLOCKFROST_PROJECT_ID: resolvedPublicBlockfrostProjectId,
  },

  // Enable experimental features for WASM support
  experimental: {
    serverComponentsExternalPackages: [
      '@anastasia-labs/cardano-multiplatform-lib-nodejs',
      '@lucid-evolution/lucid',
      '@lucid-evolution/core-types',
      '@lucid-evolution/utils'
    ]
  },
  
  // Webpack configuration to handle WASM files
  webpack: (config, { buildId, dev, isServer, defaultLoaders }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
      syncWebAssembly: true,
      layers: true
    };

    // Add WASM file loading rule
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async'
    });

    // Externalize Cardano libraries for server-side rendering
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        '@anastasia-labs/cardano-multiplatform-lib-nodejs': 'commonjs @anastasia-labs/cardano-multiplatform-lib-nodejs',
        '@lucid-evolution/lucid': 'commonjs @lucid-evolution/lucid'
      });
    }

    // Resolve fallbacks for node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer'),
      process: require.resolve('process/browser'),
      fs: false,
      path: false,
      os: false
    };

    // Add plugins for polyfills
    config.plugins.push(
      new webpack.ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      }),
      // Explicitly define environment variables in webpack
      new webpack.DefinePlugin({
        // Add MONGODB_URI to webpack definitions
        'process.env.MONGODB_URI': JSON.stringify(process.env.MONGODB_URI),
        'process.env.BLOCKFROST_PROJECT_ID': JSON.stringify(process.env.BLOCKFROST_PROJECT_ID),
        'process.env.BLOCKFROST_PROJECT_ID_PREVIEW': JSON.stringify(process.env.BLOCKFROST_PROJECT_ID_PREVIEW),
        'process.env.BLOCKFROST_PROJECT_ID_PREPROD': JSON.stringify(process.env.BLOCKFROST_PROJECT_ID_PREPROD),
        'process.env.BLOCKFROST_PROJECT_ID_MAINNET': JSON.stringify(process.env.BLOCKFROST_PROJECT_ID_MAINNET),
        'process.env.PLATFORM_WALLET_MNEMONIC': JSON.stringify(process.env.PLATFORM_WALLET_MNEMONIC),
        'process.env.CONTRACT_ADDRESS': JSON.stringify(process.env.CONTRACT_ADDRESS),
        'process.env.CARDANO_NETWORK': JSON.stringify(process.env.CARDANO_NETWORK),
        // Client-side accessible environment variables
        'process.env.NEXT_PUBLIC_CARDANO_NETWORK': JSON.stringify(resolvedNetwork),
        'process.env.NEXT_PUBLIC_BLOCKFROST_PROJECT_ID': JSON.stringify(resolvedPublicBlockfrostProjectId),
      })
    );

    return config;
  }
};

export default nextConfig;