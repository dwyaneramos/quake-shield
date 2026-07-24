# QuakeShield - Agent Instructions

## Project Overview
Parametric earthquake insurance platform for New Zealand. Smart contracts on Polygon automatically pay out when GeoNet earthquake data meets policy triggers.

## Tech Stack
- **Blockchain:** Polygon Amoy testnet (chainId: 80002)
- **Token:** Mock USDC (6 decimals)
- **Smart Contracts:** Solidity 0.8.24 + Hardhat + OpenZeppelin
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Web3:** viem + wagmi + RainbowKit
- **Map:** react-leaflet (free, no API key needed)
- **Oracle:** Custom Node.js service polling GeoNet API
- **Monorepo:** pnpm workspaces + Turborepo

## Monorepo Structure
```
apps/web/          → Next.js frontend + API routes
apps/oracle/       → GeoNet polling service
packages/contracts/ → Solidity contracts + Hardhat
packages/shared/    → Shared types/utilities
```

## Commands

### Smart Contracts
```bash
cd packages/contracts
pnpm hardhat compile          # Compile contracts
pnpm hardhat test             # Run tests
pnpm hardhat run scripts/deploy.ts --network amoy  # Deploy
```

### Frontend
```bash
cd apps/web
pnpm dev                      # Start dev server (port 3000)
pnpm build                    # Production build
```

### Oracle
```bash
cd apps/oracle
pnpm dev                      # Start oracle (polls GeoNet every 30s)
```

### Monorepo
```bash
pnpm install                  # Install all dependencies
pnpm dev                      # Start all services via Turborepo
pnpm build                    # Build all packages
```

## Key Environment Variables

### apps/web/.env.local
```
NEXT_PUBLIC_POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS=0x...  # After deploy
NEXT_PUBLIC_MOCK_USDC_ADDRESS=0x...     # After deploy
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=... # Get from cloud.walletconnect.com
```

### packages/contracts/.env
```
POLYGON_AMOY_RPC_URL=https://rpc-amoy.polygon.technology
PRIVATE_KEY=...  # Deployer wallet (never commit)
POLYGONSCAN_API_KEY=...  # For contract verification
```

### apps/oracle/.env
```
PRIVATE_KEY=...  # Oracle wallet (needs MATIC for gas)
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
QUAKE_SHIELD_ADDRESS=0x...
USDC_ADDRESS=0x...
POLL_INTERVAL_MS=30000
MIN_MAGITUDE_TO_REPORT=500  # 5.0 magnitude
```

## Architecture Notes

### Data Flow
1. **User buys policy** → Frontend calls `buyPolicy()` on QuakeShield.sol
2. **Oracle polls GeoNet** → Every 30s, checks for new quakes ≥ 5.0 magnitude
3. **Earthquake detected** → Oracle calls `recordEarthquake()` on contract
4. **Automatic payout** → Contract checks all active policies, transfers USDC if trigger conditions met

### GeoNet API
- Base URL: `https://api.geonet.org.nz`
- Key endpoint: `GET /quake?MMI=4` (recent quakes with intensity ≥ 4)
- Single quake: `GET /quake/{publicID}`
- No API key required, but respect rate limits

### Contract Addresses (After Deploy)
All addresses go in `.env` files. Never hardcode in source.

### Wallet Setup
- Deployer wallet needs MATIC on Amoy testnet: https://faucet.polygon.technology
- Oracle wallet needs MATIC for gas + USDC for testing
- Get testnet MATIC from Polygon Amoy faucet

## Conventions

### Smart Contracts
- Use SafeERC20 for all token transfers
- Scale magnitudes by 100 (6.0 = 600)
- Scale lat/lng by 1e6 (-41.2858 = -41285800)
- All state changes emit events for frontend indexing

### Frontend
- Use `src/app/` directory (App Router)
- Server Components by default, add `'use client'` only when needed
- Wallet connection via RainbowKit in layout.tsx
- Fetch contract data with wagmi hooks

### Oracle
- Sign transactions with ethers.js v6
- Log all submissions for debugging
- Handle GeoNet API errors gracefully (retry logic)
- Don't submit duplicate earthquakes (track publicId)

## Common Pitfalls

1. **Forgetting to scale values:** Magnitude 6.0 must be sent as 600, not 6.0
2. **Wrong chainId:** Amoy testnet is 80002, not 137 (mainnet)
3. **Insufficient gas:** Oracle wallet needs MATIC, not USDC
4. **GeoNet rate limits:** Don't poll faster than 30s
5. **USDC decimals:** Always use 6 decimals (1 USDC = 1000000)

## Testing

### Smart Contract Tests
```bash
cd packages/contracts
pnpm hardhat test
pnpm hardhat test --grep "buyPolicy"  # Run specific test
```

### Manual Testing Flow
1. Deploy contracts to Amoy
2. Mint test USDC: `usdc.mint(yourAddress, 100000000)` (100 USDC)
3. Start frontend, connect wallet
4. Buy a policy
5. Start oracle, wait for real earthquake OR manually call `recordEarthquake()` via Hardhat console

## Deployment Checklist
- [ ] Deploy MockUSDC to Amoy
- [ ] Deploy QuakeShield to Amoy
- [ ] Verify contracts on Polygonscan
- [ ] Update .env files with addresses
- [ ] Mint test USDC to oracle wallet
- [ ] Set oracle address in QuakeShield contract
- [ ] Fund oracle wallet with MATIC
