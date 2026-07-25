import { expect } from "chai";
import { ethers } from "hardhat";
import { QuakeShield, MockDNZD } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("QuakeShield", function () {
  let quakeshield: QuakeShield;
  let dnzd: MockDNZD;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  // Test constants
  const MAGNITUDE_6_0 = 600; // Scaled by 100
  const MAGNITUDE_7_0 = 700;
  const LAT_WELLINGTON = -41285800; // -41.2858° scaled by 1e6
  const LNG_WELLINGTON = 174778000; // 174.778° scaled by 1e6
  const LAT_CHRISTCHURCH = -43530000; // -43.53° scaled by 1e6
  const LNG_CHRISTCHURCH = 172636000; // 172.636° scaled by 1e6
  const RADIUS_50KM = 50;
  const COVERAGE_1000_DNZD = 1000000000; // 1000 DNZD (6 decimals)
  const PREMIUM_10_DNZD = 10000000; // 10 DNZD

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    // Deploy MockDNZD
    const MockDNZD = await ethers.getContractFactory("MockDNZD");
    dnzd = await MockDNZD.deploy();

    // Deploy QuakeShield
    const QuakeShield = await ethers.getContractFactory("QuakeShield");
    quakeshield = await QuakeShield.deploy(await dnzd.getAddress());

    // Set oracle
    await quakeshield.setOracle(oracle.address);

    // Mint DNZD to users
    await dnzd.mint(user1.address, ethers.parseUnits("100000", 6));
    await dnzd.mint(user2.address, ethers.parseUnits("100000", 6));

    // Mint DNZD to contract for payouts
    await dnzd.mint(await quakeshield.getAddress(), ethers.parseUnits("1000000", 6));
  });

  describe("Deployment", function () {
    it("Should set the correct DNZD token", async function () {
      expect(await quakeshield.dnzd()).to.equal(await dnzd.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      expect(await quakeshield.owner()).to.equal(owner.address);
    });

    it("Should set the deployer as initial oracle", async function () {
      // After setOracle(oracle.address) in beforeEach, oracle is set to oracle signer
      expect(await quakeshield.oracle()).to.equal(oracle.address);
    });
  });

  describe("buyPolicy", function () {
    it("Should allow user to buy a policy", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      const tx = await quakeshield
        .connect(user1)
        .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM);

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check policy was created
      const policy = await quakeshield.getPolicy(0);
      expect(policy.policyholder).to.equal(user1.address);
      expect(policy.coverageAmount).to.equal(COVERAGE_1000_DNZD);
      expect(policy.triggerMagnitude).to.equal(MAGNITUDE_6_0);
      expect(policy.isActive).to.be.true;
      expect(policy.hasPaidOut).to.be.false;
    });

    it("Should charge correct premium (1%)", async function () {
      const expectedPremium = COVERAGE_1000_DNZD / 100;

      await dnzd.connect(user1).approve(await quakeshield.getAddress(), expectedPremium);

      const balanceBefore = await dnzd.balanceOf(user1.address);
      await quakeshield
        .connect(user1)
        .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM);
      const balanceAfter = await dnzd.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(expectedPremium);
    });

    it("Should emit PolicyPurchased event", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM)
      )
        .to.emit(quakeshield, "PolicyPurchased")
        .withArgs(0, user1.address, COVERAGE_1000_DNZD, COVERAGE_1000_DNZD / 100);
    });

    it("Should reject coverage below minimum magnitude", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(COVERAGE_1000_DNZD, 300, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM) // 3.0 < 4.0 min
      ).to.be.revertedWith("QuakeShield: minimum magnitude is 4.0");
    });

    it("Should reject radius over 500km", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 501)
      ).to.be.revertedWith("QuakeShield: radius must be 1-500km");
    });
  });

  describe("recordEarthquake", function () {
    beforeEach(async function () {
      // User buys a policy near Wellington
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM);
    });

    it("Should only allow oracle to record earthquakes", async function () {
      await expect(
        quakeshield
          .connect(user1)
          .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001")
      ).to.be.revertedWith("QuakeShield: caller is not the oracle");
    });

    it("Should record earthquake event", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001");

      const quake = await quakeshield.getQuake(0);
      expect(quake.magnitude).to.equal(MAGNITUDE_6_0);
      expect(quake.latitude).to.equal(LAT_WELLINGTON);
      expect(quake.longitude).to.equal(LNG_WELLINGTON);
      expect(quake.publicId).to.equal("2024p001");
    });

    it("Should emit QuakeRecorded event", async function () {
      await expect(
        quakeshield
          .connect(oracle)
          .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001")
      )
        .to.emit(quakeshield, "QuakeRecorded")
        .withArgs(0, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON);
    });

    it("Should pay out if earthquake meets policy trigger", async function () {
      const balanceBefore = await dnzd.balanceOf(user1.address);

      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001");

      const balanceAfter = await dnzd.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(COVERAGE_1000_DNZD);

      // Policy should now be inactive
      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.false;
      expect(policy.hasPaidOut).to.be.true;
    });

    it("Should not pay out if earthquake is below trigger magnitude", async function () {
      const balanceBefore = await dnzd.balanceOf(user1.address);

      // Record earthquake below 6.0 trigger
      await quakeshield
        .connect(oracle)
        .recordEarthquake(500, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p002"); // 5.0 < 6.0

      const balanceAfter = await dnzd.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore); // No payout

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });

    it("Should not pay out if earthquake is outside radius", async function () {
      const balanceBefore = await dnzd.balanceOf(user1.address);

      // Record earthquake in Christchurch (far from Wellington)
      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_7_0, LAT_CHRISTCHURCH, LNG_CHRISTCHURCH, 10, "2024p003");

      const balanceAfter = await dnzd.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore); // No payout

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });
  });

  describe("Pool Stats", function () {
    it("Should track premiums correctly", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM);

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalPremiums).to.equal(PREMIUM_10_DNZD);
    });

    it("Should count active policies", async function () {
      await dnzd.connect(user1).approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM);

      const stats = await quakeshield.getPoolStats();
      expect(stats._activePolicies).to.equal(1);
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update oracle", async function () {
      await quakeshield.setOracle(user2.address);
      expect(await quakeshield.oracle()).to.equal(user2.address);
    });

    it("Should not allow non-owner to update oracle", async function () {
      await expect(quakeshield.connect(user1).setOracle(user2.address)).to.be.reverted;
    });
  });
});
