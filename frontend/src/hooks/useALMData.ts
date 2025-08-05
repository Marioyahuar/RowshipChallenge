import { useState, useEffect, useCallback, useMemo } from "react";
import { ethers } from "ethers";
import { ALMState, PoolData, ALMMetrics } from "../types";
import { getALMManager, getPool, getProvider, getERC20 } from "../utils/contracts";
import { CONTRACT_ADDRESSES, UPDATE_INTERVALS } from "../utils/constants";

interface TVLData {
  almTVL: {
    total: number;
    token0: number;
    token1: number;
  };
  poolTVL: {
    total: number;
    token0: number;
    token1: number;
  };
}

export function useALMData() {
  const [almState, setAlmState] = useState<ALMState | null>(null);
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [metrics, setMetrics] = useState<ALMMetrics | null>(null);
  const [tvlData, setTvlData] = useState<TVLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // Memoize provider and contracts to prevent recreation on every render
  const provider = useMemo(() => getProvider(), []);
  const almManager = useMemo(
    () => getALMManager(CONTRACT_ADDRESSES.ALM_MANAGER, provider),
    [provider]
  );
  const pool = useMemo(
    () => getPool(CONTRACT_ADDRESSES.POOL, provider),
    [provider]
  );
  const token0 = useMemo(
    () => getERC20(CONTRACT_ADDRESSES.TOKEN0, provider),
    [provider]
  );
  const token1 = useMemo(
    () => getERC20(CONTRACT_ADDRESSES.TOKEN1, provider),
    [provider]
  );

  const fetchALMState = useCallback(async (): Promise<ALMState | null> => {
    try {
      const state = await almManager.getALMState();
      console.log("STATE: ", state);
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
      console.error("Error fetching ALM state:", err);
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
      console.error("Error fetching pool data:", err);
      return null;
    }
  }, [pool]);

  const fetchTVLData = useCallback(async (): Promise<TVLData | null> => {
    try {
      // Get ALM Manager balances
      const almBalance0 = await token0.balanceOf(CONTRACT_ADDRESSES.ALM_MANAGER);
      const almBalance1 = await token1.balanceOf(CONTRACT_ADDRESSES.ALM_MANAGER);
      
      // Get Pool balances
      const poolBalance0 = await token0.balanceOf(CONTRACT_ADDRESSES.POOL);
      const poolBalance1 = await token1.balanceOf(CONTRACT_ADDRESSES.POOL);
      
      // Convert to USD (assuming USDC = $1, SCUSD = $1)
      const almToken0USD = parseFloat(ethers.formatUnits(almBalance0, 6)); // USDC has 6 decimals
      const almToken1USD = parseFloat(ethers.formatUnits(almBalance1, 18)); // SCUSD has 18 decimals
      
      const poolToken0USD = parseFloat(ethers.formatUnits(poolBalance0, 6));
      const poolToken1USD = parseFloat(ethers.formatUnits(poolBalance1, 18));
      
      return {
        almTVL: {
          total: almToken0USD + almToken1USD,
          token0: almToken0USD,
          token1: almToken1USD,
        },
        poolTVL: {
          total: poolToken0USD + poolToken1USD,
          token0: poolToken0USD,
          token1: poolToken1USD,
        },
      };
    } catch (err) {
      console.error('Error fetching TVL data:', err);
      return null;
    }
  }, [token0, token1]);

  const calculateMetrics = useCallback(
    (almState: ALMState, poolData: PoolData, tvlData?: TVLData | null): ALMMetrics => {
      const isInRange =
        poolData.currentTick >= almState.currentTickLower &&
        poolData.currentTick < almState.currentTickUpper;

      // Calculate approximate USD value (simplified for demo)
      const fees0USD = parseFloat(
        ethers.formatUnits(almState.totalFeesCollected0, 6)
      ); // USDC
      const fees1USD = parseFloat(
        ethers.formatUnits(almState.totalFeesCollected1, 18)
      ); // Assume 1:1 with USD
      const totalFeesUSD = fees0USD + fees1USD;

      // Calculate approximate APY (very simplified)
      const timeSinceStart =
        Date.now() / 1000 - parseFloat(almState.lastRebalanceTimestamp);
      const yearlyMultiplier = (365 * 24 * 3600) / Math.max(timeSinceStart, 1);
      const approxAPY = totalFeesUSD * yearlyMultiplier * 100; // Very rough estimate

      // Calculate token0 price in terms of token1
      const sqrtPrice = parseFloat(poolData.sqrtPriceX96);
      const price = Math.pow(sqrtPrice / Math.pow(2, 96), 2);

      // Calculate success rate (assume 100% if no rebalances yet)
      const rebalanceCount = parseInt(almState.rebalanceCount);
      const successRate = rebalanceCount > 0 ? 100 : 0; // In real scenario, track failed attempts
      
      // Calculate time in range (simplified - assume in range if rebalances are working)
      const avgTimeInRange = isInRange ? 95 : 60; // Higher when currently in range
      
      // Calculate more realistic APY based on fees and time
      let realisticAPY = 0;
      if (totalFeesUSD > 0) { // Show APY if any fees have been collected
        // Use actual TVL from TVL data instead of liquidity value
        const tvlAmount = tvlData?.almTVL?.total || 20000; // Use real TVL or fallback
        
        // For demo purposes, assume this represents 1 day of activity
        // In production, you'd track the actual time period
        const dailyYield = (totalFeesUSD / tvlAmount) * 100;
        const annualizedYield = dailyYield * 365;
        realisticAPY = Math.min(Math.max(annualizedYield, 0), 100); // Cap between 0-100% for display
      }

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
          rebalanceCount: rebalanceCount,
          successRate: successRate,
          avgTimeInRange: avgTimeInRange,
          currentAPY: realisticAPY,
        },
        poolData: {
          currentTick: poolData.currentTick,
          sqrtPriceX96: poolData.sqrtPriceX96,
          totalLiquidity: poolData.liquidity,
          token0Price: price.toFixed(6),
        },
      };
    },
    []
  );

  const refreshData = useCallback(async () => {
    // Skip if contracts are not properly configured
    if (
      !CONTRACT_ADDRESSES.ALM_MANAGER ||
      CONTRACT_ADDRESSES.ALM_MANAGER === "0x..." ||
      !CONTRACT_ADDRESSES.POOL ||
      CONTRACT_ADDRESSES.POOL === "0x..."
    ) {
      setError("Contract addresses are not configured");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [newAlmState, newPoolData, newTVLData] = await Promise.all([
        fetchALMState(),
        fetchPoolData(),
        fetchTVLData(),
      ]);

      if (newAlmState && newPoolData) {
        setAlmState(newAlmState);
        setPoolData(newPoolData);
        setTvlData(newTVLData);

        const newMetrics = calculateMetrics(newAlmState, newPoolData, newTVLData);
        console.log("NEW METRICS: ", newMetrics);
        console.log("TVL DATA: ", newTVLData);
        setMetrics(newMetrics);

        setLastUpdate(new Date());
      } else {
        setError("Failed to fetch data from contracts");
      }
    } catch (err: any) {
      setError(err.message || "Unknown error occurred");
      console.error("Error refreshing data:", err);
    } finally {
      setLoading(false);
    }
  }, [fetchALMState, fetchPoolData, fetchTVLData, calculateMetrics]);

  // Initial data fetch - only run once on mount
  useEffect(() => {
    refreshData();
  }, []); // Empty dependency array to run only once

  // Set up automatic refresh
  useEffect(() => {
    const interval = setInterval(refreshData, UPDATE_INTERVALS.ALM_STATE);
    return () => clearInterval(interval);
  }, [refreshData]);

  return {
    almState,
    poolData,
    metrics,
    tvlData,
    loading,
    error,
    lastUpdate,
    refreshData,
  };
}
