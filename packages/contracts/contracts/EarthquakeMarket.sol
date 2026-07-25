// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

interface IQuakeShieldReader {
    function getQuakeCount() external view returns (uint256);
    function recordedQuakes(uint256) external view returns (
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
 * @notice Binary YES/NO prediction markets on earthquake events, priced by a CPMM
 * @dev Resolved by the same oracle that feeds QuakeShield
 */
contract EarthquakeMarket is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ============ Structs ============

    struct Market {
        string description;
        int256 centerLat;       // Scaled by 1e6 (-41285800 = -41.2858°)
        int256 centerLng;       // Scaled by 1e6 (174778000 = 174.778°)
        uint256 radiusKm;       // Trigger radius in km
        uint256 triggerMagnitude; // Scaled by 100 (600 = 6.0)
        uint256 resolutionTime; // Unix timestamp deadline
        uint256 yesReserve;     // Virtual YES share reserve for CPMM
        uint256 noReserve;      // Virtual NO share reserve for CPMM
        uint256 usdcCollateral; // Actual USDC held, backs redemptions
        bool resolved;
        bool outcomeYes;        // Only meaningful if resolved == true
    }

    // ============ State Variables ============

    IERC20 public immutable usdc;
    address public immutable quakeshield;

    uint256 public nextMarketId;
    mapping(uint256 => Market) public markets;

    // Share balances: can't live inside struct with mapping
    mapping(uint256 => mapping(address => uint256)) public yesSharesOf;
    mapping(uint256 => mapping(address => uint256)) public noSharesOf;

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

    constructor(address _usdc, address _quakeshield) Ownable(msg.sender) {
        require(_usdc != address(0), "EarthquakeMarket: zero USDC address");
        require(_quakeshield != address(0), "EarthquakeMarket: zero QuakeShield address");
        usdc = IERC20(_usdc);
        quakeshield = _quakeshield;
        oracle = msg.sender;
    }

    // ============ Admin Functions ============

    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "EarthquakeMarket: zero address");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    /**
     * @notice Create a new prediction market (owner only)
     */
    function createMarket(
        string calldata description,
        int256 centerLat,
        int256 centerLng,
        uint256 radiusKm,
        uint256 triggerMagnitude,
        uint256 resolutionTime
    ) external onlyOwner returns (uint256) {
        _validateMarketParams(description, centerLat, centerLng, radiusKm, triggerMagnitude, resolutionTime);

        uint256 marketId = nextMarketId++;
        uint256 seed = 1_000_000_000_000; // Virtual liquidity seed (1T units ≈ 1M USDC)

        markets[marketId] = Market({
            description: description,
            centerLat: centerLat,
            centerLng: centerLng,
            radiusKm: radiusKm,
            triggerMagnitude: triggerMagnitude,
            resolutionTime: resolutionTime,
            yesReserve: seed,
            noReserve: seed,
            usdcCollateral: 0,
            resolved: false,
            outcomeYes: false
        });

        emit MarketCreated(marketId, description, centerLat, centerLng, radiusKm, triggerMagnitude, resolutionTime);
        return marketId;
    }

    // ============ User Functions ============

    /**
     * @notice Buy YES shares in a market
     * @param marketId Market to buy in
     * @param amountIn USDC amount to spend (6 decimals)
     */
    function buyYes(uint256 marketId, uint256 amountIn) external nonReentrant {
        _buyShares(marketId, true, amountIn);
    }

    /**
     * @notice Buy NO shares in a market
     * @param marketId Market to buy in
     * @param amountIn USDC amount to spend (6 decimals)
     */
    function buyNo(uint256 marketId, uint256 amountIn) external nonReentrant {
        _buyShares(marketId, false, amountIn);
    }

    /**
     * @notice Redeem winning shares after market resolution
     * @param marketId Market to redeem from
     */
    function redeem(uint256 marketId) external nonReentrant {
        Market storage m = markets[marketId];
        require(m.resolved, "EarthquakeMarket: market not resolved");

        uint256 payout = 0;

        if (m.outcomeYes) {
            uint256 shares = yesSharesOf[marketId][msg.sender];
            require(shares > 0, "EarthquakeMarket: no winning shares");
            yesSharesOf[marketId][msg.sender] = 0;
            payout = shares;
        } else {
            uint256 shares = noSharesOf[marketId][msg.sender];
            require(shares > 0, "EarthquakeMarket: no winning shares");
            noSharesOf[marketId][msg.sender] = 0;
            payout = shares;
        }

        require(payout <= m.usdcCollateral, "EarthquakeMarket: insufficient collateral");
        m.usdcCollateral -= payout;
        usdc.safeTransfer(msg.sender, payout);

        emit Redeemed(marketId, msg.sender, payout);
    }

    // ============ Oracle Functions ============

    /**
     * @notice Resolve a market (oracle only)
     * @dev Can resolve after resolutionTime, or immediately if a matching quake is confirmed
     * @param marketId Market to resolve
     * @param outcomeYes True if the earthquake condition was met
     */
    function resolveMarket(uint256 marketId, bool outcomeYes) external onlyOracle {
        Market storage m = markets[marketId];
        require(!m.resolved, "EarthquakeMarket: already resolved");

        if (block.timestamp < m.resolutionTime) {
            // Early resolution: verify a matching quake exists on QuakeShield
            require(_hasMatchingQuake(m), "EarthquakeMarket: no matching quake found");
        }

        m.resolved = true;
        m.outcomeYes = outcomeYes;

        emit MarketResolved(marketId, outcomeYes);
    }

    // ============ View Functions ============

    function getMarket(uint256 marketId)
        external
        view
        returns (
            string memory description,
            int256 centerLat,
            int256 centerLng,
            uint256 radiusKm,
            uint256 triggerMagnitude,
            uint256 resolutionTime,
            uint256 yesReserve,
            uint256 noReserve,
            uint256 usdcCollateral,
            bool resolved,
            bool outcomeYes
        )
    {
        Market storage m = markets[marketId];
        return (
            m.description,
            m.centerLat,
            m.centerLng,
            m.radiusKm,
            m.triggerMagnitude,
            m.resolutionTime,
            m.yesReserve,
            m.noReserve,
            m.usdcCollateral,
            m.resolved,
            m.outcomeYes
        );
    }

    /**
     * @notice Get implied YES and NO prices (fractions of 1e18, summing to 1e18)
     */
    function getMarketPrice(uint256 marketId)
        external
        view
        returns (uint256 yesPrice, uint256 noPrice)
    {
        Market storage m = markets[marketId];
        uint256 total = m.yesReserve + m.noReserve;
        require(total > 0, "EarthquakeMarket: empty reserves");
        yesPrice = (m.noReserve * 1e18) / total;
        noPrice = 1e18 - yesPrice;
    }

    function getMarketCount() external view returns (uint256) {
        return nextMarketId;
    }

    // ============ Internal Functions ============

    function _buyShares(uint256 marketId, bool isYes, uint256 amountIn) internal {
        Market storage m = markets[marketId];

        require(!m.resolved, "EarthquakeMarket: market resolved");
        require(block.timestamp < m.resolutionTime, "EarthquakeMarket: resolution time passed");
        require(amountIn > 0, "EarthquakeMarket: amount must be > 0");

        // Transfer USDC from user
        usdc.safeTransferFrom(msg.sender, address(this), amountIn);
        m.usdcCollateral += amountIn;

        uint256 sharesOut;

        if (isYes) {
            // Deposit goes into opposite (NO) reserve
            uint256 k = m.yesReserve * m.noReserve;
            uint256 newNoReserve = m.noReserve + amountIn;

            sharesOut = m.yesReserve - (k / newNoReserve);

            // Decrease YES reserve (shares leave the pool)
            m.yesReserve -= sharesOut;
            // Increase NO reserve (USDC deposit absorbed by opposite side)
            m.noReserve = newNoReserve;

            // Credit shares
            yesSharesOf[marketId][msg.sender] += sharesOut;
        } else {
            // Deposit goes into opposite (YES) reserve
            uint256 k = m.yesReserve * m.noReserve;
            uint256 newYesReserve = m.yesReserve + amountIn;

            sharesOut = m.noReserve - (k / newYesReserve);

            // Decrease NO reserve (shares leave the pool)
            m.noReserve -= sharesOut;
            // Increase YES reserve (USDC deposit absorbed by opposite side)
            m.yesReserve = newYesReserve;

            // Credit shares
            noSharesOf[marketId][msg.sender] += sharesOut;
        }

        require(sharesOut > 0, "EarthquakeMarket: insufficient output");

        emit SharesPurchased(marketId, msg.sender, isYes, amountIn, sharesOut);
    }

    /**
     * @notice Check if QuakeShield has recorded a matching quake for this market
     */
    function _hasMatchingQuake(Market storage m) internal view returns (bool) {
        IQuakeShieldReader qs = IQuakeShieldReader(quakeshield);

        uint256 quakeCount = qs.getQuakeCount();

        for (uint256 i = 0; i < quakeCount; i++) {
            (uint256 magnitude, int256 quakeLat, int256 quakeLng,,,) = qs.recordedQuakes(i);

            if (magnitude < m.triggerMagnitude) continue;

            uint256 distSq = _approxDistanceKmSquared(
                m.centerLat - quakeLat,
                m.centerLng - quakeLng
            );

            if (distSq <= m.radiusKm * m.radiusKm) {
                return true;
            }
        }

        return false;
    }

    function _validateMarketParams(
        string calldata description,
        int256 centerLat,
        int256 centerLng,
        uint256 radiusKm,
        uint256 triggerMagnitude,
        uint256 resolutionTime
    ) internal view {
        require(bytes(description).length > 0, "EarthquakeMarket: empty description");
        require(resolutionTime > block.timestamp, "EarthquakeMarket: resolution must be in the future");
        require(triggerMagnitude >= 400, "EarthquakeMarket: minimum magnitude is 4.0");
        require(radiusKm > 0 && radiusKm <= 500, "EarthquakeMarket: radius must be 1-500km");
        require(centerLat >= -90_000_000 && centerLat <= 90_000_000, "EarthquakeMarket: invalid latitude");
        require(centerLng >= -180_000_000 && centerLng <= 180_000_000, "EarthquakeMarket: invalid longitude");
    }

    /**
     * @notice Approximate squared distance in km from lat/lng differences
     * @dev Mirrors QuakeShield._approxDistanceKmSquared
     */
    function _approxDistanceKmSquared(int256 latDiff, int256 lngDiff) internal pure returns (uint256) {
        int256 kmPerDegLat = 111000000; // 111km * 1e6
        int256 kmPerDegLng = 83000000;  // 83km * 1e6

        int256 distLat = (latDiff * kmPerDegLat) / 1000000000000;
        int256 distLng = (lngDiff * kmPerDegLng) / 1000000000000;

        return uint256(distLat * distLat + distLng * distLng);
    }

    receive() external payable {}
}
