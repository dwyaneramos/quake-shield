import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { avalancheFuji, sepolia } from "viem/chains";
import { http } from "wagmi";
import { RPC_URLS } from "@/lib/chains";

const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = getDefaultConfig({
  appName: "QuakeShield",
  projectId: walletConnectProjectId || "quakeshield-dev",
  chains: [sepolia, avalancheFuji],
  transports: {
    [sepolia.id]: http(RPC_URLS[sepolia.id]),
    [avalancheFuji.id]: http(RPC_URLS[avalancheFuji.id]),
  },
  ssr: true,
});
