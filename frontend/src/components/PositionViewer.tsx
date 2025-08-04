import React from 'react';
import { useALMContext } from '../contexts/ALMContext';
import { formatTickRange, formatTokenAmount, formatTimeAgo } from '../utils/formatting';
import { TOKEN_INFO } from '../utils/constants';

export function PositionViewer() {
  const { metrics, almState, poolData, loading } = useALMContext();

  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Current Position</h3>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (!metrics || !almState || !poolData) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Current Position</h3>
        </div>
        <div className="text-gray-500">No position data available</div>
      </div>
    );
  }

  const isInRange = metrics.currentPosition.isInRange;
  const hasLiquidity = parseFloat(almState.totalLiquidity) > 0;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Current Position</h3>
        <span className={`status-indicator ${isInRange ? 'status-active' : 'status-error'}`}>
          {isInRange ? 'In Range' : 'Out of Range'}
        </span>
      </div>

      <div className="space-y-4">
        {/* Position Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="metric-label">Status</div>
            <div className={`text-lg font-semibold ${hasLiquidity ? 'text-gray-900' : 'text-gray-500'}`}>
              {hasLiquidity ? 'Active' : 'No Liquidity'}
            </div>
          </div>
          <div>
            <div className="metric-label">Current Tick</div>
            <div className="text-lg font-semibold text-primary-600">
              {poolData.currentTick.toString()}
            </div>
          </div>
        </div>

        {/* Tick Range */}
        <div>
          <div className="metric-label">Position Range</div>
          <div className="text-xl font-bold text-gray-900">
            {formatTickRange(almState.currentTickLower, almState.currentTickUpper)}
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Lower: {almState.currentTickLower} | Upper: {almState.currentTickUpper}
          </div>
        </div>

        {/* Liquidity Amount */}
        <div>
          <div className="metric-label">Liquidity</div>
          <div className="text-lg font-semibold">
            {formatTokenAmount(almState.totalLiquidity, 0, 0)}
          </div>
        </div>

        {/* Token Balances (Fees Collected) */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="metric-label">{TOKEN_INFO.FAKE_USDC.symbol} Fees</div>
            <div className="text-lg font-semibold text-blue-600">
              {formatTokenAmount(almState.totalFeesCollected0, TOKEN_INFO.FAKE_USDC.decimals)}
            </div>
          </div>
          <div>
            <div className="metric-label">{TOKEN_INFO.FAKE_SCUSD.symbol} Fees</div>
            <div className="text-lg font-semibold text-green-600">
              {formatTokenAmount(almState.totalFeesCollected1, TOKEN_INFO.FAKE_SCUSD.decimals)}
            </div>
          </div>
        </div>

        {/* Last Rebalance */}
        <div>
          <div className="metric-label">Last Rebalance</div>
          <div className="text-sm text-gray-600">
            {almState.lastRebalanceTimestamp !== '0' 
              ? formatTimeAgo(parseInt(almState.lastRebalanceTimestamp)) 
              : 'Never'
            }
          </div>
        </div>

        {/* Range Visualization */}
        <div className="mt-6">
          <div className="metric-label mb-2">Range Visualization</div>
          <div className="relative bg-gray-100 rounded-lg p-4">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-2">
              <span>Tick {almState.currentTickLower}</span>
              <span>Current: {poolData.currentTick}</span>
              <span>Tick {almState.currentTickUpper}</span>
            </div>
            
            <div className="relative h-2 bg-gray-300 rounded">
              {/* Position range */}
              <div className="absolute inset-y-0 bg-primary-500 rounded" 
                   style={{ 
                     left: '20%', 
                     right: '20%' 
                   }}></div>
              
              {/* Current tick indicator */}
              <div className={`absolute w-1 h-4 -mt-1 rounded ${isInRange ? 'bg-success-500' : 'bg-error-500'}`}
                   style={{ 
                     left: isInRange ? '50%' : (poolData.currentTick < almState.currentTickLower ? '10%' : '90%'),
                     transform: 'translateX(-50%)'
                   }}></div>
            </div>
            
            <div className="flex justify-center mt-2">
              <span className={`text-xs font-medium ${isInRange ? 'text-success-600' : 'text-error-600'}`}>
                {isInRange ? 'Earning Fees' : 'Not Earning Fees'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}