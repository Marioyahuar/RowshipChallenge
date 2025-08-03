// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IALM {
    struct ALMState {
        uint128 totalLiquidity;
        int24 currentTickLower;
        int24 currentTickUpper;
        uint256 lastRebalanceTimestamp;
        uint256 totalFeesCollected0;
        uint256 totalFeesCollected1;
        uint256 rebalanceCount;
    }

    struct PoolData {
        int24 currentTick;
        uint160 sqrtPriceX96;
        uint128 liquidity;
    }

    event Rebalanced(
        int24 oldTickLower,
        int24 oldTickUpper,
        int24 newTickLower,
        int24 newTickUpper,
        uint128 liquidityAmount
    );
    
    event FeesCollected(uint256 amount0, uint256 amount1);
    event PositionCreated(int24 tickLower, int24 tickUpper, uint128 liquidity);
    event EmergencyWithdraw(address recipient, uint256 amount0, uint256 amount1);

    function rebalance() external returns (bool success);
    function emergencyWithdraw() external;
    function getALMState() external view returns (ALMState memory);
    function getCurrentPoolState() external view returns (PoolData memory);
    function addLiquidity(uint256 amount0, uint256 amount1) external;
}