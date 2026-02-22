/**
 * Example: Propose a Token Transfer
 *
 * Demonstrates how to use the VaultDAO SDK to create a transfer proposal
 * from a Treasurer account using the Freighter browser wallet.
 *
 * Prerequisites:
 *   - Freighter wallet installed and connected to Testnet
 *   - Caller has Treasurer or Admin role in the vault
 *   - npm install @vaultdao/sdk
 */

import {
  buildOptions,
  connectWallet,
  proposeTransfer,
  signAndSubmit,
  parseError,
  VaultError,
  VaultErrorCode,
} from "../src/index";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const CONTRACT_ID = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"; // Replace with your deployed contract ID
const TOKEN_ADDRESS = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYC"; // XLM SAC on testnet
const RECIPIENT = "GDEST...XYZ"; // Replace with recipient address

async function main() {
  // 1. Connect wallet
  console.log("Connecting to Freighter wallet...");
  const wallet = await connectWallet();
  console.log(`Connected: ${wallet.publicKey} on ${wallet.network}`);

  const opts = buildOptions("testnet", CONTRACT_ID);

  try {
    // 2. Build the propose_transfer transaction
    console.log("Building propose_transfer transaction...");
    const txXdr = await proposeTransfer(
      wallet.publicKey, // Proposer (must be Treasurer or Admin)
      RECIPIENT,
      TOKEN_ADDRESS,
      BigInt(100_000_000), // 10 XLM in stroops
      "payroll_feb",       // Memo (≤ 32 chars, no spaces)
      opts
    );

    // 3. Sign with Freighter and submit
    console.log("Requesting signature from Freighter...");
    const txHash = await signAndSubmit(txXdr, opts);

    console.log(`✅ Proposal submitted successfully!`);
    console.log(`   Transaction hash: ${txHash}`);
    console.log(`   View on explorer: https://stellar.expert/explorer/testnet/tx/${txHash}`);
  } catch (err) {
    const parsed = parseError(err);
    if (parsed instanceof VaultError) {
      console.error(`❌ Contract error (${parsed.code}): ${VaultErrorCode[parsed.code]}`);

      // Handle specific errors
      switch (parsed.code) {
        case VaultErrorCode.InsufficientRole:
          console.error("   Your account does not have the Treasurer or Admin role.");
          break;
        case VaultErrorCode.ExceedsProposalLimit:
          console.error("   Amount exceeds the per-proposal spending limit.");
          break;
        case VaultErrorCode.ExceedsDailyLimit:
          console.error("   Amount would exceed the daily spending cap.");
          break;
        default:
          console.error("   See VaultErrorCode enum for details.");
      }
    } else {
      console.error("❌ Unexpected error:", parsed.message);
    }
    process.exit(1);
  }
}

main();
