// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/// @dev Minimal read interface into QuakeShield's on-chain quake log — lets
/// EarthquakeMarket resolve against the same recorded earthquakes QuakeShield
/// uses for payouts, instead of taking a second oracle submission path.
interface IQuakeShieldReader {
    function getQuakeCount() external view returns (uint256);
    function recordedQuakes(uint256 index)
        external
        view
        returns (
            uint256 magnitude,
            int256 latitude,
            int256 longitude,
            uint256 depth,
            uint256 timestamp,
            string memory publicId
        );
}

/**
 * @title EarthquakeMarket
 * @notice Binary (YES/NO) CPMM prediction markets on earthquake events,
 *         resolved against QuakeShield's recorded quake log.
 * @dev Additive to QuakeShield — does not modify or depend on its state changing.
 */
contract EarthquakeMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Market {
        string description;
        int256 centerLat;        // Scaled by 1e6
        int256 centerLng;        // Scaled by 1e6
        uint256 radiusKm;
        uint256 triggerMagnitude; // Scaled by 100
        uint256 createdAt;
        uint256 resolutionTime;
        uint256 yesReserve;      // Virtual CPMM share reserve
        uint256 noReserve;       // Virtual CPMM share reserve
        uint256 collateralBalance; // Real ERC20 held for this market
        bool resolved;
        bool outcomeYes;
    }

    // ============ State Variables ============

    // Virtual seed liquidity for a fresh market's CPMM reserves (50/50 odds).
    // Internal accounting only — the creator does not deposit this amount.
    uint256 public constant SEED_LIQUIDITY = 1_000_000e6;

    IERC20 public immutable token;
    IQuakeShieldReader public immutable quakeShield;

    mapping(uint256 => Market) public markets;
    mapping(uint256 => mapping(address => uint256)) public yesSharesOf;
    mapping(uint256 => mapping(address => uint256)) public noSharesOf;

    uint256 public nextMarketId;

    address public oracle;

    // ============ Events ============

    event MarketCreated(
        uint256 indexed marketId,
        string description,
        int256 centerLat,
        int256 centerLng,
        uint256 radiusKm,
        uint256 triggerMagnitude,
        uint256 resolutionTime
    );

    event SharesPurchased(
        uint256 indexed marketId,
        address indexed buyer,
        bool isYes,
        uint256 amountIn,
        uint256 sharesOut
    );

    event MarketResolved(uint256 indexed marketId, bool outcomeYes);

    event Redeemed(uint256 indexed marketId, address indexed user, uint256 amount);

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // ============ Modifiers ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "EarthquakeMarket: caller is not the oracle");
        _;
    }

    // ============ Constructor ============

    constructor(address _token, address _quakeShield) Ownable(msg.sender) {
        require(_token != address(0), "EarthquakeMarket: zero token address");
        require(_quakeShield != address(0), "EarthquakeMarket: zero QuakeShield address");
        token = IERC20(_token);
        quakeShield = IQuakeShieldReader(_quakeShield);
        oracle = msg.sender;
    }

    // ============ Admin Functions ============

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "EarthquakeMarket: zero address");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    /**
     * @notice Create a new prediction market (admin-only for the demo).
     */
    function createMarket(
        string calldata description,
        int256 centerLat,
        int256 centerLng,
        uint256 radiusKm,
        uint256 triggerMagnitude,
        uint256 resolutionTime
    ) external onlyOwner returns (uint256) {
        require(radiusKm > 0 && radiusKm <= 500, "EarthquakeMarket: radius must be 1-500km");
        require(triggerMagnitude >= 400, "EarthquakeMarket: minimum magnitude is 4.0");
        require(resolutionTime > block.timestamp, "EarthquakeMarket: resolution time must be in the future");

        uint256 marketId = nextMarketId++;

        markets[marketId] = Market({
            description: description,
            centerLat: centerLat,
            centerLng: centerLng,
            radiusKm: radiusKm,
            triggerMagnitude: triggerMagnitude,
            createdAt: block.timestamp,
            resolutionTime: resolutionTime,
            yesReserve: SEED_LIQUIDITY,
            noReserve: SEED_LIQUIDITY,
            collateralBalance: 0,
            resolved: false,
            outcomeYes: false
        });

        emit MarketCreated(marketId, description, centerLat, centerLng, radiusKm, triggerMagnitude, resolutionTime);
        return marketId;
    }

    // ============ Trading ============

    function buyYes(uint256 marketId, uint256 amountIn) external nonReentrant {
        Market storage m = markets[marketId];
        uint256 sharesOut = _buy(m, amountIn, true);
        yesSharesOf[marketId][msg.sender] += sharesOut;
        emit SharesPurchased(marketId, msg.sender, true, amountIn, sharesOut);
    }

    function buyNo(uint256 marketId, uint256 amountIn) external nonReentrant {
        Market storage m = markets[marketId];
        uint256 sharesOut = _buy(m, amountIn, false);
        noSharesOf[marketId][msg.sender] += sharesOut;
        emit SharesPurchased(marketId, msg.sender, false, amountIn, sharesOut);
    }

    function _buy(Market storage m, uint256 amountIn, bool isYes) internal returns (uint256 sharesOut) {
        require(!m.resolved, "EarthquakeMarket: market resolved");
        require(block.timestamp < m.resolutionTime, "EarthquakeMarket: market closed");
        require(amountIn > 0, "EarthquakeMarket: amount must be > 0");

        token.safeTransferFrom(msg.sender, address(this), amountIn);
        m.collateralBalance += amountIn;

        uint256 k = m.yesReserve * m.noReserve;

        if (isYes) {
            uint256 newNoReserve = m.noReserve + amountIn;
            // Round the post-trade YES reserve UP so the shares handed to the
            // user (yesReserve - newYesReserve) round DOWN, never in the user's favor.
            uint256 newYesReserve = Math.mulDiv(k, 1, newNoReserve, Math.Rounding.Ceil);
            sharesOut = m.yesReserve - newYesReserve;
            m.yesReserve = newYesReserve;
            m.noReserve = newNoReserve;
        } else {
            uint256 newYesReserve = m.yesReserve + amountIn;
            uint256 newNoReserve = Math.mulDiv(k, 1, newYesReserve, Math.Rounding.Ceil);
            sharesOut = m.noReserve - newNoReserve;
            m.noReserve = newNoReserve;
            m.yesReserve = newYesReserve;
        }

        require(sharesOut > 0, "EarthquakeMarket: shares out must be > 0");
    }

    // ============ Resolution ============

    /**
     * @notice Resolve a market (oracle-only). A YES claim must be backed by a
     *         matching quake already recorded on QuakeShield; a NO claim is
     *         only accepted once the resolution deadline has passed.
     */
    function resolveMarket(uint256 marketId, bool outcomeYes) external onlyOracle {
        Market storage m = markets[marketId];
        require(!m.resolved, "EarthquakeMarket: already resolved");

        if (outcomeYes) {
            require(_hasQualifyingQuake(m), "EarthquakeMarket: no matching quake");
        } else {
            require(block.timestamp >= m.resolutionTime, "EarthquakeMarket: resolution time not reached");
        }

        m.resolved = true;
        m.outcomeYes = outcomeYes;
        emit MarketResolved(marketId, outcomeYes);
    }

    function _hasQualifyingQuake(Market storage m) internal view returns (bool) {
        uint256 count = quakeShield.getQuakeCount();
        uint256 radiusSq = m.radiusKm * m.radiusKm;

        for (uint256 i = 0; i < count; i++) {
            (uint256 magnitude, int256 lat, int256 lng, , uint256 timestamp, ) = quakeShield.recordedQuakes(i);

            if (magnitude < m.triggerMagnitude) continue;
            if (timestamp < m.createdAt || timestamp > m.resolutionTime) continue;
            if (_distanceKmSquared(m.centerLat, m.centerLng, lat, lng) <= radiusSq) {
                return true;
            }
        }

        return false;
    }

    /**
     * @notice Approximate squared distance in km² — mirrors QuakeShield's
     *         simplified (non-Haversine) MVP distance check for consistency.
     */
    function _distanceKmSquared(
        int256 centerLat,
        int256 centerLng,
        int256 quakeLat,
        int256 quakeLng
    ) internal pure returns (uint256) {
        int256 latDiff = centerLat - quakeLat;
        int256 lngDiff = centerLng - quakeLng;

        int256 kmPerDegLat = 111000000; // 111km * 1e6
        int256 kmPerDegLng = 83000000;  // 83km * 1e6

        int256 distLat = (latDiff * kmPerDegLat) / 1000000000000;
        int256 distLng = (lngDiff * kmPerDegLng) / 1000000000000;

        return uint256(distLat * distLat + distLng * distLng);
    }

    // ============ Redemption ============

    function redeem(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.resolved, "EarthquakeMarket: market not resolved");

        uint256 shares;
        if (m.outcomeYes) {
            shares = yesSharesOf[marketId][msg.sender];
            require(shares > 0, "EarthquakeMarket: no winning shares");
            yesSharesOf[marketId][msg.sender] = 0;
        } else {
            shares = noSharesOf[marketId][msg.sender];
            require(shares > 0, "EarthquakeMarket: no winning shares");
            noSharesOf[marketId][msg.sender] = 0;
        }

        require(m.collateralBalance >= shares, "EarthquakeMarket: insufficient collateral");
        m.collateralBalance -= shares;
        token.safeTransfer(msg.sender, shares);

        emit Redeemed(marketId, msg.sender, shares);
    }

    // ============ View Functions ============

    function getMarket(uint256 marketId) external view returns (Market memory) {
        return markets[marketId];
    }

    function getMarketCount() external view returns (uint256) {
        return nextMarketId;
    }

    /// @notice Live implied odds, each a fraction of 1e18, summing to 1e18.
    function getMarketPrice(uint256 marketId) external view returns (uint256 yesPrice, uint256 noPrice) {
        Market storage m = markets[marketId];
        uint256 total = m.yesReserve + m.noReserve;
        require(total > 0, "EarthquakeMarket: empty reserves");

        yesPrice = Math.mulDiv(m.noReserve, 1e18, total);
        noPrice = 1e18 - yesPrice;
    }
}
