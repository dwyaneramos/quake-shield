import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { QuakeShield, MockDNZD } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("QuakeShield", function () {
  let quakeshield: QuakeShield;
  let DNZD: MockDNZD;
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
  const COVERAGE_1000_DNZD = 1000000000; // 1000 DNZD (6 decimals)
  const PREMIUM_10_DNZD = 10000000; // 10 DNZD
  const MAX_COVERAGE = 10000000000; // 10,000 DNZD (max per policy)

  const FORTNIGHT = 14 * 24 * 60 * 60;

  const WELLINGTON_REGION_NAME = "Wellington";
  const CANTERBURY_REGION_NAME = "Canterbury";
  const WELLINGTON_REGION_ID = 0;
  const CANTERBURY_REGION_ID = 1;

  async function addTestRegions() {
    await quakeshield.addRegion(WELLINGTON_REGION_NAME);
    await quakeshield.addRegion(CANTERBURY_REGION_NAME);
  }

  async function buyWellingtonPolicy(
    buyer: HardhatEthersSigner,
    coverage: number | bigint,
    recurring = false,
  ) {
    await DNZD.connect(buyer).approve(await quakeshield.getAddress(), coverage);
    return quakeshield
      .connect(buyer)
      .buyPolicy(coverage, MAGNITUDE_6_0, WELLINGTON_REGION_ID, recurring);
  }

  /**
   * Mirrors what the oracle actually does: it computes which regions' real
   * (off-chain) boundaries contain the epicenter and passes that list along —
   * the contract no longer has geometry to work this out itself. Wellington
   * and Canterbury's real boundaries are disjoint, so a Wellington epicenter
   * only ever resolves to region 0 and a Christchurch one only to region 1.
   */
  function recordQuake(
    magnitude: number,
    lat: number,
    lng: number,
    publicId: string,
    regionIds: number[],
  ) {
    return quakeshield
      .connect(oracle)
      .recordEarthquake(magnitude, lat, lng, 10, publicId, regionIds);
  }

  function recordWellingtonQuake(magnitude: number, publicId: string) {
    return recordQuake(magnitude, LAT_WELLINGTON, LNG_WELLINGTON, publicId, [
      WELLINGTON_REGION_ID,
    ]);
  }

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    // Deploy MockDNZD
    const MockDNZD = await ethers.getContractFactory("MockDNZD");
    DNZD = await MockDNZD.deploy();

    // Deploy QuakeShield
    const QuakeShield = await ethers.getContractFactory("QuakeShield");
    quakeshield = await QuakeShield.deploy(await DNZD.getAddress());

    // Set oracle
    await quakeshield.setOracle(oracle.address);

    // Mint DNZD to users
    await DNZD.mint(user1.address, ethers.parseUnits("100000", 6));
    await DNZD.mint(user2.address, ethers.parseUnits("100000", 6));

    // Mint DNZD to contract for payouts (1M DNZD)
    await DNZD.mint(
      await quakeshield.getAddress(),
      ethers.parseUnits("1000000", 6),
    );

    await addTestRegions();
  });

  describe("Deployment", function () {
    it("Should set the correct DNZD token", async function () {
      expect(await quakeshield.DNZD()).to.equal(await DNZD.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      expect(await quakeshield.owner()).to.equal(owner.address);
    });

    it("Should set the deployer as initial oracle", async function () {
      expect(await quakeshield.oracle()).to.equal(oracle.address);
    });

    it("Should have correct constants", async function () {
      expect(await quakeshield.MAX_COVERAGE_PER_POLICY()).to.equal(
        MAX_COVERAGE,
      );
      expect(await quakeshield.MIN_RESERVE_RATIO_BPS()).to.equal(15000);
      expect(await quakeshield.ACCRUAL_PERIOD()).to.equal(FORTNIGHT);
      expect(await quakeshield.RENEWAL_PERIOD()).to.equal(FORTNIGHT);
      expect(await quakeshield.BASE_APR_BPS()).to.equal(400);
      expect(await quakeshield.MAX_APR_BPS()).to.equal(3000);
    });
  });

  describe("buyPolicy", function () {
    it("Should allow user to buy a policy", async function () {
      const tx = await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);

      // Check policy was created
      const policy = await quakeshield.getPolicy(0);
      expect(policy.policyholder).to.equal(user1.address);
      expect(policy.coverageAmount).to.equal(COVERAGE_1000_DNZD);
      expect(policy.triggerMagnitude).to.equal(MAGNITUDE_6_0);
      expect(policy.regionId).to.equal(WELLINGTON_REGION_ID);
      expect(policy.isActive).to.be.true;
      expect(policy.hasPaidOut).to.be.false;
    });

    it("Should charge correct premium (1%)", async function () {
      const expectedPremium = COVERAGE_1000_DNZD / 100;
      const balanceBefore = await DNZD.balanceOf(user1.address);
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);
      const balanceAfter = await DNZD.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(expectedPremium);
    });

    it("Should route the premium into the investor yield reserve", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);
      expect(await quakeshield.yieldReserve()).to.equal(PREMIUM_10_DNZD);
    });

    it("Should emit PolicyPurchased event", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        COVERAGE_1000_DNZD,
      );

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            COVERAGE_1000_DNZD,
            MAGNITUDE_6_0,
            WELLINGTON_REGION_ID,
            false,
          ),
      )
        .to.emit(quakeshield, "PolicyPurchased")
        .withArgs(
          0,
          user1.address,
          COVERAGE_1000_DNZD,
          COVERAGE_1000_DNZD / 100,
        );
    });

    it("Should reject coverage below minimum magnitude", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        COVERAGE_1000_DNZD,
      );

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(COVERAGE_1000_DNZD, 450, WELLINGTON_REGION_ID, false),
      ).to.be.revertedWith("QuakeShield: minimum magnitude is 5.0");
    });

    it("Should reject an unknown region", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        COVERAGE_1000_DNZD,
      );

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(COVERAGE_1000_DNZD, MAGNITUDE_6_0, 99, false),
      ).to.be.revertedWith("QuakeShield: unknown region");
    });

    it("Should reject coverage exceeding max per policy (10,000 DNZD)", async function () {
      const tooMuchCoverage = ethers.parseUnits("10001", 6); // 10,001 DNZD
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        tooMuchCoverage,
      );

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            tooMuchCoverage,
            MAGNITUDE_6_0,
            WELLINGTON_REGION_ID,
            false,
          ),
      ).to.be.revertedWith("QuakeShield: exceeds max coverage");
    });

    it("Should allow coverage exactly at max (10,000 DNZD)", async function () {
      const tx = await buyWellingtonPolicy(user1, MAX_COVERAGE);
      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should track totalActiveCoverage", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);
      expect(await quakeshield.totalActiveCoverage()).to.equal(
        COVERAGE_1000_DNZD,
      );
    });
  });

  describe("recordEarthquake", function () {
    beforeEach(async function () {
      // User buys a policy over the Wellington region
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);
    });

    it("Should only allow oracle to record earthquakes", async function () {
      await expect(
        quakeshield
          .connect(user1)
          .recordEarthquake(
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            10,
            "2024p001",
            [WELLINGTON_REGION_ID],
          ),
      ).to.be.revertedWith("QuakeShield: caller is not the oracle");
    });

    it("Should reject an unknown region ID from the oracle", async function () {
      await expect(
        recordQuake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, "2024p098", [99]),
      ).to.be.revertedWith("QuakeShield: unknown region");
    });

    it("Should record earthquake event", async function () {
      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p001");

      const quake = await quakeshield.getQuake(0);
      expect(quake.magnitude).to.equal(MAGNITUDE_6_0);
      expect(quake.latitude).to.equal(LAT_WELLINGTON);
      expect(quake.longitude).to.equal(LNG_WELLINGTON);
      expect(quake.publicId).to.equal("2024p001");
    });

    it("Should emit QuakeRecorded event", async function () {
      await expect(recordWellingtonQuake(MAGNITUDE_6_0, "2024p001"))
        .to.emit(quakeshield, "QuakeRecorded")
        .withArgs(0, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON);
    });

    it("Should pay out if earthquake strikes the policy's region", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p001");

      const balanceAfter = await DNZD.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(COVERAGE_1000_DNZD);

      // Policy should now be inactive
      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.false;
      expect(policy.hasPaidOut).to.be.true;
    });

    it("Should reduce totalActiveCoverage after payout", async function () {
      expect(await quakeshield.totalActiveCoverage()).to.equal(
        COVERAGE_1000_DNZD,
      );

      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p001");

      expect(await quakeshield.totalActiveCoverage()).to.equal(0);
    });

    it("Should not pay out if earthquake is below trigger magnitude", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await recordWellingtonQuake(500, "2024p002");

      const balanceAfter = await DNZD.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore);

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });

    it("Should not pay out if earthquake is outside the policy's region", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      // Christchurch epicenter resolves only to the Canterbury region.
      await recordQuake(MAGNITUDE_7_0, LAT_CHRISTCHURCH, LNG_CHRISTCHURCH, "2024p003", [
        CANTERBURY_REGION_ID,
      ]);

      const balanceAfter = await DNZD.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore);

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });
  });

  describe("Regions & Pool Stats", function () {
    it("Should register regions with the right name and active flag", async function () {
      expect(await quakeshield.getRegionCount()).to.equal(2);
      const region = await quakeshield.getRegion(WELLINGTON_REGION_ID);
      expect(region.name).to.equal(WELLINGTON_REGION_NAME);
      expect(region.active).to.be.true;
    });

    it("Should count active policies", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);

      const stats = await quakeshield.getPoolStats();
      expect(stats._activePolicies).to.equal(1);
    });

    it("Should still allow buying a policy in a region closed to new investment", async function () {
      await quakeshield.setRegionActive(WELLINGTON_REGION_ID, false);
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD);

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalActiveCoverage).to.equal(COVERAGE_1000_DNZD);
    });

    it("Should only let the oracle set risk scores", async function () {
      await expect(
        quakeshield.connect(user1).setRegionRiskScore(0, 5000),
      ).to.be.revertedWith("QuakeShield: caller is not the oracle");
    });

    it("Should reject out-of-range risk scores", async function () {
      await expect(
        quakeshield.connect(oracle).setRegionRiskScore(0, 10001),
      ).to.be.revertedWith("QuakeShield: risk score out of range");
    });

    it("Should set risk scores for every region in one call", async function () {
      await quakeshield
        .connect(oracle)
        .setRegionRiskScores([0, 1], [2000, 8000]);

      expect(await quakeshield.getRegionAprBps(0)).to.equal(920);
      expect(await quakeshield.getRegionAprBps(1)).to.equal(2480);
    });

    it("Should reject mismatched batch arguments", async function () {
      await expect(
        quakeshield.connect(oracle).setRegionRiskScores([0, 1], [2000]),
      ).to.be.revertedWith("QuakeShield: length mismatch");
    });
  });

  describe("Investing", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    it("Should mint 1:1 shares to the first investor in a region", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await expect(quakeshield.connect(user1).invest(0, INVEST_10000))
        .to.emit(quakeshield, "InvestmentDeposited")
        .withArgs(0, user1.address, INVEST_10000, INVEST_10000);

      const [shares, value] = await quakeshield.getInvestment(0, user1.address);
      expect(shares).to.equal(INVEST_10000);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should keep each region's capital separate", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000 * 2n,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);
      await quakeshield.connect(user1).invest(1, INVEST_10000);

      expect((await quakeshield.getRegion(0)).totalAssets).to.equal(
        INVEST_10000,
      );
      expect((await quakeshield.getRegion(1)).totalAssets).to.equal(
        INVEST_10000,
      );
      expect(await quakeshield.getTotalInvested()).to.equal(INVEST_10000 * 2n);
    });

    it("Should split a region pro rata between investors", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      await DNZD.connect(user2).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user2).invest(0, INVEST_10000);

      const [, value1] = await quakeshield.getInvestment(0, user1.address);
      const [, value2] = await quakeshield.getInvestment(0, user2.address);
      expect(value1).to.equal(INVEST_10000);
      expect(value2).to.equal(INVEST_10000);
    });

    it("Should track which regions an investor holds", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000 * 2n,
      );
      await quakeshield.connect(user1).invest(1, INVEST_10000);
      await quakeshield.connect(user1).invest(1, INVEST_10000);

      const held = await quakeshield.getInvestorRegions(user1.address);
      expect(held.map(Number)).to.deep.equal([1]);
      expect(await quakeshield.getInvestorTotalValue(user1.address)).to.equal(
        INVEST_10000 * 2n,
      );
    });

    it("Should reject investing in an unknown region", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await expect(
        quakeshield.connect(user1).invest(99, INVEST_10000),
      ).to.be.revertedWith("QuakeShield: unknown region");
    });

    it("Should reject a zero investment", async function () {
      await expect(quakeshield.connect(user1).invest(0, 0)).to.be.revertedWith(
        "QuakeShield: investment must be > 0",
      );
    });

    it("Should report invested capital and yield reserve in pool stats", async function () {
      const invested = ethers.parseUnits("2500", 6);
      await DNZD.connect(user1).approve(await quakeshield.getAddress(), invested);
      await quakeshield.connect(user1).invest(0, invested);

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalInvested).to.equal(invested);
      expect(stats._yieldReserve).to.equal(0);
    });
  });

  describe("Withdrawing", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    it("Should let an investor withdraw part of a position", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      const withdrawal = ethers.parseUnits("4000", 6);
      const balanceBefore = await DNZD.balanceOf(user1.address);
      await quakeshield.connect(user1).withdrawInvestment(0, withdrawal);
      const balanceAfter = await DNZD.balanceOf(user1.address);

      expect(balanceAfter - balanceBefore).to.equal(withdrawal);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 - withdrawal);
    });

    it("Should let an investor withdraw an entire position", async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      await quakeshield.connect(user1).withdrawAllFromRegion(0);

      const [shares, value] = await quakeshield.getInvestment(0, user1.address);
      expect(shares).to.equal(0);
      expect(value).to.equal(0);
    });

    it("Should block a withdrawal that would break the reserve ratio", async function () {
      // A fresh deployment with no seed mint, so the pool is exactly what the
      // investor put in and live coverage actually constrains withdrawals.
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      const miniShield = await QuakeShield.deploy(await DNZD.getAddress());
      await miniShield.setOracle(oracle.address);
      await miniShield.addRegion(WELLINGTON_REGION_NAME);

      const invested = ethers.parseUnits("200", 6);
      await DNZD.connect(user1).approve(
        await miniShield.getAddress(),
        invested,
      );
      await miniShield.connect(user1).invest(0, invested);

      // 100 DNZD of cover against a 200.1 DNZD pool — fine at purchase time,
      // but pulling the capital back out drops the ratio below 150%.
      const coverage = ethers.parseUnits("100", 6);
      await DNZD.connect(user2).approve(
        await miniShield.getAddress(),
        coverage,
      );
      await miniShield
        .connect(user2)
        .buyPolicy(coverage, MAGNITUDE_6_0, 0, false);

      await expect(
        miniShield.connect(user1).withdrawInvestment(0, invested),
      ).to.be.revertedWith("QuakeShield: would break reserve ratio");
    });
  });

  describe("Accrual", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);
    const RESERVE_SEED = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      // Interest is capped by the yield reserve, which is only ever funded by
      // premiums — seed it directly so accrual tests don't need a policy purchase.
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        RESERVE_SEED,
      );
      await quakeshield.connect(user1).fundYieldReserve(RESERVE_SEED);
    });

    it("Should return max uint when no active coverage", async function () {
      const ratio = await quakeshield.getReserveRatio();
      expect(ratio).to.equal(ethers.MaxUint256);
    });

    it("Should pay more for a riskier region", async function () {
      await quakeshield.connect(oracle).setRegionRiskScore(0, 10000);
      await time.increase(FORTNIGHT);
      await quakeshield.accrueRegion(0);

      const expected =
        (INVEST_10000 * 3000n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + expected);
    });

    it("Should settle several missed fortnights at once", async function () {
      await time.increase(FORTNIGHT * 3);
      await quakeshield.accrueRegion(0);

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      // Three compounding periods, so strictly more than three flat ones.
      const oneperiod =
        (INVEST_10000 * 400n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      expect(value).to.be.gte(INVEST_10000 + oneperiod * 3n);
    });

    it("Should skip the period a qualifying quake lands in", async function () {
      // Quake inside Wellington, no policy to trigger.
      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p010");

      await time.increase(FORTNIGHT);

      const region = await quakeshield.getRegion(0);
      const expectedPeriodEnd = region.lastAccrualAt + BigInt(FORTNIGHT);

      await expect(quakeshield.accrueRegion(0))
        .to.emit(quakeshield, "AccrualSkipped")
        .withArgs(0, expectedPeriodEnd, "earthquake in period");

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should resume paying the fortnight after a quake", async function () {
      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p011");

      await time.increase(FORTNIGHT * 2);
      await quakeshield.accrueRegion(0);

      // First period forfeited, second paid.
      const oneperiod =
        (INVEST_10000 * 400n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + oneperiod);
    });

    it("Should leave an untouched region earning while its neighbour is hit", async function () {
      await DNZD.connect(user2).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user2).invest(1, INVEST_10000);

      // Quake in Wellington only.
      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p012");

      await time.increase(FORTNIGHT);
      await quakeshield.accrueAllRegions();

      const [, wellingtonValue] = await quakeshield.getInvestment(
        0,
        user1.address,
      );
      const [, canterburyValue] = await quakeshield.getInvestment(
        1,
        user2.address,
      );

      expect(wellingtonValue).to.equal(INVEST_10000);
      expect(canterburyValue).to.be.gt(INVEST_10000);
    });

    it("Should pay only what the yield reserve can cover", async function () {
      // A fresh deployment with an investor but no funded reserve — no
      // premiums paid in, so interest is capped at zero regardless of period.
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      const dryShield = await QuakeShield.deploy(await DNZD.getAddress());
      await dryShield.addRegion(WELLINGTON_REGION_NAME);

      await DNZD.connect(user2).approve(
        await dryShield.getAddress(),
        INVEST_10000,
      );
      await dryShield.connect(user2).invest(0, INVEST_10000);

      await time.increase(FORTNIGHT);
      await dryShield.accrueRegion(0);

      const [, value] = await dryShield.getInvestment(0, user2.address);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should preview what an accrual would pay", async function () {
      await buyWellingtonPolicy(user2, COVERAGE_1000_DNZD);

      await time.increase(FORTNIGHT * 2);
      const [periodsDue, interest] = await quakeshield.previewAccrual(0);

      expect(periodsDue).to.equal(2);
      expect(interest).to.be.gt(0);

      await quakeshield.accrueRegion(0);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + interest);
    });
  });

  describe("Losses from payouts", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
      await DNZD.connect(user1).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      await DNZD.connect(user2).approve(
        await quakeshield.getAddress(),
        INVEST_10000,
      );
      await quakeshield.connect(user2).invest(1, INVEST_10000);

      // Policy over Wellington.
      await buyWellingtonPolicy(user2, COVERAGE_1000_DNZD);
    });

    it("Should charge a payout to the region the quake struck", async function () {
      await expect(recordWellingtonQuake(MAGNITUDE_6_0, "2024p020"))
        .to.emit(quakeshield, "InvestmentLoss")
        .withArgs(0, COVERAGE_1000_DNZD);

      const [, wellingtonValue] = await quakeshield.getInvestment(0, user1.address);
      expect(wellingtonValue).to.equal(INVEST_10000 - BigInt(COVERAGE_1000_DNZD));
    });

    it("Should leave an untouched region's capital alone", async function () {
      await recordWellingtonQuake(MAGNITUDE_6_0, "2024p021");

      const [, canterburyValue] = await quakeshield.getInvestment(1, user2.address);
      expect(canterburyValue).to.equal(INVEST_10000);
    });
  });

  describe("Renewing & lapsing policies", function () {
    it("Should let the policyholder renew a recurring policy", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD, true);

      const premium = COVERAGE_1000_DNZD / 100;
      await DNZD.connect(user1).approve(await quakeshield.getAddress(), premium);

      const before = await quakeshield.getPolicy(0);
      await quakeshield.connect(user1).renewPolicy(0);
      const after = await quakeshield.getPolicy(0);

      expect(after.periodEnd).to.equal(before.periodEnd + BigInt(FORTNIGHT));
      expect(after.premiumPaid).to.equal(before.premiumPaid + BigInt(premium));
    });

    it("Should reject renewing a one-off policy", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD, false);

      await expect(
        quakeshield.connect(user1).renewPolicy(0),
      ).to.be.revertedWith("QuakeShield: not a recurring policy");
    });

    it("Should reject renewing from someone other than the policyholder", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD, true);

      await expect(
        quakeshield.connect(user2).renewPolicy(0),
      ).to.be.revertedWith("QuakeShield: not the policyholder");
    });

    it("Should lapse a policy past its coverage period", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD, false);

      await time.increase(FORTNIGHT + 1);
      await quakeshield.lapsePolicy(0);

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.false;
      expect(await quakeshield.totalActiveCoverage()).to.equal(0);
    });

    it("Should reject lapsing a policy before its period ends", async function () {
      await buyWellingtonPolicy(user1, COVERAGE_1000_DNZD, false);

      await expect(quakeshield.lapsePolicy(0)).to.be.revertedWith(
        "QuakeShield: policy not expired",
      );
    });
  });

  describe("Admin Functions", function () {
    it("Should allow owner to update oracle", async function () {
      await quakeshield.setOracle(user2.address);
      expect(await quakeshield.oracle()).to.equal(user2.address);
    });

    it("Should not allow non-owner to update oracle", async function () {
      await expect(quakeshield.connect(user1).setOracle(user2.address)).to.be
        .reverted;
    });
  });
});
