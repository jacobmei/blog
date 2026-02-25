/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_TIP_ENS_NAME: string;
  readonly PUBLIC_SIGNER_ENS_NAME?: string;
  readonly PUBLIC_WEB3_RPC_URL: string;
  readonly PUBLIC_WEB3_CHAIN_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
