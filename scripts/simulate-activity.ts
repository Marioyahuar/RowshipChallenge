import { ethers } from "hardhat";

async function main() {
    console.log("Simulating trading activity to test ALM rebalancing...");

    const [deployer] = await ethers.getSigners();
    console.log("Simulating with account:", deployer.address);

    // Get contract addresses
    const poolAddress = process.env.POOL_ADDRESS || "0x...";
    const token0Address = process.env.FAKE_USDC_ADDRESS || "0x...";
    const token1Address = process.env.FAKE_SCUSD_ADDRESS || "0x...";
    const almManagerAddress = process.env.ALM_MANAGER_ADDRESS || "0x...";
    
    if (poolAddress === "0x..." || token0Address === "0x..." || token1Address === "0x..." || almManagerAddress === "0x...") {
        console.error("Please set all contract addresses in environment variables");
        process.exit(1);
    }

    // Get contract instances
    const pool = await ethers.getContractAt("RamsesV3Pool", poolAddress);
    const fakeUSDC = await ethers.getContractAt("FakeUSDC", token0Address);
    const fakeSCUSD = await ethers.getContractAt("FakeSCUSD", token1Address);
    const almManager = await ethers.getContractAt("ALMManager", almManagerAddress);

    console.log("Contract instances loaded");

    // Get initial state
    let poolState = await pool.slot0();
    let almState = await almManager.getALMState();
    
    console.log("Initial state:");
    console.log(`Pool tick: ${poolState.tick}`);
    console.log(`ALM range: ${almState.currentTickLower} - ${almState.currentTickUpper}`);
    console.log(`ALM liquidity: ${almState.totalLiquidity}`);

    // Perform several swaps to move the price/tick
    const swapAmount = ethers.parseUnits("100", 6); // 100 USDC per swap
    const numberOfSwaps = 5;

    console.log(`\nPerforming ${numberOfSwaps} swaps to move the tick...`);

    for (let i = 0; i < numberOfSwaps; i++) {
        try {
            // Alternate between buying and selling to move the tick back and forth
            const zeroForOne = i % 2 === 0;
            
            console.log(`\nSwap ${i + 1}: ${zeroForOne ? 'USDC -> SCUSD' : 'SCUSD -> USDC'}`);
            
            // Set price limits (far from current price to ensure swap executes)
            const sqrtPriceLimitX96 = zeroForOne 
                ? "4295128740" // Very low price
                : "1461446703485210103287273052203988822378723970341"; // Very high price

            // Execute swap
            await pool.swap(
                deployer.address,
                zeroForOne,
                swapAmount,
                sqrtPriceLimitX96,
                "0x"
            );

            // Get new state
            poolState = await pool.slot0();
            console.log(`New pool tick: ${poolState.tick}`);

            // Check if rebalance is needed and execute
            const shouldRebalance = poolState.tick < almState.currentTickLower || 
                                   poolState.tick >= almState.currentTickUpper;
            
            if (shouldRebalance) {
                console.log("Tick moved outside ALM range - triggering rebalance...");
                try {
                    const success = await almManager.rebalance();
                    if (success) {
                        console.log("Rebalance executed successfully");
                        almState = await almManager.getALMState();
                        console.log(`New ALM range: ${almState.currentTickLower} - ${almState.currentTickUpper}`);
                        console.log(`Rebalance count: ${almState.rebalanceCount}`);
                    } else {
                        console.log("Rebalance failed");
                    }
                } catch (error) {
                    console.error("Rebalance error:", error);
                }
            } else {
                console.log("Tick still in range - no rebalance needed");
            }

            // Wait a bit between swaps
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.error(`Swap ${i + 1} failed:`, error);
        }
    }

    // Final state
    console.log("\n=== Final State ===");
    poolState = await pool.slot0();
    almState = await almManager.getALMState();
    
    console.log(`Final pool tick: ${poolState.tick}`);
    console.log(`Final ALM range: ${almState.currentTickLower} - ${almState.currentTickUpper}`);
    console.log(`Total rebalances: ${almState.rebalanceCount}`);
    console.log(`Total fees collected (token0): ${almState.totalFeesCollected0}`);
    console.log(`Total fees collected (token1): ${almState.totalFeesCollected1}`);

    console.log("\nSimulation completed!");
    
    return {
        totalRebalances: almState.rebalanceCount.toString(),
        finalTick: poolState.tick.toString(),
        feesCollected0: almState.totalFeesCollected0.toString(),
        feesCollected1: almState.totalFeesCollected1.toString()
    };
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

export default main;