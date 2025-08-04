import { ethers } from 'ethers';
import { logger } from '../utils/logger';
import { getALMManagerContract, parseGwei } from '../utils/contracts';
import { MonitoringConfig, RebalanceEvent, ExecutorMetrics } from '../types/index';

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

    // Initialize async - we'll log the address later
    this.initializeAsync();
  }

  private async initializeAsync() {
    const signerAddress = await this.signer.getAddress();
    logger.info('ALMExecutor initialized', {
      almManagerAddress: this.config.almManagerAddress,
      signerAddress: signerAddress
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
      const feeData = await this.provider.getFeeData();
      const maxGasPrice = parseGwei(this.config.maxGasPriceGwei.toString());
      
      // Prepare transaction options (use legacy gas pricing for Hardhat)
      const txOptions: any = {};
      
      if (feeData.gasPrice) {
        // Check if gas price is too high
        if (feeData.gasPrice > maxGasPrice) {
          throw new Error(`Gas price too high: ${ethers.formatUnits(feeData.gasPrice, 'gwei')} gwei`);
        }
        // Use legacy gas pricing (works better with Hardhat)
        txOptions.gasPrice = feeData.gasPrice;
      } else if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // Use EIP-1559 gas pricing (for mainnet)
        txOptions.maxFeePerGas = feeData.maxFeePerGas;
        txOptions.maxPriorityFeePerGas = feeData.maxPriorityFeePerGas;
      }

      // Execute rebalance
      logger.info('Sending rebalance transaction...', txOptions);
      
      // Add gas limit to prevent out of gas
      txOptions.gasLimit = 500000;
      
      const tx = await this.almContract.rebalance(txOptions);
      
      logger.info('Rebalance transaction sent', {
        hash: tx.hash,
        gasPrice: feeData.gasPrice?.toString(),
        maxFeePerGas: feeData.maxFeePerGas?.toString()
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
    const address = await this.signer.getAddress();
    const balance = await this.provider.getBalance(address);
    return {
      address: address,
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

  async getSignerAddress(): Promise<string> {
    return await this.signer.getAddress();
  }
}