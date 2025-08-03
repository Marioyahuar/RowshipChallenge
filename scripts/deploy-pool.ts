import { ethers } from "hardhat";

async function main() {
    console.log("Deploying RamsesV3Pool...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // Get token addresses (from previous deployment or environment)
    const token0Address = process.env.FAKE_USDC_ADDRESS || "0x..."; // Replace with actual address
    const token1Address = process.env.FAKE_SCUSD_ADDRESS || "0x..."; // Replace with actual address
    
    if (token0Address === "0x..." || token1Address === "0x...") {
        console.error("Please set FAKE_USDC_ADDRESS and FAKE_SCUSD_ADDRESS environment variables");
        process.exit(1);
    }

    console.log("Using token0 (USDC):", token0Address);
    console.log("Using token1 (SCUSD):", token1Address);

    // For this implementation, we'll use the existing RamsesV3Pool contract
    // In a real scenario, you'd deploy through a factory
    const RamsesV3Pool = await ethers.getContractFactory("RamsesV3Pool");
    
    // Deploy pool with minimal configuration
    // Note: This is a simplified deployment - in practice you'd use the Factory
    const pool = await RamsesV3Pool.deploy();
    await pool.waitForDeployment();
    const poolAddress = await pool.getAddress();
    
    console.log("RamsesV3Pool deployed to:", poolAddress);

    // Initialize pool with 1:1 price (stablecoin pair)
    // sqrtPriceX96 for 1:1 price = sqrt(1) * 2^96 = 2^96
    const sqrtPriceX96 = "79228162514264337593543950336"; // 2^96
    
    try {
        await pool.initialize(sqrtPriceX96);
        console.log("Pool initialized with 1:1 price");
    } catch (error) {
        console.log("Pool may already be initialized or error occurred:", error);
    }

    console.log("\nDeployment completed!");
    console.log("Save this address:");
    console.log(`POOL_ADDRESS=${poolAddress}`);

    return {
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