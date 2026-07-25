# QuakeShield - Agent Instructions

## Project Overview
Parametric earthquake insurance platform for New Zealand. Smart contracts (deployed identically to two chains) automatically pay out when GeoNet earthquake data meets policy triggers.

## Tech Stack
- **Blockchain:** Multi-chain — Ethereum Sepolia (chainId: 11155111) and Avalanche Fuji C-Chain (chainId: 43113). Same contracts, deployed separately to each.
- **Token:** Mock dNZD (6 decimals) per chain — see `packages/contracts/contracts/mocks/MockDNZD.sol`. A NewMoney dNZD integration (the real token) is planned on Sepolia (see below).
- **Smart Contracts:** Solidity 0.8.24 + Hardhat + OpenZeppelin
- **Frontend:** Next.js 15 (App Router) + React 19 + Tailwind CSS
- **Web3:** viem + wagmi + RainbowKit (chain switcher lets users pick Sepolia or Fuji)
- **Map:** react-leaflet (free, no API key needed)
- **Oracle:** Custom Node.js service polling GeoNet API — run one instance per chain
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
pnpm deploy:sepolia           # Deploy to Ethereum Sepolia
pnpm deploy:fuji              # Deploy to Avalanche Fuji
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
pnpm dev                      # Start oracle for NETWORK (defaults to sepolia, see root .env)
NETWORK=fuji pnpm dev         # Start a second instance against the other chain
```

### Monorepo
```bash
pnpm install                  # Install all dependencies
pnpm dev                      # Start all services via Turborepo
pnpm build                    # Build all packages
```

## Key Environment Variables

One root `.env` (copy from `.env.example`) supplies all three sub-projects — there
is no per-app `.env` anymore:
- `apps/web` loads it via `dotenv-cli` (`dotenv -e ../../.env -- next ...`, wired into its `pnpm dev`/`build`/`start` scripts)
- `packages/contracts` loads it in `hardhat.config.ts` via `dotenv.config({ path: ... })` pointed at the repo root
- `apps/oracle` loads it in `src/config.ts` the same way, then picks its chain via `NETWORK` (`sepolia` | `fuji`, default `sepolia`) and resolves the matching `*_SEPOLIA`/`*_FUJI` vars

```
# Shared
PRIVATE_KEY=...        # Deployer + oracle wallet (never commit)
NETWORK=sepolia        # Which chain this oracle process targets

# Ethereum Sepolia
SEPOLIA_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
NEXT_PUBLIC_SEPOLIA_RPC=https://ethereum-sepolia-rpc.publicnode.com
QUAKE_SHIELD_ADDRESS_SEPOLIA=0x...              # After deploy:sepolia
DNZD_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_DNZD_ADDRESS_SEPOLIA=0x...
NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_SEPOLIA=...
ETHERSCAN_API_KEY=...

# Avalanche Fuji
FUJI_RPC_URL=https://avalanche-fuji-c-chain-rpc.publicnode.com
NEXT_PUBLIC_FUJI_RPC=https://avalanche-fuji-c-chain-rpc.publicnode.com
QUAKE_SHIELD_ADDRESS_FUJI=0x...                 # After deploy:fuji
DNZD_ADDRESS_FUJI=0x...
NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_FUJI=0x...
NEXT_PUBLIC_DNZD_ADDRESS_FUJI=0x...
NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_FUJI=...
SNOWTRACE_API_KEY=...

# Oracle settings
POLL_INTERVAL_MS=30000
MIN_MAGITUDE_TO_REPORT=500  # 5.0 magnitude

# Frontend
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=... # Get from cloud.walletconnect.com
```

The non-`NEXT_PUBLIC_` and `NEXT_PUBLIC_` copies of the same RPC URL/address must
be kept in sync manually — Next.js requires the literal `NEXT_PUBLIC_` prefix in
source to inline a value into the client bundle, so it can't just alias the
plain var.

## Architecture Notes

### Data Flow
1. **User buys policy** → Frontend calls `buyPolicy()` on QuakeShield.sol, on whichever chain the wallet is connected to
2. **Oracle polls GeoNet** → Every 30s, checks for new quakes ≥ 5.0 magnitude
3. **Earthquake detected** → Oracle calls `recordEarthquake()` on the contract for its configured chain
4. **Automatic payout** → Contract checks all active policies on that chain, transfers DNZD if trigger conditions met

Each chain has its own independent pool, policies, and oracle — a quake recorded on Sepolia does not affect the Fuji deployment.

### GeoNet API
- Base URL: `https://api.geonet.org.nz`
- Key endpoint: `GET /quake?MMI=4` (recent quakes with intensity ≥ 4)
- Single quake: `GET /quake/{publicID}`
- No API key required, but respect rate limits

### Contract Addresses (After Deploy)
All addresses go in the root `.env`, keyed per chain. Never hardcode in source.

### Wallet Setup
- Deployer wallet needs testnet gas on **both** chains before deploying:
  - Sepolia ETH: https://cloud.google.com/application/web3/faucet/ethereum/sepolia (or any Sepolia faucet)
  - Fuji AVAX: https://core.app/tools/testnet-faucet/?subnet=c&token=c
- Oracle wallet(s) need the matching native gas token per chain, plus the contract needs to recognize them as `oracle` (the deployer is the default oracle — see `setOracle()` if using a separate wallet)

### NewMoney (dNZD) integration
QuakeShield plans to use NewMoney's dNZD (NZD-backed stablecoin, getnew.money) as its token on Sepolia — the "DNZD" naming throughout the codebase already reflects this, but until the real token is wired in, `DNZD_ADDRESS_*`/`NEXT_PUBLIC_DNZD_ADDRESS_*` still point at a `MockDNZD` deployment (see `packages/contracts/contracts/mocks/MockDNZD.sol`), not the actual NewMoney contract. As of the last check, dNZD is Sepolia-testnet-only (mint-only REST API, beta v0.1) — no Fuji/Avalanche support yet. Requires an API key from tech@getnewmoney.io. Once available, swap `NEXT_PUBLIC_DNZD_ADDRESS_SEPOLIA` for the real dNZD token address; the contract itself doesn't care which ERC20 it holds.

## Conventions

### Smart Contracts
- Use SafeERC20 for all token transfers
- Scale magnitudes by 100 (6.0 = 600)
- Scale lat/lng by 1e6 (-41.2858 = -41285800)
- All state changes emit events for frontend indexing
- The same Solidity contracts deploy unmodified to any EVM chain — network-specific config lives only in `hardhat.config.ts` and `.env`, never in `.sol` files

### Frontend
- Use `src/app/` directory (App Router)
- Server Components by default, add `'use client'` only when needed
- Wallet connection via RainbowKit in layout.tsx; RainbowKit's chain switcher lets users move between Sepolia and Fuji
- Contract addresses are chain-keyed — always resolve them via `getContracts(chainId)` / `isChainConfigured(chainId)` in `@/lib/contracts`, never assume a single fixed address
- Fetch contract data with wagmi hooks (`useChainId()` + the hooks in `@/lib/hooks`)

### Oracle
- Sign transactions with ethers.js v6
- Log all submissions for debugging
- Handle GeoNet API errors gracefully (retry logic)
- Don't submit duplicate earthquakes (track publicId)
- One oracle process = one chain. For multi-chain, run multiple instances with different `NETWORK=` values

## Common Pitfalls

1. **Forgetting to scale values:** Magnitude 6.0 must be sent as 600, not 6.0
2. **Wrong chainId:** Sepolia is 11155111, Fuji is 43113 — don't confuse with mainnets (1, 43114)
3. **Insufficient gas:** Oracle/deployer wallets need the chain's native token (ETH on Sepolia, AVAX on Fuji), not DNZD
4. **GeoNet rate limits:** Don't poll faster than 30s
5. **DNZD decimals:** Always use 6 decimals (1 DNZD = 1000000)
6. **Mixing up chains:** Sepolia and Fuji have entirely separate contract deployments, addresses, and pools — a policy bought on one chain does not exist on the other

## Testing

### Smart Contract Tests
```bash
cd packages/contracts
pnpm hardhat test
pnpm hardhat test --grep "buyPolicy"  # Run specific test
```

### Manual Testing Flow
1. Deploy contracts to Sepolia and/or Fuji
2. Mint test DNZD: `DNZD.mint(yourAddress, 100000000)` (100 DNZD)
3. Start frontend, connect wallet, switch to the chain you deployed to
4. Buy a policy
5. Start the matching oracle instance, wait for a real earthquake OR manually call `recordEarthquake()` via Hardhat console

## Deployment Checklist
- [ ] Fund deployer wallet with Sepolia ETH and/or Fuji AVAX
- [ ] Deploy MockDNZD + QuakeShield to Sepolia (`pnpm deploy:sepolia`)
- [ ] Deploy MockDNZD + QuakeShield to Fuji (`pnpm deploy:fuji`)
- [ ] Verify contracts (Etherscan for Sepolia, Snowtrace for Fuji)
- [ ] Update the root `.env` with per-chain addresses
- [ ] Mint test DNZD to oracle wallet(s)
- [ ] Set oracle address in QuakeShield contract if using a separate oracle wallet per chain
- [ ] Fund oracle wallet(s) with native gas token
