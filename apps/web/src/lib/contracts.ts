// Contract ABIs (will be populated after compilation)
export const QUAKESHIELD_ABI = [] as const;
export const MOCK_USDC_ABI = [] as const;

// Contract addresses (set after deployment)
export const CONTRACTS = {
  QUAKESHIELD_ADDRESS: process.env.NEXT_PUBLIC_QUAKE_SHIELD_ADDRESS || "",
  USDC_ADDRESS: process.env.NEXT_PUBLIC_MOCK_USDC_ADDRESS || "",
} as const;
