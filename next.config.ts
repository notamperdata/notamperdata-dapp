import type { NextConfig } from "next";
import webpack from "webpack";

const nextConfig: NextConfig = {
  // Explicitly define environment variables for production
  env: {
    BLOCKFROST_PROJECT_ID: process.env.BLOCKFROST_PROJECT_ID,
    PLATFORM_WALLET_MNEMONIC: process.env.PLATFORM_WALLET_MNEMONIC,
    CONTRACT_ADDRESS: process.env.CONTRACT_ADDRESS,
    CARDANO_NETWORK: process.env.CARDANO_NETWORK,
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
        'process.env.BLOCKFROST_PROJECT_ID': JSON.stringify(process.env.BLOCKFROST_PROJECT_ID),
        'process.env.PLATFORM_WALLET_MNEMONIC': JSON.stringify(process.env.PLATFORM_WALLET_MNEMONIC),
        'process.env.CONTRACT_ADDRESS': JSON.stringify(process.env.CONTRACT_ADDRESS),
        'process.env.CARDANO_NETWORK': JSON.stringify(process.env.CARDANO_NETWORK),
      })
    );

    return config;
  }
};

export default nextConfig;