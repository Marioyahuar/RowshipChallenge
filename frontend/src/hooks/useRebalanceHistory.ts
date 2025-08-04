import { useState, useEffect, useMemo } from 'react';
import { ethers } from 'ethers';
import { getALMManager, getProvider } from '../utils/contracts';
import { CONTRACT_ADDRESSES } from '../utils/constants';

interface RebalanceEvent {
  blockNumber: number;
  transactionHash: string;
  timestamp: Date;
  oldTickLower: number;
  oldTickUpper: number;
  newTickLower: number;
  newTickUpper: number;
  liquidityAmount: string;
}

export function useRebalanceHistory() {
  const [events, setEvents] = useState<RebalanceEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const provider = useMemo(() => getProvider(), []);
  const almManager = useMemo(() => getALMManager(CONTRACT_ADDRESSES.ALM_MANAGER, provider), [provider]);

  const fetchRebalanceEvents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the current block number
      const currentBlock = await provider.getBlockNumber();
      const fromBlock = Math.max(0, currentBlock - 1000); // Last 1000 blocks

      // Query for Rebalanced events
      const filter = almManager.filters.Rebalanced();
      const eventLogs = await almManager.queryFilter(filter, fromBlock, currentBlock);

      const rebalanceEvents: RebalanceEvent[] = [];

      for (const log of eventLogs) {
        try {
          const block = await provider.getBlock(log.blockNumber);
          const parsedLog = almManager.interface.parseLog(log);
          
          if (parsedLog && block) {
            rebalanceEvents.push({
              blockNumber: log.blockNumber,
              transactionHash: log.transactionHash,
              timestamp: new Date(block.timestamp * 1000),
              oldTickLower: Number(parsedLog.args[0]),
              oldTickUpper: Number(parsedLog.args[1]),
              newTickLower: Number(parsedLog.args[2]),
              newTickUpper: Number(parsedLog.args[3]),
              liquidityAmount: parsedLog.args[4].toString(),
            });
          }
        } catch (err) {
          console.error('Error parsing rebalance event:', err);
        }
      }

      // Sort by timestamp (most recent first)
      rebalanceEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setEvents(rebalanceEvents);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch rebalance history');
      console.error('Error fetching rebalance events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (CONTRACT_ADDRESSES.ALM_MANAGER && CONTRACT_ADDRESSES.ALM_MANAGER !== '0x...') {
      fetchRebalanceEvents();
    }
  }, []);

  return {
    events,
    loading,
    error,
    refetch: fetchRebalanceEvents,
  };
}