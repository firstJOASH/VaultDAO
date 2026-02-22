/**
 * Example: Read Vault Information
 *
 * Demonstrates all read-only (view) functions available in the SDK.
 * No wallet required — uses any public key as simulation source.
 *
 * Prerequisites:
 *   - npm install @vaultdao/sdk
 *   - Replace CONTRACT_ID and VIEWER_PUBLIC_KEY below
 */

import {
  buildOptions,
  getProposal,
  getRole,
  getTodaySpent,
  isSigner,
  Role,
} from "../src/index";

const CONTRACT_ID   = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const VIEWER_KEY    = "GABC...XYZ"; // Any funded Stellar public key (used for simulation)
const QUERY_ADDRESS = "GXXX...YYY"; // Address to query role/signer status for

async function main() {
  const opts = buildOptions("testnet", CONTRACT_ID);

  // 1. Check if an address is a registered signer
  const isRegistered = await isSigner(QUERY_ADDRESS, VIEWER_KEY, opts);
  console.log(`Is ${QUERY_ADDRESS} a signer? ${isRegistered}`);

  // 2. Get role for an address
  const role = await getRole(QUERY_ADDRESS, VIEWER_KEY, opts);
  console.log(`Role: ${Role[role]} (${role})`);

  // 3. Get today's aggregate spending
  const spentToday = await getTodaySpent(VIEWER_KEY, opts);
  console.log(`Today's spending: ${spentToday} stroops (${Number(spentToday) / 1e7} XLM)`);

  // 4. Fetch a specific proposal
  const PROPOSAL_ID = BigInt(1);
  try {
    const proposal = await getProposal(PROPOSAL_ID, VIEWER_KEY, opts);
    console.log(`\nProposal #${PROPOSAL_ID}:`);
    console.log(`  Proposer  : ${proposal.proposer}`);
    console.log(`  Recipient : ${proposal.recipient}`);
    console.log(`  Amount    : ${proposal.amount} stroops`);
    console.log(`  Status    : ${proposal.status}`);
    console.log(`  Approvals : ${proposal.approvals.join(", ") || "none"}`);
    if (proposal.unlockLedger > BigInt(0)) {
      console.log(`  Unlock at : ledger ${proposal.unlockLedger}`);
    }
  } catch {
    console.log(`Proposal #${PROPOSAL_ID} not found.`);
  }
}

main();
