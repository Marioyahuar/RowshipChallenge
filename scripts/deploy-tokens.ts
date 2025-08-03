import { ethers } from "hardhat";

async function main() {
    console.log("Deploying tokens...");

    const [deployer] = await ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Account balance:", ethers.formatEther(await deployer.provider.getBalance(deployer.address)));

    // Deploy FakeUSDC
    const FakeUSDC = await ethers.getContractFactory("FakeUSDC");
    const fakeUSDC = await FakeUSDC.deploy();
    await fakeUSDC.waitForDeployment();
    const fakeUSDCAddress = await fakeUSDC.getAddress();
    console.log("FakeUSDC deployed to:", fakeUSDCAddress);

    // Deploy FakeSCUSD
    const FakeSCUSD = await ethers.getContractFactory("FakeSCUSD");
    const fakeSCUSD = await FakeSCUSD.deploy();
    await fakeSCUSD.waitForDeployment();
    const fakeSCUSDAddress = await fakeSCUSD.getAddress();
    console.log("FakeSCUSD deployed to:", fakeSCUSDAddress);

    // Verify deployment
    const usdcBalance = await fakeUSDC.balanceOf(deployer.address);
    const scusdBalance = await fakeSCUSD.balanceOf(deployer.address);
    
    console.log("FakeUSDC balance:", ethers.formatUnits(usdcBalance, 6));
    console.log("FakeSCUSD balance:", ethers.formatUnits(scusdBalance, 18));

    console.log("\nDeployment completed!");
    console.log("Save these addresses:");
    console.log(`FAKE_USDC_ADDRESS=${fakeUSDCAddress}`);
    console.log(`FAKE_SCUSD_ADDRESS=${fakeSCUSDAddress}`);

    return {
        fakeUSDC: fakeUSDCAddress,
        fakeSCUSD: fakeSCUSDAddress
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