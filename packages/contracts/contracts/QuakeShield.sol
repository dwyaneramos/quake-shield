// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title QuakeShield
 * @notice Parametric earthquake insurance for New Zealand
 * @dev Automatically pays out when GeoNet earthquake data meets policy triggers
 */
contract QuakeShield is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ Structs ============

    struct Policy {
        uint256 id;
        address policyholder;
        uint256 coverageAmount;
        uint256 premiumPaid;
        uint256 triggerMagnitude; // Scaled by 100 (600 = 6.0)
        int256 centerLat;         // Scaled by 1e6 (-41285800 = -41.2858°)
        int256 centerLng;         // Scaled by 1e6 (174778000 = 174.778°)
        uint256 radiusKm;         // Trigger radius in km
        bool isActive;
        bool hasPaidOut;
        uint256 createdAt;
    }

    struct QuakeEvent {
        uint256 magnitude;
        int256 latitude;
        int256 longitude;
        uint256 depth;
        uint256 timestamp;
        string publicId;
    }

    // ============ State Variables ============

    IERC20 public immutable usdc;

    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    QuakeEvent[] public recordedQuakes;

    uint256 public policyCounter;
    uint256 public totalPremiums;
    uint256 public totalPayouts;

    address public oracle;

    // ============ Events ============

    event PolicyPurchased(
        uint256 indexed policyId,
        address indexed policyholder,
        uint256 coverage,
        uint256 premium
    );

    event PayoutExecuted(
        uint256 indexed policyId,
        address indexed policyholder,
        uint256 amount,
        uint256 quakeMagnitude
    );

    event QuakeRecorded(
        uint256 indexed quakeId,
        uint256 magnitude,
        int256 lat,
        int256 lng
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    // ============ Modifiers ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "QuakeShield: caller is not the oracle");
        _;
    }

    // ============ Constructor ============

    constructor(address _usdc) Ownable(msg.sender) {
        require(_usdc != address(0), "QuakeShield: zero address");
        usdc = IERC20(_usdc);
        oracle = msg.sender;
    }

    // ============ Admin Functions ============

    /**
     * @notice Update oracle address (only owner)
     * @param _oracle New oracle address
     */
    function setOracle(address _oracle) external onlyOwner {
        require(_oracle != address(0), "QuakeShield: zero address");
        emit OracleUpdated(oracle, _oracle);
        oracle = _oracle;
    }

    // ============ User Functions ============

    /**
     * @notice Buy an earthquake insurance policy
     * @param coverageAmount Payout amount in USDC (6 decimals)
     * @param triggerMagnitude Minimum magnitude to trigger payout (scaled by 100)
     * @param centerLat Center latitude (scaled by 1e6)
     * @param centerLng Center longitude (scaled by 1e6)
     * @param radiusKm Radius in km from center
     * @return policyId The new policy ID
     */
    function buyPolicy(
        uint256 coverageAmount,
        uint256 triggerMagnitude,
        int256 centerLat,
        int256 centerLng,
        uint256 radiusKm
    ) external nonReentrant returns (uint256) {
        require(coverageAmount > 0, "QuakeShield: coverage must be > 0");
        require(triggerMagnitude >= 400, "QuakeShield: minimum magnitude is 4.0");
        require(radiusKm > 0 && radiusKm <= 500, "QuakeShield: radius must be 1-500km");

        // 1% premium
        uint256 premium = coverageAmount * 10 / 1000;
        usdc.safeTransferFrom(msg.sender, address(this), premium);

        uint256 policyId = policyCounter++;

        policies[policyId] = Policy({
            id: policyId,
            policyholder: msg.sender,
            coverageAmount: coverageAmount,
            premiumPaid: premium,
            triggerMagnitude: triggerMagnitude,
            centerLat: centerLat,
            centerLng: centerLng,
            radiusKm: radiusKm,
            isActive: true,
            hasPaidOut: false,
            createdAt: block.timestamp
        });

        userPolicies[msg.sender].push(policyId);
        totalPremiums += premium;

        emit PolicyPurchased(policyId, msg.sender, coverageAmount, premium);
        return policyId;
    }

    // ============ Oracle Functions ============

    /**
     * @notice Record an earthquake event (oracle only)
     * @param magnitude Earthquake magnitude (scaled by 100)
     * @param latitude Epicenter latitude (scaled by 1e6)
     * @param longitude Epicenter longitude (scaled by 1e6)
     * @param depth Depth in km
     * @param publicId GeoNet public ID
     * @return quakeId The new quake event ID
     */
    function recordEarthquake(
        uint256 magnitude,
        int256 latitude,
        int256 longitude,
        uint256 depth,
        string calldata publicId
    ) external onlyOracle returns (uint256) {
        uint256 quakeId = recordedQuakes.length;

        recordedQuakes.push(
            QuakeEvent({
                magnitude: magnitude,
                latitude: latitude,
                longitude: longitude,
                depth: depth,
                timestamp: block.timestamp,
                publicId: publicId
            })
        );

        emit QuakeRecorded(quakeId, magnitude, latitude, longitude);

        // Process all active policies against this earthquake
        _processClaims(magnitude, latitude, longitude);

        return quakeId;
    }

    // ============ View Functions ============

    function getPolicy(uint256 policyId) external view returns (Policy memory) {
        return policies[policyId];
    }

    function getUserPolicies(address user) external view returns (uint256[] memory) {
        return userPolicies[user];
    }

    function getQuakeCount() external view returns (uint256) {
        return recordedQuakes.length;
    }

    function getQuake(uint256 quakeId) external view returns (QuakeEvent memory) {
        return recordedQuakes[quakeId];
    }

    function getPoolStats()
        external
        view
        returns (
            uint256 _totalPremiums,
            uint256 _totalPayouts,
            uint256 _balance,
            uint256 _activePolicies
        )
    {
        uint256 activeCount = 0;
        for (uint256 i = 0; i < policyCounter; i++) {
            if (policies[i].isActive) {
                activeCount++;
            }
        }
        return (
            totalPremiums,
            totalPayouts,
            usdc.balanceOf(address(this)),
            activeCount
        );
    }

    // ============ Internal Functions ============

    /**
     * @notice Process claims against an earthquake event
     */
    function _processClaims(
        uint256 magnitude,
        int256 quakeLat,
        int256 quakeLng
    ) internal {
        for (uint256 i = 0; i < policyCounter; i++) {
            Policy storage p = policies[i];

            if (!p.isActive || p.hasPaidOut) continue;
            if (magnitude < p.triggerMagnitude) continue;

            // Calculate distance between policy center and quake epicenter
            int256 latDiff = p.centerLat - quakeLat;
            int256 lngDiff = p.centerLng - quakeLng;

            // Rough distance calculation (1 degree ≈ 111km)
            // This is simplified for MVP; production would use Haversine
            uint256 distKmSq = _approxDistanceKmSquared(latDiff, lngDiff);
            uint256 radiusSq = p.radiusKm * p.radiusKm;

            if (distKmSq <= radiusSq) {
                p.hasPaidOut = true;
                p.isActive = false;
                totalPayouts += p.coverageAmount;
                usdc.safeTransfer(p.policyholder, p.coverageAmount);
                emit PayoutExecuted(i, p.policyholder, p.coverageAmount, magnitude);
            }
        }
    }

    /**
     * @notice Approximate squared distance in km from lat/lng differences
     */
    function _approxDistanceKmSquared(
        int256 latDiff,
        int256 lngDiff
    ) internal pure returns (uint256) {
        // 1 degree latitude ≈ 111km
        // 1 degree longitude ≈ 111km * cos(average latitude)
        // For NZ (lat ~-41°), cos(41°) ≈ 0.75
        // Simplified: use 111km for lat, 83km for lng

        int256 kmPerDegLat = 111000000; // 111km * 1e6
        int256 kmPerDegLng = 83000000;  // 83km * 1e6

        // latDiff/lngDiff are in units of 1e-6 degrees
        // Multiply by kmPerDeg to get km * 1e6
        // Divide by 1e6 to get km (integer)
        int256 distLat = (latDiff * kmPerDegLat) / 1000000000000; // 1e6 * 1e6 / 1e12
        int256 distLng = (lngDiff * kmPerDegLng) / 1000000000000;

        // Return squared distance in km²
        return uint256(distLat * distLat + distLng * distLng);
    }

    receive() external payable {}
}
