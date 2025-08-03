import { ethers } from 'ethers';
import { DISPLAY_PRECISION, TOKEN_INFO } from './constants';

export function formatTokenAmount(
  amount: string | bigint,
  decimals: number,
  precision: number = DISPLAY_PRECISION.AMOUNT,
  includeCommas: boolean = true
): string {
  try {
    const formatted = ethers.formatUnits(amount, decimals);
    const number = parseFloat(formatted);
    
    if (number === 0) return '0';
    
    let result = number.toFixed(precision);
    
    // Remove trailing zeros
    result = result.replace(/\.?0+$/, '');
    
    if (includeCommas) {
      const parts = result.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      result = parts.join('.');
    }
    
    return result;
  } catch (error) {
    console.error('Error formatting token amount:', error);
    return '0';
  }
}

export function formatUSDC(amount: string | bigint): string {
  return formatTokenAmount(amount, TOKEN_INFO.FAKE_USDC.decimals);
}

export function formatSCUSD(amount: string | bigint): string {
  return formatTokenAmount(amount, TOKEN_INFO.FAKE_SCUSD.decimals);
}

export function formatPercentage(
  value: number,
  precision: number = DISPLAY_PRECISION.PERCENTAGE
): string {
  if (isNaN(value) || !isFinite(value)) return '0.00%';
  return `${value.toFixed(precision)}%`;
}

export function formatAPY(apy: number): string {
  return formatPercentage(apy, DISPLAY_PRECISION.APY);
}

export function formatPrice(
  price: string | number,
  precision: number = DISPLAY_PRECISION.PRICE
): string {
  const num = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(num) || !isFinite(num)) return '0.000000';
  
  return num.toFixed(precision);
}

export function formatTimeAgo(timestamp: number | string): string {
  const now = Date.now();
  const time = typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp;
  const diff = now - time;
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return `${seconds}s ago`;
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ${minutes % 60}m`;
  
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

export function formatAddress(address: string, length: number = 6): string {
  if (!address || address.length < 10) return address;
  
  return `${address.slice(0, length)}...${address.slice(-4)}`;
}

export function formatTransactionHash(hash: string): string {
  return formatAddress(hash, 8);
}

export function formatLargeNumber(num: number): string {
  if (num >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  } else if (num >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  } else if (num >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }
  return num.toFixed(2);
}

export function formatTickRange(tickLower: number, tickUpper: number): string {
  return `[${tickLower}, ${tickUpper})`;
}

export function calculatePriceFromTick(tick: number): number {
  // Price = 1.0001^tick
  // This is a simplified calculation for display purposes
  return Math.pow(1.0001, tick);
}

export function formatTickPrice(tick: number): string {
  const price = calculatePriceFromTick(tick);
  return formatPrice(price);
}