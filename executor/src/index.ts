import * as dotenv from 'dotenv';
import { logger } from './utils/logger.js';
import { PoolMonitor } from './services/PoolMonitor.js';
import { ALMExecutor } from './services/ALMExecutor.js';
import { MetricsCollector } from './services/MetricsCollector.js';
import { MonitoringConfig } from './types/index.js';

// Load environment variables
dotenv.config();

function loadConfig(): MonitoringConfig {
  const config: MonitoringConfig = {
    rpcUrl: process.env.RPC_URL || 'https://rpc.testnet.soniclabs.com',
    privateKey: process.env.PRIVATE_KEY || '',
    poolAddress: process.env.POOL_ADDRESS || '',
    almManagerAddress: process.env.ALM_MANAGER_ADDRESS || '',
    monitoringIntervalMs: parseInt(process.env.MONITORING_INTERVAL_MS || '10000'),
    rebalanceThresholdTicks: parseInt(process.env.REBALANCE_THRESHOLD_TICKS || '1'),
    maxGasPriceGwei: parseInt(process.env.MAX_GAS_PRICE_GWEI || '50'),
    minRebalanceIntervalSeconds: parseInt(process.env.MIN_REBALANCE_INTERVAL_SECONDS || '60')
  };

  // Validate required config
  const requiredFields = ['privateKey', 'poolAddress', 'almManagerAddress'];
  for (const field of requiredFields) {
    if (!config[field as keyof MonitoringConfig]) {
      throw new Error(`Missing required environment variable: ${field.toUpperCase()}`);
    }
  }

  return config;
}

async function main() {
  try {
    logger.info('Starting ALM Executor Service...');
    
    // Load configuration
    const config = loadConfig();
    logger.info('Configuration loaded', {
      rpcUrl: config.rpcUrl,
      poolAddress: config.poolAddress,
      almManagerAddress: config.almManagerAddress,
      monitoringIntervalMs: config.monitoringIntervalMs
    });

    // Initialize services
    const metricsCollector = new MetricsCollector();
    const almExecutor = new ALMExecutor(config);
    const poolMonitor = new PoolMonitor(config);

    // Check executor balance
    const balance = await almExecutor.checkBalance();
    logger.info('Executor wallet', balance);

    if (parseFloat(balance.balance) < 0.01) {
      logger.warn('Low balance detected - ensure sufficient funds for gas fees');
    }

    // Set up event handlers
    poolMonitor.on('stateUpdate', async ({ poolData, almState }) => {
      const executorMetrics = almExecutor.getMetrics();
      metricsCollector.recordSnapshot(poolData, almState, executorMetrics);
    });

    poolMonitor.on('rebalanceNeeded', async ({ poolData, almState }) => {
      logger.info('Rebalance needed - executing...', {
        currentTick: poolData.currentTick,
        almRange: `${almState.currentTickLower} - ${almState.currentTickUpper}`
      });

      try {
        const rebalanceEvent = await almExecutor.executeRebalance();
        metricsCollector.recordRebalanceEvent(rebalanceEvent);
      } catch (error) {
        logger.error('Failed to execute rebalance', error);
      }
    });

    poolMonitor.on('feesCollected', ({ amount0, amount1 }) => {
      almExecutor.updateFeesCollected(amount0, amount1);
      logger.info('Fees collected and recorded in metrics');
    });

    poolMonitor.on('error', (error) => {
      logger.error('Pool monitor error', error);
    });

    // Periodic metrics logging
    setInterval(() => {
      const metrics = almExecutor.getMetrics();
      const latest = metricsCollector.getLatestSnapshot();
      
      logger.info('Periodic metrics update', {
        uptime: `${metrics.uptimeSeconds}s`,
        totalRebalances: metrics.totalRebalances,
        successRate: `${metrics.successfulRebalances}/${metrics.totalRebalances}`,
        successPercentage: metricsCollector.getSuccessRate().toFixed(2) + '%',
        timeInRange: metricsCollector.getTimeInRange().toFixed(2) + '%',
        currentTick: latest?.poolData.currentTick,
        almLiquidity: latest?.almState.totalLiquidity.toString()
      });
    }, 60000); // Log every minute

    // Start monitoring
    await poolMonitor.start();
    logger.info('ALM Executor Service started successfully');

    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      await poolMonitor.stop();
      
      // Export final metrics
      const finalMetrics = metricsCollector.exportMetrics();
      logger.info('Final metrics', finalMetrics.summary);
      
      logger.info('Shutdown complete');
      process.exit(0);
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    // Keep process alive
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception', error);
      shutdown('uncaughtException');
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Unhandled rejection', { reason, promise });
    });

  } catch (error) {
    logger.error('Failed to start ALM Executor Service', error);
    process.exit(1);
  }
}

// Start the service
if (require.main === module) {
  main().catch((error) => {
    logger.error('Fatal error in main', error);
    process.exit(1);
  });
}

export default main;