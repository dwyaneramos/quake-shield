import { expect } from "chai";
import { ethers } from "hardhat";
import { EarthquakeMarket, QuakeShield, MockDNZD } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { time } from "@nomicfoundation/hardhat-network-helpers";

const SEED_LIQUIDITY = 1_000_000_000_000n; // 1_000_000e6

// Mirrors the contract's CPMM math (ceil on the post-trade opposite-side
// reserve, so shares handed to the buyer round down) for independent
// hand-computed assertions.
function ceilDiv(a: bigint, b: bigint): bigint {
  return (a + b - 1n) / b;
}

function computeBuy(yesReserve: bigint, noReserve: bigint, amountIn: bigint, isYes: boolean) {
  const k = yesReserve * noReserve;
  if (isYes) {
    const newNoReserve = noReserve + amountIn;
    const newYesReserve = ceilDiv(k, newNoReserve);
    return { sharesOut: yesReserve - newYesReserve, newYesReserve, newNoReserve };
  } else {
    const newYesReserve = yesReserve + amountIn;
    const newNoReserve = ceilDiv(k, newYesReserve);
    return { sharesOut: noReserve - newNoReserve, newYesReserve, newNoReserve };
  }
}

describe("EarthquakeMarket", function () {
  let market: EarthquakeMarket;
  let quakeshield: QuakeShield;
  let dnzd: MockDNZD;
  let owner: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let user1: HardhatEthersSigner;
  let user2: HardhatEthersSigner;

  const LAT_WELLINGTON = -41285800;
  const LNG_WELLINGTON = 174778000;
  const LAT_CHRISTCHURCH = -43530000;
  const LNG_CHRISTCHURCH = 172636000;
  const RADIUS_50KM = 50;
  const MAGNITUDE_6_0 = 600;
  const MAGNITUDE_5_0 = 500;

  async function futureResolutionTime(secondsFromNow = 3600) {
    return (await time.latest()) + secondsFromNow;
  }

  beforeEach(async function () {
    [owner, oracle, user1, user2] = await ethers.getSigners();

    const MockDNZD = await ethers.getContractFactory("MockDNZD");
    dnzd = await MockDNZD.deploy();

    const QuakeShield = await ethers.getContractFactory("QuakeShield");
    quakeshield = await QuakeShield.deploy(await dnzd.getAddress());
    await quakeshield.setOracle(oracle.address);

    const EarthquakeMarket = await ethers.getContractFactory("EarthquakeMarket");
    market = await EarthquakeMarket.deploy(await dnzd.getAddress(), await quakeshield.getAddress());
    await market.setOracle(oracle.address);

    await dnzd.mint(user1.address, ethers.parseUnits("100000", 6));
    await dnzd.mint(user2.address, ethers.parseUnits("100000", 6));
    await dnzd.connect(user1).approve(await market.getAddress(), ethers.MaxUint256);
    await dnzd.connect(user2).approve(await market.getAddress(), ethers.MaxUint256);
  });

  describe("Deployment", function () {
    it("Should set token, QuakeShield, owner and oracle", async function () {
      expect(await market.token()).to.equal(await dnzd.getAddress());
      expect(await market.quakeShield()).to.equal(await quakeshield.getAddress());
      expect(await market.owner()).to.equal(owner.address);
      expect(await market.oracle()).to.equal(oracle.address);
    });
  });

  describe("createMarket", function () {
    it("Should create a market with seeded 50/50 reserves", async function () {
      const resolutionTime = await futureResolutionTime();
      await market.createMarket(
        "M6.0+ within 50km of Wellington",
        LAT_WELLINGTON,
        LNG_WELLINGTON,
        RADIUS_50KM,
        MAGNITUDE_6_0,
        resolutionTime
      );

      const m = await market.getMarket(0);
      expect(m.yesReserve).to.equal(SEED_LIQUIDITY);
      expect(m.noReserve).to.equal(SEED_LIQUIDITY);
      expect(m.resolved).to.be.false;

      const [yesPrice, noPrice] = await market.getMarketPrice(0);
      expect(yesPrice).to.equal(ethers.parseUnits("0.5", 18));
      expect(noPrice).to.equal(ethers.parseUnits("0.5", 18));
    });

    it("Should emit MarketCreated", async function () {
      const resolutionTime = await futureResolutionTime();
      await expect(
        market.createMarket("desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime)
      )
        .to.emit(market, "MarketCreated")
        .withArgs(0, "desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime);
    });

    it("Should reject non-owner creation", async function () {
      const resolutionTime = await futureResolutionTime();
      await expect(
        market
          .connect(user1)
          .createMarket("desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime)
      ).to.be.reverted;
    });

    it("Should reject a resolution time in the past", async function () {
      const pastTime = (await time.latest()) - 10;
      await expect(
        market.createMarket("desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, pastTime)
      ).to.be.revertedWith("EarthquakeMarket: resolution time must be in the future");
    });
  });

  describe("buyYes / buyNo", function () {
    let resolutionTime: number;

    beforeEach(async function () {
      resolutionTime = await futureResolutionTime();
      await market.createMarket("desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime);
    });

    it("Should move price toward YES on a YES buy, matching hand-computed CPMM shares", async function () {
      const amountIn = ethers.parseUnits("100", 6);
      const expected = computeBuy(SEED_LIQUIDITY, SEED_LIQUIDITY, amountIn, true);

      await expect(market.connect(user1).buyYes(0, amountIn))
        .to.emit(market, "SharesPurchased")
        .withArgs(0, user1.address, true, amountIn, expected.sharesOut);

      const shares = await market.yesSharesOf(0, user1.address);
      expect(shares).to.equal(expected.sharesOut);

      const m = await market.getMarket(0);
      expect(m.yesReserve).to.equal(expected.newYesReserve);
      expect(m.noReserve).to.equal(expected.newNoReserve);
      expect(m.collateralBalance).to.equal(amountIn);

      const [yesPrice] = await market.getMarketPrice(0);
      expect(yesPrice).to.be.gt(ethers.parseUnits("0.5", 18));
    });

    it("Should move price toward NO on a NO buy, symmetric to buyYes", async function () {
      const amountIn = ethers.parseUnits("100", 6);
      const expected = computeBuy(SEED_LIQUIDITY, SEED_LIQUIDITY, amountIn, false);

      await expect(market.connect(user1).buyNo(0, amountIn))
        .to.emit(market, "SharesPurchased")
        .withArgs(0, user1.address, false, amountIn, expected.sharesOut);

      const shares = await market.noSharesOf(0, user1.address);
      expect(shares).to.equal(expected.sharesOut);

      const [yesPrice, noPrice] = await market.getMarketPrice(0);
      expect(noPrice).to.be.gt(ethers.parseUnits("0.5", 18));
      expect(yesPrice).to.be.lt(ethers.parseUnits("0.5", 18));
    });

    it("Should reject trades after resolutionTime", async function () {
      await time.increaseTo(resolutionTime + 1);
      await expect(market.connect(user1).buyYes(0, ethers.parseUnits("100", 6))).to.be.revertedWith(
        "EarthquakeMarket: market closed"
      );
    });

    it("Should reject zero-amount trades", async function () {
      await expect(market.connect(user1).buyYes(0, 0)).to.be.revertedWith(
        "EarthquakeMarket: amount must be > 0"
      );
    });
  });

  describe("resolveMarket + redeem", function () {
    let resolutionTime: number;

    beforeEach(async function () {
      resolutionTime = await futureResolutionTime();
      await market.createMarket("desc", LAT_WELLINGTON, LNG_WELLINGTON, RADIUS_50KM, MAGNITUDE_6_0, resolutionTime);
      await market.connect(user1).buyYes(0, ethers.parseUnits("100", 6));
      await market.connect(user2).buyNo(0, ethers.parseUnits("50", 6));
    });

    it("Should resolve YES when a matching quake exists on QuakeShield and pay out winners", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, LAT_WELLINGTON, LNG_WELLINGTON, 10, "2024p001");

      await expect(market.connect(oracle).resolveMarket(0, true))
        .to.emit(market, "MarketResolved")
        .withArgs(0, true);

      const winnerShares = await market.yesSharesOf(0, user1.address);
      const balanceBefore = await dnzd.balanceOf(user1.address);

      await expect(market.connect(user1).redeem(0))
        .to.emit(market, "Redeemed")
        .withArgs(0, user1.address, winnerShares);

      const balanceAfter = await dnzd.balanceOf(user1.address);
      expect(balanceAfter - balanceBefore).to.equal(winnerShares);
      expect(await market.yesSharesOf(0, user1.address)).to.equal(0);
    });

    it("Should reject a YES resolution with no matching quake", async function () {
      await expect(market.connect(oracle).resolveMarket(0, true)).to.be.revertedWith(
        "EarthquakeMarket: no matching quake"
      );
    });

    it("Should reject a YES resolution when the quake is outside the radius", async function () {
      await quakeshield
        .connect(oracle)
        .recordEarthquake(MAGNITUDE_6_0, LAT_CHRISTCHURCH, LNG_CHRISTCHURCH, 10, "2024p002");

      await expect(market.connect(oracle).resolveMarket(0, true)).to.be.revertedWith(
        "EarthquakeMarket: no matching quake"
      );
    });

    it("Should reject NO resolution before resolutionTime", async function () {
      await expect(market.connect(oracle).resolveMarket(0, false)).to.be.revertedWith(
        "EarthquakeMarket: resolution time not reached"
      );
    });

    it("Should resolve NO after resolutionTime with no qualifying quake, and pay out NO holders", async function () {
      await time.increaseTo(resolutionTime + 1);
      await market.connect(oracle).resolveMarket(0, false);

      const winnerShares = await market.noSharesOf(0, user2.address);
      const balanceBefore = await dnzd.balanceOf(user2.address);

      await market.connect(user2).redeem(0);

      const balanceAfter = await dnzd.balanceOf(user2.address);
      expect(balanceAfter - balanceBefore).to.equal(winnerShares);
    });

    it("Should reject double-resolution", async function () {
      await time.increaseTo(resolutionTime + 1);
      await market.connect(oracle).resolveMarket(0, false);
      await expect(market.connect(oracle).resolveMarket(0, false)).to.be.revertedWith(
        "EarthquakeMarket: already resolved"
      );
    });

    it("Should reject double-redeem", async function () {
      await time.increaseTo(resolutionTime + 1);
      await market.connect(oracle).resolveMarket(0, false);
      await market.connect(user2).redeem(0);
      await expect(market.connect(user2).redeem(0)).to.be.revertedWith(
        "EarthquakeMarket: no winning shares"
      );
    });

    it("Should reject redeem from losing side", async function () {
      await time.increaseTo(resolutionTime + 1);
      await market.connect(oracle).resolveMarket(0, false);
      await expect(market.connect(user1).redeem(0)).to.be.revertedWith(
        "EarthquakeMarket: no winning shares"
      );
    });

    it("Should reject resolution from a non-oracle caller", async function () {
      await time.increaseTo(resolutionTime + 1);
      await expect(market.connect(user1).resolveMarket(0, false)).to.be.revertedWith(
        "EarthquakeMarket: caller is not the oracle"
      );
    });
  });
});
