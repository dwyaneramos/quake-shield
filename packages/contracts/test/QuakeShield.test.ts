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
  const RADIUS_50KM = 50;
  const COVERAGE_1000_DNZD = 1000000000; // 1000 DNZD (6 decimals)
  const PREMIUM_10_DNZD = 10000000; // 10 DNZD
  const MAX_COVERAGE = 10000000000; // 10,000 DNZD (max per policy)

  const FORTNIGHT = 14 * 24 * 60 * 60;

  // Region boxes mirroring packages/shared/src/regions.ts, scaled by 1e6.
  const WELLINGTON_REGION = {
    name: "Wellington",
    south: -41700000,
    north: -40700000,
    west: 174600000,
    east: 176300000,
  };
  const CANTERBURY_REGION = {
    name: "Canterbury",
    south: -45100000,
    north: -42400000,
    west: 171500000,
    east: 174200000,
  };

  async function addTestRegions() {
    await quakeshield.addRegion(
      WELLINGTON_REGION.name,
      WELLINGTON_REGION.south,
      WELLINGTON_REGION.north,
      WELLINGTON_REGION.west,
      WELLINGTON_REGION.east,
    );
    await quakeshield.addRegion(
      CANTERBURY_REGION.name,
      CANTERBURY_REGION.south,
      CANTERBURY_REGION.north,
      CANTERBURY_REGION.west,
      CANTERBURY_REGION.east,
    );
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
      expect(await quakeshield.BASE_APR_BPS()).to.equal(400);
      expect(await quakeshield.MAX_APR_BPS()).to.equal(3000);
    });
  });

  describe("buyPolicy", function () {
    it("Should allow user to buy a policy", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      const tx = await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

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

      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), expectedPremium);

      const balanceBefore = await DNZD.balanceOf(user1.address);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );
      const balanceAfter = await DNZD.balanceOf(user1.address);

      expect(balanceBefore - balanceAfter).to.equal(expectedPremium);
    });

    it("Should route the premium into the investor yield reserve", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      expect(await quakeshield.yieldReserve()).to.equal(PREMIUM_10_DNZD);
    });

    it("Should emit PolicyPurchased event", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            COVERAGE_1000_DNZD,
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            RADIUS_50KM,
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
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            COVERAGE_1000_DNZD,
            300,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            RADIUS_50KM,
          ),
      ).to.be.revertedWith("QuakeShield: minimum magnitude is 4.0");
    });

    it("Should reject radius over 500km", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            COVERAGE_1000_DNZD,
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            501,
          ),
      ).to.be.revertedWith("QuakeShield: radius must be 1-500km");
    });

    it("Should reject coverage exceeding max per policy (10,000 DNZD)", async function () {
      const tooMuchCoverage = ethers.parseUnits("10001", 6); // 10,001 DNZD
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), tooMuchCoverage);

      await expect(
        quakeshield
          .connect(user1)
          .buyPolicy(
            tooMuchCoverage,
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            RADIUS_50KM,
          ),
      ).to.be.revertedWith("QuakeShield: exceeds max coverage");
    });

    it("Should allow coverage exactly at max (10,000 DNZD)", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), MAX_COVERAGE);

      const tx = await quakeshield
        .connect(user1)
        .buyPolicy(
          MAX_COVERAGE,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      const receipt = await tx.wait();
      expect(receipt?.status).to.equal(1);
    });

    it("Should track totalActiveCoverage", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      expect(await quakeshield.totalActiveCoverage()).to.equal(
        COVERAGE_1000_DNZD,
      );
    });
  });

  describe("recordEarthquake", function () {
    beforeEach(async function () {
      // User buys a policy near Wellington
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );
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
          ),
      ).to.be.revertedWith("QuakeShield: caller is not the oracle");
    });

    it("Should record earthquake event", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p001",
        );

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
          .recordEarthquake(
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            10,
            "2024p001",
          ),
      )
        .to.emit(quakeshield, "QuakeRecorded")
        .withArgs(0, MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON);
    });

    it("Should pay out if earthquake meets policy trigger", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p001",
        );

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

      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p001",
        );

      expect(await quakeshield.totalActiveCoverage()).to.equal(0);
    });

    it("Should not pay out if earthquake is below trigger magnitude", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await quakeshield
        .connect(oracle)
        .recordEarthquake(500, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p002");

      const balanceAfter = await DNZD.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore);

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });

    it("Should not pay out if earthquake is outside radius", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_7_0,
          LAT_CHRISTCHURCH,
          LNG_CHRISTCHURCH,
          10,
          "2024p003",
        );

      const balanceAfter = await DNZD.balanceOf(user1.address);
      expect(balanceAfter).to.equal(balanceBefore);

      const policy = await quakeshield.getPolicy(0);
      expect(policy.isActive).to.be.true;
    });
  });

  describe("Regions", function () {
    it("Should let the owner register a region", async function () {
      await expect(
        quakeshield.addRegion(
          WELLINGTON_REGION.name,
          WELLINGTON_REGION.south,
          WELLINGTON_REGION.north,
          WELLINGTON_REGION.west,
          WELLINGTON_REGION.east,
        ),
      )
        .to.emit(quakeshield, "RegionAdded")
        .withArgs(0, WELLINGTON_REGION.name);

      expect(await quakeshield.getRegionCount()).to.equal(1);
      const region = await quakeshield.getRegion(0);
      expect(region.name).to.equal(WELLINGTON_REGION.name);
      expect(region.active).to.be.true;
    });

    it("Should reject regions with inverted bounds", async function () {
      await expect(
        quakeshield.addRegion("Broken", 0, -1, 0, 1),
      ).to.be.revertedWith("QuakeShield: invalid region bounds");
    });

    it("Should not allow non-owner to register a region", async function () {
      await expect(
        quakeshield
          .connect(user1)
          .addRegion(
            WELLINGTON_REGION.name,
            WELLINGTON_REGION.south,
            WELLINGTON_REGION.north,
            WELLINGTON_REGION.west,
            WELLINGTON_REGION.east,
          ),
      ).to.be.reverted;
    });

    it("Should let the owner close a region to new investment", async function () {
      await addTestRegions();
      await quakeshield.setRegionActive(0, false);

      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), ethers.parseUnits("100", 6));
      await expect(
        quakeshield.connect(user1).invest(0, ethers.parseUnits("100", 6)),
      ).to.be.revertedWith("QuakeShield: region closed to investment");
    });
  });

  describe("Risk-based returns", function () {
    beforeEach(async function () {
      await addTestRegions();
    });

    it("Should pay the base rate for a region with no recorded risk", async function () {
      expect(await quakeshield.getRegionAprBps(0)).to.equal(400);
    });

    it("Should pay the max rate at the top of the risk scale", async function () {
      await quakeshield.connect(oracle).setRegionRiskScore(0, 10000);
      expect(await quakeshield.getRegionAprBps(0)).to.equal(3000);
    });

    it("Should scale the rate linearly with the risk score", async function () {
      await quakeshield.connect(oracle).setRegionRiskScore(0, 5000);
      // 400 + 5000 * (3000 - 400) / 10000 = 1700 bps
      expect(await quakeshield.getRegionAprBps(0)).to.equal(1700);
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
      await quakeshield.connect(oracle).setRegionRiskScores([0, 1], [2000, 8000]);

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

    beforeEach(async function () {
      await addTestRegions();
    });

    it("Should mint 1:1 shares to the first investor in a region", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await expect(quakeshield.connect(user1).invest(0, INVEST_10000))
        .to.emit(quakeshield, "InvestmentDeposited")
        .withArgs(0, user1.address, INVEST_10000, INVEST_10000);

      const [shares, value] = await quakeshield.getInvestment(0, user1.address);
      expect(shares).to.equal(INVEST_10000);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should keep each region's capital separate", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000 * 2n);
      await quakeshield.connect(user1).invest(0, INVEST_10000);
      await quakeshield.connect(user1).invest(1, INVEST_10000);

      expect((await quakeshield.getRegion(0)).totalAssets).to.equal(INVEST_10000);
      expect((await quakeshield.getRegion(1)).totalAssets).to.equal(INVEST_10000);
      expect(await quakeshield.getTotalInvested()).to.equal(INVEST_10000 * 2n);
    });

    it("Should split a region pro rata between investors", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      await DNZD
        .connect(user2)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user2).invest(0, INVEST_10000);

      const [, value1] = await quakeshield.getInvestment(0, user1.address);
      const [, value2] = await quakeshield.getInvestment(0, user2.address);
      expect(value1).to.equal(INVEST_10000);
      expect(value2).to.equal(INVEST_10000);
    });

    it("Should track which regions an investor holds", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000 * 2n);
      await quakeshield.connect(user1).invest(1, INVEST_10000);
      await quakeshield.connect(user1).invest(1, INVEST_10000);

      const held = await quakeshield.getInvestorRegions(user1.address);
      expect(held.map(Number)).to.deep.equal([1]);
      expect(await quakeshield.getInvestorTotalValue(user1.address)).to.equal(
        INVEST_10000 * 2n,
      );
    });

    it("Should reject investing in an unknown region", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await expect(
        quakeshield.connect(user1).invest(99, INVEST_10000),
      ).to.be.revertedWith("QuakeShield: unknown region");
    });

    it("Should reject a zero investment", async function () {
      await expect(
        quakeshield.connect(user1).invest(0, 0),
      ).to.be.revertedWith("QuakeShield: investment must be > 0");
    });
  });

  describe("Withdrawing", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
      await addTestRegions();
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user1).invest(0, INVEST_10000);
    });

    it("Should allow a partial withdrawal", async function () {
      const half = INVEST_10000 / 2n;
      const balanceBefore = await DNZD.balanceOf(user1.address);

      await expect(quakeshield.connect(user1).withdrawInvestment(0, half))
        .to.emit(quakeshield, "InvestmentWithdrawn")
        .withArgs(0, user1.address, half, half);

      expect((await DNZD.balanceOf(user1.address)) - balanceBefore).to.equal(half);

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(half);
    });

    it("Should allow withdrawing the whole position", async function () {
      const balanceBefore = await DNZD.balanceOf(user1.address);
      await quakeshield.connect(user1).withdrawAllFromRegion(0);

      expect((await DNZD.balanceOf(user1.address)) - balanceBefore).to.equal(
        INVEST_10000,
      );

      const [shares, value] = await quakeshield.getInvestment(0, user1.address);
      expect(shares).to.equal(0);
      expect(value).to.equal(0);
    });

    it("Should reject withdrawing more than the position is worth", async function () {
      await expect(
        quakeshield.connect(user1).withdrawInvestment(0, INVEST_10000 + 1n),
      ).to.be.revertedWith("QuakeShield: amount exceeds position");
    });

    it("Should reject withdrawing from a region with no position", async function () {
      await expect(
        quakeshield.connect(user2).withdrawInvestment(0, 1),
      ).to.be.revertedWith("QuakeShield: no position in this region");
    });

    it("Should block a withdrawal that would break the reserve ratio", async function () {
      // A fresh deployment with no seed mint, so the pool is exactly what the
      // investor put in and live coverage actually constrains withdrawals.
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      const miniShield = await QuakeShield.deploy(await DNZD.getAddress());
      await miniShield.setOracle(oracle.address);
      await miniShield.addRegion(
        WELLINGTON_REGION.name,
        WELLINGTON_REGION.south,
        WELLINGTON_REGION.north,
        WELLINGTON_REGION.west,
        WELLINGTON_REGION.east,
      );

      const invested = ethers.parseUnits("200", 6);
      await DNZD.connect(user1).approve(await miniShield.getAddress(), invested);
      await miniShield.connect(user1).invest(0, invested);

      // 100 DNZD of cover against a 200.1 DNZD pool — fine at purchase time,
      // but pulling the capital back out drops the ratio to 0%.
      const coverage = ethers.parseUnits("100", 6);
      await DNZD.connect(user2).approve(await miniShield.getAddress(), coverage);
      await miniShield
        .connect(user2)
        .buyPolicy(
          coverage,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      await expect(
        miniShield.connect(user1).withdrawInvestment(0, invested),
      ).to.be.revertedWith("QuakeShield: would break reserve ratio");
    });
  });

  describe("Fortnightly accrual", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
      await addTestRegions();

      // Seed the reserve that pays investor returns.
      await DNZD
        .connect(user2)
        .approve(await quakeshield.getAddress(), ethers.parseUnits("50000", 6));
      await quakeshield
        .connect(user2)
        .fundYieldReserve(ethers.parseUnits("50000", 6));

      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user1).invest(0, INVEST_10000);
    });

    it("Should pay nothing before a full fortnight has passed", async function () {
      await time.increase(FORTNIGHT - 3600);
      await quakeshield.accrueRegion(0);

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should pay a fortnight of interest when the region stays quiet", async function () {
      await time.increase(FORTNIGHT);

      // 10,000 DNZD at 4% APR for 14/365 of a year ≈ 15.34 DNZD
      const expected = (INVEST_10000 * 400n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);

      await expect(quakeshield.accrueRegion(0)).to.emit(
        quakeshield,
        "InterestAccrued",
      );

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + expected);
    });

    it("Should pay more for a riskier region", async function () {
      await quakeshield.connect(oracle).setRegionRiskScore(0, 10000);
      await time.increase(FORTNIGHT);
      await quakeshield.accrueRegion(0);

      const expected = (INVEST_10000 * 3000n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + expected);
    });

    it("Should settle several missed fortnights at once", async function () {
      await time.increase(FORTNIGHT * 3);
      await quakeshield.accrueRegion(0);

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      // Three compounding periods, so strictly more than three flat ones.
      const oneperiod = (INVEST_10000 * 400n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      expect(value).to.be.gte(INVEST_10000 + oneperiod * 3n);
    });

    it("Should skip the period a qualifying quake lands in", async function () {
      // Quake inside the Wellington box, no policy to trigger.
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p010",
        );

      await time.increase(FORTNIGHT);

      await expect(quakeshield.accrueRegion(0))
        .to.emit(quakeshield, "AccrualSkipped")
        .withArgs(0, await nextPeriodEnd(0), "earthquake in period");

      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should resume paying the fortnight after a quake", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p011",
        );

      await time.increase(FORTNIGHT * 2);
      await quakeshield.accrueRegion(0);

      // First period forfeited, second paid.
      const oneperiod = (INVEST_10000 * 400n * BigInt(FORTNIGHT)) / (10000n * 365n * 86400n);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + oneperiod);
    });

    it("Should leave an untouched region earning while its neighbour is hit", async function () {
      await DNZD
        .connect(user2)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user2).invest(1, INVEST_10000);

      // Quake in Wellington only.
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p012",
        );

      await time.increase(FORTNIGHT);
      await quakeshield.accrueAllRegions();

      const [, wellingtonValue] = await quakeshield.getInvestment(0, user1.address);
      const [, canterburyValue] = await quakeshield.getInvestment(1, user2.address);

      expect(wellingtonValue).to.equal(INVEST_10000);
      expect(canterburyValue).to.be.gt(INVEST_10000);
    });

    it("Should pay only what the yield reserve can cover", async function () {
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      const dryShield = await QuakeShield.deploy(await DNZD.getAddress());
      await dryShield.addRegion(
        WELLINGTON_REGION.name,
        WELLINGTON_REGION.south,
        WELLINGTON_REGION.north,
        WELLINGTON_REGION.west,
        WELLINGTON_REGION.east,
      );

      await DNZD.connect(user1).approve(await dryShield.getAddress(), INVEST_10000);
      await dryShield.connect(user1).invest(0, INVEST_10000);

      await time.increase(FORTNIGHT);
      await dryShield.accrueRegion(0);

      // Empty reserve, so nothing to pay — capital is untouched.
      const [, value] = await dryShield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000);
    });

    it("Should preview what an accrual would pay", async function () {
      await time.increase(FORTNIGHT * 2);
      const [periodsDue, interest] = await quakeshield.previewAccrual(0);

      expect(periodsDue).to.equal(2);
      expect(interest).to.be.gt(0);

      await quakeshield.accrueRegion(0);
      const [, value] = await quakeshield.getInvestment(0, user1.address);
      expect(value).to.equal(INVEST_10000 + interest);
    });

    async function nextPeriodEnd(regionId: number): Promise<bigint> {
      const region = await quakeshield.getRegion(regionId);
      return region.lastAccrualAt + BigInt(FORTNIGHT);
    }
  });

  describe("Losses from payouts", function () {
    const INVEST_10000 = ethers.parseUnits("10000", 6);

    beforeEach(async function () {
      await addTestRegions();

      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user1).invest(0, INVEST_10000);

      await DNZD
        .connect(user2)
        .approve(await quakeshield.getAddress(), INVEST_10000);
      await quakeshield.connect(user2).invest(1, INVEST_10000);

      // Policy over Wellington.
      await DNZD
        .connect(user2)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user2)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );
    });

    it("Should charge a payout to the region the quake struck", async function () {
      await expect(
        quakeshield
          .connect(oracle)
          .recordEarthquake(
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            10,
            "2024p020",
          ),
      )
        .to.emit(quakeshield, "InvestmentLoss")
        .withArgs(0, COVERAGE_1000_DNZD);

      const [, wellingtonValue] = await quakeshield.getInvestment(0, user1.address);
      expect(wellingtonValue).to.equal(INVEST_10000 - BigInt(COVERAGE_1000_DNZD));
    });

    it("Should leave other regions untouched by a payout they didn't cause", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p021",
        );

      const [, canterburyValue] = await quakeshield.getInvestment(1, user2.address);
      expect(canterburyValue).to.equal(INVEST_10000);
    });

    it("Should record the loss on the region", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p022",
        );

      const region = await quakeshield.getRegion(0);
      expect(region.totalLosses).to.equal(COVERAGE_1000_DNZD);
      expect(region.quakeCount).to.equal(1);
      expect(region.lastQuakeAt).to.be.gt(0);
    });

    it("Should spread a loss across the pool when the epicenter is in no region", async function () {
      // Just west of the Wellington box (west edge 174.6) so it belongs to no
      // registered region, but still ~19km from the policy centre, so the
      // policy pays out.
      const offshoreLat = -41285800;
      const offshoreLng = 174550000;

      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, offshoreLat, offshoreLng, 10, "2024p023");

      const [, wellingtonValue] = await quakeshield.getInvestment(0, user1.address);
      const [, canterburyValue] = await quakeshield.getInvestment(1, user2.address);

      // Charged 50/50 across the two equally-sized regions.
      const half = BigInt(COVERAGE_1000_DNZD) / 2n;
      expect(wellingtonValue).to.equal(INVEST_10000 - half);
      expect(canterburyValue).to.equal(INVEST_10000 - half);
    });
  });

  describe("Wipe-out", function () {
    // A thinly-backed region hit by a payout larger than it holds: its
    // investors lose everything, and the rest of the pool covers the shortfall.
    const WELLINGTON_CAPITAL = ethers.parseUnits("500", 6);
    const CANTERBURY_CAPITAL = ethers.parseUnits("10000", 6);
    const COVERAGE = ethers.parseUnits("1000", 6);

    let shield: QuakeShield;

    beforeEach(async function () {
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      shield = await QuakeShield.deploy(await DNZD.getAddress());
      await shield.setOracle(oracle.address);
      await shield.addRegion(
        WELLINGTON_REGION.name,
        WELLINGTON_REGION.south,
        WELLINGTON_REGION.north,
        WELLINGTON_REGION.west,
        WELLINGTON_REGION.east,
      );
      await shield.addRegion(
        CANTERBURY_REGION.name,
        CANTERBURY_REGION.south,
        CANTERBURY_REGION.north,
        CANTERBURY_REGION.west,
        CANTERBURY_REGION.east,
      );

      await DNZD.connect(user1).approve(await shield.getAddress(), WELLINGTON_CAPITAL);
      await shield.connect(user1).invest(0, WELLINGTON_CAPITAL);

      await DNZD.connect(user2).approve(await shield.getAddress(), CANTERBURY_CAPITAL);
      await shield.connect(user2).invest(1, CANTERBURY_CAPITAL);

      await DNZD.connect(user2).approve(await shield.getAddress(), COVERAGE);
      await shield
        .connect(user2)
        .buyPolicy(
          COVERAGE,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );
    });

    it("Should void the shares of a region losses have emptied", async function () {
      await expect(
        shield
          .connect(oracle)
          .recordEarthquake(
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            10,
            "2024p030",
          ),
      )
        .to.emit(shield, "RegionWipedOut")
        .withArgs(0, 1);

      const [shares, value] = await shield.getInvestment(0, user1.address);
      expect(shares).to.equal(0);
      expect(value).to.equal(0);
    });

    it("Should fall back to the rest of the pool for the shortfall", async function () {
      await shield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p031",
        );

      // Wellington covered 500 of the 1,000 payout; Canterbury covered the rest.
      const [, canterburyValue] = await shield.getInvestment(1, user2.address);
      expect(canterburyValue).to.equal(CANTERBURY_CAPITAL - (COVERAGE - WELLINGTON_CAPITAL));
    });

    it("Should let a new investor start clean after a wipe-out", async function () {
      await shield
        .connect(oracle)
        .recordEarthquake(
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          10,
          "2024p032",
        );

      const fresh = ethers.parseUnits("500", 6);
      await DNZD.connect(user2).approve(await shield.getAddress(), fresh);
      await shield.connect(user2).invest(0, fresh);

      // Worth exactly what was put in — not diluted by the wiped position.
      const [, freshValue] = await shield.getInvestment(0, user2.address);
      expect(freshValue).to.equal(fresh);

      // And the wiped investor is still at zero.
      const [, wipedValue] = await shield.getInvestment(0, user1.address);
      expect(wipedValue).to.equal(0);
    });
  });

  describe("Pool Stats", function () {
    it("Should track premiums correctly", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalPremiums).to.equal(PREMIUM_10_DNZD);
    });

    it("Should count active policies", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      const stats = await quakeshield.getPoolStats();
      expect(stats._activePolicies).to.equal(1);
    });

    it("Should return totalActiveCoverage in pool stats", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalActiveCoverage).to.equal(COVERAGE_1000_DNZD);
    });

    it("Should report invested capital and yield reserve", async function () {
      await addTestRegions();

      const invested = ethers.parseUnits("2500", 6);
      await DNZD.connect(user1).approve(await quakeshield.getAddress(), invested);
      await quakeshield.connect(user1).invest(0, invested);

      const stats = await quakeshield.getPoolStats();
      expect(stats._totalInvested).to.equal(invested);
      expect(stats._yieldReserve).to.equal(0);
    });
  });

  describe("Reserve Ratio", function () {
    it("Should return max uint when no active coverage", async function () {
      const ratio = await quakeshield.getReserveRatio();
      expect(ratio).to.equal(ethers.MaxUint256);
    });

    it("Should calculate correct reserve ratio", async function () {
      await DNZD
        .connect(user1)
        .approve(await quakeshield.getAddress(), COVERAGE_1000_DNZD);
      await quakeshield
        .connect(user1)
        .buyPolicy(
          COVERAGE_1000_DNZD,
          MAGNITUDE_6_0,
          LAT_WELLINGTON,
          LNG_WELLINGTON,
          RADIUS_50KM,
        );

      const ratio = await quakeshield.getReserveRatio();
      expect(ratio).to.be.gt(15000); // Well above 150%
    });

    it("Should block a policy the pool can't back at 150%", async function () {
      const QuakeShield = await ethers.getContractFactory("QuakeShield");
      const miniShield = await QuakeShield.deploy(await DNZD.getAddress());
      await miniShield.addRegion(
        WELLINGTON_REGION.name,
        WELLINGTON_REGION.south,
        WELLINGTON_REGION.north,
        WELLINGTON_REGION.west,
        WELLINGTON_REGION.east,
      );

      // 100 DNZD of capital can't back 1,000 DNZD of cover.
      const invested = ethers.parseUnits("100", 6);
      await DNZD.connect(user1).approve(await miniShield.getAddress(), invested);
      await miniShield.connect(user1).invest(0, invested);

      await DNZD
        .connect(user2)
        .approve(await miniShield.getAddress(), COVERAGE_1000_DNZD);
      await expect(
        miniShield
          .connect(user2)
          .buyPolicy(
            COVERAGE_1000_DNZD,
            MAGNITUDE_6_0,
            LAT_WELLINGTON,
            LNG_WELLINGTON,
            RADIUS_50KM,
          ),
      ).to.be.revertedWith("QuakeShield: pool reserve ratio insufficient");
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
