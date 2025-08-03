import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import { getALMManagerContract, parseGwei } from '../utils/contracts.js';
import { MonitoringConfig, RebalanceEvent, ExecutorMetrics } from '../types/index.js';

export class ALMExecutor {
  private provider: ethers.Provider;
  private signer: ethers.Signer;
  private almContract: ethers.Contract;
  private config: MonitoringConfig;
  private metrics: ExecutorMetrics;
  private startTime: Date;

  constructor(config: MonitoringConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.signer = new ethers.Wallet(config.privateKey, this.provider);
    this.almContract = getALMManagerContract(config.almManagerAddress, this.signer);
    this.startTime = new Date();
    
    this.metrics = {
      totalRebalances: 0,
      successfulRebalances: 0,
      failedRebalances: 0,
      totalFeesCollected: {
        token0: 0n,
        token1: 0n
      },
      lastRebalanceTime: null,
      uptimeSeconds: 0,
      averageRebalanceTime: 0
    };

    logger.info('ALMExecutor initialized', {
      almManagerAddress: config.almManagerAddress,
      signerAddress: this.signer.address
    });
  }

  async executeRebalance(): Promise<RebalanceEvent> {
    const startTime = Date.now();
    let rebalanceEvent: RebalanceEvent = {
      timestamp: new Date(),
      success: false,
      oldTickLower: 0,
      oldTickUpper: 0,
      newTickLower: 0,
      newTickUpper: 0
    };

    try {
      logger.info('Starting rebalance execution...');

      // Check if contract is paused
      const isPaused = await this.almContract.paused();
      if (isPaused) {
        throw new Error('ALM contract is paused');
      }

      // Get current state before rebalance
      const currentState = await this.almContract.getALMState();
      rebalanceEvent.oldTickLower = currentState.currentTickLower;
      rebalanceEvent.oldTickUpper = currentState.currentTickUpper;

      // Check gas price
      const gasPrice = await this.provider.getFeeData();
      const maxGasPrice = parseGwei(this.config.maxGasPriceGwei.toString());
      
      if (gasPrice.gasPrice && gasPrice.gasPrice > maxGasPrice) {
        throw new Error(`Gas price too high: ${ethers.formatUnits(gasPrice.gasPrice, 'gwei')} gwei`);
      }

      // Prepare transaction options
      const txOptions: any = {};
      if (gasPrice.gasPrice) {
        txOptions.gasPrice = gasPrice.gasPrice;
      }
      if (gasPrice.maxFeePerGas && gasPrice.maxPriorityFeePerGas) {
        txOptions.maxFeePerGas = gasPrice.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = gasPrice.maxPriorityFeePerGas;
      }

      // Execute rebalance
      logger.info('Sending rebalance transaction...', txOptions);
      const tx = await this.almContract.rebalance(txOptions);
      
      logger.info('Rebalance transaction sent', {
        hash: tx.hash,
        gasPrice: gasPrice.gasPrice?.toString(),
        maxFeePerGas: gasPrice.maxFeePerGas?.toString()
      });

      // Wait for confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        // Get new state after rebalance
        const newState = await this.almContract.getALMState();
        
        rebalanceEvent.success = true;
        rebalanceEvent.newTickLower = newState.currentTickLower;
        rebalanceEvent.newTickUpper = newState.currentTickUpper;
        rebalanceEvent.gasUsed = receipt.gasUsed;
        rebalanceEvent.gasPrice = receipt.gasPrice;

        // Update metrics
        this.metrics.totalRebalances++;
        this.metrics.successfulRebalances++;
        this.metrics.lastRebalanceTime = new Date();
        
        const executionTime = Date.now() - startTime;
        this.updateAverageRebalanceTime(executionTime);

        logger.info('Rebalance executed successfully', {
          hash: tx.hash,
          gasUsed: receipt.gasUsed.toString(),
          executionTimeMs: executionTime,
          oldRange: `${rebalanceEvent.oldTickLower} - ${rebalanceEvent.oldTickUpper}`,
          newRange: `${rebalanceEvent.newTickLower} - ${rebalanceEvent.newTickUpper}`
        });

      } else {
        throw new Error(`Transaction failed with status: ${receipt.status}`);
      }

    } catch (error: any) {
      rebalanceEvent.success = false;
      rebalanceEvent.error = error.message;
      
      this.metrics.totalRebalances++;
      this.metrics.failedRebalances++;

      logger.error('Rebalance execution failed', {
        error: error.message,
        executionTimeMs: Date.now() - startTime
      });
    }

    return rebalanceEvent;
  }

  async checkBalance(): Promise<{ address: string; balance: string }> {
    const balance = await this.provider.getBalance(this.signer.address);
    return {
      address: this.signer.address!,
      balance: ethers.formatEther(balance)
    };
  }

  async isContractPaused(): Promise<boolean> {
    try {
      return await this.almContract.paused();
    } catch (error) {
      logger.error('Error checking if contract is paused', error);
      return true; // Assume paused on error for safety
    }
  }

  getMetrics(): ExecutorMetrics {
    this.metrics.uptimeSeconds = Math.floor((Date.now() - this.startTime.getTime()) / 1000);
    return { ...this.metrics };
  }

  updateFeesCollected(amount0: bigint, amount1: bigint): void {
    this.metrics.totalFeesCollected.token0 += amount0;
    this.metrics.totalFeesCollected.token1 += amount1;
  }

  private updateAverageRebalanceTime(newTime: number): void {
    if (this.metrics.successfulRebalances === 1) {
      this.metrics.averageRebalanceTime = newTime;
    } else {
      // Calculate running average
      const totalTime = this.metrics.averageRebalanceTime * (this.metrics.successfulRebalances - 1) + newTime;
      this.metrics.averageRebalanceTime = totalTime / this.metrics.successfulRebalances;
    }
  }

  getSignerAddress(): string {
    return this.signer.address!;
  }
}