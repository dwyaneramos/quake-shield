// Auto-generated from packages/contracts/artifacts after `pnpm hardhat compile`.
// Re-run the codegen (see AGENTS.md) if the contract ABI changes.

import { avalancheFuji, sepolia } from "viem/chains";

export const QUAKESHIELD_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_usdc",
        "type": "address"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "token",
        "type": "address"
      }
    ],
    "name": "SafeERC20FailedOperation",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "oldOracle",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOracle",
        "type": "address"
      }
    ],
    "name": "OracleUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "previousOwner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "policyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "policyholder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "quakeMagnitude",
        "type": "uint256"
      }
    ],
    "name": "PayoutExecuted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "policyId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "policyholder",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "coverage",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "premium",
        "type": "uint256"
      }
    ],
    "name": "PolicyPurchased",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "quakeId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "magnitude",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "lat",
        "type": "int256"
      },
      {
        "indexed": false,
        "internalType": "int256",
        "name": "lng",
        "type": "int256"
      }
    ],
    "name": "QuakeRecorded",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "coverageAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "triggerMagnitude",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "centerLat",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "centerLng",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "radiusKm",
        "type": "uint256"
      }
    ],
    "name": "buyPolicy",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "policyId",
        "type": "uint256"
      }
    ],
    "name": "getPolicy",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "policyholder",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "coverageAmount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "premiumPaid",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "triggerMagnitude",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "centerLat",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "centerLng",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "radiusKm",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "isActive",
            "type": "bool"
          },
          {
            "internalType": "bool",
            "name": "hasPaidOut",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "createdAt",
            "type": "uint256"
          }
        ],
        "internalType": "struct QuakeShield.Policy",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getPoolStats",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "_totalPremiums",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalPayouts",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_activePolicies",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "quakeId",
        "type": "uint256"
      }
    ],
    "name": "getQuake",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "magnitude",
            "type": "uint256"
          },
          {
            "internalType": "int256",
            "name": "latitude",
            "type": "int256"
          },
          {
            "internalType": "int256",
            "name": "longitude",
            "type": "int256"
          },
          {
            "internalType": "uint256",
            "name": "depth",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "timestamp",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "publicId",
            "type": "string"
          }
        ],
        "internalType": "struct QuakeShield.QuakeEvent",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getQuakeCount",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "user",
        "type": "address"
      }
    ],
    "name": "getUserPolicies",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "oracle",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "policies",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "policyholder",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "coverageAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "premiumPaid",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "triggerMagnitude",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "centerLat",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "centerLng",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "radiusKm",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "isActive",
        "type": "bool"
      },
      {
        "internalType": "bool",
        "name": "hasPaidOut",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "createdAt",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "policyCounter",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "magnitude",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "latitude",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "longitude",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "depth",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "publicId",
        "type": "string"
      }
    ],
    "name": "recordEarthquake",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "recordedQuakes",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "magnitude",
        "type": "uint256"
      },
      {
        "internalType": "int256",
        "name": "latitude",
        "type": "int256"
      },
      {
        "internalType": "int256",
        "name": "longitude",
        "type": "int256"
      },
      {
        "internalType": "uint256",
        "name": "depth",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "publicId",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_oracle",
        "type": "address"
      }
    ],
    "name": "setOracle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPayouts",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalPremiums",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "newOwner",
        "type": "address"
      }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdc",
    "outputs": [
      {
        "internalType": "contract IERC20",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "userPolicies",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "stateMutability": "payable",
    "type": "receive"
  }
] as const;

export const MOCK_USDC_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "allowance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientAllowance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "balance",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "needed",
        "type": "uint256"
      }
    ],
    "name": "ERC20InsufficientBalance",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "approver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidApprover",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "receiver",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidReceiver",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "sender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSender",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "ERC20InvalidSpender",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Approval",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "Transfer",
    "type": "event"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "owner",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      }
    ],
    "name": "allowance",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "spender",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "approve",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "account",
        "type": "address"
      }
    ],
    "name": "balanceOf",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "decimals",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "",
        "type": "uint8"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "name",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "symbol",
    "outputs": [
      {
        "internalType": "string",
        "name": "",
        "type": "string"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalSupply",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transfer",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "from",
        "type": "address"
      },
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "value",
        "type": "uint256"
      }
    ],
    "name": "transferFrom",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const;

export const EARTHQUAKE_MARKET_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_token", "type": "address" },
      { "internalType": "address", "name": "_quakeShield", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  { "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }], "name": "OwnableInvalidOwner", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "account", "type": "address" }], "name": "OwnableUnauthorizedAccount", "type": "error" },
  { "inputs": [], "name": "ReentrancyGuardReentrantCall", "type": "error" },
  { "inputs": [{ "internalType": "address", "name": "token", "type": "address" }], "name": "SafeERC20FailedOperation", "type": "error" },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": false, "internalType": "string", "name": "description", "type": "string" },
      { "indexed": false, "internalType": "int256", "name": "centerLat", "type": "int256" },
      { "indexed": false, "internalType": "int256", "name": "centerLng", "type": "int256" },
      { "indexed": false, "internalType": "uint256", "name": "radiusKm", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "triggerMagnitude", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "resolutionTime", "type": "uint256" }
    ],
    "name": "MarketCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": false, "internalType": "bool", "name": "outcomeYes", "type": "bool" }
    ],
    "name": "MarketResolved",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldOracle", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOracle", "type": "address" }
    ],
    "name": "OracleUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "user", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "Redeemed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "buyer", "type": "address" },
      { "indexed": false, "internalType": "bool", "name": "isYes", "type": "bool" },
      { "indexed": false, "internalType": "uint256", "name": "amountIn", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "sharesOut", "type": "uint256" }
    ],
    "name": "SharesPurchased",
    "type": "event"
  },
  { "inputs": [], "name": "SEED_LIQUIDITY", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [
      { "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" }
    ],
    "name": "buyNo",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "internalType": "uint256", "name": "amountIn", "type": "uint256" }
    ],
    "name": "buyYes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "description", "type": "string" },
      { "internalType": "int256", "name": "centerLat", "type": "int256" },
      { "internalType": "int256", "name": "centerLng", "type": "int256" },
      { "internalType": "uint256", "name": "radiusKm", "type": "uint256" },
      { "internalType": "uint256", "name": "triggerMagnitude", "type": "uint256" },
      { "internalType": "uint256", "name": "resolutionTime", "type": "uint256" }
    ],
    "name": "createMarket",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }],
    "name": "getMarket",
    "outputs": [
      {
        "components": [
          { "internalType": "string", "name": "description", "type": "string" },
          { "internalType": "int256", "name": "centerLat", "type": "int256" },
          { "internalType": "int256", "name": "centerLng", "type": "int256" },
          { "internalType": "uint256", "name": "radiusKm", "type": "uint256" },
          { "internalType": "uint256", "name": "triggerMagnitude", "type": "uint256" },
          { "internalType": "uint256", "name": "createdAt", "type": "uint256" },
          { "internalType": "uint256", "name": "resolutionTime", "type": "uint256" },
          { "internalType": "uint256", "name": "yesReserve", "type": "uint256" },
          { "internalType": "uint256", "name": "noReserve", "type": "uint256" },
          { "internalType": "uint256", "name": "collateralBalance", "type": "uint256" },
          { "internalType": "bool", "name": "resolved", "type": "bool" },
          { "internalType": "bool", "name": "outcomeYes", "type": "bool" }
        ],
        "internalType": "struct EarthquakeMarket.Market",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [], "name": "getMarketCount", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }],
    "name": "getMarketPrice",
    "outputs": [
      { "internalType": "uint256", "name": "yesPrice", "type": "uint256" },
      { "internalType": "uint256", "name": "noPrice", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [], "name": "nextMarketId", "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }], "stateMutability": "view", "type": "function" },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "noSharesOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  { "inputs": [], "name": "oracle", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "owner", "outputs": [{ "internalType": "address", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [], "name": "quakeShield", "outputs": [{ "internalType": "contract IQuakeShieldReader", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "uint256", "name": "marketId", "type": "uint256" }], "name": "redeem", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "renounceOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  {
    "inputs": [
      { "internalType": "uint256", "name": "marketId", "type": "uint256" },
      { "internalType": "bool", "name": "outcomeYes", "type": "bool" }
    ],
    "name": "resolveMarket",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  { "inputs": [{ "internalType": "address", "name": "_oracle", "type": "address" }], "name": "setOracle", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  { "inputs": [], "name": "token", "outputs": [{ "internalType": "contract IERC20", "name": "", "type": "address" }], "stateMutability": "view", "type": "function" },
  { "inputs": [{ "internalType": "address", "name": "newOwner", "type": "address" }], "name": "transferOwnership", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
  {
    "inputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "yesSharesOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
] as const;

// Contract addresses are per-chain — QuakeShield is deployed separately to
// Sepolia and Fuji, so there's a distinct MockUSDC/QuakeShield pair on each.
// Set after deployment in the root .env.
export interface ChainContracts {
  QUAKESHIELD_ADDRESS: `0x${string}` | "";
  USDC_ADDRESS: `0x${string}` | "";
  DEPLOY_BLOCK: bigint;
  EARTHQUAKE_MARKET_ADDRESS: `0x${string}` | "";
  EARTHQUAKE_MARKET_DEPLOY_BLOCK: bigint;
}

export const CONTRACTS_BY_CHAIN: Record<number, ChainContracts> = {
  [sepolia.id]: {
    QUAKESHIELD_ADDRESS: (process.env.NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_SEPOLIA || "") as `0x${string}` | "",
    USDC_ADDRESS: (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS_SEPOLIA || "") as `0x${string}` | "",
    DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_SEPOLIA || "0"),
    EARTHQUAKE_MARKET_ADDRESS: (process.env.NEXT_PUBLIC_EARTHQUAKE_MARKET_ADDRESS_SEPOLIA || "") as `0x${string}` | "",
    EARTHQUAKE_MARKET_DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_EARTHQUAKE_MARKET_DEPLOY_BLOCK_SEPOLIA || "0"),
  },
  [avalancheFuji.id]: {
    QUAKESHIELD_ADDRESS: (process.env.NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_FUJI || "") as `0x${string}` | "",
    USDC_ADDRESS: (process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS_FUJI || "") as `0x${string}` | "",
    DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_FUJI || "0"),
    EARTHQUAKE_MARKET_ADDRESS: (process.env.NEXT_PUBLIC_EARTHQUAKE_MARKET_ADDRESS_FUJI || "") as `0x${string}` | "",
    EARTHQUAKE_MARKET_DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_EARTHQUAKE_MARKET_DEPLOY_BLOCK_FUJI || "0"),
  },
};

const EMPTY_CONTRACTS: ChainContracts = {
  QUAKESHIELD_ADDRESS: "",
  USDC_ADDRESS: "",
  DEPLOY_BLOCK: 0n,
  EARTHQUAKE_MARKET_ADDRESS: "",
  EARTHQUAKE_MARKET_DEPLOY_BLOCK: 0n,
};

export function getContracts(chainId: number | undefined): ChainContracts {
  return (chainId && CONTRACTS_BY_CHAIN[chainId]) || EMPTY_CONTRACTS;
}

export function isChainConfigured(chainId: number | undefined): boolean {
  const contracts = getContracts(chainId);
  return Boolean(contracts.QUAKESHIELD_ADDRESS && contracts.USDC_ADDRESS);
}
