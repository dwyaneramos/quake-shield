import { ethers, network } from "hardhat";

/**
 * Deploys EarthquakeMarket standalone, reusing the QuakeShield + USDC
 * addresses already deployed on this network (does not touch QuakeShield),
 * then seeds one sample market so the UI has something to trade.
 */
async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const suffix = network.name.toUpperCase();
  const usdcAddress = process.env[`USDC_ADDRESS_${suffix}`] || process.env[`NEXT_PUBLIC_MOCK_USDC_ADDRESS_${suffix}`];
  const quakeShieldAddress = process.env[`QUAKE_SHIELD_ADDRESS_${suffix}`] || process.env[`NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_${suffix}`];

  if (!usdcAddress) throw new Error(`Missing USDC_ADDRESS_${suffix} / NEXT_PUBLIC_MOCK_USDC_ADDRESS_${suffix} in .env`);
  if (!quakeShieldAddress) throw new Error(`Missing QUAKE_SHIELD_ADDRESS_${suffix} / NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_${suffix} in .env`);

  console.log("\n--- Deploying EarthquakeMarket ---");
  console.log("Reusing token:", usdcAddress);
  console.log("Reusing QuakeShield:", quakeShieldAddress);
  const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
  const earthquakeMarket = await EarthquakeMarket.deploy(usdcAddress, quakeShieldAddress);
  await earthquakeMarket.waitForDeployment();
  const earthquakeMarketAddress = await earthquakeMarket.getAddress();
  console.log("EarthquakeMarket deployed to:", earthquakeMarketAddress);

  // Set oracle on EarthquakeMarket (deployer is oracle by default)
  console.log("\n--- Setting oracle address ---");
  await earthquakeMarket.setOracle(deployer.address);
  console.log("Oracle set to:", deployer.address);

  console.log("\n--- Creating sample market ---");
  // M6.0+ within 50km of Wellington, resolves 30 days out.
  const wellingtonLat = -41_286_500n; // scaled 1e6
  const wellingtonLng = 174_776_200n; // scaled 1e6
  const radiusKm = 50n;
  const triggerMagnitude = 600n; // scaled by 100 -> 6.0
  const resolutionTime = BigInt(Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60);

  const tx = await earthquakeMarket.createMarket(
    "M6.0+ earthquake within 50km of Wellington in the next 30 days",
    wellingtonLat,
    wellingtonLng,
    radiusKm,
    triggerMagnitude,
    resolutionTime
  );
  await tx.wait();
  console.log("Sample market created (id 0)");

  console.log("\n====================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log(`Network: ${network.name} (${network.config.chainId})`);
  console.log("EarthquakeMarket:", earthquakeMarketAddress);
  console.log("====================================");
  console.log(`\nAdd to root .env: NEXT_PUBLIC_EARTHQUAKE_MARKET_ADDRESS_${suffix}=${earthquakeMarketAddress}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
