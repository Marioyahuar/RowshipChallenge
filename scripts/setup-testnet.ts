import { ethers } from "hardhat";

async function main() {
    console.log("Setting up testnet environment...");

    const [deployer] = await ethers.getSigners();
    console.log("Setup with account:", deployer.address);

    // Get deployed contract addresses
    const almManagerAddress = process.env.ALM_MANAGER_ADDRESS || "0x...";
    const token0Address = process.env.FAKE_USDC_ADDRESS || "0x...";
    const token1Address = process.env.FAKE_SCUSD_ADDRESS || "0x...";
    
    if (almManagerAddress === "0x..." || token0Address === "0x..." || token1Address === "0x...") {
        console.error("Please set contract addresses in environment variables");
        process.exit(1);
    }

    // Get contract instances
    const fakeUSDC = await ethers.getContractAt("FakeUSDC", token0Address);
    const fakeSCUSD = await ethers.getContractAt("FakeSCUSD", token1Address);
    const almManager = await ethers.getContractAt("ALMManager", almManagerAddress);

    console.log("Contract instances loaded");

    // Mint additional tokens for testing
    const mintAmount0 = ethers.parseUnits("10000", 6); // 10,000 USDC
    const mintAmount1 = ethers.parseUnits("10000", 18); // 10,000 SCUSD

    console.log("Minting additional tokens for testing...");
    await fakeUSDC.mint(deployer.address, mintAmount0);
    await fakeSCUSD.mint(deployer.address, mintAmount1);

    console.log("Current balances:");
    const balance0 = await fakeUSDC.balanceOf(deployer.address);
    const balance1 = await fakeSCUSD.balanceOf(deployer.address);
    console.log(`USDC balance: ${ethers.formatUnits(balance0, 6)}`);
    console.log(`SCUSD balance: ${ethers.formatUnits(balance1, 18)}`);

    // Approve ALM Manager to spend tokens
    console.log("Approving ALM Manager to spend tokens...");
    const approveAmount0 = ethers.parseUnits("5000", 6); // 5,000 USDC
    const approveAmount1 = ethers.parseUnits("5000", 18); // 5,000 SCUSD

    await fakeUSDC.approve(almManagerAddress, approveAmount0);
    await fakeSCUSD.approve(almManagerAddress, approveAmount1);

    console.log("Approved amounts:");
    console.log(`USDC approved: ${ethers.formatUnits(approveAmount0, 6)}`);
    console.log(`SCUSD approved: ${ethers.formatUnits(approveAmount1, 18)}`);

    // Add initial liquidity to ALM
    console.log("Adding initial liquidity to ALM...");
    const liquidityAmount0 = ethers.parseUnits("1000", 6); // 1,000 USDC
    const liquidityAmount1 = ethers.parseUnits("1000", 18); // 1,000 SCUSD

    try {
        await almManager.addLiquidity(liquidityAmount0, liquidityAmount1);
        console.log("Initial liquidity added successfully");
        
        // Check ALM state
        const almState = await almManager.getALMState();
        console.log("ALM State after adding liquidity:");
        console.log(`Total Liquidity: ${almState.totalLiquidity}`);
        console.log(`Current Tick Range: ${almState.currentTickLower} - ${almState.currentTickUpper}`);
        console.log(`Rebalance Count: ${almState.rebalanceCount}`);
    } catch (error) {
        console.error("Error adding initial liquidity:", error);
    }

    console.log("\nTestnet setup completed!");
    console.log("ALM is ready for testing and monitoring");
    
    return {
        almManager: almManagerAddress,
        token0: token0Address,
        token1: token1Address,
        setupComplete: true
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