# @vaultdao/sdk

Official TypeScript SDK for the VaultDAO Soroban smart contract on Stellar.

## Installation

```bash
npm install @vaultdao/sdk
```

> **Note:** The Freighter wallet browser extension is required for signing transactions. Install it at [freighter.app](https://www.freighter.app/).

## Quick Start

```ts
import {
  buildOptions,
  connectWallet,
  proposeTransfer,
  signAndSubmit,
} from "@vaultdao/sdk";

const opts = buildOptions("testnet", "CXXXXXXX...");

// 1. Connect Freighter wallet
const wallet = await connectWallet();

// 2. Build + sign + submit a proposal
const txXdr = await proposeTransfer(
  wallet.publicKey,
  "GDEST...", // recipient
  "CDLZFC3...", // XLM SAC token address
  BigInt(100_000_000), // 10 XLM in stroops
  "payroll_jan",
  opts,
);
const txHash = await signAndSubmit(txXdr, opts);
console.log("Proposal created:", txHash);
```

## API Reference

Full API documentation is in [docs/API.md](../docs/API.md).

## Examples

Ready-to-run examples are in the [`examples/`](./examples/) directory:

| File                                                    | Description                         |
| ------------------------------------------------------- | ----------------------------------- |
| [`propose-transfer.ts`](./examples/propose-transfer.ts) | Create a transfer proposal          |
| [`approve-proposal.ts`](./examples/approve-proposal.ts) | Approve a pending proposal          |
| [`execute-proposal.ts`](./examples/execute-proposal.ts) | Execute an approved proposal        |
| [`get-vault-info.ts`](./examples/get-vault-info.ts)     | Read vault state (no wallet needed) |

## Building the SDK

```bash
npm install
npm run build          # Compile TypeScript → dist/
```

> TypeScript bindings can also be generated directly from the compiled WASM:
>
> ```bash
> npm run bindings      # See package.json for the full stellar CLI command
> ```

## Error Handling

```ts
import { parseError, VaultError, VaultErrorCode } from "@vaultdao/sdk";

try {
  await someOperation();
} catch (err) {
  const parsed = parseError(err);
  if (parsed instanceof VaultError) {
    console.error(VaultErrorCode[parsed.code]); // e.g. "InsufficientRole"
  }
}
```

## License

MIT
