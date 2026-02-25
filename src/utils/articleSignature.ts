import { ethers } from "ethers";

export const ARTICLE_SIGNATURE_VERSION = "mashbean.article.v1";

export interface ArticleSignatureMetadata {
  contentHash?: string;
  signature?: string;
  signer?: string;
  signatureVersion?: string;
}

export interface ArticleSignatureInput {
  slug: string;
  title: string;
  description: string;
  pubDateISO: string;
  updatedDateISO?: string;
  body: string;
}

export interface ArticleSignatureVerification {
  status: "verified" | "invalid" | "unsigned" | "error";
  reason: string;
  computedHash: string;
  recoveredAddress: string | null;
  expectedSigner: string | null;
}

const normalizeBody = (body: string): string => body.replace(/\r\n/g, "\n").trim();

export const buildArticleSigningPayload = (input: ArticleSignatureInput): string => {
  const normalized = {
    version: ARTICLE_SIGNATURE_VERSION,
    slug: input.slug.trim(),
    title: input.title.trim(),
    description: input.description.trim(),
    pubDateISO: input.pubDateISO,
    updatedDateISO: input.updatedDateISO ?? "",
    body: normalizeBody(input.body)
  };

  return JSON.stringify(normalized);
};

export const computeArticleContentHash = (payload: string): string =>
  ethers.utils.keccak256(ethers.utils.toUtf8Bytes(payload));

export const buildArticleSigningMessage = (contentHash: string): string => `${ARTICLE_SIGNATURE_VERSION}:${contentHash}`;

export const verifyArticleSignature = (
  input: ArticleSignatureInput,
  metadata: ArticleSignatureMetadata,
  fallbackSigner?: string | null
): ArticleSignatureVerification => {
  const payload = buildArticleSigningPayload(input);
  const computedHash = computeArticleContentHash(payload);
  const providedHash = metadata.contentHash?.trim();
  const providedSignature = metadata.signature?.trim();
  const providedVersion = metadata.signatureVersion?.trim();
  const signerCandidate = (metadata.signer ?? fallbackSigner ?? "").trim();

  if (!providedHash || !providedSignature || !signerCandidate) {
    return {
      status: "unsigned",
      reason: "Missing signature metadata",
      computedHash,
      recoveredAddress: null,
      expectedSigner: null
    };
  }

  if (!ethers.utils.isAddress(signerCandidate)) {
    return {
      status: "error",
      reason: `Invalid signer address: ${signerCandidate}`,
      computedHash,
      recoveredAddress: null,
      expectedSigner: null
    };
  }

  const expectedSigner = ethers.utils.getAddress(signerCandidate);

  if (providedVersion && providedVersion !== ARTICLE_SIGNATURE_VERSION) {
    return {
      status: "error",
      reason: `Unsupported signatureVersion: ${providedVersion}`,
      computedHash,
      recoveredAddress: null,
      expectedSigner
    };
  }

  if (providedHash !== computedHash) {
    return {
      status: "invalid",
      reason: "contentHash mismatch",
      computedHash,
      recoveredAddress: null,
      expectedSigner
    };
  }

  try {
    const message = buildArticleSigningMessage(computedHash);
    const recoveredAddress = ethers.utils.getAddress(ethers.utils.verifyMessage(message, providedSignature));

    if (recoveredAddress !== expectedSigner) {
      return {
        status: "invalid",
        reason: "Recovered signer does not match expected signer",
        computedHash,
        recoveredAddress,
        expectedSigner
      };
    }

    return {
      status: "verified",
      reason: "Signature verified",
      computedHash,
      recoveredAddress,
      expectedSigner
    };
  } catch (error) {
    return {
      status: "error",
      reason: error instanceof Error ? error.message : "Signature verification failed",
      computedHash,
      recoveredAddress: null,
      expectedSigner
    };
  }
};
