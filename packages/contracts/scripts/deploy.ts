import { ethers, network } from "hardhat";
// The canonical region table, shared with the frontend and oracle. Imported as
// JSON because this script runs as CommonJS while @quakeshield/shared is ESM.
// Only names are registered on-chain — boundary geometry lives entirely in the
// shared package and the oracle, see QuakeShield.sol's Region struct note.
import NZ_REGIONS from "../../shared/src/regions.json";

/** Seed capital for the reserve that pays investor returns (MockDNZD only). */
const YIELD_RESERVE_SEED = ethers.parseUnits("50000", 6);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  // If USDC_ADDRESS_<NETWORK> is set (the existing mock/real USDC token),
  // point QuakeShield at that instead of deploying a fresh MockDNZD.
  const externalTokenAddress = process.env[`USDC_ADDRESS_${network.name.toUpperCase()}`];

  let DNZDAddress: string;
  let mockDNZD: Awaited<ReturnType<typeof deployMockDNZD>> | null = null;

  if (externalTokenAddress) {
    DNZDAddress = externalTokenAddress;
    console.log("\n--- Using external token ---");
    console.log("Token:", DNZDAddress);
  } else {
    console.log("\n--- Deploying MockDNZD ---");
    mockDNZD = await deployMockDNZD();
    DNZDAddress = await mockDNZD.getAddress();
    console.log("MockDNZD deployed to:", DNZDAddress);

    console.log("\n--- Minting test DNZD ---");
    const mintAmount = ethers.parseUnits("1000000", 6);
    await (await mockDNZD.mint(deployer.address, mintAmount)).wait();
    console.log("Minted 1,000,000 DNZD to deployer");
  }

  // Deploy QuakeShield
  console.log("\n--- Deploying QuakeShield ---");
  const QuakeShield = await ethers.getContractFactory("QuakeShield");
  const quakeshield = await QuakeShield.deploy(DNZDAddress);
  await quakeshield.waitForDeployment();
  const quakeshieldAddress = await quakeshield.getAddress();
  console.log("QuakeShield deployed to:", quakeshieldAddress);

  // Register the investable regions, in order — a region's on-chain ID is
  // just its index here, and must stay in sync with packages/shared/src/regions.json,
  // which the frontend and oracle read for boundary geometry.
  console.log(`\n--- Registering ${NZ_REGIONS.length} NZ regions ---`);
  for (const region of NZ_REGIONS) {
    const tx = await quakeshield.addRegion(region.name);
    await tx.wait();
    console.log(`  ✓ ${region.name}`);
  }

  // Seed the reserve investor returns are paid from. Premiums top this up as
  // policies are sold, but a fresh deployment has nothing to pay out with.
  if (mockDNZD) {
    console.log("\n--- Seeding yield reserve ---");
    await (await mockDNZD.approve(quakeshieldAddress, YIELD_RESERVE_SEED)).wait();
    await (await quakeshield.fundYieldReserve(YIELD_RESERVE_SEED)).wait();
    console.log(`Funded yield reserve with ${ethers.formatUnits(YIELD_RESERVE_SEED, 6)} DNZD`);
  } else {
    console.log("\n--- Yield reserve ---");
    console.log("External token in use — fund the reserve manually with fundYieldReserve()");
  }

  // Summary
  const deployBlock = quakeshield.deploymentTransaction()?.blockNumber ?? 0;
  const suffix = network.name.toUpperCase();

  console.log("\n====================================");
  console.log("  DEPLOYMENT SUMMARY");
  console.log("====================================");
  console.log(`Network: ${network.name} (${network.config.chainId})`);
  console.log("Token:", DNZDAddress, externalTokenAddress ? "(external)" : "(MockDNZD)");
  console.log("QuakeShield:", quakeshieldAddress);
  console.log("Regions registered:", NZ_REGIONS.length);
  console.log("====================================");
  console.log("\nAdd to the root .env:");
  console.log(`QUAKE_SHIELD_ADDRESS_${suffix}=${quakeshieldAddress}`);
  console.log(`DNZD_ADDRESS_${suffix}=${DNZDAddress}`);
  console.log(`NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_${suffix}=${quakeshieldAddress}`);
  console.log(`NEXT_PUBLIC_DNZD_ADDRESS_${suffix}=${DNZDAddress}`);
  console.log(`NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_${suffix}=${deployBlock}`);
  console.log("\nNext steps:");
  console.log("1. Fund the oracle wallet with this chain's native gas token");
  console.log("2. Set the oracle address via setOracle() if it isn't the deployer");
  console.log("3. Start the oracle so it pushes region risk scores and runs accrual");
}

async function deployMockDNZD() {
  const MockDNZD = await ethers.getContractFactory("MockDNZD");
  const token = await MockDNZD.deploy();
  await token.waitForDeployment();
  return token;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
