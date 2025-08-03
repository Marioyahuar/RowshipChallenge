import { ethers } from 'ethers';
import { EventEmitter } from 'events';
import { logger } from '../utils/logger.js';
import { getPoolContract, getALMManagerContract } from '../utils/contracts.js';
import { PoolData, ALMState, MonitoringConfig } from '../types/index.js';

export class PoolMonitor extends EventEmitter {
  private provider: ethers.Provider;
  private poolContract: ethers.Contract;
  private almContract: ethers.Contract;
  private config: MonitoringConfig;
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;

  constructor(config: MonitoringConfig) {
    super();
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    
    this.poolContract = getPoolContract(config.poolAddress, this.provider);
    this.almContract = getALMManagerContract(config.almManagerAddress, this.provider);
    
    logger.info('PoolMonitor initialized', {
      poolAddress: config.poolAddress,
      almManagerAddress: config.almManagerAddress
    });
  }

  async start(): Promise<void> {
    if (this.isMonitoring) {
      logger.warn('Pool monitor is already running');
      return;
    }

    logger.info('Starting pool monitor...', {
      interval: this.config.monitoringIntervalMs
    });

    this.isMonitoring = true;
    
    // Initial check
    await this.checkPoolState();
    
    // Set up periodic monitoring
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.checkPoolState();
      } catch (error) {
        logger.error('Error during periodic pool check', error);
      }
    }, this.config.monitoringIntervalMs);

    // Set up event listeners
    this.setupEventListeners();
  }

  async stop(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    logger.info('Stopping pool monitor...');
    this.isMonitoring = false;
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }

    // Remove event listeners
    this.poolContract.removeAllListeners();
    this.almContract.removeAllListeners();
  }

  private async checkPoolState(): Promise<void> {
    try {
      const [poolData, almState] = await Promise.all([
        this.getPoolData(),
        this.getALMState()
      ]);

      logger.debug('Current state', {
        poolTick: poolData.currentTick,
        almRange: `${almState.currentTickLower} - ${almState.currentTickUpper}`,
        almLiquidity: almState.totalLiquidity.toString()
      });

      // Check if rebalance is needed
      const needsRebalance = this.shouldRebalance(poolData, almState);
      
      if (needsRebalance) {
        logger.info('Rebalance needed', {
          currentTick: poolData.currentTick,
          almTickLower: almState.currentTickLower,
          almTickUpper: almState.currentTickUpper
        });
        
        this.emit('rebalanceNeeded', { poolData, almState });
      }

      // Emit state update
      this.emit('stateUpdate', { poolData, almState });

    } catch (error) {
      logger.error('Error checking pool state', error);
      this.emit('error', error);
    }
  }

  private setupEventListeners(): void {
    // Listen to pool swap events
    this.poolContract.on('Swap', (sender, recipient, amount0, amount1, sqrtPriceX96, liquidity, tick) => {
      logger.debug('Swap event detected', {
        sender,
        recipient,
        amount0: amount0.toString(),
        amount1: amount1.toString(),
        tick
      });
      
      this.emit('swap', {
        sender,
        recipient,
        amount0,
        amount1,
        sqrtPriceX96,
        liquidity,
        tick
      });
    });

    // Listen to ALM rebalance events
    this.almContract.on('Rebalanced', (oldTickLower, oldTickUpper, newTickLower, newTickUpper, liquidityAmount) => {
      logger.info('Rebalance event detected', {
        oldRange: `${oldTickLower} - ${oldTickUpper}`,
        newRange: `${newTickLower} - ${newTickUpper}`,
        liquidity: liquidityAmount.toString()
      });
      
      this.emit('rebalanced', {
        oldTickLower,
        oldTickUpper,
        newTickLower,
        newTickUpper,
        liquidityAmount
      });
    });

    // Listen to fees collected events
    this.almContract.on('FeesCollected', (amount0, amount1) => {
      logger.info('Fees collected', {
        amount0: amount0.toString(),
        amount1: amount1.toString()
      });
      
      this.emit('feesCollected', { amount0, amount1 });
    });
  }

  private shouldRebalance(poolData: PoolData, almState: ALMState): boolean {
    // No liquidity = no need to rebalance
    if (almState.totalLiquidity === 0n) {
      return false;
    }

    // Check if current tick is outside ALM range
    const tickOutOfRange = poolData.currentTick < almState.currentTickLower || 
                          poolData.currentTick >= almState.currentTickUpper;

    // Check minimum time between rebalances
    const timeSinceLastRebalance = Date.now() / 1000 - Number(almState.lastRebalanceTimestamp);
    const minTimeElapsed = timeSinceLastRebalance >= this.config.minRebalanceIntervalSeconds;

    return tickOutOfRange && minTimeElapsed;
  }

  async getPoolData(): Promise<PoolData> {
    const slot0 = await this.poolContract.slot0();
    const liquidity = await this.poolContract.liquidity();
    
    return {
      currentTick: slot0.tick,
      sqrtPriceX96: slot0.sqrtPriceX96,
      liquidity: liquidity
    };
  }

  async getALMState(): Promise<ALMState> {
    const state = await this.almContract.getALMState();
    
    return {
      totalLiquidity: state.totalLiquidity,
      currentTickLower: state.currentTickLower,
      currentTickUpper: state.currentTickUpper,
      lastRebalanceTimestamp: state.lastRebalanceTimestamp,
      totalFeesCollected0: state.totalFeesCollected0,
      totalFeesCollected1: state.totalFeesCollected1,
      rebalanceCount: state.rebalanceCount
    };
  }

  isRunning(): boolean {
    return this.isMonitoring;
  }
}