import path from "path";
import type { NextConfig } from "next";

// wagmi's Coinbase "Base Account" connector statically imports @coinbase/cdp-sdk,
// which in turn imports these optional @x402/* payment-protocol subpaths that
// aren't published as real dependencies. We don't use x402 payments, so stub
// them out (with matching named exports) rather than pulling in the whole
// (unpublished) package family.
const stubsDir = path.resolve(__dirname, "src/lib/x402-stubs");
const X402_STUB_FILES: Record<string, string> = {
  "@x402/evm": "evm.ts",
  "@x402/evm/exact/client": "evm-exact-client.ts",
  "@x402/evm/upto/client": "evm-upto-client.ts",
  "@x402/svm/exact/client": "svm-exact-client.ts",
  "@x402/core/client": "core-client.ts",
};

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [],
  },
  // Transpile shared packages from monorepo
  transpilePackages: ["@quakeshield/shared"],
  turbopack: {
    // Turbopack resolveAlias wants paths relative to the project root.
    resolveAlias: Object.fromEntries(
      Object.entries(X402_STUB_FILES).map(([mod, file]) => [mod, `./src/lib/x402-stubs/${file}`])
    ),
  },
  webpack: (config) => {
    // webpack alias keys without a trailing "$" prefix-match, so "@x402/evm" would
    // otherwise swallow "@x402/evm/exact/client" and "@x402/evm/upto/client" too.
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(
        Object.entries(X402_STUB_FILES).map(([mod, file]) => [`${mod}$`, path.join(stubsDir, file)])
      ),
    };
    return config;
  },
};

export default nextConfig;
