// Auto-generated from packages/contracts/artifacts after `pnpm hardhat compile`.
// Re-run the codegen (see AGENTS.md) if the contract ABI changes.

import { avalancheFuji, sepolia } from "viem/chains";

export const QUAKESHIELD_ABI = [
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "_DNZD",
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
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "periodEnd",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "reason",
        "type": "string"
      }
    ],
    "name": "AccrualSkipped",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
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
        "name": "aprBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "periodEnd",
        "type": "uint256"
      }
    ],
    "name": "InterestAccrued",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "investor",
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
        "name": "sharesMinted",
        "type": "uint256"
      }
    ],
    "name": "InvestmentDeposited",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "InvestmentLoss",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "investor",
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
        "name": "sharesBurned",
        "type": "uint256"
      }
    ],
    "name": "InvestmentWithdrawn",
    "type": "event"
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
      }
    ],
    "name": "PolicyLapsed",
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
        "name": "premium",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newPeriodEnd",
        "type": "uint256"
      }
    ],
    "name": "PolicyRenewed",
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
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "RegionAdded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
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
        "internalType": "uint256",
        "name": "timestamp",
        "type": "uint256"
      }
    ],
    "name": "RegionQuake",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "riskScoreBps",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "aprBps",
        "type": "uint256"
      }
    ],
    "name": "RegionRiskUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "RegionStatusUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "newEpoch",
        "type": "uint256"
      }
    ],
    "name": "RegionWipedOut",
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
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "YieldReserveFunded",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ACCRUAL_PERIOD",
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
    "name": "BASE_APR_BPS",
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
    "name": "DNZD",
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
    "inputs": [],
    "name": "INVESTMENT_TRIGGER_MAGNITUDE",
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
    "name": "MAX_ACCRUAL_PERIODS",
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
    "name": "MAX_APR_BPS",
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
    "name": "MAX_COVERAGE_PER_POLICY",
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
    "name": "MIN_RESERVE_RATIO_BPS",
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
    "name": "RENEWAL_PERIOD",
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
    "name": "accrueAllRegions",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "interestPaid",
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
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "accrueRegion",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "interestPaid",
        "type": "uint256"
      }
    ],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      }
    ],
    "name": "addRegion",
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
        "name": "coverageAmount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "triggerMagnitude",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "recurring",
        "type": "bool"
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
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "fundYieldReserve",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "investor",
        "type": "address"
      }
    ],
    "name": "getInvestment",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "shares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "value",
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
        "name": "investor",
        "type": "address"
      }
    ],
    "name": "getInvestorRegions",
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
    "inputs": [
      {
        "internalType": "address",
        "name": "investor",
        "type": "address"
      }
    ],
    "name": "getInvestorTotalValue",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "total",
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
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "getNextAccrualAt",
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
            "internalType": "uint256",
            "name": "regionId",
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
          },
          {
            "internalType": "bool",
            "name": "isRecurring",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "periodEnd",
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
      },
      {
        "internalType": "uint256",
        "name": "_totalActiveCoverage",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_totalInvested",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "_yieldReserve",
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
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "getRegion",
    "outputs": [
      {
        "components": [
          {
            "internalType": "string",
            "name": "name",
            "type": "string"
          },
          {
            "internalType": "uint256",
            "name": "totalAssets",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalShares",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "epoch",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "riskScoreBps",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "riskUpdatedAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastAccrualAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lastQuakeAt",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "quakeCount",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalInterestPaid",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalLosses",
            "type": "uint256"
          },
          {
            "internalType": "bool",
            "name": "active",
            "type": "bool"
          }
        ],
        "internalType": "struct QuakeShield.Region",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "getRegionAprBps",
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
    "name": "getRegionCount",
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
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "getRegionPeriodInterest",
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
    "name": "getReserveRatio",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "reserveRatioBps",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getTotalInvested",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "total",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "invest",
    "outputs": [],
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
    "name": "isPolicyExpired",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
    "name": "lapsePolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
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
        "internalType": "uint256",
        "name": "regionId",
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
      },
      {
        "internalType": "bool",
        "name": "isRecurring",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "periodEnd",
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
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "name": "positions",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "epoch",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "shares",
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
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "previewAccrual",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "periodsDue",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "interest",
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
      },
      {
        "internalType": "uint256[]",
        "name": "regionIds",
        "type": "uint256[]"
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "regions",
    "outputs": [
      {
        "internalType": "string",
        "name": "name",
        "type": "string"
      },
      {
        "internalType": "uint256",
        "name": "totalAssets",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalShares",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "epoch",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "riskScoreBps",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "riskUpdatedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastAccrualAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "lastQuakeAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "quakeCount",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalInterestPaid",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "totalLosses",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
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
    "name": "renewPolicy",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "bool",
        "name": "active",
        "type": "bool"
      }
    ],
    "name": "setRegionActive",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "riskScoreBps",
        "type": "uint256"
      }
    ],
    "name": "setRegionRiskScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256[]",
        "name": "regionIds",
        "type": "uint256[]"
      },
      {
        "internalType": "uint256[]",
        "name": "riskScoresBps",
        "type": "uint256[]"
      }
    ],
    "name": "setRegionRiskScores",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalActiveCoverage",
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
    "name": "uncoveredLosses",
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      }
    ],
    "name": "withdrawAllFromRegion",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "regionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "withdrawInvestment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "yieldReserve",
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

export const DNZD_ABI = [
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

// Contract addresses are per-chain — QuakeShield is deployed separately to
// Sepolia and Fuji, so there's a distinct DNZD/QuakeShield pair on each.
// Set after deployment in the root .env.
export interface ChainContracts {
  QUAKESHIELD_ADDRESS: `0x${string}` | "";
  DNZD_ADDRESS: `0x${string}` | "";
  DEPLOY_BLOCK: bigint;
}

// `NEXT_PUBLIC_USDC_ADDRESS_*` is the older name for the same token address and
// is still read as a fallback so existing .env files keep working. Each name
// has to appear as a literal for Next.js to inline it into the client bundle.
export const CONTRACTS_BY_CHAIN: Record<number, ChainContracts> = {
  [sepolia.id]: {
    QUAKESHIELD_ADDRESS: (process.env.NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_SEPOLIA || "") as `0x${string}` | "",
    DNZD_ADDRESS: (process.env.NEXT_PUBLIC_DNZD_ADDRESS_SEPOLIA ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS_SEPOLIA ||
      "") as `0x${string}` | "",
    DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_SEPOLIA || "0"),
  },
  [avalancheFuji.id]: {
    QUAKESHIELD_ADDRESS: (process.env.NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS_FUJI || "") as `0x${string}` | "",
    DNZD_ADDRESS: (process.env.NEXT_PUBLIC_DNZD_ADDRESS_FUJI ||
      process.env.NEXT_PUBLIC_USDC_ADDRESS_FUJI ||
      "") as `0x${string}` | "",
    DEPLOY_BLOCK: BigInt(process.env.NEXT_PUBLIC_QUAKE_SHIELD_DEPLOY_BLOCK_FUJI || "0"),
  },
};

const EMPTY_CONTRACTS: ChainContracts = {
  QUAKESHIELD_ADDRESS: "",
  DNZD_ADDRESS: "",
  DEPLOY_BLOCK: 0n,
};

export function getContracts(chainId: number | undefined): ChainContracts {
  return (chainId && CONTRACTS_BY_CHAIN[chainId]) || EMPTY_CONTRACTS;
}

export function isChainConfigured(chainId: number | undefined): boolean {
  const contracts = getContracts(chainId);
  return Boolean(contracts.QUAKESHIELD_ADDRESS && contracts.DNZD_ADDRESS);
}
