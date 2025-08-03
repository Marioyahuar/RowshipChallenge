import { ethers } from "hardhat";
import fs from "fs";

async function main() {
    console.log("🚀 Starting complete ALM deployment...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

    const deployedAddresses: any = {};

    try {
        // 1. Deploy Tokens
        console.log("\n📦 Step 1: Deploying tokens...");
        
        const FakeUSDC = await ethers.getContractFactory("FakeUSDC");
        const fakeUSDC = await FakeUSDC.deploy();
        await fakeUSDC.waitForDeployment();
        deployedAddresses.FAKE_USDC_ADDRESS = await fakeUSDC.getAddress();
        console.log("✅ FakeUSDC deployed to:", deployedAddresses.FAKE_USDC_ADDRESS);

        const FakeSCUSD = await ethers.getContractFactory("FakeSCUSD");
        const fakeSCUSD = await FakeSCUSD.deploy();
        await fakeSCUSD.waitForDeployment();
        deployedAddresses.FAKE_SCUSD_ADDRESS = await fakeSCUSD.getAddress();
        console.log("✅ FakeSCUSD deployed to:", deployedAddresses.FAKE_SCUSD_ADDRESS);

        // 2. Deploy Mock Pool
        console.log("\n🏊 Step 2: Deploying mock pool...");
        
        const MockPool = await ethers.getContractFactory("MockPool");
        const mockPool = await MockPool.deploy(
            deployedAddresses.FAKE_USDC_ADDRESS,
            deployedAddresses.FAKE_SCUSD_ADDRESS
        );
        await mockPool.waitForDeployment();
        deployedAddresses.POOL_ADDRESS = await mockPool.getAddress();
        console.log("✅ MockPool deployed to:", deployedAddresses.POOL_ADDRESS);

        // 3. Deploy ALM Manager
        console.log("\n🤖 Step 3: Deploying ALM Manager...");
        
        const ALMManager = await ethers.getContractFactory("ALMManager");
        const almManager = await ALMManager.deploy(
            deployedAddresses.POOL_ADDRESS,
            deployedAddresses.FAKE_USDC_ADDRESS,
            deployedAddresses.FAKE_SCUSD_ADDRESS,
            deployer.address
        );
        await almManager.waitForDeployment();
        deployedAddresses.ALM_MANAGER_ADDRESS = await almManager.getAddress();
        console.log("✅ ALMManager deployed to:", deployedAddresses.ALM_MANAGER_ADDRESS);

        // 4. Setup initial state
        console.log("\n⚙️  Step 4: Setting up initial state...");
        
        // Mint tokens for testing
        const mintAmount0 = ethers.parseUnits("100000", 6); // 100k USDC
        const mintAmount1 = ethers.parseUnits("100000", 18); // 100k SCUSD
        
        await fakeUSDC.mint(deployer.address, mintAmount0);
        await fakeSCUSD.mint(deployer.address, mintAmount1);
        console.log("✅ Minted tokens for testing");

        // Approve ALM Manager
        const approveAmount0 = ethers.parseUnits("50000", 6);
        const approveAmount1 = ethers.parseUnits("50000", 18);
        
        await fakeUSDC.approve(deployedAddresses.ALM_MANAGER_ADDRESS, approveAmount0);
        await fakeSCUSD.approve(deployedAddresses.ALM_MANAGER_ADDRESS, approveAmount1);
        console.log("✅ Approved ALM Manager to spend tokens");

        // Add initial liquidity
        const liquidityAmount0 = ethers.parseUnits("10000", 6); // 10k USDC
        const liquidityAmount1 = ethers.parseUnits("10000", 18); // 10k SCUSD
        
        await almManager.addLiquidity(liquidityAmount0, liquidityAmount1);
        console.log("✅ Added initial liquidity to ALM");

        // 5. Verify deployment
        console.log("\n✅ Step 5: Verifying deployment...");
        
        const almState = await almManager.getALMState();
        const poolState = await almManager.getCurrentPoolState();
        
        console.log("ALM State:", {
            totalLiquidity: almState.totalLiquidity.toString(),
            currentRange: `${almState.currentTickLower} - ${almState.currentTickUpper}`,
            rebalanceCount: almState.rebalanceCount.toString()
        });
        
        console.log("Pool State:", {
            currentTick: poolState.currentTick.toString(),
            sqrtPriceX96: poolState.sqrtPriceX96.toString(),
            liquidity: poolState.liquidity.toString()
        });

        // 6. Save deployment info
        console.log("\n💾 Step 6: Saving deployment info...");
        
        // Save to .env format
        const envContent = Object.entries(deployedAddresses)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
        
        fs.writeFileSync('.env.local', envContent);
        console.log("✅ Saved addresses to .env.local");

        // Save to JSON for frontend
        fs.writeFileSync('deployment.json', JSON.stringify({
            ...deployedAddresses,
            deployer: deployer.address,
            network: "hardhat",
            timestamp: new Date().toISOString()
        }, null, 2));
        console.log("✅ Saved deployment info to deployment.json");

        console.log("\n🎉 Deployment completed successfully!");
        console.log("\n📋 Contract Addresses:");
        Object.entries(deployedAddresses).forEach(([key, value]) => {
            console.log(`${key}=${value}`);
        });

        console.log("\n🔧 Next steps:");
        console.log("1. Copy addresses to executor/.env");
        console.log("2. Copy addresses to frontend/.env");
        console.log("3. Start the executor: cd executor && npm run dev");
        console.log("4. Start the frontend: cd frontend && npm run dev");
        console.log("5. Run simulation: npm run simulate");

        return deployedAddresses;

    } catch (error) {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    }
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