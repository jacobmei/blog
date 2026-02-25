import { ethers } from "ethers";
import { requireWeb3PublicConfig } from "@/utils/web3Config";

export interface EnsResolution {
  inputName: string;
  resolvedAddress: string | null;
  reverseName: string | null;
  forwardMatchesInput: boolean;
  reverseMatchesInput: boolean;
  isVerified: boolean;
  verificationCode:
    | "verified"
    | "unresolved"
    | "missing_reverse"
    | "reverse_mismatch"
    | "reverse_forward_mismatch"
    | "error";
  verificationMessage: string;
  error?: string;
}

let provider: ethers.providers.JsonRpcProvider | null = null;
let providerUrl: string | null = null;
const resolutionCache = new Map<string, Promise<EnsResolution>>();

const normalizeName = (value: string): string => value.trim().toLowerCase().replace(/\.$/, "");

const getProvider = (): ethers.providers.JsonRpcProvider => {
  const cfg = requireWeb3PublicConfig();
  const { rpcUrl, chainId } = cfg;
  if (!provider || providerUrl !== rpcUrl) {
    provider = new ethers.providers.JsonRpcProvider(rpcUrl, chainId);
    providerUrl = rpcUrl;
  }
  return provider;
};

export const resolveEnsProfile = async (name: string): Promise<EnsResolution> => {
  const normalizedInput = normalizeName(name);
  const cached = resolutionCache.get(normalizedInput);
  if (cached) return cached;

  const task = (async (): Promise<EnsResolution> => {
    try {
      const rpc = getProvider();
      const resolved = await rpc.resolveName(normalizedInput);

      if (!resolved || !ethers.utils.isAddress(resolved)) {
        return {
          inputName: normalizedInput,
          resolvedAddress: null,
          reverseName: null,
          forwardMatchesInput: false,
          reverseMatchesInput: false,
          isVerified: false,
          verificationCode: "unresolved",
          verificationMessage: "ENS 名稱目前沒有綁定地址"
        };
      }

      const checksumAddress = ethers.utils.getAddress(resolved);
      const reverse = await rpc.lookupAddress(checksumAddress);
      const normalizedReverse = reverse ? normalizeName(reverse) : null;
      const forwardAgain = normalizedReverse ? await rpc.resolveName(normalizedReverse) : null;

      const forwardMatchesInput = ethers.utils.isAddress(resolved);
      const reverseMatchesInput = normalizedReverse === normalizedInput;
      const reverseForwardMatches = forwardAgain
        ? ethers.utils.getAddress(forwardAgain) === checksumAddress
        : false;

      let verificationCode: EnsResolution["verificationCode"] = "verified";
      let verificationMessage = "ENS 正反向解析一致";
      if (!normalizedReverse) {
        verificationCode = "missing_reverse";
        verificationMessage = "尚未設定 reverse record";
      } else if (!reverseMatchesInput) {
        verificationCode = "reverse_mismatch";
        verificationMessage = "reverse 記錄與 ENS 名稱不一致";
      } else if (!reverseForwardMatches) {
        verificationCode = "reverse_forward_mismatch";
        verificationMessage = "reverse 名稱反查地址不一致";
      }

      return {
        inputName: normalizedInput,
        resolvedAddress: checksumAddress,
        reverseName: normalizedReverse,
        forwardMatchesInput,
        reverseMatchesInput,
        isVerified: forwardMatchesInput && reverseMatchesInput && reverseForwardMatches,
        verificationCode,
        verificationMessage
      };
    } catch (error) {
      return {
        inputName: normalizedInput,
        resolvedAddress: null,
        reverseName: null,
        forwardMatchesInput: false,
        reverseMatchesInput: false,
        isVerified: false,
        verificationCode: "error",
        verificationMessage: "ENS 解析時發生錯誤",
        error: error instanceof Error ? error.message : "Unknown ENS resolution error"
      };
    }
  })();

  resolutionCache.set(normalizedInput, task);
  return task;
};
