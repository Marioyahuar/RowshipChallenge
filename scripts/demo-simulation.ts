import { ethers } from "hardhat";
import fs from "fs";

async function main() {
    console.log("🎮 Starting ALM Demo Simulation...");

    const [deployer] = await ethers.getSigners();
    
    // Load deployment addresses
    let addresses: any = {};
    try {
        const deploymentData = fs.readFileSync('deployment.json', 'utf8');
        addresses = JSON.parse(deploymentData);
        console.log("📦 Loaded deployment addresses");
    } catch (error) {
        console.error("❌ Could not load deployment.json. Please run deploy-all first.");
        process.exit(1);
    }

    // Get contract instances
    const mockPool = await ethers.getContractAt("MockPool", addresses.POOL_ADDRESS);
    const almManager = await ethers.getContractAt("ALMManager", addresses.ALM_MANAGER_ADDRESS);
    const fakeUSDC = await ethers.getContractAt("FakeUSDC", addresses.FAKE_USDC_ADDRESS);
    const fakeSCUSD = await ethers.getContractAt("FakeSCUSD", addresses.FAKE_SCUSD_ADDRESS);

    // Fund the pool with tokens for fees
    console.log("💰 Funding pool with tokens for fee collection...");
    try {
        // Mint tokens to the pool address for fee collection
        await fakeUSDC.mint(mockPool.target, ethers.parseUnits("100", 6)); // 100 USDC
        await fakeSCUSD.mint(mockPool.target, ethers.parseUnits("100", 18)); // 100 SCUSD
        console.log("✅ Pool funded with tokens");
    } catch (error) {
        console.error("❌ Pool funding failed:", error);
    }

    console.log("📊 Starting state:");
    await logState(mockPool, almManager);

    // Simulation: Move price and trigger rebalances
    console.log("\n🎯 Simulation: Testing ALM rebalancing...");
    
    const numberOfTicks = 5;
    for (let i = 0; i < numberOfTicks; i++) {
        console.log(`\n--- Simulation Step ${i + 1}/${numberOfTicks} ---`);
        
        // Get current state
        const currentState = await almManager.getALMState();
        const currentPoolState = await mockPool.slot0();
        
        console.log(`Current tick: ${currentPoolState.tick}`);
        console.log(`ALM range: [${currentState.currentTickLower}, ${currentState.currentTickUpper})`);
        
        // Move tick to trigger rebalance
        const currentTick = Number(currentPoolState.tick);
        const newTick = currentTick + (i % 2 === 0 ? 2 : -2);
        console.log(`Moving tick to: ${newTick}`);
        
        await mockPool.setTick(newTick);
        
        // Check if rebalance is needed
        const tickLower = Number(currentState.currentTickLower);
        const tickUpper = Number(currentState.currentTickUpper);
        const isOutOfRange = newTick < tickLower || newTick >= tickUpper;
        
        if (isOutOfRange) {
            console.log("🚨 Tick is out of range - triggering rebalance...");
            
            try {
                const rebalanceTx = await almManager.rebalance();
                await rebalanceTx.wait();
                console.log("✅ Rebalance successful");
                
                // Add some mock fees (smaller amounts)
                await mockPool.addFees(
                    1, // position index
                    currentState.currentTickLower,
                    currentState.currentTickUpper,
                    ethers.parseUnits("1", 6), // 1 USDC fees
                    ethers.parseUnits("1", 18)  // 1 SCUSD fees
                );
                console.log("💰 Added mock fees");
                
            } catch (error) {
                console.error("❌ Rebalance failed:", error);
            }
        } else {
            console.log("✅ Tick is in range - no rebalance needed");
        }
        
        // Wait a bit for demo purposes
        await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Final state
    console.log("\n📊 Final state:");
    await logState(mockPool, almManager);

    // Collect fees
    console.log("\n💰 Collecting fees...");
    try {
        const currentState = await almManager.getALMState();  
        // Use reasonable amounts instead of max values
        const collectTx = await mockPool.collect(
            deployer.address,
            1,
            currentState.currentTickLower,
            currentState.currentTickUpper,
            ethers.parseUnits("50", 6),  // Collect up to 50 USDC
            ethers.parseUnits("50", 18)  // Collect up to 50 SCUSD
        );
        await collectTx.wait();
        console.log("✅ Fees collected");
    } catch (error) {
        console.error("❌ Fee collection failed:", error);
    }

    console.log("\n🎉 Demo simulation completed!");
    console.log("\n📋 Summary:");
    const finalState = await almManager.getALMState();
    console.log(`- Total rebalances: ${finalState.rebalanceCount}`);
    console.log(`- Total fees (USDC): ${ethers.formatUnits(finalState.totalFeesCollected0, 6)}`);
    console.log(`- Total fees (SCUSD): ${ethers.formatUnits(finalState.totalFeesCollected1, 18)}`);
    console.log(`- Current liquidity: ${finalState.totalLiquidity}`);
}

async function logState(mockPool: any, almManager: any) {
    const poolSlot0 = await mockPool.slot0();
    const poolLiquidity = await mockPool.liquidity();
    const almState = await almManager.getALMState();
    
    console.log({
        pool: {
            tick: poolSlot0.tick.toString(),
            sqrtPriceX96: poolSlot0.sqrtPriceX96.toString(),
            liquidity: poolLiquidity.toString()
        },
        alm: {
            liquidity: almState.totalLiquidity.toString(),
            range: `[${almState.currentTickLower}, ${almState.currentTickUpper})`,
            rebalances: almState.rebalanceCount.toString(),
            fees0: ethers.formatUnits(almState.totalFeesCollected0, 6),
            fees1: ethers.formatUnits(almState.totalFeesCollected1, 18)
        }
    });
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