/**
 * VaultDAO SDK — Public API
 *
 * Import everything you need from this single entry point.
 *
 * @example
 * import { proposeTransfer, signAndSubmit, buildOptions } from "@vaultdao/sdk";
 */

// Types
export type {
  InitConfig,
  VaultConfig,
  Proposal,
  RecurringPayment,
  SdkOptions,
  Network,
} from "./types";

// Enums & errors
export { Role, ProposalStatus, VaultErrorCode, VaultError } from "./types";

// Utility functions
export type { WalletConnection } from "./utils";
export {
  buildOptions,
  connectWallet,
  buildTransaction,
  signAndSubmit,
  parseError,
  NETWORK_PASSPHRASES,
  DEFAULT_RPC_URLS,
  // ScVal converters — useful for advanced use cases
  addressToScVal,
  i128ToScVal,
  u64ToScVal,
  u32ToScVal,
  symbolToScVal,
  decodeScVal,
} from "./utils";

// Contract bindings
export {
  // Initialization
  initialize,
  // Proposal lifecycle
  proposeTransfer,
  approveProposal,
  executeProposal,
  rejectProposal,
  // Admin
  setRole,
  addSigner,
  removeSigner,
  updateLimits,
  updateThreshold,
  // Recurring payments
  schedulePayment,
  executeRecurringPayment,
  // View / read-only
  getProposal,
  getRole,
  getTodaySpent,
  isSigner,
} from "./contract";
