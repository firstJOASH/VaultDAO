/**
 * VaultDAO SDK — Utility Functions
 *
 * High-level helpers that wrap lower-level Stellar SDK operations.
 */

import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
} from "stellar-sdk";
import type { SdkOptions, Network } from "./types";
import { VaultError, VaultErrorCode } from "./types";

// ---------------------------------------------------------------------------
// Network helpers
// ---------------------------------------------------------------------------

/** Known network passphrases keyed by preset name. */
export const NETWORK_PASSPHRASES: Record<Exclude<Network, "custom">, string> = {
  testnet: Networks.TESTNET,
  mainnet: Networks.PUBLIC,
  futurenet: Networks.FUTURENET,
};

/** Default RPC endpoints for known networks. */
export const DEFAULT_RPC_URLS: Record<Exclude<Network, "custom">, string> = {
  testnet: "https://soroban-testnet.stellar.org",
  mainnet: "https://mainnet.stellar.validationcloud.io/v1/REPLACE_ME",
  futurenet: "https://rpc-futurenet.stellar.org",
};

/**
 * Build an `SdkOptions` object from a network preset and contract ID.
 *
 * @example
 * const opts = buildOptions("testnet", "CXXXXXXXXX...");
 */
export function buildOptions(
  network: Exclude<Network, "custom">,
  contractId: string
): SdkOptions {
  return {
    contractId,
    rpcUrl: DEFAULT_RPC_URLS[network],
    networkPassphrase: NETWORK_PASSPHRASES[network],
  };
}

// ---------------------------------------------------------------------------
// Wallet connection
// ---------------------------------------------------------------------------

export interface WalletConnection {
  publicKey: string;
  network: string;
  networkUrl: string;
}

/**
 * Connect to the Freighter browser extension and return wallet details.
 *
 * Throws if Freighter is not installed or the user rejects the connection.
 *
 * @example
 * const wallet = await connectWallet();
 * console.log(wallet.publicKey); // "GABC..."
 */
export async function connectWallet(): Promise<WalletConnection> {
  // Dynamic import keeps the SDK usable in Node.js environments
  const freighter = await import("@stellar/freighter-api");

  const connected = await freighter.isConnected();
  if (!connected) {
    throw new Error(
      "Freighter wallet is not installed. Install it at https://www.freighter.app/"
    );
  }

  const publicKey = await freighter.getPublicKey();
  const details = await freighter.getNetworkDetails();

  return {
    publicKey,
    network: details.network,
    networkUrl: details.networkUrl,
  };
}

// ---------------------------------------------------------------------------
// Transaction building
// ---------------------------------------------------------------------------

/**
 * Prepare and simulate a Soroban contract invocation.
 *
 * Returns the prepared transaction ready to be signed and submitted.
 *
 * @param sourcePublicKey - The sender's public key.
 * @param operation       - The XDR operation to include.
 * @param opts            - SDK connection options.
 */
export async function buildTransaction(
  sourcePublicKey: string,
  operation: xdr.Operation,
  opts: SdkOptions
): Promise<string> {
  const server = new SorobanRpc.Server(opts.rpcUrl, { allowHttp: false });
  const account = await server.getAccount(sourcePublicKey);

  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: opts.networkPassphrase,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw parseSimulationError(simResult.error);
  }

  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();
  return preparedTx.toXDR();
}

// ---------------------------------------------------------------------------
// Signing and submission
// ---------------------------------------------------------------------------

/**
 * Sign a transaction XDR with Freighter and submit it to the network.
 *
 * @param txXdr           - The base64 XDR of the prepared transaction.
 * @param opts            - SDK connection options.
 * @returns               The transaction hash on success.
 *
 * @example
 * const hash = await signAndSubmit(txXdr, opts);
 */
export async function signAndSubmit(
  txXdr: string,
  opts: SdkOptions
): Promise<string> {
  const freighter = await import("@stellar/freighter-api");

  const signedXdr = await freighter.signTransaction(txXdr, {
    networkPassphrase: opts.networkPassphrase,
  });

  const server = new SorobanRpc.Server(opts.rpcUrl, { allowHttp: false });
  const { Transaction } = await import("stellar-sdk");
  const signedTx = new Transaction(signedXdr, opts.networkPassphrase);
  const sendResult = await server.sendTransaction(signedTx);

  if (sendResult.status === "ERROR") {
    throw new Error(`Transaction failed: ${sendResult.errorResult}`);
  }

  // Poll for confirmation
  const hash = sendResult.hash;
  for (let i = 0; i < 30; i++) {
    await sleep(2000);
    const status = await server.getTransaction(hash);
    if (status.status === SorobanRpc.Api.GetTransactionStatus.SUCCESS) {
      return hash;
    }
    if (status.status === SorobanRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`Transaction reverted: ${hash}`);
    }
  }

  throw new Error(`Transaction not confirmed after 60 seconds: ${hash}`);
}

// ---------------------------------------------------------------------------
// Error parsing
// ---------------------------------------------------------------------------

/**
 * Parse a raw Soroban error string or XDR result into a `VaultError`
 * (if recognisable) or a plain `Error`.
 *
 * @example
 * try {
 *   await someContractCall();
 * } catch (err) {
 *   const parsed = parseError(err);
 *   if (parsed instanceof VaultError) {
 *     console.error("Contract error:", VaultErrorCode[parsed.code]);
 *   }
 * }
 */
export function parseError(err: unknown): VaultError | Error {
  if (err instanceof VaultError) return err;

  const message = err instanceof Error ? err.message : String(err);

  // Soroban contract errors surface as "Error(Contract, X)" in simulations
  const match = message.match(/Error\(Contract,\s*(\d+)\)/);
  if (match) {
    const code = parseInt(match[1], 10) as VaultErrorCode;
    if (code in VaultErrorCode) {
      return new VaultError(code);
    }
  }

  return err instanceof Error ? err : new Error(message);
}

function parseSimulationError(errorMessage: string): Error {
  return parseError(new Error(errorMessage));
}

// ---------------------------------------------------------------------------
// Conversion helpers (ScVal ↔ JS)
// ---------------------------------------------------------------------------

/** Convert a JS string to a Soroban Address ScVal. */
export function addressToScVal(address: string): xdr.ScVal {
  return nativeToScVal(address, { type: "address" });
}

/** Convert a JS bigint to a Soroban i128 ScVal. */
export function i128ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

/** Convert a JS bigint to a Soroban u64 ScVal. */
export function u64ToScVal(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

/** Convert a JS number to a Soroban u32 ScVal. */
export function u32ToScVal(value: number): xdr.ScVal {
  return nativeToScVal(value, { type: "u32" });
}

/** Convert a JS string to a Soroban Symbol ScVal. */
export function symbolToScVal(value: string): xdr.ScVal {
  return xdr.ScVal.scvSymbol(value);
}

/** Decode a raw ScVal into a native JS value. */
export function decodeScVal(scVal: xdr.ScVal): unknown {
  return scValToNative(scVal);
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Build an instance of the Stellar `Contract` class from SDK options.
 * @internal
 */
export function getContract(opts: SdkOptions): Contract {
  return new Contract(opts.contractId);
}
