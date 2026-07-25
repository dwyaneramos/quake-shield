import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji, sepolia } from "viem/chains";
import { http } from "wagmi";
import { RPC_URLS } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

if (!walletConnectProjectId) {
  throw new Error(
    "NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID is not set. Get a project ID from " +
      "https://cloud.walletconnect.com and set it in .env.local — WalletConnect's " +
      "relay rejects unregistered IDs, which surfaces as " +
      '"Connection interrupted while trying to subscribe" at runtime.'
  );
}

export const wagmiConfig = getDefaultConfig({
  appName: "QuakeShield",
  projectId: walletConnectProjectId,
  chains: [sepolia, avalancheFuji],
  transports: {
    [sepolia.id]: http(RPC_URLS[sepolia.id]),
    [avalancheFuji.id]: http(RPC_URLS[avalancheFuji.id]),
  },
  ssr: true,
});
