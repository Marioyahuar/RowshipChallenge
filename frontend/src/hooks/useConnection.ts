import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { ConnectionState } from '../types';
import { NETWORK_CONFIG } from '../utils/constants';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useConnection() {
  const [connectionState, setConnectionState] = useState<ConnectionState>({
    isConnected: false,
  });

  const connectWallet = async (): Promise<void> => {
    if (!window.ethereum) {
      setConnectionState({
        isConnected: false,
        error: 'MetaMask or compatible wallet not detected',
      });
      return;
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      
      // Request account access
      await provider.send('eth_requestAccounts', []);
      
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setConnectionState({
        isConnected: true,
        address,
        networkId: Number(network.chainId),
      });
      
    } catch (error: any) {
      setConnectionState({
        isConnected: false,
        error: error.message || 'Failed to connect wallet',
      });
    }
  };

  const switchNetwork = async (chainId: number): Promise<void> => {
    if (!window.ethereum) return;

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${chainId.toString(16)}` }],
      });
    } catch (error: any) {
      // If network doesn't exist, add it
      if (error.code === 4902) {
        const networkConfig = Object.values(NETWORK_CONFIG).find(
          config => config.chainId === chainId
        );
        
        if (networkConfig) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: `0x${chainId.toString(16)}`,
                  chainName: networkConfig.name,
                  rpcUrls: [networkConfig.rpcUrl],
                  blockExplorerUrls: [networkConfig.explorerUrl],
                },
              ],
            });
          } catch (addError) {
            console.error('Failed to add network:', addError);
          }
        }
      }
    }
  };

  const disconnect = (): void => {
    setConnectionState({
      isConnected: false,
    });
  };

  const getNetworkName = (chainId: number): string => {
    const network = Object.values(NETWORK_CONFIG).find(
      config => config.chainId === chainId
    );
    return network?.name || `Chain ${chainId}`;
  };

  const isCorrectNetwork = (chainId: number): boolean => {
    return chainId === NETWORK_CONFIG.SONIC_TESTNET.chainId || 
           chainId === NETWORK_CONFIG.SEPOLIA.chainId;
  };

  // Listen for account and network changes
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setConnectionState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const networkId = parseInt(chainId, 16);
      setConnectionState(prev => ({
        ...prev,
        networkId,
      }));
    };

    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check if already connected
    const checkConnection = async () => {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const accounts = await provider.listAccounts();
        
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          setConnectionState({
            isConnected: true,
            address: accounts[0].address,
            networkId: Number(network.chainId),
          });
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  return {
    connectionState,
    connectWallet,
    switchNetwork,
    disconnect,
    getNetworkName,
    isCorrectNetwork,
  };
}