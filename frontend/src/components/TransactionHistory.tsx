import React from 'react';
import { formatTimeAgo, formatTransactionHash, formatTickRange } from '../utils/formatting';
import { RebalanceEvent } from '../types';

interface TransactionHistoryProps {
  rebalanceHistory?: RebalanceEvent[];
  loading?: boolean;
}

export function TransactionHistory({ rebalanceHistory = [], loading = false }: TransactionHistoryProps) {
  if (loading) {
    return (
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-semibold">Recent Rebalances</h3>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="animate-pulse flex items-center space-x-4 p-3 bg-gray-50 rounded">
              <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                <div className="h-3 bg-gray-300 rounded w-1/2"></div>
              </div>
              <div className="h-3 bg-gray-300 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Mock data for demonstration since we don't have real transaction history yet
  const mockHistory: RebalanceEvent[] = [
    {
      timestamp: new Date(Date.now() - 300000), // 5 minutes ago
      success: true,
      oldTickLower: -2,
      oldTickUpper: -1,
      newTickLower: 0,
      newTickUpper: 1,
      transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
      gasUsed: '125000',
    },
    {
      timestamp: new Date(Date.now() - 900000), // 15 minutes ago
      success: true,
      oldTickLower: -3,
      oldTickUpper: -2,
      newTickLower: -2,
      newTickUpper: -1,
      transactionHash: '0xabcdef1234567890abcdef1234567890abcdef12',
      gasUsed: '118000',
    },
    {
      timestamp: new Date(Date.now() - 1800000), // 30 minutes ago
      success: false,
      oldTickLower: -3,
      oldTickUpper: -2,
      newTickLower: 0,
      newTickUpper: 0,
    },
  ];

  const historyToShow = rebalanceHistory.length > 0 ? rebalanceHistory : mockHistory;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="text-lg font-semibold">Recent Rebalances</h3>
        <span className="text-sm text-gray-500">
          {historyToShow.length} total
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {historyToShow.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-gray-400 text-4xl mb-2">📊</div>
            <div>No rebalances yet</div>
            <div className="text-sm">Rebalances will appear here once they occur</div>
          </div>
        ) : (
          historyToShow.map((event, index) => (
            <div
              key={index}
              className={`flex items-center space-x-4 p-3 rounded-lg border ${
                event.success 
                  ? 'bg-success-50 border-success-200' 
                  : 'bg-error-50 border-error-200'
              }`}
            >
              {/* Status indicator */}
              <div className={`w-2 h-2 rounded-full ${
                event.success ? 'bg-success-500' : 'bg-error-500'
              }`}></div>

              {/* Transaction details */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-1">
                  <span className={`text-sm font-medium ${
                    event.success ? 'text-success-700' : 'text-error-700'
                  }`}>
                    {event.success ? 'Rebalanced' : 'Failed'}
                  </span>
                  {event.transactionHash && (
                    <span className="text-xs text-gray-500 font-mono">
                      {formatTransactionHash(event.transactionHash)}
                    </span>
                  )}
                </div>
                
                <div className="text-xs text-gray-600">
                  {event.success ? (
                    <>
                      {formatTickRange(event.oldTickLower, event.oldTickUpper)} → {formatTickRange(event.newTickLower, event.newTickUpper)}
                      {event.gasUsed && (
                        <span className="ml-2">• {parseInt(event.gasUsed).toLocaleString()} gas</span>
                      )}
                    </>
                  ) : (
                    <span className="text-error-600">
                      Rebalance failed {event.error && `• ${event.error}`}
                    </span>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              <div className="text-xs text-gray-500 text-right">
                {formatTimeAgo(event.timestamp.getTime())}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary stats */}
      {historyToShow.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-sm font-medium text-gray-900">
                {historyToShow.filter(e => e.success).length}
              </div>
              <div className="text-xs text-gray-600">Successful</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {historyToShow.filter(e => !e.success).length}
              </div>
              <div className="text-xs text-gray-600">Failed</div>
            </div>
            <div>
              <div className="text-sm font-medium text-gray-900">
                {historyToShow.length > 0 ? ((historyToShow.filter(e => e.success).length / historyToShow.length) * 100).toFixed(0) : 0}%
              </div>
              <div className="text-xs text-gray-600">Success Rate</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}