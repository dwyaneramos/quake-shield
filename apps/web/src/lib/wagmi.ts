import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { polygonAmoy } from "viem/chains";
import { http } from "wagmi";

const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_AMOY_RPC || polygonAmoy.rpcUrls.default.http[0];
const walletConnectProjectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "";

export const wagmiConfig = getDefaultConfig({
  appName: "QuakeShield",
  projectId: walletConnectProjectId || "quakeshield-dev",
  chains: [polygonAmoy],
  transports: {
    [polygonAmoy.id]: http(rpcUrl),
  },
  ssr: true,
});
