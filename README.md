# VaultDAO

<div align="center">
  <img src="https://img.shields.io/badge/Stellar-Soroban-purple" alt="Stellar Soroban" />
  <img src="https://img.shields.io/badge/Security-Rust-orange" alt="Rust" />
  <img src="https://img.shields.io/badge/Status-Testnet-green" alt="Status" />
  <img src="https://github.com/NovaGrids/VaultDAO/actions/workflows/test.yml/badge.svg?branch=main" alt="CI Status" />
</div>

**VaultDAO** is a Soroban-native treasury management dApp for high-value Stellar organizations. It brings the robust security of multi-signature wallets to the speed and efficiency of the Soroban smart contract platform.

Think of it as the **"Gnosis Safe of Stellar"** — built for DAOs, Enterprise Treasuries, and Investment Clubs.

---

## 🛡️ Features

| Feature                | Description                                                                                                  |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Multi-Signature**    | **M-of-N** signing logic enforced on-chain. Requires cryptographic proof from multiple treasurers.           |
| **RBAC**               | Granular **Role-Based Access Control** (Admin, Treasurer, Member) defining exact permissions.                |
| **Timelocks**          | Large transfers (> threshold) are **locked for 24 hours** before execution, allowing emergency cancellation. |
| **Spending Limits**    | Enforced **Daily** and **Weekly** allowances to prevent budget overruns or drainage.                         |
| **Recurring Payments** | Automate payroll and subscriptions with rigorous interval checks.                                            |

## 🔒 Security Architecture

VaultDAO handles treasury funds, so security is paramount. The contract leverages **Rust** for memory safety and **Soroban's** simplified host environment to minimize attack vectors.

### Storage Strategy

To optimize for ledger rent and data capabilities, we use a hybrid storage model:

- **Instance Storage**: Used for `Config` (Global Settings) and `Roles`. This data is "hot" and always available to every contract invocation.
- **Persistent Storage**: Used for `Proposals` and `RecurringPayments`. These records must persist until explicitly removed or expired.
  - _TTL_: Automatically extended on access.
- **Temporary Storage**: Used for **Daily/Weekly Spending Limits**.
  - _Why?_ These records are ephemeral. Once the time period (day/week) passes, the data can be safely evicted by the network, saving rent costs.

### Testing

- **100% Logic Coverage**: The multi-signature voting engine, timelock delays, and limit trackers are fully covered by unit tests in `src/test.rs`.
- **RBAC Verification**: Every sensitive function invokes `require_auth()` and checks the caller's role against the stored registry.

See [docs/TESTING.md](docs/TESTING.md) for the full testing guide.

---

## 🏗️ Architecture & Structure

VaultDAO is designed for scale and security.

- **Smart Contracts**: Built with Rust/Soroban using a hybrid storage model (Instance, Persistent, Temporary) to optimize for ledger rent.
- **Frontend**: A premium React dashboard integrated with the Freighter wallet.

See [ARCHITECTURE.md](docs/ARCHITECTURE.md) for a deep dive into the system design and [STRUCTURE.md](docs/STRUCTURE.md) for folder organization.

---

## 🚀 Getting Started

### Prerequisites

- **Rust (1.70+)** & **WASM Target**: `rustup target add wasm32-unknown-unknown`
- **Node.js (18+)**
- **Stellar CLI**: `cargo install --locked stellar-cli`
- **Freighter Wallet**: [Browser Extension](https://www.freighter.app/)

### 1. Smart Contract

Ensure you have Rust and the wasm32 target installed.

```bash
# Clone the repository
git clone https://github.com/NovaGrids/VaultDAO.git
cd vaultdao

# Build the contract
cargo build --target wasm32-unknown-unknown --release

# Run Tests
cargo test
```

### 2. Frontend

Navigate to the frontend directory.

```bash
cd frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:5173` to view the dashboard.

For detailed setup and deployment instructions, see [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

### Run Tests

```bash
cd contracts/vault
cargo test
```

---

## 📦 SDK & Developer Integration

Integrate VaultDAO into your own application using the official TypeScript SDK.

```bash
npm install @vaultdao/sdk
```

- **API Reference**: [docs/API.md](docs/API.md)
- **SDK README**: [sdk/README.md](sdk/README.md)
- **Usage examples**: [`sdk/examples/`](sdk/examples/)
## 🧪 Testing

VaultDAO has a comprehensive test suite covering smart contract logic and (soon) frontend components.

```bash
# Smart contract tests
cd contracts/vault && cargo test

# Frontend tests (after setup)
cd frontend && npm test
```

Read the full guide: [docs/TESTING.md](docs/TESTING.md)

---

## 🌊 Stellar Drips Wave

We are actively participating in the **Stellar Community Drips Wave**. We welcome developers to help us build the future of Stellar treasury management!

- Browse [Wave Issues](docs/WAVE_ISSUES.md) for tasks.
- Read [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

## 🛡️ Security & Conduct

- **Security**: Please read our [SECURITY.md](docs/SECURITY.md) for our vulnerability disclosure policy.
- **Conduct**: We follow the [Contributor Covenant](CODE_OF_CONDUCT.md).

## 📄 License

VaultDAO is licensed under the **AGPL-3.0 License**. See the [LICENSE](LICENSE) file for details.
