import { expect } from "chai";
import { ethers } from "hardhat";
import { EarthquakeMarket, MockUSDC, QuakeShield } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("EarthquakeMarket", function () {
  let market: EarthquakeMarket;
  let quakeshield: QuakeShield;
  let usdc: MockUSDC;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const SEED = 1_000_000_000_000n; // Virtual liquidity seed
  const MAGNITUDE_6_0 = 600;
  const LAT_WELLINGTON = -41285800;
  const LNG_WELLINGTON = 174778000;
  const RADIUS_50KM = 50;
  const DESCRIPTION = "M6.0+ near Wellington by 2027";
  const AMOUNT_100_USDC = 100_000_000n; // 100 USDC (6 decimals)

  let resolutionTime: number;

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy();

    const QuakeShield = await ethers.getContractFactory("QuakeShield");
    quakeshield = await QuakeShield.deploy(await usdc.getAddress());
    await quakeshield.setOracle(oracle.address);

    const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
    market = await EarthquakeMarket.deploy(await usdc.getAddress(), await quakeshield.getAddress());
    await market.setOracle(oracle.address);

    await usdc.mint(user1.address, ethers.parseUnits("100000", 6));
    await usdc.mint(user2.address, ethers.parseUnits("100000", 6));
    await usdc.mint(await market.getAddress(), ethers.parseUnits("1000000", 6));

    resolutionTime = (await time.latest()) + 3600;
  });

  async function createDefaultMarket() {
    return market
      .connect(owner)
      .createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime);
  }

  async function resolveAfterTime(marketId: number, outcomeYes: boolean) {
    await time.increaseTo(resolutionTime + 1);
    return market.connect(oracle).resolveMarket(marketId, outcomeYes);
  }

  describe("Deployment", function () {
    it("Should set the correct USDC token", async function () {
      expect(await market.usdc()).to.equal(await usdc.getAddress());
    });

    it("Should set the correct QuakeShield address", async function () {
      expect(await market.quakeshield()).to.equal(await quakeshield.getAddress());
    });

    it("Should set the deployer as owner", async function () {
      expect(await market.owner()).to.equal(owner.address);
    });

    it("Should set oracle to the configured address", async function () {
      expect(await market.oracle()).to.equal(oracle.address);
    });
  });

  describe("createMarket", function () {
    it("Should create a market with correct params", async function () {
      await createDefaultMarket();

      const m = await market.getMarket(0);
      expect(m.description).to.equal(DESCRIPTION);
      expect(m.centerLat).to.equal(LAT_WELLINGTON);
      expect(m.centerLng).to.equal(LNG_WELLINGTON);
      expect(m.radiusKm).to.equal(RADIUS_50KM);
      expect(m.triggerMagnitude).to.equal(MAGNITUDE_6_0);
      expect(m.yesReserve).to.equal(SEED);
      expect(m.noReserve).to.equal(SEED);
      expect(m.resolved).to.be.false;
    });

    it("Should emit MarketCreated event", async function () {
      await expect(
        market
          .connect(owner)
          .createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime)
      )
        .to.emit(market, "MarketCreated")
        .withArgs(0, DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime);
    });

    it("Should only allow owner to create markets", async function () {
      await expect(
        market
          .connect(user1)
          .createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime)
      ).to.be.reverted;
    });

    it("Should reject empty description", async function () {
      await expect(
        market.connect(owner).createMarket("", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime)
      ).to.be.revertedWith("EarthquakeMarket: empty description");
    });

    it("Should reject past resolution time", async function () {
      const pastTime = (await time.latest()) - 3600;
      await expect(
        market.connect(owner).createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, pastTime)
      ).to.be.revertedWith("EarthquakeMarket: resolution must be in the future");
    });

    it("Should reject magnitude below 4.0", async function () {
      await expect(
        market.connect(owner).createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, 300, resolutionTime)
      ).to.be.revertedWith("EarthquakeMarket: minimum magnitude is 4.0");
    });

    it("Should reject radius over 500km", async function () {
      await expect(
        market.connect(owner).createMarket(DESCRIPTION, LAT_WELLINGTON, LNG_WELLINGTON, 501, MAGNITUDE_6_0, resolutionTime)
      ).to.be.revertedWith("EarthquakeMarket: radius must be 1-500km");
    });

    it("Should increment market IDs", async function () {
      await createDefaultMarket();
      await createDefaultMarket();
      expect(await market.getMarketCount()).to.equal(2);
    });
  });

  describe("buyYes / buyNo (CPMM)", function () {
    beforeEach(async function () {
      await createDefaultMarket();
    });

    it("Should buy YES shares and move price correctly", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);

      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);

      // CPMM math with seed=1T, amountIn=100M (100 USDC):
      // k = 1T * 1T = 1e24
      // newNoReserve = 1T + 100M = 1_100_000_000_000
      // sharesOut = 1T - (1e24 / 1_100_000_000_000) = 1T - 909_090_909_090 = 90_909_090_910
      const k = SEED * SEED;
      const newNoReserve = SEED + AMOUNT_100_USDC;
      const expectedShares = SEED - (k / newNoReserve);

      expect(await market.yesSharesOf(0, user1.address)).to.equal(expectedShares);

      const m = await market.getMarket(0);
      expect(m.yesReserve).to.equal(SEED - expectedShares);
      expect(m.noReserve).to.equal(newNoReserve);
    });

    it("Should emit SharesPurchased event", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);

      const k = SEED * SEED;
      const newNoReserve = SEED + AMOUNT_100_USDC;
      const expectedShares = SEED - (k / newNoReserve);

      await expect(market.connect(user1).buyYes(0, AMOUNT_100_USDC))
        .to.emit(market, "SharesPurchased")
        .withArgs(0, user1.address, true, AMOUNT_100_USDC, expectedShares);
    });

    it("Should buy NO shares symmetrically", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);

      await market.connect(user1).buyNo(0, AMOUNT_100_USDC);

      const k = SEED * SEED;
      const newYesReserve = SEED + AMOUNT_100_USDC;
      const expectedShares = SEED - (k / newYesReserve);

      expect(await market.noSharesOf(0, user1.address)).to.equal(expectedShares);

      const m = await market.getMarket(0);
      expect(m.noReserve).to.equal(SEED - expectedShares);
      expect(m.yesReserve).to.equal(newYesReserve);
    });

    it("Should move price after YES buy", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);

      const [yesPrice, noPrice] = await market.getMarketPrice(0);
      expect(yesPrice + noPrice).to.equal(10n ** 18n);
      // YES price should be > 50% after buying YES
      expect(yesPrice).to.be.gt(5n * 10n ** 17n);
    });

    it("Should revert on zero amount", async function () {
      await expect(market.connect(user1).buyYes(0, 0)).to.be.revertedWith(
        "EarthquakeMarket: amount must be > 0"
      );
    });

    it("Should revert on resolved market", async function () {
      await resolveAfterTime(0, true);

      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      await expect(market.connect(user1).buyYes(0, AMOUNT_100_USDC)).to.be.revertedWith(
        "EarthquakeMarket: market resolved"
      );
    });

    it("Should revert after resolution time", async function () {
      await time.increaseTo(resolutionTime + 1);

      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      await expect(market.connect(user1).buyYes(0, AMOUNT_100_USDC)).to.be.revertedWith(
        "EarthquakeMarket: resolution time passed"
      );
    });

    it("Should transfer USDC to contract", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      const balanceBefore = await usdc.balanceOf(user1.address);

      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);

      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceBefore - balanceAfter).to.equal(AMOUNT_100_USDC);
    });

    it("Should accumulate collateral correctly", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC * 2n);
      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);

      await usdc.connect(user2).approve(await market.getAddress(), AMOUNT_100_USDC);
      await market.connect(user2).buyNo(0, AMOUNT_100_USDC);

      const m = await market.getMarket(0);
      expect(m.usdcCollateral).to.equal(AMOUNT_100_USDC * 2n);
    });
  });

  describe("resolveMarket", function () {
    beforeEach(async function () {
      await createDefaultMarket();
    });

    it("Should only allow oracle to resolve", async function () {
      await time.increaseTo(resolutionTime + 1);
      await expect(market.connect(user1).resolveMarket(0, true)).to.be.revertedWith(
        "EarthquakeMarket: caller is not the oracle"
      );
    });

    it("Should resolve YES outcome after deadline", async function () {
      await expect(resolveAfterTime(0, true))
        .to.emit(market, "MarketResolved")
        .withArgs(0, true);

      const m = await market.getMarket(0);
      expect(m.resolved).to.be.true;
      expect(m.outcomeYes).to.be.true;
    });

    it("Should resolve NO outcome after deadline", async function () {
      await expect(resolveAfterTime(0, false))
        .to.emit(market, "MarketResolved")
        .withArgs(0, false);

      const m = await market.getMarket(0);
      expect(m.resolved).to.be.true;
      expect(m.outcomeYes).to.be.false;
    });

    it("Should revert on double resolution", async function () {
      await resolveAfterTime(0, true);
      await expect(market.connect(oracle).resolveMarket(0, true)).to.be.revertedWith(
        "EarthquakeMarket: already resolved"
      );
    });

    it("Should allow early resolution if matching quake exists", async function () {
      // Record a matching earthquake in QuakeShield
      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001");

      await expect(market.connect(oracle).resolveMarket(0, true))
        .to.emit(market, "MarketResolved")
        .withArgs(0, true);
    });

    it("Should revert early resolution if no matching quake", async function () {
      // Record a non-matching earthquake (too small)
      await quakeshield
        .connect(oracle)
        .recordEarthquake(300, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p002");

      await expect(market.connect(oracle).resolveMarket(0, true)).to.be.revertedWith(
        "EarthquakeMarket: no matching quake found"
      );
    });
  });

  describe("redeem", function () {
    beforeEach(async function () {
      await createDefaultMarket();

      // user1 buys 100 USDC of YES shares
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);
    });

    it("Should pay out YES winners when resolved YES", async function () {
      await resolveAfterTime(0, true);

      const shares = await market.yesSharesOf(0, user1.address);
      const balanceBefore = await usdc.balanceOf(user1.address);

      await market.connect(user1).redeem(0);

      const balanceAfter = await usdc.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(shares);
      expect(await market.yesSharesOf(0, user1.address)).to.equal(0);
    });

    it("Should pay out NO winners when resolved NO", async function () {
      // user2 buys 100 USDC of NO shares
      await usdc.connect(user2).approve(await market.getAddress(), AMOUNT_100_USDC);
      await market.connect(user2).buyNo(0, AMOUNT_100_USDC);

      await resolveAfterTime(0, false);

      const shares = await market.noSharesOf(0, user2.address);
      const balanceBefore = await usdc.balanceOf(user2.address);

      await market.connect(user2).redeem(0);

      const balanceAfter = await usdc.balanceOf(user2.address);
      expect(balanceAfter - balanceBefore).to.equal(shares);
    });

    it("Should revert for losers (YES shares when resolved NO)", async function () {
      await resolveAfterTime(0, false);

      await expect(market.connect(user1).redeem(0)).to.be.revertedWith(
        "EarthquakeMarket: no winning shares"
      );
    });

    it("Should prevent double redeem", async function () {
      await resolveAfterTime(0, true);

      await market.connect(user1).redeem(0);
      await expect(market.connect(user1).redeem(0)).to.be.revertedWith(
        "EarthquakeMarket: no winning shares"
      );
    });

    it("Should revert redeem before resolution", async function () {
      await expect(market.connect(user1).redeem(0)).to.be.revertedWith(
        "EarthquakeMarket: market not resolved"
      );
    });

    it("Should emit Redeemed event", async function () {
      await resolveAfterTime(0, true);

      const shares = await market.yesSharesOf(0, user1.address);
      await expect(market.connect(user1).redeem(0))
        .to.emit(market, "Redeemed")
        .withArgs(0, user1.address, shares);
    });
  });

  describe("getMarketPrice", function () {
    beforeEach(async function () {
      await createDefaultMarket();
    });

    it("Should return 50/50 for fresh market", async function () {
      const [yesPrice, noPrice] = await market.getMarketPrice(0);
      expect(yesPrice).to.equal(5n * 10n ** 17n);
      expect(noPrice).to.equal(5n * 10n ** 17n);
    });

    it("Should shift YES price up after YES buy", async function () {
      await usdc.connect(user1).approve(await market.getAddress(), AMOUNT_100_USDC);
      await market.connect(user1).buyYes(0, AMOUNT_100_USDC);

      const [yesPrice, noPrice] = await market.getMarketPrice(0);
      expect(yesPrice).to.be.gt(5n * 10n ** 17n);
      expect(yesPrice + noPrice).to.equal(10n ** 18n);
    });
  });
});
