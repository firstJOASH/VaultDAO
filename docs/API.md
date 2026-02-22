# VaultDAO SDK — API Reference

Complete reference for the `@vaultdao/sdk` TypeScript package.

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Contract Functions](#contract-functions)
- [Types](#types)
- [Error Codes](#error-codes)
- [Events](#events)
- [Integration Guide](#integration-guide)

---

## Installation

```bash
npm install @vaultdao/sdk
```

**Peer dependency for browser (signing):** [Freighter](https://www.freighter.app/) browser extension.

---

## Quick Start

```ts
import {
  buildOptions,
  connectWallet,
  proposeTransfer,
  signAndSubmit,
} from "@vaultdao/sdk";

const opts = buildOptions("testnet", "CXXXXXXX...");
const wallet = await connectWallet();
const txXdr = await proposeTransfer(
  wallet.publicKey,
  "GDEST...",
  "CDLZFC3...",
  BigInt(1e7),
  "memo",
  opts,
);
const hash = await signAndSubmit(txXdr, opts);
```

---

## Authentication

### `connectWallet(): Promise<WalletConnection>`

Connects to the Freighter browser extension. Throws if Freighter is not installed.

```ts
const wallet = await connectWallet();
// { publicKey: "GABC...", network: "TESTNET", networkUrl: "https://..." }
```

### `buildOptions(network, contractId): SdkOptions`

Creates the options object required by every SDK function.

| Parameter    | Type      | Description                             |
| ------------ | --------- | --------------------------------------- |
| `network`    | `Network` | `"testnet"`, `"mainnet"`, `"futurenet"` |
| `contractId` | `string`  | Deployed contract Strkey (`Cxxx...`)    |

---

## Contract Functions

All write functions return a **prepared transaction XDR string**. Pass this to `signAndSubmit()` to broadcast.

### `initialize(adminPublicKey, config, opts)`

Initialise the vault. **Can only be called once.**

| Parameter        | Type         | Description                              |
| ---------------- | ------------ | ---------------------------------------- |
| `adminPublicKey` | `string`     | Admin's Stellar address                  |
| `config`         | `InitConfig` | Full configuration (see [Types](#types)) |
| `opts`           | `SdkOptions` | Connection options                       |

**Errors:** `AlreadyInitialized`, `NoSigners`, `ThresholdTooLow`, `ThresholdTooHigh`, `InvalidAmount`

```ts
const txXdr = await initialize(
  adminPublicKey,
  {
    signers: [admin, signer1, signer2],
    threshold: 2,
    spendingLimit: BigInt(1000e7),
    dailyLimit: BigInt(5000e7),
    weeklyLimit: BigInt(10000e7),
    timelockThreshold: BigInt(500e7),
    timelockDelay: BigInt(17280), // ~1 day
  },
  opts,
);
const hash = await signAndSubmit(txXdr, opts);
```

---

### `proposeTransfer(proposerPublicKey, recipient, tokenAddress, amount, memo, opts)`

Create a new transfer proposal. Proposer must have `Treasurer` or `Admin` role.

| Parameter           | Type         | Description                          |
| ------------------- | ------------ | ------------------------------------ |
| `proposerPublicKey` | `string`     | Proposer's address                   |
| `recipient`         | `string`     | Destination Stellar address          |
| `tokenAddress`      | `string`     | Contract ID of the token to transfer |
| `amount`            | `bigint`     | Amount in stroops (smallest unit)    |
| `memo`              | `string`     | Short memo, ≤ 32 chars, no spaces    |
| `opts`              | `SdkOptions` | Connection options                   |

**Returns:** `string` — prepared transaction XDR

**Errors:** `InsufficientRole`, `InvalidAmount`, `ExceedsProposalLimit`, `ExceedsDailyLimit`, `ExceedsWeeklyLimit`

---

### `approveProposal(signerPublicKey, proposalId, opts)`

Cast an approval vote. The proposal transitions to `Approved` once the threshold is reached.

| Parameter         | Type         | Description        |
| ----------------- | ------------ | ------------------ |
| `signerPublicKey` | `string`     | Signer's address   |
| `proposalId`      | `bigint`     | Target proposal ID |
| `opts`            | `SdkOptions` | Connection options |

**Errors:** `NotASigner`, `InsufficientRole`, `ProposalNotPending`, `AlreadyApproved`, `ProposalExpired`

---

### `executeProposal(executorPublicKey, proposalId, opts)`

Execute an `Approved` proposal, transferring funds to the recipient.

| Parameter           | Type         | Description        |
| ------------------- | ------------ | ------------------ |
| `executorPublicKey` | `string`     | Executor's address |
| `proposalId`        | `bigint`     | Target proposal ID |
| `opts`              | `SdkOptions` | Connection options |

**Errors:** `ProposalNotApproved`, `ProposalAlreadyExecuted`, `TimelockNotExpired`, `InsufficientBalance`, `ProposalExpired`

> **Note:** If `unlockLedger > 0`, wait until the current ledger sequence exceeds it before calling.

---

### `rejectProposal(rejectorPublicKey, proposalId, opts)`

Cancel a `Pending` proposal. Only the original proposer or an Admin may reject.

**Errors:** `Unauthorized`, `ProposalNotPending`

---

### `setRole(adminPublicKey, targetAddress, role, opts)`

Assign a `Role` to any address. Only `Admin` can call this.

| Parameter        | Type     | Description                                   |
| ---------------- | -------- | --------------------------------------------- |
| `adminPublicKey` | `string` | Admin's address                               |
| `targetAddress`  | `string` | Address to assign the role to                 |
| `role`           | `Role`   | `Role.Member`, `Role.Treasurer`, `Role.Admin` |

**Errors:** `Unauthorized`

---

### `addSigner(adminPublicKey, newSignerAddress, opts)`

Add a new address to the signers list. Only `Admin`.

**Errors:** `Unauthorized`, `SignerAlreadyExists`

---

### `removeSigner(adminPublicKey, signerAddress, opts)`

Remove a signer. Fails if removal would make the threshold unreachable.

**Errors:** `Unauthorized`, `SignerNotFound`, `CannotRemoveSigner`

---

### `updateLimits(adminPublicKey, spendingLimit, dailyLimit, opts)`

Update per-proposal and daily spending limits. Only `Admin`.

**Errors:** `Unauthorized`, `InvalidAmount`

---

### `updateThreshold(adminPublicKey, threshold, opts)`

Change the M-of-N approval threshold. Must satisfy `1 ≤ threshold ≤ signers.length`.

**Errors:** `Unauthorized`, `ThresholdTooLow`, `ThresholdTooHigh`

---

### `schedulePayment(proposerPublicKey, recipient, tokenAddress, amount, memo, intervalLedgers, opts)`

Schedule a recurring automatic payment. Minimum interval is 720 ledgers (~1 hour).

| Parameter         | Type     | Description                                 |
| ----------------- | -------- | ------------------------------------------- |
| `intervalLedgers` | `bigint` | Cadence in ledgers (720 min; 17280 ≈ 1 day) |

**Errors:** `InsufficientRole`, `InvalidAmount`, `IntervalTooShort`

---

### `executeRecurringPayment(callerPublicKey, paymentId, opts)`

Execute a due recurring payment. Anyone (keeper bot) can call this.

**Errors:** `TimelockNotExpired` (not yet due), `ExceedsDailyLimit`, `InsufficientBalance`

---

### View Functions (read-only, no signature required)

| Function                             | Description                | Returns    |
| ------------------------------------ | -------------------------- | ---------- |
| `getProposal(id, callerKey, opts)`   | Fetch proposal by ID       | `Proposal` |
| `getRole(address, callerKey, opts)`  | Get role for address       | `Role`     |
| `getTodaySpent(callerKey, opts)`     | Today's aggregate spending | `bigint`   |
| `isSigner(address, callerKey, opts)` | Is address a signer?       | `boolean`  |

---

## Types

### `InitConfig`

```ts
interface InitConfig {
  signers: string[]; // List of signer addresses
  threshold: number; // M in M-of-N
  spendingLimit: bigint; // Max per proposal (stroops)
  dailyLimit: bigint; // Max daily aggregate (stroops)
  weeklyLimit: bigint; // Max weekly aggregate (stroops)
  timelockThreshold: bigint; // Amount triggering timelock (stroops)
  timelockDelay: bigint; // Timelock duration in ledgers
}
```

### `Proposal`

```ts
interface Proposal {
  id: bigint;
  proposer: string;
  recipient: string;
  token: string;
  amount: bigint;
  memo: string;
  approvals: string[];
  status: ProposalStatus;
  createdAt: bigint;
  expiresAt: bigint;
  unlockLedger: bigint; // 0 = no timelock
}
```

### `Role` enum

| Value            | Numeric | Permissions                   |
| ---------------- | ------- | ----------------------------- |
| `Role.Member`    | `0`     | Read-only                     |
| `Role.Treasurer` | `1`     | Propose and approve transfers |
| `Role.Admin`     | `2`     | Full control                  |

### `ProposalStatus` enum

| Value                     | Numeric | Meaning                            |
| ------------------------- | ------- | ---------------------------------- |
| `ProposalStatus.Pending`  | `0`     | Awaiting approvals                 |
| `ProposalStatus.Approved` | `1`     | Threshold met, ready to execute    |
| `ProposalStatus.Executed` | `2`     | Funds transferred                  |
| `ProposalStatus.Rejected` | `3`     | Cancelled                          |
| `ProposalStatus.Expired`  | `4`     | Expired without reaching threshold |

---

## Error Codes

All contract errors surface as `VaultError` instances with a `.code` property.

```ts
import { parseError, VaultError, VaultErrorCode } from "@vaultdao/sdk";

try {
  await proposeTransfer(/* ... */);
} catch (err) {
  const parsed = parseError(err);
  if (parsed instanceof VaultError) {
    console.error(parsed.code, VaultErrorCode[parsed.code]);
  }
}
```

| Code | Name                      | Description                           | How to handle                   |
| ---- | ------------------------- | ------------------------------------- | ------------------------------- |
| 100  | `AlreadyInitialized`      | Contract already set up               | Don't call `initialize()` twice |
| 101  | `NotInitialized`          | Contract not yet set up               | Call `initialize()` first       |
| 200  | `Unauthorized`            | Caller not authorised for this action | Check your role                 |
| 201  | `NotASigner`              | Address not in the signers list       | Add via `addSigner()`           |
| 202  | `InsufficientRole`        | Role too low for this action          | Elevate with `setRole()`        |
| 300  | `ProposalNotFound`        | Proposal ID doesn't exist             | Verify the ID                   |
| 301  | `ProposalNotPending`      | Proposal not in Pending state         | Check status first              |
| 302  | `AlreadyApproved`         | Signer already voted                  | Each signer votes once          |
| 303  | `ProposalExpired`         | Proposal lifetime exceeded (~7 days)  | Create a new proposal           |
| 304  | `ProposalNotApproved`     | Threshold not met                     | Wait for more approvals         |
| 305  | `ProposalAlreadyExecuted` | Proposal was already executed         | Nothing to do                   |
| 400  | `ExceedsProposalLimit`    | Amount > per-proposal limit           | Reduce amount or increase limit |
| 401  | `ExceedsDailyLimit`       | Daily cap would be exceeded           | Wait until next day             |
| 402  | `ExceedsWeeklyLimit`      | Weekly cap would be exceeded          | Wait until next week            |
| 403  | `InvalidAmount`           | Amount ≤ 0                            | Use a positive amount           |
| 404  | `TimelockNotExpired`      | Timelock still active                 | Wait until `unlockLedger`       |
| 405  | `IntervalTooShort`        | Recurring interval < 720 ledgers      | Use ≥ 720 ledgers               |
| 500  | `ThresholdTooLow`         | Threshold < 1                         | Use threshold ≥ 1               |
| 501  | `ThresholdTooHigh`        | Threshold > number of signers         | Add more signers                |
| 502  | `SignerAlreadyExists`     | Address already a signer              | No duplicate signers            |
| 503  | `SignerNotFound`          | Address not in signers list           | Check address                   |
| 504  | `CannotRemoveSigner`      | Removal would break threshold         | Reduce threshold first          |
| 505  | `NoSigners`               | Empty signers list                    | Provide at least one signer     |
| 600  | `TransferFailed`          | Token transfer failed                 | Check token contract            |
| 601  | `InsufficientBalance`     | Vault balance too low                 | Top up the vault                |

---

## Events

The contract emits the following Soroban events that can be indexed by horizon or a custom listener.

| Topic                              | Additional Data                        | Emitted by                             |
| ---------------------------------- | -------------------------------------- | -------------------------------------- |
| `initialized`                      | `(admin, threshold)`                   | `initialize()`                         |
| `proposal_created` + `proposalId`  | `(proposer, recipient, amount)`        | `proposeTransfer()`                    |
| `proposal_approved` + `proposalId` | `(approver, approvalCount, threshold)` | `approveProposal()`                    |
| `proposal_ready` + `proposalId`    | —                                      | `approveProposal()` (on threshold met) |
| `proposal_executed` + `proposalId` | `(executor, recipient, amount)`        | `executeProposal()`                    |
| `proposal_rejected` + `proposalId` | `rejector`                             | `rejectProposal()`                     |
| `role_assigned`                    | `(address, roleNumeric)`               | `setRole()`                            |
| `config_updated`                   | `updaterAddress`                       | `updateLimits()`, `updateThreshold()`  |
| `signer_added`                     | `(signer, totalSigners)`               | `addSigner()`                          |
| `signer_removed`                   | `(signer, totalSigners)`               | `removeSigner()`                       |

---

## Integration Guide

### React Application

```tsx
import {
  buildOptions,
  connectWallet,
  proposeTransfer,
  signAndSubmit,
  parseError,
  VaultError,
} from "@vaultdao/sdk";
import { useState } from "react";

const opts = buildOptions("testnet", import.meta.env.VITE_CONTRACT_ID);

export function ProposeButton({
  recipient,
  amount,
}: {
  recipient: string;
  amount: bigint;
}) {
  const [status, setStatus] = useState("");

  const handlePropose = async () => {
    try {
      const wallet = await connectWallet();
      const txXdr = await proposeTransfer(
        wallet.publicKey,
        recipient,
        TOKEN_ID,
        amount,
        "memo",
        opts,
      );
      const hash = await signAndSubmit(txXdr, opts);
      setStatus(`Proposal submitted: ${hash}`);
    } catch (err) {
      const parsed = parseError(err);
      setStatus(
        parsed instanceof VaultError
          ? `Error: ${parsed.message}`
          : "Unknown error",
      );
    }
  };

  return <button onClick={handlePropose}>Propose Transfer — {status}</button>;
}
```

### Node.js / Backend Keeper Bot

```ts
// keeper.ts — automatically execute due recurring payments
import {
  buildOptions,
  executeRecurringPayment,
  signAndSubmit,
} from "@vaultdao/sdk";
import { Keypair } from "stellar-sdk";

const opts = buildOptions("testnet", process.env.CONTRACT_ID!);
const keeper = Keypair.fromSecret(process.env.KEEPER_SECRET!);

async function runKeeper(paymentId: bigint) {
  // Build unsigned transaction
  const txXdr = await executeRecurringPayment(
    keeper.publicKey(),
    paymentId,
    opts,
  );
  // Sign locally (no Freighter in Node.js)
  const { Transaction } = await import("stellar-sdk");
  const tx = new Transaction(txXdr, opts.networkPassphrase);
  tx.sign(keeper);
  // Submit
  const { SorobanRpc } = await import("stellar-sdk");
  const server = new SorobanRpc.Server(opts.rpcUrl);
  await server.sendTransaction(tx);
}
```

### Common Patterns

**Poll for proposal approval:**

```ts
async function waitForApproval(
  proposalId: bigint,
  callerKey: string,
  opts: SdkOptions,
) {
  while (true) {
    const proposal = await getProposal(proposalId, callerKey, opts);
    if (proposal.status !== ProposalStatus.Pending) return proposal;
    await new Promise((r) => setTimeout(r, 5000)); // poll every 5 s
  }
}
```

**Check timelock before executing:**

```ts
import { SorobanRpc } from "stellar-sdk";

async function canExecute(
  proposalId: bigint,
  callerKey: string,
  opts: SdkOptions,
) {
  const proposal = await getProposal(proposalId, callerKey, opts);
  if (proposal.status !== ProposalStatus.Approved) return false;
  if (proposal.unlockLedger === BigInt(0)) return true;

  const server = new SorobanRpc.Server(opts.rpcUrl);
  const ledger = await server.getLatestLedger();
  return BigInt(ledger.sequence) >= proposal.unlockLedger;
}
```
