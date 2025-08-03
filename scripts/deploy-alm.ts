import { ethers } from "hardhat";

async function main() {
    console.log("Deploying ALMManager...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get addresses from environment or previous deployments
    const poolAddress = process.env.POOL_ADDRESS || "0x...";
    const token0Address = process.env.FAKE_USDC_ADDRESS || "0x...";
    const token1Address = process.env.FAKE_SCUSD_ADDRESS || "0x...";
    
    if (poolAddress === "0x..." || token0Address === "0x..." || token1Address === "0x...") {
        console.error("Please set POOL_ADDRESS, FAKE_USDC_ADDRESS, and FAKE_SCUSD_ADDRESS environment variables");
        process.exit(1);
    }

    console.log("Using pool:", poolAddress);
    console.log("Using token0 (USDC):", token0Address);
    console.log("Using token1 (SCUSD):", token1Address);
    console.log("Using owner:", deployer.address);

    // Deploy ALMManager
    const ALMManager = await ethers.getContractFactory("ALMManager");
    const almManager = await ALMManager.deploy(
        poolAddress,
        token0Address,
        token1Address,
        deployer.address
    );
    
    await almManager.waitForDeployment();
    const almManagerAddress = await almManager.getAddress();
    
    console.log("ALMManager deployed to:", almManagerAddress);

    // Verify deployment
    const almState = await almManager.getALMState();
    console.log("Initial ALM state:", {
        totalLiquidity: almState.totalLiquidity.toString(),
        rebalanceCount: almState.rebalanceCount.toString(),
        lastRebalanceTimestamp: almState.lastRebalanceTimestamp.toString()
    });

    console.log("\nDeployment completed!");
    console.log("Save this address:");
    console.log(`ALM_MANAGER_ADDRESS=${almManagerAddress}`);

    return {
        almManager: almManagerAddress,
        pool: poolAddress,
        token0: token0Address,
        token1: token1Address
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