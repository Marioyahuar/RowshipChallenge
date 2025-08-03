export interface ALMState {
  totalLiquidity: bigint;
  currentTickLower: number;
  currentTickUpper: number;
  lastRebalanceTimestamp: bigint;
  totalFeesCollected0: bigint;
  totalFeesCollected1: bigint;
  rebalanceCount: bigint;
}

export interface PoolData {
  currentTick: number;
  sqrtPriceX96: bigint;
  liquidity: bigint;
}

export interface MonitoringConfig {
  rpcUrl: string;
  privateKey: string;
  poolAddress: string;
  almManagerAddress: string;
  monitoringIntervalMs: number;
  rebalanceThresholdTicks: number;
  maxGasPriceGwei: number;
  minRebalanceIntervalSeconds: number;
}

export interface ExecutorMetrics {
  totalRebalances: number;
  successfulRebalances: number;
  failedRebalances: number;
  totalFeesCollected: {
    token0: bigint;
    token1: bigint;
  };
  lastRebalanceTime: Date | null;
  uptimeSeconds: number;
  averageRebalanceTime: number;
}

export interface RebalanceEvent {
  timestamp: Date;
  success: boolean;
  oldTickLower: number;
  oldTickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  gasUsed?: bigint;
  gasPrice?: bigint;
  error?: string;
}