// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "../interfaces/IALM.sol";
import "../interfaces/IMockPool.sol";

contract ALMManager is IALM, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    ALMState public almState;
    IMockPool public immutable pool;
    IERC20 public immutable token0;
    IERC20 public immutable token1;
    
    uint256 public constant POSITION_INDEX = 1;
    int24 public constant TICK_SPACING = 1;
    uint256 public constant REBALANCE_THRESHOLD = 1;
    
    bool public paused = false;
    
    modifier whenNotPaused() {
        require(!paused, "ALM: Contract paused");
        _;
    }
    
    modifier onlyAuthorized() {
        require(msg.sender == owner() || msg.sender == address(this), "ALM: Not authorized");
        _;
    }

    constructor(
        address _pool,
        address _token0,
        address _token1,
        address _owner
    ) Ownable(_owner) {
        pool = IMockPool(_pool);
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        
        almState = ALMState({
            totalLiquidity: 0,
            currentTickLower: 0,
            currentTickUpper: 0,
            lastRebalanceTimestamp: block.timestamp,
            totalFeesCollected0: 0,
            totalFeesCollected1: 0,
            rebalanceCount: 0
        });
    }

    function addLiquidity(uint256 amount0, uint256 amount1) external override onlyOwner whenNotPaused {
        require(amount0 > 0 || amount1 > 0, "ALM: Invalid amounts");
        
        if (amount0 > 0) {
            token0.safeTransferFrom(msg.sender, address(this), amount0);
        }
        if (amount1 > 0) {
            token1.safeTransferFrom(msg.sender, address(this), amount1);
        }
        
        _addLiquidityToPool();
    }

    function rebalance() external override whenNotPaused nonReentrant returns (bool success) {
        try this._rebalanceInternal() {
            return true;
        } catch {
            return false;
        }
    }

    function _rebalanceInternal() external onlyAuthorized {
        (, int24 currentTick, , , , , ) = pool.slot0();
        
        if (_shouldRebalance(currentTick)) {
            _executeRebalance(currentTick);
        }
    }

    function _shouldRebalance(int24 currentTick) internal view returns (bool) {
        if (almState.totalLiquidity == 0) return false;
        
        return currentTick < almState.currentTickLower || 
               currentTick >= almState.currentTickUpper;
    }

    function _executeRebalance(int24 currentTick) internal {
        int24 oldTickLower = almState.currentTickLower;
        int24 oldTickUpper = almState.currentTickUpper;
        uint128 oldLiquidity = almState.totalLiquidity;
        
        if (oldLiquidity > 0) {
            _removeLiquidity();
            _collectFees();
        }
        
        int24 newTickLower = _alignTick(currentTick);
        int24 newTickUpper = newTickLower + TICK_SPACING;
        
        _addLiquidityToPosition(newTickLower, newTickUpper);
        
        almState.currentTickLower = newTickLower;
        almState.currentTickUpper = newTickUpper;
        almState.lastRebalanceTimestamp = block.timestamp;
        almState.rebalanceCount++;
        
        emit Rebalanced(oldTickLower, oldTickUpper, newTickLower, newTickUpper, almState.totalLiquidity);
    }

    function _alignTick(int24 tick) internal pure returns (int24) {
        return (tick / TICK_SPACING) * TICK_SPACING;
    }

    function _addLiquidityToPool() internal {
        (, int24 currentTick, , , , , ) = pool.slot0();
        int24 tickLower = _alignTick(currentTick);
        int24 tickUpper = tickLower + TICK_SPACING;
        
        _addLiquidityToPosition(tickLower, tickUpper);
        
        if (almState.totalLiquidity == 0) {
            almState.currentTickLower = tickLower;
            almState.currentTickUpper = tickUpper;
        }
    }

    function _addLiquidityToPosition(int24 tickLower, int24 tickUpper) internal {
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        if (balance0 == 0 && balance1 == 0) return;
        
        uint128 liquidity = _calculateLiquidity(balance0, balance1, tickLower, tickUpper);
        if (liquidity == 0) return;
        
        token0.safeIncreaseAllowance(address(pool), balance0);
        token1.safeIncreaseAllowance(address(pool), balance1);
        
        try pool.mint(
            address(this),
            POSITION_INDEX,
            tickLower,
            tickUpper,
            liquidity,
            ""
        ) returns (uint256 amount0, uint256 amount1) {
            almState.totalLiquidity += liquidity;
            emit PositionCreated(tickLower, tickUpper, liquidity);
        } catch {
            token0.safeDecreaseAllowance(address(pool), balance0);
            token1.safeDecreaseAllowance(address(pool), balance1);
        }
    }

    function _removeLiquidity() internal {
        if (almState.totalLiquidity == 0) return;
        
        try pool.burn(
            POSITION_INDEX,
            almState.currentTickLower,
            almState.currentTickUpper,
            almState.totalLiquidity
        ) {
            almState.totalLiquidity = 0;
        } catch {
            // Handle burn failure gracefully
        }
    }

    function _collectFees() internal {
        try pool.collect(
            address(this),
            POSITION_INDEX,
            almState.currentTickLower,
            almState.currentTickUpper,
            type(uint128).max,
            type(uint128).max
        ) returns (uint128 amount0, uint128 amount1) {
            almState.totalFeesCollected0 += amount0;
            almState.totalFeesCollected1 += amount1;
            
            if (amount0 > 0 || amount1 > 0) {
                emit FeesCollected(amount0, amount1);
            }
        } catch {
            // Handle collect failure gracefully
        }
    }

    function _calculateLiquidity(
        uint256 amount0,
        uint256 amount1,
        int24 tickLower,
        int24 tickUpper
    ) internal pure returns (uint128) {
        // Simplified liquidity calculation for narrow range
        // In a real implementation, this would use proper math libraries
        if (amount0 == 0 && amount1 == 0) return 0;
        
        // For single-tick positions, use the smaller amount as basis
        uint256 baseAmount = amount0 < amount1 ? amount0 : amount1;
        if (baseAmount == 0) {
            baseAmount = amount0 > 0 ? amount0 : amount1;
        }
        
        return uint128(baseAmount / 1000); // Simplified calculation
    }

    function emergencyWithdraw() external override onlyOwner {
        _removeLiquidity();
        _collectFees();
        
        uint256 balance0 = token0.balanceOf(address(this));
        uint256 balance1 = token1.balanceOf(address(this));
        
        if (balance0 > 0) {
            token0.safeTransfer(owner(), balance0);
        }
        if (balance1 > 0) {
            token1.safeTransfer(owner(), balance1);
        }
        
        emit EmergencyWithdraw(owner(), balance0, balance1);
    }

    function pause() external onlyOwner {
        paused = true;
    }

    function unpause() external onlyOwner {
        paused = false;
    }

    function getALMState() external view override returns (ALMState memory) {
        return almState;
    }

    function getCurrentPoolState() external view override returns (PoolData memory) {
        (uint160 sqrtPriceX96, int24 tick, , , , , ) = pool.slot0();
        uint128 liquidity = pool.liquidity();
        
        return PoolData({
            currentTick: tick,
            sqrtPriceX96: sqrtPriceX96,
            liquidity: liquidity
        });
    }

    // Callback functions for Uniswap V3 compatibility
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata
    ) external {
        require(msg.sender == address(pool), "ALM: Invalid caller");
        
        if (amount0Owed > 0) {
            token0.safeTransfer(msg.sender, amount0Owed);
        }
        if (amount1Owed > 0) {
            token1.safeTransfer(msg.sender, amount1Owed);
        }
    }

    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata
    ) external {
        require(msg.sender == address(pool), "ALM: Invalid caller");
        
        if (amount0Delta > 0) {
            token0.safeTransfer(msg.sender, uint256(amount0Delta));
        }
        if (amount1Delta > 0) {
            token1.safeTransfer(msg.sender, uint256(amount1Delta));
        }
    }
}