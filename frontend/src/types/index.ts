export interface ALMState {
  totalLiquidity: string;
  currentTickLower: number;
  currentTickUpper: number;
  lastRebalanceTimestamp: string;
  totalFeesCollected0: string;
  totalFeesCollected1: string;
  rebalanceCount: string;
}

export interface PoolData {
  currentTick: number;
  sqrtPriceX96: string;
  liquidity: string;
}

export interface ALMMetrics {
  currentPosition: {
    tickLower: number;
    tickUpper: number;
    liquidity: string;
    isInRange: boolean;
  };
  performance: {
    totalFeesEarned0: string;
    totalFeesEarned1: string;
    totalFeesEarnedUSD: string;
    rebalanceCount: number;
    successRate: number;
    avgTimeInRange: number;
    currentAPY: number;
  };
  poolData: {
    currentTick: number;
    sqrtPriceX96: string;
    totalLiquidity: string;
    token0Price: string;
  };
}

export interface ContractAddresses {
  almManager: string;
  pool: string;
  token0: string;
  token1: string;
}

export interface RebalanceEvent {
  timestamp: Date;
  success: boolean;
  oldTickLower: number;
  oldTickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  transactionHash?: string;
  gasUsed?: string;
}

export interface ConnectionState {
  isConnected: boolean;
  address?: string;
  networkId?: number;
  error?: string;
}