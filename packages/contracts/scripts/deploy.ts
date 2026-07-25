import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // If USDC_ADDRESS_<NETWORK> is set (e.g. a real token like NewMoney's dNZD),
  // point QuakeShield at that instead of deploying a fresh MockUSDC.
  const externalTokenAddress = process.env[`USDC_ADDRESS_${network.name.toUpperCase()}`];

  let usdcAddress: string;
  if (externalTokenAddress) {
    usdcAddress = externalTokenAddress;
    console.log("\n--- Using external token ---");
    console.log("Token:", usdcAddress);
  } else {
    console.log("\n--- Deploying MockUSDC ---");
    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    const usdc = await MockUSDC.deploy();
    await usdc.waitForDeployment();
    usdcAddress = await usdc.getAddress();
    console.log("MockUSDC deployed to:", usdcAddress);

    console.log("\n--- Minting test USDC ---");
    const mintAmount = ethers.parseUnits("1000000", 6);
    await usdc.mint(deployer.address, mintAmount);
    console.log("Minted 1,000,000 USDC to deployer");
  }

  // Deploy QuakeShield
  console.log("\n--- Deploying QuakeShield ---");
  const QuakeShield = await ethers.getContractFactory("QuakeShield");
  const quakeshield = await QuakeShield.deploy(usdcAddress);
  await quakeshield.waitForDeployment();
  const quakeshieldAddress = await quakeshield.getAddress();
  console.log("QuakeShield deployed to:", quakeshieldAddress);

  // Summary
  console.log("\n====================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log(`Network: ${network.name} (${network.config.chainId})`);
  console.log("Token:", usdcAddress, externalTokenAddress ? "(external)" : "(MockUSDC)");
  console.log("QuakeShield:", quakeshieldAddress);
  console.log("====================================");
  console.log("\nNext steps:");
  console.log(`1. Update the root .env with these addresses (the *_${network.name.toUpperCase()} vars)`);
  console.log("2. Fund the oracle wallet with this chain's native gas token");
  console.log("3. Set oracle address in QuakeShield contract if using a separate oracle wallet");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
