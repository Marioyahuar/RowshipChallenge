import React from 'react';
import { useALMContext } from '../contexts/ALMContext';
import { MetricsCard } from './MetricsCard';
import { PositionViewer } from './PositionViewer';
import { TransactionHistory } from './TransactionHistory';
import { formatTokenAmount, formatPercentage, formatTimeAgo, formatAddress } from '../utils/formatting';
import { TOKEN_INFO, NETWORK_CONFIG } from '../utils/constants';

export function Dashboard() {
  const { 
    metrics, 
    almState, 
    poolData, 
    tvlData,
    loading, 
    error, 
    lastUpdate,
    connectionState,
    connectWallet,
    switchNetwork,
    disconnect,
    getNetworkName,
    isCorrectNetwork,
    refreshData 
  } = useALMContext();

  // Connection status component
  const ConnectionStatus = () => (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Connection</h3>
        <button
          onClick={refreshData}
          className="btn btn-secondary text-sm"
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>
      
      <div className="space-y-3">
        {connectionState.isConnected ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Wallet</span>
              <span className="font-mono text-sm">
                {formatAddress(connectionState.address!)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Network</span>
              <span className={`text-sm ${
                isCorrectNetwork(connectionState.networkId!) 
                  ? 'text-success-600' 
                  : 'text-warning-600'
              }`}>
                {getNetworkName(connectionState.networkId!)}
              </span>
            </div>
            {!isCorrectNetwork(connectionState.networkId!) && (
              <button
                onClick={() => switchNetwork(NETWORK_CONFIG.HARDHAT_LOCAL.chainId)}
                className="btn btn-primary w-full text-sm"
              >
                Switch to Hardhat Local
              </button>
            )}
            <button
              onClick={disconnect}
              className="btn btn-secondary w-full text-sm"
            >
              Disconnect
            </button>
          </>
        ) : (
          <div className="text-center">
            <div className="text-gray-500 mb-3">
              {connectionState.error || 'Not connected to wallet'}
            </div>
            <button
              onClick={connectWallet}
              className="btn btn-primary w-full"
              disabled={false}
            >
              Connect Wallet
            </button>
          </div>
        )}
        
        {lastUpdate && (
          <div className="text-xs text-gray-500 text-center pt-2 border-t">
            Last updated: {formatTimeAgo(lastUpdate.getTime())}
          </div>
        )}
      </div>
    </div>
  );

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="card border-error-200">
            <div className="text-center py-8">
              <div className="text-error-500 text-4xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-error-700 mb-2">
                Error Loading Dashboard
              </h2>
              <p className="text-error-600 mb-4">{error}</p>
              <button
                onClick={refreshData}
                className="btn btn-primary"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            ALM Dashboard
          </h1>
          <p className="text-gray-600">
            Automated Liquidity Manager for Shadow DEX Stablecoin Pool
          </p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Connection Status - Top Right */}
          <div className="lg:col-span-1 lg:order-2">
            <ConnectionStatus />
          </div>

          {/* Key Metrics - Top */}
          <div className="lg:col-span-3 lg:order-1">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <MetricsCard
                title="Pool TVL"
                value={tvlData ? `$${tvlData.poolTVL.total.toFixed(2)}` : '--'}
                subtitle={`USDC: $${tvlData ? tvlData.poolTVL.token0.toFixed(2) : '--'} | SCUSD: $${tvlData ? tvlData.poolTVL.token1.toFixed(2) : '--'}`}
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title="Current APY"
                value={metrics ? formatPercentage(metrics.performance.currentAPY) : '--'}
                subtitle="Estimated annual yield"
                trend={metrics && metrics.performance.currentAPY > 0 ? 'up' : 'neutral'}
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title="Total Fees"
                value={metrics ? `$${metrics.performance.totalFeesEarnedUSD}` : '--'}
                subtitle="Fees collected"
                trend="up"
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title="Rebalances"
                value={almState ? almState.rebalanceCount : '--'}
                subtitle={metrics ? `${formatPercentage(metrics.performance.successRate)} success` : 'Total count'}
                loading={loading}
                error={!!error}
              />
            </div>
          </div>

          {/* Position Details - Left Side */}
          <div className="lg:col-span-2 lg:order-3">
            <PositionViewer />
          </div>

          {/* Transaction History - Right Side */}
          <div className="lg:col-span-2 lg:order-4">
            <TransactionHistory />
          </div>

          {/* Additional Metrics - Bottom */}
          <div className="lg:col-span-4 lg:order-5">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricsCard
                title="ALM TVL"
                value={tvlData ? `$${tvlData.almTVL.total.toFixed(2)}` : '--'}
                subtitle={`${tvlData && tvlData.poolTVL.total > 0 ? ((tvlData.almTVL.total / tvlData.poolTVL.total) * 100).toFixed(1) : '--'}% of Pool | Liquidity: ${almState ? formatTokenAmount(almState.totalLiquidity, 0, 0) : '--'}`}
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title="Time in Range"
                value={metrics ? formatPercentage(metrics.performance.avgTimeInRange) : '--'}
                subtitle="Historical average"
                trend={metrics && metrics.performance.avgTimeInRange > 80 ? 'up' : 'neutral'}
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title={`${TOKEN_INFO.FAKE_USDC.symbol} Fees`}
                value={almState ? formatTokenAmount(almState.totalFeesCollected0, TOKEN_INFO.FAKE_USDC.decimals) : '--'}
                subtitle="Collected fees"
                loading={loading}
                error={!!error}
              />
              
              <MetricsCard
                title={`${TOKEN_INFO.FAKE_SCUSD.symbol} Fees`}
                value={almState ? formatTokenAmount(almState.totalFeesCollected1, TOKEN_INFO.FAKE_SCUSD.decimals) : '--'}
                subtitle="Collected fees"
                loading={loading}
                error={!!error}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-500 text-sm">
          <p>
            ALM Strategy: Always keep liquidity in exactly the active tick only
          </p>
          <p className="mt-1">
            Built for Rowship Technical Challenge • Powered by RamsesV3Pool
          </p>
        </div>
      </div>
    </div>
  );
}