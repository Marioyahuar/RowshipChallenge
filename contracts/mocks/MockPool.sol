// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockPool {
    struct Slot0 {
        uint160 sqrtPriceX96;
        int24 tick;
        uint16 observationIndex;
        uint16 observationCardinality;
        uint16 observationCardinalityNext;
        uint8 feeProtocol;
        bool unlocked;
    }

    Slot0 private _slot0;
    uint128 public liquidity;
    
    IERC20 public token0;
    IERC20 public token1;
    
    mapping(bytes32 => Position) public positions;
    
    struct Position {
        uint128 liquidity;
        uint256 feeGrowthInside0LastX128;
        uint256 feeGrowthInside1LastX128;
        uint128 tokensOwed0;
        uint128 tokensOwed1;
    }

    event Mint(
        address sender,
        address indexed owner,
        int24 indexed tickLower,
        int24 indexed tickUpper,
        uint128 amount,
        uint256 amount0,
        uint256 amount1
    );

    event Burn(
        address indexed owner,
        int24 indexed tickLower,
        int24 indexed tickUpper,
        uint128 amount,
        uint256 amount0,
        uint256 amount1
    );

    event Swap(
        address indexed sender,
        address indexed recipient,
        int256 amount0,
        int256 amount1,
        uint160 sqrtPriceX96,
        uint128 liquidity,
        int24 tick
    );

    constructor(address _token0, address _token1) {
        token0 = IERC20(_token0);
        token1 = IERC20(_token1);
        
        // Initialize with 1:1 price (2^96 for 1:1 ratio)
        _slot0 = Slot0({
            sqrtPriceX96: 79228162514264337593543950336, // 2^96
            tick: 0,
            observationIndex: 0,
            observationCardinality: 1,
            observationCardinalityNext: 1,
            feeProtocol: 0,
            unlocked: true
        });
    }

    function slot0() external view returns (
        uint160 sqrtPriceX96,
        int24 tick,
        uint16 observationIndex,
        uint16 observationCardinality,
        uint16 observationCardinalityNext,
        uint8 feeProtocol,
        bool unlocked
    ) {
        return (
            _slot0.sqrtPriceX96,
            _slot0.tick,
            _slot0.observationIndex,
            _slot0.observationCardinality,
            _slot0.observationCardinalityNext,
            _slot0.feeProtocol,
            _slot0.unlocked
        );
    }

    function initialize(uint160 sqrtPriceX96) external {
        require(_slot0.sqrtPriceX96 == 0, "Already initialized");
        _slot0.sqrtPriceX96 = sqrtPriceX96;
    }

    function mint(
        address recipient,
        uint256 index,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount,
        bytes calldata data
    ) external returns (uint256 amount0, uint256 amount1) {
        require(amount > 0, "Invalid liquidity amount");
        
        // Simplified calculation for demo
        amount0 = uint256(amount) * 1000; // Simplified conversion
        amount1 = uint256(amount) * 1000;
        
        // Update position
        bytes32 positionKey = keccak256(abi.encodePacked(recipient, index, tickLower, tickUpper));
        positions[positionKey].liquidity += amount;
        
        // Update pool liquidity if position is in range
        if (_slot0.tick >= tickLower && _slot0.tick < tickUpper) {
            liquidity += amount;
        }
        
        // Transfer tokens from caller
        if (amount0 > 0) {
            // Call mint callback
            IMintCallback(msg.sender).uniswapV3MintCallback(amount0, amount1, data);
        }
        
        emit Mint(msg.sender, recipient, tickLower, tickUpper, amount, amount0, amount1);
    }

    function burn(
        uint256 index,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount
    ) external returns (uint256 amount0, uint256 amount1) {
        bytes32 positionKey = keccak256(abi.encodePacked(msg.sender, index, tickLower, tickUpper));
        require(positions[positionKey].liquidity >= amount, "Insufficient liquidity");
        
        // Simplified calculation
        amount0 = uint256(amount) * 1000;
        amount1 = uint256(amount) * 1000;
        
        // Update position
        positions[positionKey].liquidity -= amount;
        
        // Update pool liquidity if position is in range
        if (_slot0.tick >= tickLower && _slot0.tick < tickUpper) {
            liquidity -= amount;
        }
        
        // Add to tokens owed
        positions[positionKey].tokensOwed0 += uint128(amount0);
        positions[positionKey].tokensOwed1 += uint128(amount1);
        
        emit Burn(msg.sender, tickLower, tickUpper, amount, amount0, amount1);
    }

    function collect(
        address recipient,
        uint256 index,
        int24 tickLower,
        int24 tickUpper,
        uint128 amount0Requested,
        uint128 amount1Requested
    ) external returns (uint128 amount0, uint128 amount1) {
        bytes32 positionKey = keccak256(abi.encodePacked(msg.sender, index, tickLower, tickUpper));
        
        amount0 = amount0Requested > positions[positionKey].tokensOwed0 
            ? positions[positionKey].tokensOwed0 
            : amount0Requested;
            
        amount1 = amount1Requested > positions[positionKey].tokensOwed1 
            ? positions[positionKey].tokensOwed1 
            : amount1Requested;
        
        positions[positionKey].tokensOwed0 -= amount0;
        positions[positionKey].tokensOwed1 -= amount1;
        
        // Transfer tokens to recipient
        if (amount0 > 0) {
            token0.transfer(recipient, amount0);
        }
        if (amount1 > 0) {
            token1.transfer(recipient, amount1);
        }
    }

    function swap(
        address recipient,
        bool zeroForOne,
        int256 amountSpecified,
        uint160 sqrtPriceLimitX96,
        bytes calldata data
    ) external returns (int256 amount0, int256 amount1) {
        require(amountSpecified != 0, "Invalid swap amount");
        
        // Simplified swap logic - just change the tick
        if (zeroForOne) {
            _slot0.tick -= 1;
        } else {
            _slot0.tick += 1;
        }
        
        // Simplified amounts
        amount0 = zeroForOne ? amountSpecified : -amountSpecified;
        amount1 = zeroForOne ? -amountSpecified : amountSpecified;
        
        // Call swap callback
        ISwapCallback(msg.sender).uniswapV3SwapCallback(amount0, amount1, data);
        
        emit Swap(msg.sender, recipient, amount0, amount1, _slot0.sqrtPriceX96, liquidity, _slot0.tick);
    }

    // Helper functions for testing
    function setTick(int24 newTick) external {
        _slot0.tick = newTick;
    }
    
    function addFees(uint256 index, int24 tickLower, int24 tickUpper, uint128 fees0, uint128 fees1) external {
        bytes32 positionKey = keccak256(abi.encodePacked(msg.sender, index, tickLower, tickUpper));
        positions[positionKey].tokensOwed0 += fees0;
        positions[positionKey].tokensOwed1 += fees1;
    }
}

interface IMintCallback {
    function uniswapV3MintCallback(
        uint256 amount0Owed,
        uint256 amount1Owed,
        bytes calldata data
    ) external;
}

interface ISwapCallback {
    function uniswapV3SwapCallback(
        int256 amount0Delta,
        int256 amount1Delta,
        bytes calldata data
    ) external;
}