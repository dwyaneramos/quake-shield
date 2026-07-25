import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Deploy MockUSDC
  console.log("\n--- Deploying MockUSDC ---");
  const MockUSDC = await ethers.getContractFactory("MockUSDC");
  const usdc = await MockUSDC.deploy();
  await usdc.waitForDeployment();
  const usdcAddress = await usdc.getAddress();
  console.log("MockUSDC deployed to:", usdcAddress);

  // Deploy QuakeShield
  console.log("\n--- Deploying QuakeShield ---");
  const QuakeShield = await ethers.getContractFactory("QuakeShield");
  const quakeshield = await QuakeShield.deploy(usdcAddress);
  await quakeshield.waitForDeployment();
  const quakeshieldAddress = await quakeshield.getAddress();
  console.log("QuakeShield deployed to:", quakeshieldAddress);

  // Deploy EarthquakeMarket
  console.log("\n--- Deploying EarthquakeMarket ---");
  const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
  const market = await EarthquakeMarket.deploy(usdcAddress, quakeshieldAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("EarthquakeMarket deployed to:", marketAddress);

  // Mint test USDC to deployer (1,000,000 USDC)
  console.log("\n--- Minting test USDC ---");
  const mintAmount = ethers.parseUnits("1000000", 6);
  await usdc.mint(deployer.address, mintAmount);
  console.log("Minted 1,000,000 USDC to deployer");

  // Summary
  console.log("\n====================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log("Network: Polygon Amoy (80002)");
  console.log("MockUSDC:", usdcAddress);
  console.log("QuakeShield:", quakeshieldAddress);
  console.log("EarthquakeMarket:", marketAddress);
  console.log("====================================");
  console.log("\nNext steps:");
  console.log("1. Update apps/web/.env.local with these addresses");
  console.log("2. Update apps/oracle/.env with these addresses");
  console.log("3. Mint USDC to oracle wallet for gas");
  console.log("4. Set oracle address in QuakeShield contract");
  console.log("5. Set oracle address in EarthquakeMarket contract");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
