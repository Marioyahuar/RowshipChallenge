import { ethers } from "hardhat";
import fs from "fs";

async function main() {
  console.log("🚀 Fresh Deploy - Starting from zero...");
  console.log("This will deploy all contracts with clean state for realistic simulation\n");

  const [deployer] = await ethers.getSigners();
  console.log("📤 Deploying with account:", deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)), "ETH\n");

  // 1. Deploy Mock Tokens
  console.log("🪙 Deploying Mock Tokens...");
  
  const FakeUSDC = await ethers.getContractFactory("FakeUSDC");
  const fakeUSDC = await FakeUSDC.deploy();
  await fakeUSDC.waitForDeployment();
  
  const FakeSCUSD = await ethers.getContractFactory("FakeSCUSD");
  const fakeSCUSD = await FakeSCUSD.deploy();
  await fakeSCUSD.waitForDeployment();
  
  console.log("✅ FakeUSDC deployed to:", await fakeUSDC.getAddress());
  console.log("✅ FakeSCUSD deployed to:", await fakeSCUSD.getAddress());

  // 2. Deploy Mock Pool
  console.log("\n🏊 Deploying Mock Pool...");
  
  const MockPool = await ethers.getContractFactory("MockPool");
  const mockPool = await MockPool.deploy(
    await fakeUSDC.getAddress(),
    await fakeSCUSD.getAddress()
  );
  await mockPool.waitForDeployment();
  
  console.log("✅ MockPool deployed to:", await mockPool.getAddress());

  // 3. Deploy ALM Manager
  console.log("\n🤖 Deploying ALM Manager...");
  
  const ALMManager = await ethers.getContractFactory("ALMManager");
  const almManager = await ALMManager.deploy(
    await mockPool.getAddress(),
    await fakeUSDC.getAddress(),
    await fakeSCUSD.getAddress(),
    deployer.address
  );
  await almManager.waitForDeployment();
  
  console.log("✅ ALMManager deployed to:", await almManager.getAddress());

  // 4. Initial Setup (minimal amounts to start clean)
  console.log("\n⚙️  Initial Setup...");
  
  // Only mint small amounts for gas and initial operations
  await fakeUSDC.mint(deployer.address, ethers.parseUnits("100", 6)); // 100 USDC for setup
  await fakeSCUSD.mint(deployer.address, ethers.parseUnits("100", 18)); // 100 SCUSD for setup
  
  console.log("✅ Minted minimal tokens for setup");

  // 5. Save deployment addresses
  const deploymentData = {
    FAKE_USDC_ADDRESS: await fakeUSDC.getAddress(),
    FAKE_SCUSD_ADDRESS: await fakeSCUSD.getAddress(),
    POOL_ADDRESS: await mockPool.getAddress(),
    ALM_MANAGER_ADDRESS: await almManager.getAddress(),
    DEPLOYER: deployer.address,
    TIMESTAMP: new Date().toISOString(),
    NETWORK: "localhost"
  };

  fs.writeFileSync('deployment.json', JSON.stringify(deploymentData, null, 2));
  console.log("\n💾 Deployment addresses saved to deployment.json");

  // 6. Verify initial state (should be all zeros)
  console.log("\n📊 INITIAL STATE (Clean):");
  const initialAlmState = await almManager.getALMState();
  const initialPoolState = await mockPool.slot0();
  
  console.log(`• Pool Tick: ${initialPoolState.tick}`);
  console.log(`• Pool Liquidity: ${await mockPool.liquidity()}`);
  console.log(`• ALM Liquidity: ${initialAlmState.totalLiquidity}`);
  console.log(`• ALM Range: [${initialAlmState.currentTickLower}, ${initialAlmState.currentTickUpper})`);
  console.log(`• Rebalance Count: ${initialAlmState.rebalanceCount}`);
  console.log(`• USDC Fees: ${ethers.formatUnits(initialAlmState.totalFeesCollected0, 6)}`);
  console.log(`• SCUSD Fees: ${ethers.formatUnits(initialAlmState.totalFeesCollected1, 18)}`);

  console.log("\n🎉 Fresh deployment complete!");
  console.log("📋 Next steps:");
  console.log("   1. Run: npx hardhat run scripts/realistic-simulation.ts --network localhost");
  console.log("   2. Start frontend to see realistic data");
  console.log("   3. Demo the ALM with meaningful numbers!\n");

  return deploymentData;
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