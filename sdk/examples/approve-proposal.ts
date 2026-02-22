/**
 * Example: Approve a Proposal
 *
 * Shows how a signer (Treasurer or Admin) casts their approval vote
 * on an existing pending proposal.
 *
 * Prerequisites:
 *   - Freighter wallet installed and connected to Testnet
 *   - Caller is a registered signer with Treasurer or Admin role
 *   - npm install @vaultdao/sdk
 */

import {
  buildOptions,
  connectWallet,
  approveProposal,
  getProposal,
  signAndSubmit,
  parseError,
  VaultError,
  VaultErrorCode,
  ProposalStatus,
} from "../src/index";

const CONTRACT_ID = "CXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const PROPOSAL_ID = BigInt(1); // Replace with the target proposal ID

async function main() {
  // 1. Connect wallet
  const wallet = await connectWallet();
  console.log(`Connected: ${wallet.publicKey}`);

  const opts = buildOptions("testnet", CONTRACT_ID);

  // 2. Read proposal state before approving
  console.log(`Fetching proposal #${PROPOSAL_ID}...`);
  const proposal = await getProposal(PROPOSAL_ID, wallet.publicKey, opts);

  if (proposal.status !== ProposalStatus.Pending) {
    console.error(
      `Proposal is not pending (status: ${ProposalStatus[proposal.status]})`
    );
    process.exit(1);
  }

  console.log(`Proposal details:`);
  console.log(`  Recipient : ${proposal.recipient}`);
  console.log(`  Amount    : ${proposal.amount} stroops`);
  console.log(`  Approvals : ${proposal.approvals.length}`);
  console.log(`  Expires   : ledger ${proposal.expiresAt}`);

  if (proposal.approvals.includes(wallet.publicKey)) {
    console.error("You have already approved this proposal.");
    process.exit(1);
  }

  try {
    // 3. Build and submit approval
    console.log("Building approval transaction...");
    const txXdr = await approveProposal(wallet.publicKey, PROPOSAL_ID, opts);

    console.log("Requesting Freighter signature...");
    const txHash = await signAndSubmit(txXdr, opts);

    console.log(`✅ Approval submitted!`);
    console.log(`   Transaction hash: ${txHash}`);
  } catch (err) {
    const parsed = parseError(err);
    if (parsed instanceof VaultError) {
      console.error(`❌ Contract error (${parsed.code}): ${VaultErrorCode[parsed.code]}`);
    } else {
      console.error("❌ Unexpected error:", parsed.message);
    }
    process.exit(1);
  }
}

main();
