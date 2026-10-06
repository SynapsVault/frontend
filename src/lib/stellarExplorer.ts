// Inlined from @synapsvault/registry-client
import { STELLAR_NETWORK } from "./config.js";
type ExplorerNetwork = "testnet" | "public";
interface NetworkPreset { explorerNetwork: ExplorerNetwork; x402Network: string; networkPassphrase: string; sorobanRpcUrl: string; horizonUrl: string; usdcSacContractId: string; }
const networks: Record<string, NetworkPreset> = {
  testnet: { explorerNetwork: "testnet", x402Network: "stellar:testnet", networkPassphrase: "Test SDF Network ; September 2015", sorobanRpcUrl: "https://soroban-testnet.stellar.org", horizonUrl: "https://horizon-testnet.stellar.org", usdcSacContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" },
  mainnet: { explorerNetwork: "public", x402Network: "stellar:pubnet", networkPassphrase: "Public Global Stellar Network ; September 2015", sorobanRpcUrl: "https://soroban.stellar.org", horizonUrl: "https://horizon.stellar.org", usdcSacContractId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75" },
};

export type StellarNetwork = ExplorerNetwork;

// Follows VITE_NETWORK (see lib/config.ts); defaults to testnet.
const NETWORK: StellarNetwork = networks[STELLAR_NETWORK].explorerNetwork;

const EXPLORER_BASE = `https://stellar.expert/explorer/${NETWORK}`;

/** Stellar Explorer URL for a transaction hash. */
export function explorerTxUrl(txHash: string): string {
  return `${EXPLORER_BASE}/tx/${txHash}`;
}

/** Stellar Explorer URL for an account / wallet address (G...). */
export function explorerAccountUrl(address: string): string {
  return `${EXPLORER_BASE}/account/${address}`;
}

/** Stellar Explorer URL for a Soroban contract id (C...). */
export function explorerContractUrl(contractId: string): string {
  return `${EXPLORER_BASE}/contract/${contractId}`;
}