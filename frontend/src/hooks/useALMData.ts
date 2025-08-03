import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { ALMState, PoolData, ALMMetrics } from '../types';
import { getALMManager, getPool, getProvider } from '../utils/contracts';
import { CONTRACT_ADDRESSES, UPDATE_INTERVALS } from '../utils/constants';

export function useALMData() {
  const [almState, setAlmState] = useState<ALMState | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [metrics, setMetrics] = useState<ALMMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const provider = getProvider();
  const almManager = getALMManager(CONTRACT_ADDRESSES.ALM_MANAGER, provider);
  const pool = getPool(CONTRACT_ADDRESSES.POOL, provider);

  const fetchALMState = useCallback(async (): Promise<ALMState | null> => {
    try {
      const state = await almManager.getALMState();
      
      return {
        totalLiquidity: state.totalLiquidity.toString(),
        currentTickLower: state.currentTickLower,
        currentTickUpper: state.currentTickUpper,
        lastRebalanceTimestamp: state.lastRebalanceTimestamp.toString(),
        totalFeesCollected0: state.totalFeesCollected0.toString(),
        totalFeesCollected1: state.totalFeesCollected1.toString(),
        rebalanceCount: state.rebalanceCount.toString(),
      };
    } catch (err) {
      console.error('Error fetching ALM state:', err);
      return null;
    }
  }, [almManager]);

  const fetchPoolData = useCallback(async (): Promise<PoolData | null> => {
    try {
      const slot0 = await pool.slot0();
      const liquidity = await pool.liquidity();
      
      return {
        currentTick: slot0.tick,
        sqrtPriceX96: slot0.sqrtPriceX96.toString(),
        liquidity: liquidity.toString(),
      };
    } catch (err) {
      console.error('Error fetching pool data:', err);
      return null;
    }
  }, [pool]);

  const calculateMetrics = useCallback((almState: ALMState, poolData: PoolData): ALMMetrics => {
    const isInRange = poolData.currentTick >= almState.currentTickLower && 
                     poolData.currentTick < almState.currentTickUpper;

    // Calculate approximate USD value (simplified for demo)
    const fees0USD = parseFloat(ethers.formatUnits(almState.totalFeesCollected0, 6)); // USDC
    const fees1USD = parseFloat(ethers.formatUnits(almState.totalFeesCollected1, 18)); // Assume 1:1 with USD
    const totalFeesUSD = fees0USD + fees1USD;

    // Calculate approximate APY (very simplified)
    const timeSinceStart = Date.now() / 1000 - parseFloat(almState.lastRebalanceTimestamp);
    const yearlyMultiplier = (365 * 24 * 3600) / Math.max(timeSinceStart, 1);
    const approxAPY = totalFeesUSD * yearlyMultiplier * 100; // Very rough estimate

    // Calculate token0 price in terms of token1
    const sqrtPrice = parseFloat(poolData.sqrtPriceX96);
    const price = Math.pow(sqrtPrice / Math.pow(2, 96), 2);

    return {
      currentPosition: {
        tickLower: almState.currentTickLower,
        tickUpper: almState.currentTickUpper,
        liquidity: almState.totalLiquidity,
        isInRange,
      },
      performance: {
        totalFeesEarned0: almState.totalFeesCollected0,
        totalFeesEarned1: almState.totalFeesCollected1,
        totalFeesEarnedUSD: totalFeesUSD.toFixed(2),
        rebalanceCount: parseInt(almState.rebalanceCount),
        successRate: 100, // Simplified - would need more data to calculate real success rate
        avgTimeInRange: 85, // Simplified - would need historical data
        currentAPY: Math.min(approxAPY, 999), // Cap at 999% for display
      },
      poolData: {
        currentTick: poolData.currentTick,
        sqrtPriceX96: poolData.sqrtPriceX96,
        totalLiquidity: poolData.liquidity,
        token0Price: price.toFixed(6),
      },
    };
  }, []);

  const refreshData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [newAlmState, newPoolData] = await Promise.all([
        fetchALMState(),
        fetchPoolData(),
      ]);

      if (newAlmState && newPoolData) {
        setAlmState(newAlmState);
        setPoolData(newPoolData);
        
        const newMetrics = calculateMetrics(newAlmState, newPoolData);
        setMetrics(newMetrics);
        
        setLastUpdate(new Date());
      } else {
        setError('Failed to fetch data from contracts');
      }
    } catch (err: any) {
      setError(err.message || 'Unknown error occurred');
      console.error('Error refreshing data:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchALMState, fetchPoolData, calculateMetrics]);

  // Initial data fetch
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Set up automatic refresh
  useEffect(() => {
    const interval = setInterval(refreshData, UPDATE_INTERVALS.ALM_STATE);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    almState,
    poolData,
    metrics,
    loading,
    error,
    lastUpdate,
    refreshData,
  };
}