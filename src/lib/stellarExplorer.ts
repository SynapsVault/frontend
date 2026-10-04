// Inlined from @synapsvault/registry-client
type ExplorerNetwork = "testnet" | "public";
interface NetworkPreset { explorerNetwork: ExplorerNetwork; x402Network: string; networkPassphrase: string; sorobanRpcUrl: string; horizonUrl: string; usdcSacContractId: string; }
const networks: Record<string, NetworkPreset> = {
  testnet: { explorerNetwork: "testnet", x402Network: "stellar:testnet", networkPassphrase: "Test SDF Network ; September 2015", sorobanRpcUrl: "https://soroban-testnet.stellar.org", horizonUrl: "https://horizon-testnet.stellar.org", usdcSacContractId: "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA" },
  mainnet: { explorerNetwork: "public", x402Network: "stellar:pubnet", networkPassphrase: "Public Global Stellar Network ; September 2015", sorobanRpcUrl: "https://soroban.stellar.org", horizonUrl: "https://horizon.stellar.org", usdcSacContractId: "CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75" },
};

export type StellarNetwork = ExplorerNetwork;

function resolveExplorerNetwork(): StellarNetwork {
  const raw = (import.meta.env.VITE_STELLAR_NETWORK as string | undefined)?.trim().toLowerCase();
  if (!raw) return networks.testnet.explorerNetwork;
  if (raw === "public" || raw === "mainnet" || raw === "pubnet") {
    return networks.mainnet.explorerNetwork;
  }
  if (raw === "testnet") return networks.testnet.explorerNetwork;
  return networks.testnet.explorerNetwork;
}

// Defaults to testnet; set VITE_STELLAR_NETWORK=testnet|mainnet|public for explorer links.
const NETWORK: StellarNetwork = resolveExplorerNetwork();

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