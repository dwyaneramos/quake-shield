import { ethers, network } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // If DNZD_ADDRESS_<NETWORK> is set (e.g. NewMoney's real dNZD token),
  // point QuakeShield at that instead of deploying a fresh MockDNZD.
  const externalTokenAddress = process.env[`DNZD_ADDRESS_${network.name.toUpperCase()}`];

  let DNZDAddress: string;
  if (externalTokenAddress) {
    DNZDAddress = externalTokenAddress;
    console.log("\n--- Using external token ---");
    console.log("Token:", DNZDAddress);
  } else {
    console.log("\n--- Deploying MockDNZD ---");
    const MockDNZD = await ethers.getContractFactory("MockDNZD");
    const DNZD = await MockDNZD.deploy();
    await DNZD.waitForDeployment();
    DNZDAddress = await DNZD.getAddress();
    console.log("MockDNZD deployed to:", DNZDAddress);

    console.log("\n--- Minting test DNZD ---");
    const mintAmount = ethers.parseUnits("1000000", 6);
    await DNZD.mint(deployer.address, mintAmount);
    console.log("Minted 1,000,000 DNZD to deployer");
  }

  // Deploy QuakeShield
  console.log("\n--- Deploying QuakeShield ---");
  const QuakeShield = await ethers.getContractFactory("QuakeShield");
  const quakeshield = await QuakeShield.deploy(DNZDAddress);
  await quakeshield.waitForDeployment();
  const quakeshieldAddress = await quakeshield.getAddress();
  console.log("QuakeShield deployed to:", quakeshieldAddress);

  // Deploy EarthquakeMarket, sharing the same token and reading QuakeShield's
  // recorded quake log for resolution.
  console.log("\n--- Deploying EarthquakeMarket ---");
  const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
  const earthquakeMarket = await EarthquakeMarket.deploy(DNZDAddress, quakeshieldAddress);
  await earthquakeMarket.waitForDeployment();
  const earthquakeMarketAddress = await earthquakeMarket.getAddress();
  console.log("EarthquakeMarket deployed to:", earthquakeMarketAddress);

  // Summary
  console.log("\n====================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log(`Network: ${network.name} (${network.config.chainId})`);
  console.log("Token:", DNZDAddress, externalTokenAddress ? "(external)" : "(MockDNZD)");
  console.log("QuakeShield:", quakeshieldAddress);
  console.log("EarthquakeMarket:", earthquakeMarketAddress);
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
