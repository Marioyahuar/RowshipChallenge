import { ethers } from 'ethers';

// ALM Manager ABI (simplified)
export const ALM_MANAGER_ABI = [
  "function getALMState() external view returns (tuple(uint128 totalLiquidity, int24 currentTickLower, int24 currentTickUpper, uint256 lastRebalanceTimestamp, uint256 totalFeesCollected0, uint256 totalFeesCollected1, uint256 rebalanceCount))",
  "function getCurrentPoolState() external view returns (tuple(int24 currentTick, uint160 sqrtPriceX96, uint128 liquidity))",
  "function rebalance() external returns (bool success)",
  "function paused() external view returns (bool)",
  "event Rebalanced(int24 oldTickLower, int24 oldTickUpper, int24 newTickLower, int24 newTickUpper, uint128 liquidityAmount)",
  "event FeesCollected(uint256 amount0, uint256 amount1)"
];

// Pool ABI (simplified for monitoring)
export const RAMSES_V3_POOL_ABI = [
  "function slot0() external view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
  "function liquidity() external view returns (uint128)",
  "event Swap(address indexed sender, address indexed recipient, int256 amount0, int256 amount1, uint160 sqrtPriceX96, uint128 liquidity, int24 tick)"
];

export function getALMManagerContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, ALM_MANAGER_ABI, signerOrProvider);
}

export function getPoolContract(address: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(address, RAMSES_V3_POOL_ABI, signerOrProvider);
}

export function formatUnits(value: bigint, decimals: number): string {
  return ethers.formatUnits(value, decimals);
}

export function parseGwei(value: string): bigint {
  return ethers.parseUnits(value, 'gwei');
}