// Contract addresses - these should be set via environment variables in production
export const CONTRACT_ADDRESSES = {
  ALM_MANAGER: import.meta.env.VITE_ALM_MANAGER_ADDRESS || '0x...',
  POOL: import.meta.env.VITE_POOL_ADDRESS || '0x...',
  TOKEN0: import.meta.env.VITE_FAKE_USDC_ADDRESS || '0x...',
  TOKEN1: import.meta.env.VITE_FAKE_SCUSD_ADDRESS || '0x...',
};

// Debug logging
console.log('Contract Addresses:', CONTRACT_ADDRESSES);

// Network configuration
export const NETWORK_CONFIG = {
  HARDHAT_LOCAL: {
    chainId: 31337,
    name: 'Hardhat Local',
    rpcUrl: 'http://localhost:8545',
    explorerUrl: 'http://localhost:8545',
  },
  SONIC_TESTNET: {
    chainId: 64165,
    name: 'Sonic Testnet',
    rpcUrl: 'https://rpc.testnet.soniclabs.com',
    explorerUrl: 'https://explorer.sonic.global',
  },
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_KEY',
    explorerUrl: 'https://sepolia.etherscan.io',
  },
};

// Update intervals
export const UPDATE_INTERVALS = {
  POOL_DATA: 10000, // 10 seconds
  ALM_STATE: 15000, // 15 seconds
  METRICS: 30000,   // 30 seconds
};

// Token information
export const TOKEN_INFO = {
  FAKE_USDC: {
    symbol: 'fUSDC',
    name: 'Fake USDC',
    decimals: 6,
  },
  FAKE_SCUSD: {
    symbol: 'fscUSD',
    name: 'Fake Shadow USD',
    decimals: 18,
  },
};

// Display constants
export const DISPLAY_PRECISION = {
  PRICE: 6,
  AMOUNT: 4,
  PERCENTAGE: 2,
  APY: 2,
};