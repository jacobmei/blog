export interface Web3PublicConfig {
  tipEnsName: string;
  signerEnsName: string;
  rpcUrl: string;
  chainId: number;
}

let cached: Web3PublicConfig | null = null;
let resolved = false;

const trimTrailingSlash = (value: string): string => value.replace(/\/+$/, "");

const formatConfigError = (issues: string[]): string =>
  `Invalid Web3 public config: ${issues.join("; ")}. Required env: PUBLIC_TIP_ENS_NAME, PUBLIC_WEB3_RPC_URL, PUBLIC_WEB3_CHAIN_ID.`;

export const getWeb3PublicConfig = (): Web3PublicConfig | null => {
  if (resolved) return cached;
  resolved = true;

  const issues: string[] = [];
  const tipEnsName = (import.meta.env.PUBLIC_TIP_ENS_NAME ?? "").trim();
  const signerEnsNameRaw = (import.meta.env.PUBLIC_SIGNER_ENS_NAME ?? "").trim();
  const rpcUrlRaw = (import.meta.env.PUBLIC_WEB3_RPC_URL ?? "").trim();
  const chainIdRaw = (import.meta.env.PUBLIC_WEB3_CHAIN_ID ?? "").trim();

  if (!tipEnsName) issues.push("PUBLIC_TIP_ENS_NAME is missing");
  if (!rpcUrlRaw) issues.push("PUBLIC_WEB3_RPC_URL is missing");
  if (!chainIdRaw) issues.push("PUBLIC_WEB3_CHAIN_ID is missing");
  if (issues.length > 0) return null;

  const chainId = Number.parseInt(chainIdRaw, 10);
  if (!Number.isInteger(chainId) || chainId <= 0) {
    issues.push(`PUBLIC_WEB3_CHAIN_ID must be a positive integer (got "${chainIdRaw}")`);
    return null;
  }

  let rpcUrl: URL;
  try {
    rpcUrl = new URL(rpcUrlRaw);
  } catch {
    issues.push(`PUBLIC_WEB3_RPC_URL must be a valid URL (got "${rpcUrlRaw}")`);
    return null;
  }

  if (rpcUrl.protocol !== "http:" && rpcUrl.protocol !== "https:") {
    issues.push(`PUBLIC_WEB3_RPC_URL must use http/https (got "${rpcUrl.protocol}")`);
    return null;
  }

  cached = {
    tipEnsName: tipEnsName.toLowerCase(),
    signerEnsName: (signerEnsNameRaw || tipEnsName).toLowerCase(),
    rpcUrl: trimTrailingSlash(rpcUrl.toString()),
    chainId
  };

  return cached;
};

export const requireWeb3PublicConfig = (): Web3PublicConfig => {
  const cfg = getWeb3PublicConfig();
  if (cfg) return cfg;

  const tipEnsName = (import.meta.env.PUBLIC_TIP_ENS_NAME ?? "").trim();
  const rpcUrlRaw = (import.meta.env.PUBLIC_WEB3_RPC_URL ?? "").trim();
  const chainIdRaw = (import.meta.env.PUBLIC_WEB3_CHAIN_ID ?? "").trim();
  const issues: string[] = [];

  if (!tipEnsName) issues.push("PUBLIC_TIP_ENS_NAME is missing");
  if (!rpcUrlRaw) issues.push("PUBLIC_WEB3_RPC_URL is missing");
  if (!chainIdRaw) issues.push("PUBLIC_WEB3_CHAIN_ID is missing");

  if (chainIdRaw) {
    const chainId = Number.parseInt(chainIdRaw, 10);
    if (!Number.isInteger(chainId) || chainId <= 0) {
      issues.push(`PUBLIC_WEB3_CHAIN_ID must be a positive integer (got "${chainIdRaw}")`);
    }
  }

  if (rpcUrlRaw) {
    try {
      const rpcUrl = new URL(rpcUrlRaw);
      if (rpcUrl.protocol !== "http:" && rpcUrl.protocol !== "https:") {
        issues.push(`PUBLIC_WEB3_RPC_URL must use http/https (got "${rpcUrl.protocol}")`);
      }
    } catch {
      issues.push(`PUBLIC_WEB3_RPC_URL must be a valid URL (got "${rpcUrlRaw}")`);
    }
  }

  throw new Error(formatConfigError(issues.length > 0 ? issues : ["unknown configuration error"]));
};
