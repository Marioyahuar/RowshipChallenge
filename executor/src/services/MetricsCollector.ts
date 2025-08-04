import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { ALMState, PoolData, RebalanceEvent, ExecutorMetrics } from '../types/index';

interface MetricsSnapshot {
  timestamp: Date;
  poolData: PoolData;
  almState: ALMState;
  executorMetrics: ExecutorMetrics;
}

export class MetricsCollector extends EventEmitter {
  private snapshots: MetricsSnapshot[] = [];
  private rebalanceHistory: RebalanceEvent[] = [];
  private maxHistorySize: number = 1000;

  constructor(maxHistorySize: number = 1000) {
    super();
    this.maxHistorySize = maxHistorySize;
    logger.info('MetricsCollector initialized', { maxHistorySize });
  }

  recordSnapshot(poolData: PoolData, almState: ALMState, executorMetrics: ExecutorMetrics): void {
    const snapshot: MetricsSnapshot = {
      timestamp: new Date(),
      poolData,
      almState,
      executorMetrics
    };

    this.snapshots.push(snapshot);
    
    // Keep only the most recent snapshots
    if (this.snapshots.length > this.maxHistorySize) {
      this.snapshots = this.snapshots.slice(-this.maxHistorySize);
    }

    logger.debug('Metrics snapshot recorded', {
      totalSnapshots: this.snapshots.length,
      poolTick: poolData.currentTick,
      almLiquidity: almState.totalLiquidity.toString()
    });

    this.emit('snapshotRecorded', snapshot);
  }

  recordRebalanceEvent(event: RebalanceEvent): void {
    this.rebalanceHistory.push(event);
    
    // Keep only the most recent rebalance events
    if (this.rebalanceHistory.length > this.maxHistorySize) {
      this.rebalanceHistory = this.rebalanceHistory.slice(-this.maxHistorySize);
    }

    logger.info('Rebalance event recorded', {
      success: event.success,
      totalRebalances: this.rebalanceHistory.length,
      tickRange: `${event.newTickLower} - ${event.newTickUpper}`
    });

    this.emit('rebalanceRecorded', event);
  }

  getLatestSnapshot(): MetricsSnapshot | null {
    return this.snapshots.length > 0 ? this.snapshots[this.snapshots.length - 1] : null;
  }

  getRebalanceHistory(limit?: number): RebalanceEvent[] {
    if (limit) {
      return this.rebalanceHistory.slice(-limit);
    }
    return [...this.rebalanceHistory];
  }

  getSuccessRate(): number {
    if (this.rebalanceHistory.length === 0) return 0;
    
    const successfulRebalances = this.rebalanceHistory.filter(event => event.success).length;
    return (successfulRebalances / this.rebalanceHistory.length) * 100;
  }

  getAverageTickRange(): { lower: number; upper: number } | null {
    const snapshots = this.snapshots.filter(s => s.almState.totalLiquidity > 0n);
    
    if (snapshots.length === 0) return null;

    const avgLower = snapshots.reduce((sum, s) => sum + s.almState.currentTickLower, 0) / snapshots.length;
    const avgUpper = snapshots.reduce((sum, s) => sum + s.almState.currentTickUpper, 0) / snapshots.length;

    return {
      lower: Math.round(avgLower),
      upper: Math.round(avgUpper)
    };
  }

  getTimeInRange(): number {
    if (this.snapshots.length < 2) return 0;

    let timeInRange = 0;
    let totalTime = 0;

    for (let i = 1; i < this.snapshots.length; i++) {
      const prev = this.snapshots[i - 1];
      const curr = this.snapshots[i];
      
      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();
      totalTime += timeDiff;

      // Check if tick was in range during this period
      const tickInRange = curr.poolData.currentTick >= prev.almState.currentTickLower &&
                         curr.poolData.currentTick < prev.almState.currentTickUpper;
      
      if (tickInRange) {
        timeInRange += timeDiff;
      }
    }

    return totalTime > 0 ? (timeInRange / totalTime) * 100 : 0;
  }

  getTotalFeesEarned(): { token0: bigint; token1: bigint } {
    const latest = this.getLatestSnapshot();
    if (!latest) {
      return { token0: 0n, token1: 0n };
    }

    return {
      token0: latest.almState.totalFeesCollected0,
      token1: latest.almState.totalFeesCollected1
    };
  }

  getRebalanceFrequency(): number {
    if (this.rebalanceHistory.length < 2) return 0;

    const timeSpan = this.rebalanceHistory[this.rebalanceHistory.length - 1].timestamp.getTime() - 
                    this.rebalanceHistory[0].timestamp.getTime();
    
    if (timeSpan === 0) return 0;

    // Return rebalances per hour
    return (this.rebalanceHistory.length / timeSpan) * (1000 * 60 * 60);
  }

  exportMetrics(): {
    summary: any;
    snapshots: MetricsSnapshot[];
    rebalanceHistory: RebalanceEvent[];
  } {
    const latest = this.getLatestSnapshot();
    
    return {
      summary: {
        totalSnapshots: this.snapshots.length,
        totalRebalances: this.rebalanceHistory.length,
        successRate: this.getSuccessRate(),
        timeInRange: this.getTimeInRange(),
        averageTickRange: this.getAverageTickRange(),
        totalFeesEarned: this.getTotalFeesEarned(),
        rebalanceFrequency: this.getRebalanceFrequency(),
        latestState: latest ? {
          timestamp: latest.timestamp,
          poolTick: latest.poolData.currentTick,
          almRange: `${latest.almState.currentTickLower} - ${latest.almState.currentTickUpper}`,
          almLiquidity: latest.almState.totalLiquidity.toString()
        } : null
      },
      snapshots: this.snapshots,
      rebalanceHistory: this.rebalanceHistory
    };
  }

  clearHistory(): void {
    this.snapshots = [];
    this.rebalanceHistory = [];
    logger.info('Metrics history cleared');
  }
}