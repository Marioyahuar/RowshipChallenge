import React, { createContext, useContext, ReactNode } from 'react';
import { useALMData } from '../hooks/useALMData';
import { useConnection } from '../hooks/useConnection';
import { ALMState, PoolData, ALMMetrics, ConnectionState } from '../types';

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

interface ALMContextType {
  // Data
  almState: ALMState | null;
  poolData: PoolData | null;
  metrics: ALMMetrics | null;
  tvlData: TVLData | null;
  
  // State
  loading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  
  // Connection
  connectionState: ConnectionState;
  
  // Actions
  refreshData: () => Promise<void>;
  connectWallet: () => Promise<void>;
  switchNetwork: (chainId: number) => Promise<void>;
  disconnect: () => void;
  getNetworkName: (chainId: number) => string;
  isCorrectNetwork: (chainId: number) => boolean;
}

const ALMContext = createContext<ALMContextType | null>(null);

export function useALMContext(): ALMContextType {
  const context = useContext(ALMContext);
  if (!context) {
    throw new Error('useALMContext must be used within ALMProvider');
  }
  return context;
}

interface ALMProviderProps {
  children: ReactNode;
}

export function ALMProvider({ children }: ALMProviderProps) {
  const {
    almState,
    poolData,
    metrics,
    tvlData,
    loading,
    error,
    lastUpdate,
    refreshData,
  } = useALMData();

  const {
    connectionState,
    connectWallet,
    switchNetwork,
    disconnect,
    getNetworkName,
    isCorrectNetwork,
  } = useConnection();

  const contextValue: ALMContextType = {
    // Data
    almState,
    poolData,
    metrics,
    tvlData,
    
    // State
    loading,
    error,
    lastUpdate,
    
    // Connection
    connectionState,
    
    // Actions
    refreshData,
    connectWallet,
    switchNetwork,
    disconnect,
    getNetworkName,
    isCorrectNetwork,
  };

  return (
    <ALMContext.Provider value={contextValue}>
      {children}
    </ALMContext.Provider>
  );
}