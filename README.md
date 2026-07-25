# QuakeShield

Parametric earthquake insurance for New Zealand. Smart contracts automatically pay out policyholders when real GeoNet earthquake data crosses a policy's trigger conditions — no claims process, no adjuster.

Deployed identically to two chains, each with its own independent pool, policies, and oracle:

- **Ethereum Sepolia** (chainId `11155111`)
- **Avalanche Fuji C-Chain** (chainId `43113`)

## How it works

1. A user buys a policy by calling `buyPolicy()` on the QuakeShield contract, on whichever chain their wallet is connected to.
2. An oracle service polls the [GeoNet API](https://api.geonet.org.nz) every 30s for new earthquakes.
3. When a quake ≥ 5.0 magnitude is detected, the oracle calls `recordEarthquake()` on that chain's contract.
4. The contract checks all active policies on that chain and automatically pays out DNZD to any policy whose trigger conditions are met.

## Tech stack

- **Smart contracts:** Solidity 0.8.24, Hardhat, OpenZeppelin
- **Frontend:** Next.js 15 (App Router), React 19, Tailwind CSS
- **Web3:** viem, wagmi, RainbowKit (chain switcher for Sepolia/Fuji)
- **Oracle:** Node.js service polling GeoNet (one instance per chain)
- **Token:** Mock dNZD (6 decimals), with a real [NewMoney dNZD](https://getnew.money) integration planned on Sepolia
- **Monorepo:** pnpm workspaces + Turborepo

## Structure

```
apps/web/           Next.js frontend + API routes
apps/oracle/         GeoNet polling service
packages/contracts/  Solidity contracts + Hardhat
packages/shared/      Shared types/utilities
```

## Getting started

```bash
pnpm install
cp .env.example .env   
```

Deploy contracts (needs Sepolia ETH and/or Fuji AVAX in the deployer wallet):

```bash
cd packages/contracts
pnpm deploy:sepolia
pnpm deploy:fuji
```

Update the root `.env` with the deployed addresses, then:

```bash
pnpm dev              # starts the frontend (and other turbo-managed dev tasks)
pnpm --filter oracle dev            # oracle for NETWORK (default: sepolia)
NETWORK=fuji pnpm --filter oracle dev   # second oracle instance for Fuji
```

The frontend runs on `http://localhost:3000`.

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all services via Turborepo |
| `pnpm build` | Build all packages |
| `pnpm test` | Run tests across the monorepo |
| `pnpm lint` | Lint all packages |
| `pnpm oracle` | Start the oracle service |
| `pnpm deploy:contracts` | Deploy contracts |

See [AGENTS.md](AGENTS.md) for full environment variable reference, architecture notes, conventions, and a detailed deployment checklist.

## Testnet faucets

- Sepolia ETH: https://cloud.google.com/application/web3/faucet/ethereum/sepolia
- Fuji AVAX: https://core.app/tools/testnet-faucet/?subnet=c&token=c
