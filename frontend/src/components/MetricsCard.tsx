import React from 'react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  error?: boolean;
  className?: string;
}

export function MetricsCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  loading = false,
  error = false,
  className = '' 
}: MetricsCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-success-600';
      case 'down': return 'text-error-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`card border-error-200 ${className}`}>
        <div className="metric-label text-error-600">{title}</div>
        <div className="metric-value text-error-500">--</div>
        <div className="text-sm text-error-600">Error loading data</div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="metric-label">{title}</div>
      <div className={`metric-value ${getTrendColor()}`}>
        {value} {getTrendIcon()}
      </div>
      {subtitle && (
        <div className="text-sm text-gray-600 mt-1">{subtitle}</div>
      )}
    </div>
  );
}