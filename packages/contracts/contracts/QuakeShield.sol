// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

/**
 * @title QuakeShield
 * @notice Parametric earthquake insurance for New Zealand, funded by regional
 *         investments.
 * @dev Two sides of one pool:
 *
 *      - Policyholders buy parametric cover. When GeoNet data recorded by the
 *        oracle meets a policy's trigger, the payout is automatic.
 *      - Investors back a specific NZ region. Their capital is what makes the
 *        pool solvent enough to write policies, and they earn a fortnightly
 *        return — paid out of premiums — for every period in which no
 *        significant quake strikes that region. When one does, the payouts it
 *        causes are charged against that region's invested capital first.
 *
 *      In other words: investing is a bet that a region stays quiet, and the
 *      quieter a region has been lately (per the oracle's risk score), the
 *      lower the return it pays.
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
        uint256 regionId;         // Covered region — same registry investors back, see `regions`
        bool isActive;
        bool hasPaidOut;
        uint256 createdAt;
        bool isRecurring;         // Fortnightly premium plan vs one-off
        uint256 periodEnd;        // Coverage lapses at this timestamp unless renewed (one-off policies can't renew)
    }

    struct QuakeEvent {
        uint256 magnitude;
        int256 latitude;
        int256 longitude;
        uint256 depth;
        uint256 timestamp;
        string publicId;
    }

    /**
     * @notice An investable New Zealand region.
     * @dev Boundaries are an axis-aligned box in 1e6-scaled degrees — a
     *      deliberate simplification of the real regional outlines, so that
     *      the contract, the oracle and the UI all attribute a quake to the
     *      same region without needing point-in-polygon maths on-chain.
     */
    struct Region {
        string name;
        int256 south;              // Min latitude, scaled 1e6
        int256 north;              // Max latitude, scaled 1e6
        int256 west;               // Min longitude, scaled 1e6
        int256 east;               // Max longitude, scaled 1e6
        uint256 totalAssets;       // DNZD backing this region (capital + interest - losses)
        uint256 totalShares;       // Investor shares outstanding for the current epoch
        uint256 epoch;             // Incremented if losses ever wipe the region out
        uint256 riskScoreBps;      // 0 = quiet, 10000 = very active (oracle-supplied)
        uint256 riskUpdatedAt;
        uint256 lastAccrualAt;     // Start of the accrual period currently running
        uint256 lastQuakeAt;       // Most recent qualifying quake in this region
        uint256 quakeCount;
        uint256 totalInterestPaid;
        uint256 totalLosses;
        bool active;
    }

    /// @dev Shares are only valid for the epoch they were minted in — see `epoch`.
    struct Position {
        uint256 epoch;
        uint256 shares;
    }

    // ============ State Variables ============

    IERC20 public immutable DNZD;

    mapping(uint256 => Policy) public policies;
    mapping(address => uint256[]) public userPolicies;
    QuakeEvent[] public recordedQuakes;

    uint256 public policyCounter;
    uint256 public totalPremiums;
    uint256 public totalPayouts;

    address public oracle;

    // ============ Solvency ============

    uint256 public totalActiveCoverage;
    uint256 public constant MAX_COVERAGE_PER_POLICY = 10_000e6; // 10,000 DNZD
    uint256 public constant MIN_RESERVE_RATIO_BPS = 15000;      // 150% (15000 basis points)

    /// @notice Coverage window for a policy — 14 days, matching the fortnightly premium plan.
    uint256 public constant RENEWAL_PERIOD = 14 days;

    // ============ Investment State ============

    /// @notice One accrual period. Investors are paid every fortnight.
    uint256 public constant ACCRUAL_PERIOD = 14 days;

    /// @notice Cap on periods settled in a single accrual call, to bound gas.
    uint256 public constant MAX_ACCRUAL_PERIODS = 26;

    /// @notice Return paid to the quietest possible region, annualised.
    uint256 public constant BASE_APR_BPS = 400;   // 4%

    /// @notice Return paid to the riskiest possible region, annualised.
    uint256 public constant MAX_APR_BPS = 3000;   // 30%

    /// @notice A quake at or above this magnitude interrupts a region's return.
    uint256 public constant INVESTMENT_TRIGGER_MAGNITUDE = 500; // 5.0

    Region[] public regions;

    /// @dev regionId => investor => position
    mapping(uint256 => mapping(address => Position)) public positions;

    /// @dev Regions an investor has ever held a position in, for UI enumeration.
    mapping(address => uint256[]) private investorRegions;
    mapping(address => mapping(uint256 => bool)) private investorHasRegion;

    /// @notice Premiums set aside to pay investor returns.
    uint256 public yieldReserve;

    /// @notice Payouts that exceeded all invested capital and the yield reserve.
    uint256 public uncoveredLosses;

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

    event PolicyRenewed(
        uint256 indexed policyId,
        address indexed policyholder,
        uint256 premium,
        uint256 newPeriodEnd
    );

    event PolicyLapsed(uint256 indexed policyId, address indexed policyholder);

    event QuakeRecorded(
        uint256 indexed quakeId,
        uint256 magnitude,
        int256 lat,
        int256 lng
    );

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    event RegionAdded(uint256 indexed regionId, string name);
    event RegionStatusUpdated(uint256 indexed regionId, bool active);
    event RegionRiskUpdated(uint256 indexed regionId, uint256 riskScoreBps, uint256 aprBps);
    event RegionQuake(uint256 indexed regionId, uint256 magnitude, uint256 timestamp);

    event InvestmentDeposited(
        uint256 indexed regionId,
        address indexed investor,
        uint256 amount,
        uint256 sharesMinted
    );
    event InvestmentWithdrawn(
        uint256 indexed regionId,
        address indexed investor,
        uint256 amount,
        uint256 sharesBurned
    );
    event InterestAccrued(
        uint256 indexed regionId,
        uint256 amount,
        uint256 aprBps,
        uint256 periodEnd
    );
    event AccrualSkipped(uint256 indexed regionId, uint256 periodEnd, string reason);
    event InvestmentLoss(uint256 indexed regionId, uint256 amount);
    event RegionWipedOut(uint256 indexed regionId, uint256 newEpoch);
    event YieldReserveFunded(address indexed from, uint256 amount);

    // ============ Modifiers ============

    modifier onlyOracle() {
        require(msg.sender == oracle, "QuakeShield: caller is not the oracle");
        _;
    }

    // ============ Constructor ============

    constructor(address _DNZD) Ownable(msg.sender) {
        require(_DNZD != address(0), "QuakeShield: zero address");
        DNZD = IERC20(_DNZD);
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

    /**
     * @notice Register an investable region (only owner)
     * @param name Display name, e.g. "Canterbury"
     * @param south Min latitude, scaled by 1e6
     * @param north Max latitude, scaled by 1e6
     * @param west Min longitude, scaled by 1e6
     * @param east Max longitude, scaled by 1e6
     * @return regionId The new region's ID
     */
    function addRegion(
        string calldata name,
        int256 south,
        int256 north,
        int256 west,
        int256 east
    ) external onlyOwner returns (uint256) {
        require(bytes(name).length > 0, "QuakeShield: region needs a name");
        require(north > south && east > west, "QuakeShield: invalid region bounds");

        uint256 regionId = regions.length;

        regions.push(
            Region({
                name: name,
                south: south,
                north: north,
                west: west,
                east: east,
                totalAssets: 0,
                totalShares: 0,
                epoch: 0,
                riskScoreBps: 0,
                riskUpdatedAt: 0,
                lastAccrualAt: block.timestamp,
                lastQuakeAt: 0,
                quakeCount: 0,
                totalInterestPaid: 0,
                totalLosses: 0,
                active: true
            })
        );

        emit RegionAdded(regionId, name);
        return regionId;
    }

    /// @notice Open or close a region to new investment (only owner).
    function setRegionActive(uint256 regionId, bool active) external onlyOwner {
        require(regionId < regions.length, "QuakeShield: unknown region");
        regions[regionId].active = active;
        emit RegionStatusUpdated(regionId, active);
    }

    // ============ Oracle: Risk Scoring ============

    /**
     * @notice Set a region's risk score, which drives its investment return.
     * @dev The oracle derives this from GeoNet's full quake history for the
     *      region (recent frequency and size), scaled into 0-10000. The
     *      contract maps it onto a bounded APR — see `getRegionAprBps`.
     * @param regionId Region to update
     * @param riskScoreBps 0 (quiet) to 10000 (very active)
     */
    function setRegionRiskScore(uint256 regionId, uint256 riskScoreBps) public onlyOracle {
        require(regionId < regions.length, "QuakeShield: unknown region");
        require(riskScoreBps <= 10000, "QuakeShield: risk score out of range");

        Region storage region = regions[regionId];
        region.riskScoreBps = riskScoreBps;
        region.riskUpdatedAt = block.timestamp;

        emit RegionRiskUpdated(regionId, riskScoreBps, getRegionAprBps(regionId));
    }

    /// @notice Batch form of `setRegionRiskScore`, so one oracle tx covers every region.
    function setRegionRiskScores(
        uint256[] calldata regionIds,
        uint256[] calldata riskScoresBps
    ) external onlyOracle {
        require(regionIds.length == riskScoresBps.length, "QuakeShield: length mismatch");
        for (uint256 i = 0; i < regionIds.length; i++) {
            setRegionRiskScore(regionIds[i], riskScoresBps[i]);
        }
    }

    // ============ Investment ============

    /**
     * @notice Invest DNZD behind a region, backing the policies written there.
     * @dev Capital earns a return every quiet fortnight and is drawn on first
     *      to pay claims caused by quakes in this region.
     * @param regionId Region to back
     * @param amount DNZD amount (6 decimals)
     */
    function invest(uint256 regionId, uint256 amount) external nonReentrant {
        require(amount > 0, "QuakeShield: investment must be > 0");
        require(regionId < regions.length, "QuakeShield: unknown region");

        Region storage region = regions[regionId];
        require(region.active, "QuakeShield: region closed to investment");

        // Settle any interest owed before minting shares, so a new investor
        // can't claim a share of the period they weren't invested for.
        _accrueRegion(regionId);

        uint256 shares = (region.totalShares == 0 || region.totalAssets == 0)
            ? amount
            : (amount * region.totalShares) / region.totalAssets;
        require(shares > 0, "QuakeShield: investment too small");

        DNZD.safeTransferFrom(msg.sender, address(this), amount);

        Position storage position = positions[regionId][msg.sender];
        if (position.epoch != region.epoch) {
            position.epoch = region.epoch;
            position.shares = 0;
        }
        position.shares += shares;

        region.totalShares += shares;
        region.totalAssets += amount;

        if (!investorHasRegion[msg.sender][regionId]) {
            investorHasRegion[msg.sender][regionId] = true;
            investorRegions[msg.sender].push(regionId);
        }

        emit InvestmentDeposited(regionId, msg.sender, amount, shares);
    }

    /**
     * @notice Withdraw part of an investment position.
     * @param regionId Region to withdraw from
     * @param amount DNZD amount to take out (6 decimals)
     */
    function withdrawInvestment(uint256 regionId, uint256 amount) public nonReentrant {
        require(amount > 0, "QuakeShield: withdrawal must be > 0");
        require(regionId < regions.length, "QuakeShield: unknown region");

        _accrueRegion(regionId);

        Region storage region = regions[regionId];
        Position storage position = positions[regionId][msg.sender];
        require(
            position.epoch == region.epoch && position.shares > 0,
            "QuakeShield: no position in this region"
        );

        uint256 positionValue = (position.shares * region.totalAssets) / region.totalShares;
        require(amount <= positionValue, "QuakeShield: amount exceeds position");

        // Round shares burned UP so withdrawals never round in the investor's favour.
        uint256 sharesToBurn = Math.mulDiv(
            amount,
            region.totalShares,
            region.totalAssets,
            Math.Rounding.Ceil
        );
        if (sharesToBurn > position.shares) {
            sharesToBurn = position.shares;
        }

        // The pool must still cover live policies at 150% after paying out.
        _requireSolventAfter(amount);

        position.shares -= sharesToBurn;
        region.totalShares -= sharesToBurn;
        region.totalAssets -= amount;

        DNZD.safeTransfer(msg.sender, amount);
        emit InvestmentWithdrawn(regionId, msg.sender, amount, sharesToBurn);
    }

    /// @notice Withdraw an entire position, interest included.
    function withdrawAllFromRegion(uint256 regionId) external {
        require(regionId < regions.length, "QuakeShield: unknown region");
        _accrueRegion(regionId);

        (, uint256 value) = getInvestment(regionId, msg.sender);
        require(value > 0, "QuakeShield: no position in this region");

        withdrawInvestment(regionId, value);
    }

    /**
     * @notice Pay out every fortnight a region has gone without a significant
     *         quake since it was last settled.
     * @dev Permissionless — the oracle calls it on schedule, but anyone can.
     *      Interest comes out of the premium-funded yield reserve; if the
     *      reserve is short, only what's there is paid.
     * @param regionId Region to settle
     * @return interestPaid Total DNZD credited to the region
     */
    function accrueRegion(uint256 regionId) external returns (uint256 interestPaid) {
        require(regionId < regions.length, "QuakeShield: unknown region");
        return _accrueRegion(regionId);
    }

    /// @notice Settle every region at once.
    function accrueAllRegions() external returns (uint256 interestPaid) {
        for (uint256 i = 0; i < regions.length; i++) {
            interestPaid += _accrueRegion(i);
        }
    }

    /**
     * @notice Top up the reserve that pays investor returns.
     * @dev Premiums flow here automatically; this lets the operator seed or
     *      supplement it directly.
     */
    function fundYieldReserve(uint256 amount) external nonReentrant {
        require(amount > 0, "QuakeShield: amount must be > 0");
        DNZD.safeTransferFrom(msg.sender, address(this), amount);
        yieldReserve += amount;
        emit YieldReserveFunded(msg.sender, amount);
    }

    // ============ User Functions ============

    /**
     * @notice Buy an earthquake insurance policy over a region
     * @param coverageAmount Payout amount in DNZD (6 decimals)
     * @param triggerMagnitude Minimum magnitude to trigger payout (scaled by 100)
     * @param regionId Region to cover — the same registry investors back, so a policy
     *        pays out on exactly the quakes that also interrupt that region's investors
     * @param recurring If true, premium is billed every RENEWAL_PERIOD via renewPolicy() instead of once.
     *        Either way coverage only runs for RENEWAL_PERIOD from purchase — a one-off policy simply
     *        cannot be renewed, so it lapses at periodEnd, while a recurring policy keeps extending.
     * @return policyId The new policy ID
     */
    function buyPolicy(
        uint256 coverageAmount,
        uint256 triggerMagnitude,
        uint256 regionId,
        bool recurring
    ) external nonReentrant returns (uint256) {
        require(coverageAmount > 0, "QuakeShield: coverage must be > 0");
        require(coverageAmount <= MAX_COVERAGE_PER_POLICY, "QuakeShield: exceeds max coverage");
        require(triggerMagnitude >= 500, "QuakeShield: minimum magnitude is 5.0");
        require(regionId < regions.length, "QuakeShield: unknown region");

        // Solvency check: pool must have 150% reserve ratio after this policy
        uint256 poolBalance = DNZD.balanceOf(address(this));
        uint256 newTotalCoverage = totalActiveCoverage + coverageAmount;
        require(
            (poolBalance * 10000) / newTotalCoverage >= MIN_RESERVE_RATIO_BPS,
            "QuakeShield: pool reserve ratio insufficient"
        );

        // 1% premium
        uint256 premium = coverageAmount * 10 / 1000;
        DNZD.safeTransferFrom(msg.sender, address(this), premium);

        uint256 policyId = policyCounter++;

        policies[policyId] = Policy({
            id: policyId,
            policyholder: msg.sender,
            coverageAmount: coverageAmount,
            premiumPaid: premium,
            triggerMagnitude: triggerMagnitude,
            regionId: regionId,
            isActive: true,
            hasPaidOut: false,
            createdAt: block.timestamp,
            isRecurring: recurring,
            periodEnd: block.timestamp + RENEWAL_PERIOD
        });

        userPolicies[msg.sender].push(policyId);
        totalPremiums += premium;
        totalActiveCoverage += coverageAmount;

        // Premiums fund the returns paid to the investors backing the pool.
        yieldReserve += premium;

        emit PolicyPurchased(policyId, msg.sender, coverageAmount, premium);
        return policyId;
    }

    /**
     * @notice Pay the next fortnightly premium on a recurring policy, extending its coverage
     * @dev Only the policyholder can renew; they must have approved at least one premium's worth of DNZD.
     *      Renewing early (before periodEnd) simply extends from the current periodEnd rather than now,
     *      so paying ahead of time never shortens the covered window.
     * @param policyId The policy to renew
     */
    function renewPolicy(uint256 policyId) external nonReentrant {
        Policy storage p = policies[policyId];

        require(p.policyholder == msg.sender, "QuakeShield: not the policyholder");
        require(p.isRecurring, "QuakeShield: not a recurring policy");
        require(p.isActive && !p.hasPaidOut, "QuakeShield: policy not active");
        require(
            block.timestamp <= p.periodEnd + RENEWAL_PERIOD,
            "QuakeShield: policy lapsed, buy a new one"
        );

        uint256 premium = p.coverageAmount * 10 / 1000;
        DNZD.safeTransferFrom(msg.sender, address(this), premium);

        uint256 renewFrom = block.timestamp > p.periodEnd ? block.timestamp : p.periodEnd;
        p.periodEnd = renewFrom + RENEWAL_PERIOD;
        p.premiumPaid += premium;
        totalPremiums += premium;

        emit PolicyRenewed(policyId, msg.sender, premium, p.periodEnd);
    }

    /**
     * @notice Deactivate a policy whose coverage period has ended without renewal, freeing its
     *         reserved capital — applies to one-off policies (which can never renew) as much as
     *         to recurring ones that missed a renewal
     * @dev Callable by anyone — claims already ignore policies past periodEnd (see _processClaims),
     *      this just settles totalActiveCoverage/isActive bookkeeping on-chain.
     * @param policyId The lapsed policy to close out
     */
    function lapsePolicy(uint256 policyId) external {
        Policy storage p = policies[policyId];

        require(p.isActive && !p.hasPaidOut, "QuakeShield: policy not active");
        require(block.timestamp > p.periodEnd, "QuakeShield: policy not expired");

        p.isActive = false;
        totalActiveCoverage -= p.coverageAmount;

        emit PolicyLapsed(policyId, p.policyholder);
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

        // Mark affected regions before paying claims: investors there forfeit
        // this period's return whether or not any policy happened to trigger.
        _markRegionsHit(magnitude, latitude, longitude);

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

    /**
     * @notice Whether a policy's coverage period has ended — for a one-off policy this means its
     *         single 14-day term is up, for a recurring policy it means a renewal was missed
     */
    function isPolicyExpired(uint256 policyId) external view returns (bool) {
        Policy storage p = policies[policyId];
        return block.timestamp > p.periodEnd;
    }

    function getRegion(uint256 regionId) external view returns (Region memory) {
        require(regionId < regions.length, "QuakeShield: unknown region");
        return regions[regionId];
    }

    function getRegionCount() external view returns (uint256) {
        return regions.length;
    }

    /**
     * @notice The annualised return a region currently pays, in basis points.
     * @dev Scales linearly from BASE_APR_BPS at risk score 0 to MAX_APR_BPS at
     *      risk score 10000 — the more seismically active a region has been
     *      lately, the more it must pay investors to take that risk.
     */
    function getRegionAprBps(uint256 regionId) public view returns (uint256) {
        require(regionId < regions.length, "QuakeShield: unknown region");
        uint256 risk = regions[regionId].riskScoreBps;
        if (risk > 10000) {
            risk = 10000;
        }
        return BASE_APR_BPS + (risk * (MAX_APR_BPS - BASE_APR_BPS)) / 10000;
    }

    /// @notice What one fortnight of interest is worth at the region's current size and rate.
    function getRegionPeriodInterest(uint256 regionId) public view returns (uint256) {
        return _periodInterest(regions[regionId].totalAssets, getRegionAprBps(regionId));
    }

    /// @notice When the region's next fortnightly settlement becomes payable.
    function getNextAccrualAt(uint256 regionId) external view returns (uint256) {
        require(regionId < regions.length, "QuakeShield: unknown region");
        return regions[regionId].lastAccrualAt + ACCRUAL_PERIOD;
    }

    /**
     * @notice Preview what calling `accrueRegion` right now would pay.
     * @return periodsDue Fortnights elapsed since the last settlement
     * @return interest DNZD that would be credited (reserve permitting)
     */
    function previewAccrual(uint256 regionId)
        external
        view
        returns (uint256 periodsDue, uint256 interest)
    {
        require(regionId < regions.length, "QuakeShield: unknown region");
        Region storage region = regions[regionId];

        uint256 aprBps = getRegionAprBps(regionId);
        uint256 assets = region.totalAssets;
        uint256 cursor = region.lastAccrualAt;
        uint256 reserve = yieldReserve;

        while (block.timestamp >= cursor + ACCRUAL_PERIOD && periodsDue < MAX_ACCRUAL_PERIODS) {
            uint256 periodStart = cursor;
            cursor += ACCRUAL_PERIOD;
            periodsDue++;

            if (region.lastQuakeAt >= periodStart && region.lastQuakeAt < cursor) {
                continue;
            }

            uint256 periodInterest = _periodInterest(assets, aprBps);
            if (periodInterest > reserve) {
                periodInterest = reserve;
            }
            reserve -= periodInterest;
            assets += periodInterest;
            interest += periodInterest;
        }
    }

    /**
     * @notice An investor's stake in a region.
     * @return shares Shares held (0 if a wipe-out voided them)
     * @return value Current DNZD value of those shares
     */
    function getInvestment(uint256 regionId, address investor)
        public
        view
        returns (uint256 shares, uint256 value)
    {
        require(regionId < regions.length, "QuakeShield: unknown region");
        Region storage region = regions[regionId];
        Position storage position = positions[regionId][investor];

        if (position.epoch != region.epoch || position.shares == 0 || region.totalShares == 0) {
            return (0, 0);
        }

        shares = position.shares;
        value = (shares * region.totalAssets) / region.totalShares;
    }

    /// @notice Every region the investor has ever put capital into.
    function getInvestorRegions(address investor) external view returns (uint256[] memory) {
        return investorRegions[investor];
    }

    /// @notice The investor's total live position across all regions, in DNZD.
    function getInvestorTotalValue(address investor) external view returns (uint256 total) {
        uint256[] storage held = investorRegions[investor];
        for (uint256 i = 0; i < held.length; i++) {
            (, uint256 value) = getInvestment(held[i], investor);
            total += value;
        }
    }

    /// @notice Capital invested across every region.
    function getTotalInvested() public view returns (uint256 total) {
        for (uint256 i = 0; i < regions.length; i++) {
            total += regions[i].totalAssets;
        }
    }

    function getPoolStats()
        external
        view
        returns (
            uint256 _totalPremiums,
            uint256 _totalPayouts,
            uint256 _balance,
            uint256 _activePolicies,
            uint256 _totalActiveCoverage,
            uint256 _totalInvested,
            uint256 _yieldReserve
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
            DNZD.balanceOf(address(this)),
            activeCount,
            totalActiveCoverage,
            getTotalInvested(),
            yieldReserve
        );
    }

    /**
     * @notice Get current reserve ratio in basis points (10000 = 100%)
     * @return reserveRatioBps Reserve ratio scaled by 10000
     */
    function getReserveRatio() external view returns (uint256 reserveRatioBps) {
        uint256 poolValue = DNZD.balanceOf(address(this));
        if (totalActiveCoverage == 0) {
            return type(uint256).max;
        }
        return (poolValue * 10000) / totalActiveCoverage;
    }

    // ============ Internal: Investment ============

    function _periodInterest(uint256 assets, uint256 aprBps) internal pure returns (uint256) {
        return (assets * aprBps * ACCRUAL_PERIOD) / (10000 * 365 days);
    }

    /**
     * @notice Settle a region fortnight by fortnight up to the present.
     * @dev A period pays nothing if a qualifying quake struck inside it — that
     *      is the whole bet. The period clock advances either way, so a hit
     *      region resumes earning from the next fortnight.
     */
    function _accrueRegion(uint256 regionId) internal returns (uint256 interestPaid) {
        Region storage region = regions[regionId];

        // A region added mid-block has nothing to settle yet.
        if (region.lastAccrualAt == 0) {
            region.lastAccrualAt = block.timestamp;
            return 0;
        }

        uint256 aprBps = getRegionAprBps(regionId);
        uint256 periods = 0;

        while (
            block.timestamp >= region.lastAccrualAt + ACCRUAL_PERIOD &&
            periods < MAX_ACCRUAL_PERIODS
        ) {
            uint256 periodStart = region.lastAccrualAt;
            uint256 periodEnd = periodStart + ACCRUAL_PERIOD;
            region.lastAccrualAt = periodEnd;
            periods++;

            if (region.lastQuakeAt >= periodStart && region.lastQuakeAt < periodEnd) {
                emit AccrualSkipped(regionId, periodEnd, "earthquake in period");
                continue;
            }

            if (region.totalAssets == 0) {
                continue;
            }

            uint256 interest = _periodInterest(region.totalAssets, aprBps);
            if (interest > yieldReserve) {
                interest = yieldReserve;
            }
            if (interest == 0) {
                emit AccrualSkipped(regionId, periodEnd, "yield reserve empty");
                continue;
            }

            yieldReserve -= interest;
            region.totalAssets += interest;
            region.totalInterestPaid += interest;
            interestPaid += interest;

            emit InterestAccrued(regionId, interest, aprBps, periodEnd);
        }
    }

    /// @dev Inclusive on all four edges — mirrors `isInRegion` in the shared TS module.
    function _isInRegion(Region storage region, int256 lat, int256 lng)
        internal
        view
        returns (bool)
    {
        return lat >= region.south && lat <= region.north && lng >= region.west && lng <= region.east;
    }

    /**
     * @notice Flag every region a significant quake landed in, ending their
     *         current earning period.
     */
    function _markRegionsHit(uint256 magnitude, int256 lat, int256 lng) internal {
        if (magnitude < INVESTMENT_TRIGGER_MAGNITUDE) {
            return;
        }

        for (uint256 i = 0; i < regions.length; i++) {
            if (!_isInRegion(regions[i], lat, lng)) continue;

            regions[i].lastQuakeAt = block.timestamp;
            regions[i].quakeCount += 1;
            emit RegionQuake(i, magnitude, block.timestamp);
        }
    }

    /**
     * @notice Charge a payout against invested capital.
     * @dev Regions containing the epicenter pay first — they took the risk on
     *      that ground. Anything they can't absorb is spread across the rest of
     *      the pool, then the yield reserve, and only then recorded as an
     *      uncovered shortfall.
     */
    function _chargeLoss(uint256 amount, int256 lat, int256 lng) internal {
        if (amount == 0) return;

        uint256 remaining = _chargeRegions(amount, lat, lng, true);

        if (remaining > 0) {
            remaining = _chargeRegions(remaining, lat, lng, false);
        }

        if (remaining > 0 && yieldReserve > 0) {
            uint256 fromReserve = remaining > yieldReserve ? yieldReserve : remaining;
            yieldReserve -= fromReserve;
            remaining -= fromReserve;
        }

        if (remaining > 0) {
            uncoveredLosses += remaining;
        }
    }

    /**
     * @notice Charge `amount` pro rata across regions, in proportion to what
     *         each currently holds.
     * @param matching true to charge only the regions containing the epicenter,
     *        false to charge only the regions that don't
     * @return remaining The part of `amount` those regions couldn't cover
     */
    function _chargeRegions(
        uint256 amount,
        int256 lat,
        int256 lng,
        bool matching
    ) internal returns (uint256 remaining) {
        uint256 chargeable = 0;
        for (uint256 i = 0; i < regions.length; i++) {
            if (_isInRegion(regions[i], lat, lng) != matching) continue;
            chargeable += regions[i].totalAssets;
        }

        if (chargeable == 0) {
            return amount;
        }

        uint256 toCharge = amount > chargeable ? chargeable : amount;
        uint256 charged = 0;

        for (uint256 i = 0; i < regions.length; i++) {
            Region storage region = regions[i];
            if (region.totalAssets == 0) continue;
            if (_isInRegion(region, lat, lng) != matching) continue;

            uint256 share = (toCharge * region.totalAssets) / chargeable;
            if (share == 0) continue;

            _applyLoss(i, share);
            charged += share;
        }

        // Integer division can leave a few wei unallocated; take it from the
        // first region that can still cover it.
        if (charged < toCharge) {
            uint256 dust = toCharge - charged;
            for (uint256 i = 0; i < regions.length && dust > 0; i++) {
                Region storage region = regions[i];
                if (region.totalAssets == 0) continue;
                if (_isInRegion(region, lat, lng) != matching) continue;

                uint256 take = dust > region.totalAssets ? region.totalAssets : dust;
                _applyLoss(i, take);
                charged += take;
                dust -= take;
            }
        }

        return amount - charged;
    }

    /**
     * @notice Write a loss down against one region.
     * @dev If it takes the region to zero while shares are still outstanding,
     *      those shares are worthless — the epoch is bumped so later investors
     *      start from a clean slate instead of subsidising the wiped position.
     */
    function _applyLoss(uint256 regionId, uint256 amount) internal {
        Region storage region = regions[regionId];

        region.totalAssets -= amount;
        region.totalLosses += amount;
        emit InvestmentLoss(regionId, amount);

        if (region.totalAssets == 0 && region.totalShares > 0) {
            region.totalShares = 0;
            region.epoch += 1;
            emit RegionWipedOut(regionId, region.epoch);
        }
    }

    function _requireSolventAfter(uint256 outflow) internal view {
        if (totalActiveCoverage == 0) return;

        uint256 newBalance = DNZD.balanceOf(address(this)) - outflow;
        require(
            (newBalance * 10000) / totalActiveCoverage >= MIN_RESERVE_RATIO_BPS,
            "QuakeShield: would break reserve ratio"
        );
    }

    // ============ Internal: Claims ============

    /**
     * @notice Process claims against an earthquake event
     * @dev A policy triggers on exactly the same test that flags its region for
     *      investors (`_isInRegion`) — the region a policyholder buys cover in is
     *      the same region whose investors are on the hook for the payout.
     */
    function _processClaims(
        uint256 magnitude,
        int256 quakeLat,
        int256 quakeLng
    ) internal {
        for (uint256 i = 0; i < policyCounter; i++) {
            Policy storage p = policies[i];

            if (!p.isActive || p.hasPaidOut) continue;
            if (block.timestamp > p.periodEnd) continue;
            if (magnitude < p.triggerMagnitude) continue;
            if (!_isInRegion(regions[p.regionId], quakeLat, quakeLng)) continue;

            p.hasPaidOut = true;
            p.isActive = false;
            totalPayouts += p.coverageAmount;
            totalActiveCoverage -= p.coverageAmount;

            // The capital backing this ground funds the payout.
            _chargeLoss(p.coverageAmount, quakeLat, quakeLng);

            DNZD.safeTransfer(p.policyholder, p.coverageAmount);
            emit PayoutExecuted(i, p.policyholder, p.coverageAmount, magnitude);
        }
    }

    receive() external payable {}
}
