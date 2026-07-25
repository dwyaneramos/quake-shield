import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // Use existing deployed addresses
  const usdcAddress = process.env.USDC_ADDRESS || "0x6de0C06048D8Cfd0Ca57006Ae4B05EbCc86F2ba4";
  const quakeshieldAddress = process.env.QUAKE_SHIELD_ADDRESS || "0x7D1CFE16972da98f7366F1C3cF342177747eEb6d";

  console.log("\nUsing existing MockUSDC:", usdcAddress);
  console.log("Using existing QuakeShield:", quakeshieldAddress);

  // Deploy EarthquakeMarket
  console.log("\n--- Deploying EarthquakeMarket ---");
  const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
  const market = await EarthquakeMarket.deploy(usdcAddress, quakeshieldAddress);
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("EarthquakeMarket deployed to:", marketAddress);

  // Set oracle on EarthquakeMarket (deployer is oracle by default)
  console.log("\n--- Setting oracle address ---");
  await market.setOracle(deployer.address);
  console.log("Oracle set to:", deployer.address);

  console.log("\n====================================");
  console.log("  DEPLOYMENT COMPLETE");
  console.log("====================================");
  console.log("EarthquakeMarket:", marketAddress);
  console.log("====================================");
  console.log("\nNext steps:");
  console.log("1. Update apps/web/.env.local: NEXT_PUBLIC_EARTHQUAKE_MARKET_ADDRESS=" + marketAddress);
  console.log("2. Update apps/oracle/.env: EARTHQUAKE_MARKET_ADDRESS=" + marketAddress);
  console.log("3. Mint USDC to your wallet for testing");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
