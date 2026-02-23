import { useState, useCallback } from 'react';
import {
    xdr,
    Address,
    Operation,
    TransactionBuilder,
    SorobanRpc,
    nativeToScVal,
    scValToNative
} from 'stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';
import { useWallet } from '../context/WalletContextProps';
import { parseError } from '../utils/errorParser';
import type { VaultActivity, GetVaultEventsResult, VaultEventType } from '../types/activity';
import type { TokenInfo } from '../constants/tokens';
import { 
    DEFAULT_TOKENS, 
    XLM_TOKEN, 
    getAllTrackedTokens, 
    addCustomToken as addCustomTokenToStorage,
    isValidStellarAddress
} from '../constants/tokens';

const CONTRACT_ID = "CDXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
const NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
const RPC_URL = "https://soroban-testnet.stellar.org";
const EVENTS_PAGE_SIZE = 20;

// Recurring Payment Types
export interface RecurringPayment {
    id: string;
    recipient: string;
    token: string;
    amount: string;
    memo: string;
    interval: number; // in seconds
    nextPaymentTime: number; // timestamp
    totalPayments: number;
    status: 'active' | 'paused' | 'cancelled';
    createdAt: number;
    creator: string;
}

export interface RecurringPaymentHistory {
    id: string;
    paymentId: string;
    executedAt: number;
    transactionHash: string;
    amount: string;
    success: boolean;
}

export interface CreateRecurringPaymentParams {
    recipient: string;
    token: string;
    amount: string;
    memo: string;
    interval: number; // in seconds
}

const server = new SorobanRpc.Server(RPC_URL);

interface StellarBalance {
    asset_type: string;
    balance: string;
    asset_code?: string;
    asset_issuer?: string;
}

/** Known contract event names (topic[0] symbol) */
const EVENT_SYMBOLS: VaultEventType[] = [
    'proposal_created', 'proposal_approved', 'proposal_ready', 'proposal_executed',
    'proposal_rejected', 'signer_added', 'signer_removed', 'config_updated', 'initialized', 'role_assigned'
];

function getEventTypeFromTopic(topic0Base64: string): VaultEventType {
    try {
        const scv = xdr.ScVal.fromXDR(topic0Base64, 'base64');
        const native = scValToNative(scv);
        if (typeof native === 'string' && EVENT_SYMBOLS.includes(native as VaultEventType)) {
            return native as VaultEventType;
        }
        return 'unknown';
    } catch {
        return 'unknown';
    }
}

function addressToNative(addrScVal: unknown): string {
    if (typeof addrScVal === 'string') return addrScVal;
    if (addrScVal != null && typeof addrScVal === 'object') {
        const o = addrScVal as Record<string, unknown>;
        if (typeof o.address === 'function') return (o.address as () => string)();
        if (typeof o.address === 'string') return o.address;
    }
    return String(addrScVal ?? '');
}

function parseEventValue(valueXdrBase64: string, eventType: VaultEventType): { actor: string; details: Record<string, unknown> } {
    const details: Record<string, unknown> = {};
    let actor = '';
    try {
        const scv = xdr.ScVal.fromXDR(valueXdrBase64, 'base64');
        const native = scValToNative(scv);
        if (Array.isArray(native)) {
            const vec = native as unknown[];
            const first = vec[0];
            actor = addressToNative(first);
            if (eventType === 'proposal_created' && vec.length >= 3) {
                details.proposer = actor;
                details.recipient = addressToNative(vec[1]);
                details.amount = vec[2] != null ? String(vec[2]) : '';
            } else if (eventType === 'proposal_approved' && vec.length >= 3) {
                details.approval_count = vec[1];
                details.threshold = vec[2];
            } else if (eventType === 'proposal_executed' && vec.length >= 3) {
                details.recipient = addressToNative(vec[1]);
                details.amount = vec[2] != null ? String(vec[2]) : '';
            } else if ((eventType === 'signer_added' || eventType === 'signer_removed') && vec.length >= 2) {
                details.total_signers = vec[1];
            } else if (eventType === 'role_assigned' && vec.length >= 2) {
                details.role = vec[1];
            } else {
                details.raw = native;
            }
        } else {
            actor = addressToNative(native);
            if (native !== null && typeof native === 'object') {
                details.raw = native;
            }
        }
    } catch {
        details.parseError = true;
    }
    return { actor, details };
}

interface RawEvent {
    type: string;
    ledger: string;
    ledgerClosedAt?: string;
    contractId?: string;
    id: string;
    pagingToken?: string;
    inSuccessfulContractCall?: boolean;
    topic?: string[];
    value?: { xdr: string };
}

export const useVaultContract = () => {
    const { address, isConnected } = useWallet();
    const [loading, setLoading] = useState(false);

    const getDashboardStats = useCallback(async () => {
        try {
            const accountInfo = await server.getAccount(CONTRACT_ID) as unknown as { balances: StellarBalance[] };
            const nativeBalance = accountInfo.balances.find((b: StellarBalance) => b.asset_type === 'native');
            const balance = nativeBalance ? parseFloat(nativeBalance.balance).toLocaleString() : "0";

            return {
                totalBalance: balance,
                totalProposals: 24,
                pendingApprovals: 3,
                readyToExecute: 1,
                activeSigners: 5,
                threshold: "3/5"
            };
        } catch (e) {
            console.error("Failed to fetch dashboard stats:", e);
            return {
                totalBalance: "0",
                totalProposals: 0,
                pendingApprovals: 0,
                readyToExecute: 0,
                activeSigners: 0,
                threshold: "0/0"
            };
        }
    }, []);

    const proposeTransfer = async (recipient: string, token: string, amount: string, memo: string) => {
        if (!isConnected || !address) throw new Error("Wallet not connected");
        setLoading(true);
        try {
            const account = await server.getAccount(address);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "propose_transfer",
                            args: [
                                new Address(address).toScVal(),
                                new Address(recipient).toScVal(),
                                new Address(token).toScVal(),
                                nativeToScVal(BigInt(amount)),
                                xdr.ScVal.scvSymbol(memo),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
            const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
            const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
            return response.hash;
        } catch (e: unknown) {
            throw parseError(e);
        } finally {
            setLoading(false);
        }
    };

    const approveProposal = async (proposalId: number) => {
        if (!isConnected || !address) throw new Error("Wallet not connected");
        setLoading(true);
        try {
            const account = await server.getAccount(address);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "approve_proposal",
                            args: [
                                new Address(address).toScVal(),
                                nativeToScVal(BigInt(proposalId), { type: "u64" }),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
            const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
            const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
            return response.hash;
        } catch (e: unknown) {
            throw parseError(e);
        } finally {
            setLoading(false);
        }
    };

    const rejectProposal = async (proposalId: number) => {
        if (!isConnected || !address) throw new Error("Wallet not connected");
        setLoading(true);
        try {
            const account = await server.getAccount(address);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "reject_proposal",
                            args: [
                                new Address(address).toScVal(),
                                nativeToScVal(BigInt(proposalId), { type: "u64" }),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
            const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
            const response = await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
            return response.hash;
        } catch (e: unknown) {
            throw parseError(e);
        } finally {
            setLoading(false);
        }
    };

    const executeProposal = async (proposalId: number) => {
        if (!isConnected || !address) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        try {
            // 1. Get latest account data
            const account = await server.getAccount(address);

            // 2. Build Transaction
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "execute_proposal",
                            args: [
                                new Address(address).toScVal(),
                                nativeToScVal(BigInt(proposalId), { type: "u64" }),
                            ],
                        })
                    ),
                    auth: [],
                }))
                .build();

            // 3. Simulate Transaction
            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationError(simulation)) {
                throw new Error(`Simulation Failed: ${simulation.error}`);
            }

            // Assemble transaction with simulation data
            const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();

            // 4. Sign with Freighter
            const signedXdr = await signTransaction(preparedTx.toXDR(), {
                network: "TESTNET",
            });

            // 5. Submit Transaction
            const response = await server.sendTransaction(
                TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE)
            );

            if (response.status !== "PENDING") {
                throw new Error("Transaction submission failed");
            }

            return response.hash;

        } catch (e: unknown) {
            const parsed = parseError(e);
            throw parsed;
        } finally {
            setLoading(false);
        }
    };

    const getVaultEvents = async (
        cursor?: string,
        limit: number = EVENTS_PAGE_SIZE
    ): Promise<GetVaultEventsResult> => {
        try {
            const latestLedgerRes = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getLatestLedger' }),
            });
            const latestLedgerData = await latestLedgerRes.json();
            const latestLedger = latestLedgerData?.result?.sequence ?? '0';
            const startLedger = cursor ? undefined : Math.max(1, parseInt(latestLedger, 10) - 50000);

            const params: Record<string, unknown> = {
                filters: [{ type: 'contract', contractIds: [CONTRACT_ID] }],
                pagination: { limit: Math.min(limit, 200) },
            };
            if (!cursor) params.startLedger = String(startLedger);
            else params.pagination = { ...(params.pagination as object), cursor };

            const res = await fetch(RPC_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'getEvents', params }),
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error.message || 'getEvents failed');
            const events: RawEvent[] = data.result?.events ?? [];
            const resultCursor = data.result?.cursor;
            const hasMore = Boolean(resultCursor && events.length === limit);

            const activities: VaultActivity[] = events.map(ev => {
                const topic0 = ev.topic?.[0];
                const valueXdr = ev.value?.xdr;
                const eventType = topic0 ? getEventTypeFromTopic(topic0) : 'unknown';
                const { actor, details } = valueXdr ? parseEventValue(valueXdr, eventType) : { actor: '', details: {} };
                return {
                    id: ev.id,
                    type: eventType,
                    timestamp: ev.ledgerClosedAt || new Date().toISOString(),
                    ledger: ev.ledger,
                    actor,
                    details: { ...details, ledger: ev.ledger },
                    eventId: ev.id,
                    pagingToken: ev.pagingToken,
                };
            });

            return { activities, latestLedger: data.result?.latestLedger ?? latestLedger, cursor: resultCursor, hasMore };
        } catch (e) {
            console.error('getVaultEvents', e);
            return { activities: [], latestLedger: '0', hasMore: false };
        }
    };

    const getListMode = async (): Promise<string> => {
        try {
            const account = await server.getAccount(CONTRACT_ID);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "get_list_mode",
                            args: [],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
                const result = scValToNative(simulation.result.retval);
                const modes = ['Disabled', 'Whitelist', 'Blacklist'];
                return modes[result] || 'Disabled';
            }
            return 'Disabled';
        } catch (e) {
            console.error('getListMode error:', e);
            return 'Disabled';
        }
    };

    const setListMode = async (mode: string) => {
        if (!address) throw new Error("Wallet not connected");
        const modeMap: Record<string, number> = { 'Disabled': 0, 'Whitelist': 1, 'Blacklist': 2 };
        const modeValue = modeMap[mode] ?? 0;

        const account = await server.getAccount(address);
        const tx = new TransactionBuilder(account, { fee: "100" })
            .setNetworkPassphrase(NETWORK_PASSPHRASE)
            .setTimeout(30)
            .addOperation(Operation.invokeHostFunction({
                func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                    new xdr.InvokeContractArgs({
                        contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                        functionName: "set_list_mode",
                        args: [
                            new Address(address).toScVal(),
                            nativeToScVal(modeValue, { type: "u32" }),
                        ],
                    })
                ),
                auth: [],
            }))
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
        const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
        await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
    };

    const addToWhitelist = async (targetAddress: string) => {
        if (!address) throw new Error("Wallet not connected");
        const account = await server.getAccount(address);
        const tx = new TransactionBuilder(account, { fee: "100" })
            .setNetworkPassphrase(NETWORK_PASSPHRASE)
            .setTimeout(30)
            .addOperation(Operation.invokeHostFunction({
                func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                    new xdr.InvokeContractArgs({
                        contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                        functionName: "add_to_whitelist",
                        args: [
                            new Address(address).toScVal(),
                            new Address(targetAddress).toScVal(),
                        ],
                    })
                ),
                auth: [],
            }))
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
        const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
        await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
    };

    const removeFromWhitelist = async (targetAddress: string) => {
        if (!address) throw new Error("Wallet not connected");
        const account = await server.getAccount(address);
        const tx = new TransactionBuilder(account, { fee: "100" })
            .setNetworkPassphrase(NETWORK_PASSPHRASE)
            .setTimeout(30)
            .addOperation(Operation.invokeHostFunction({
                func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                    new xdr.InvokeContractArgs({
                        contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                        functionName: "remove_from_whitelist",
                        args: [
                            new Address(address).toScVal(),
                            new Address(targetAddress).toScVal(),
                        ],
                    })
                ),
                auth: [],
            }))
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
        const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
        await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
    };

    const addToBlacklist = async (targetAddress: string) => {
        if (!address) throw new Error("Wallet not connected");
        const account = await server.getAccount(address);
        const tx = new TransactionBuilder(account, { fee: "100" })
            .setNetworkPassphrase(NETWORK_PASSPHRASE)
            .setTimeout(30)
            .addOperation(Operation.invokeHostFunction({
                func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                    new xdr.InvokeContractArgs({
                        contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                        functionName: "add_to_blacklist",
                        args: [
                            new Address(address).toScVal(),
                            new Address(targetAddress).toScVal(),
                        ],
                    })
                ),
                auth: [],
            }))
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
        const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
        await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
    };

    const removeFromBlacklist = async (targetAddress: string) => {
        if (!address) throw new Error("Wallet not connected");
        const account = await server.getAccount(address);
        const tx = new TransactionBuilder(account, { fee: "100" })
            .setNetworkPassphrase(NETWORK_PASSPHRASE)
            .setTimeout(30)
            .addOperation(Operation.invokeHostFunction({
                func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                    new xdr.InvokeContractArgs({
                        contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                        functionName: "remove_from_blacklist",
                        args: [
                            new Address(address).toScVal(),
                            new Address(targetAddress).toScVal(),
                        ],
                    })
                ),
                auth: [],
            }))
            .build();

        const simulation = await server.simulateTransaction(tx);
        if (SorobanRpc.Api.isSimulationError(simulation)) throw new Error(`Simulation Failed: ${simulation.error}`);
        const preparedTx = SorobanRpc.assembleTransaction(tx, simulation).build();
        const signedXdr = await signTransaction(preparedTx.toXDR(), { network: "TESTNET" });
        await server.sendTransaction(TransactionBuilder.fromXDR(signedXdr as string, NETWORK_PASSPHRASE));
    };

    const isWhitelisted = async (targetAddress: string): Promise<boolean> => {
        try {
            const account = await server.getAccount(CONTRACT_ID);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "is_whitelisted",
                            args: [new Address(targetAddress).toScVal()],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
                return scValToNative(simulation.result.retval) === true;
            }
            return false;
        } catch (e) {
            console.error('isWhitelisted error:', e);
            return false;
        }
    };

    const isBlacklisted = async (targetAddress: string): Promise<boolean> => {
        try {
            const account = await server.getAccount(CONTRACT_ID);
            const tx = new TransactionBuilder(account, { fee: "100" })
                .setNetworkPassphrase(NETWORK_PASSPHRASE)
                .setTimeout(30)
                .addOperation(Operation.invokeHostFunction({
                    func: xdr.HostFunction.hostFunctionTypeInvokeContract(
                        new xdr.InvokeContractArgs({
                            contractAddress: Address.fromString(CONTRACT_ID).toScAddress(),
                            functionName: "is_blacklisted",
                            args: [new Address(targetAddress).toScVal()],
                        })
                    ),
                    auth: [],
                }))
                .build();

            const simulation = await server.simulateTransaction(tx);
            if (SorobanRpc.Api.isSimulationSuccess(simulation) && simulation.result) {
                return scValToNative(simulation.result.retval) === true;
            }
            return false;
        } catch (e) {
            console.error('isBlacklisted error:', e);
            return false;
        }
    };

    const getVaultBalance = useCallback(async () => {
        console.log('Getting vault balance');
        return Promise.resolve('1000000');
    }, []);

    const getRecurringPayments = useCallback(async () => {
        console.log('Getting recurring payments');
        return Promise.resolve([]);
    }, []);

    const getRecurringPaymentHistory = useCallback(async (id: unknown) => {
        console.log('Getting recurring payment history', id);
        return Promise.resolve([]);
    }, []);

    const schedulePayment = useCallback(async (data: unknown) => {
        console.log('Scheduling payment', data);
        return Promise.resolve();
    }, []);

    const executeRecurringPayment = useCallback(async (id: unknown) => {
        console.log('Executing recurring payment', id);
        return Promise.resolve();
    }, []);

    const cancelRecurringPayment = useCallback(async (id: unknown) => {
        console.log('Cancelling recurring payment', id);
        return Promise.resolve();
    }, []);

    const getProposalSignatures = useCallback(async (proposalId: number) => {
        console.log('Getting signatures for proposal:', proposalId);
        return Promise.resolve([
            { address: 'GABC...XYZ', name: 'Signer 1', signed: true, timestamp: new Date().toISOString() },
            { address: 'GDEF...UVW', name: 'Signer 2', signed: false, timestamp: undefined },
        ]);
    }, []);

    const remindSigner = useCallback(async (proposalId: number, signerAddress: string) => {
        console.log('Reminding signer:', signerAddress, 'for proposal:', proposalId);
        return Promise.resolve();
    }, []);

    const exportSignatures = useCallback(async (proposalId: number) => {
        console.log('Exporting signatures for proposal:', proposalId);
        return Promise.resolve();
    }, []);

    const getUserRole = useCallback(async () => {
        console.log('Getting user role');
        return Promise.resolve(2);
    }, []);

    const getAllRoles = useCallback(async () => {
        console.log('Getting all roles');
        return Promise.resolve([
            { address: 'GABC...XYZ', role: 2 },
            { address: 'GDEF...UVW', role: 1 },
        ]);
    }, []);

    const assignRole = useCallback(async (address: string, role: number) => {
        console.log('Assigning role:', role, 'to:', address);
        return Promise.resolve();
    }, []);

    const revokeRole = useCallback(async (address: string) => {
        console.log('Revoking role for:', address);
        return Promise.resolve();
    }, []);

    return {
        proposeTransfer,
        rejectProposal,
        executeProposal,
        getDashboardStats,
        getVaultEvents,
        loading,
        getListMode,
        setListMode,
        addToWhitelist,
        removeFromWhitelist,
        addToBlacklist,
        removeFromBlacklist,
        isWhitelisted,
        isBlacklisted,
        getVaultBalance,
        getRecurringPayments,
        getRecurringPaymentHistory,
        schedulePayment,
        executeRecurringPayment,
        cancelRecurringPayment,
        getProposalSignatures,
        remindSigner,
        exportSignatures,
        getUserRole,
        getAllRoles,
        assignRole,
        revokeRole,
    };
};
