import { ethers } from 'ethers';

// ALM Manager ABI (simplified for frontend)
export const ALM_MANAGER_ABI = [
  "function getALMState() external view returns (tuple(uint128 totalLiquidity, int24 currentTickLower, int24 currentTickUpper, uint256 lastRebalanceTimestamp, uint256 totalFeesCollected0, uint256 totalFeesCollected1, uint256 rebalanceCount))",
  "function getCurrentPoolState() external view returns (tuple(int24 currentTick, uint160 sqrtPriceX96, uint128 liquidity))",
  "function paused() external view returns (bool)",
  "event Rebalanced(int24 oldTickLower, int24 oldTickUpper, int24 newTickLower, int24 newTickUpper, uint128 liquidityAmount)",
  "event FeesCollected(uint256 amount0, uint256 amount1)"
];

// Pool ABI (simplified)
export const RAMSES_V3_POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
];

// ERC20 ABI (for token info)
export const ERC20_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function decimals() external view returns (uint8)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];

export function getALMManager(address: string, provider: ethers.Provider): ethers.Contract {
  return new ethers.Contract(address, ALM_MANAGER_ABI, provider);
}

export function getPool(address: string, provider: ethers.Provider): ethers.Contract {
  return new ethers.Contract(address, RAMSES_V3_POOL_ABI, provider);
}

export function getERC20(address: string, provider: ethers.Provider): ethers.Contract {
  return new ethers.Contract(address, ERC20_ABI, provider);
}

export function getProvider(rpcUrl?: string): ethers.Provider {
  if (rpcUrl) {
    return new ethers.JsonRpcProvider(rpcUrl);
  }
  
  // Use environment variable or fallback to localhost
  const defaultRpcUrl = import.meta.env.VITE_RPC_URL || 'http://localhost:8545';
  return new ethers.JsonRpcProvider(defaultRpcUrl);
}