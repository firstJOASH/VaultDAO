import React, { useState, useEffect } from 'react';
import { useWallet } from '../../context/WalletContext';
import { useToast } from '../../context/ToastContext';
import { useVaultContract } from '../../hooks/useVaultContract';
import ConfirmationModal from '../../components/ConfirmationModal';
import ProposalDetailModal from '../../components/ProposalDetailModal';
import { ArrowUpRight, Clock, Plus } from 'lucide-react';

// Ledger cadence: ~5 seconds per ledger on Stellar
const SECONDS_PER_LEDGER = 5;

interface Proposal {
    id: number;
    proposer: string;
    recipient: string;
    amount: string;
    token: string;
    memo: string;
    status: ProposalStatus;
    approvals: number;
    threshold: number;
    createdAt: string;
    /** Unlock ledger for timelocked proposals (0 = no timelock). */
    unlockLedger?: number;
    /** Current network ledger sequence for timelock calculation. */
    currentLedger?: number;
}

const mockProposals: Proposal[] = [
    {
        id: 102,
        proposer: 'GA5W...7K9L',
        recipient: 'GD26L4...Z3X4',
        amount: '2,500',
        token: 'XLM',
        memo: 'Quarterly server maintenance costs',
        status: 'Pending',
        approvals: 1,
        threshold: 3,
        createdAt: '2h ago',
    },
    {
        id: 101,
        proposer: 'GB2R...4M1P',
        recipient: 'GCEYUX...R7T2',
        amount: '12,000',
        token: 'XLM',
        memo: 'Marketing grant for ecosystem growth',
        status: 'Executed',
        approvals: 3,
        threshold: 3,
        createdAt: '2024-02-14',
        // No timelock — can be executed immediately
        unlockLedger: 0,
        currentLedger: 1000,
    },
    {
        id: 3,
        proposer: 'GABC...XYZ1',
        recipient: 'GKLM...GHI4',
        amount: '5000',
        token: 'XLM',
        memo: 'Q1 payroll',
        status: 'Approved',
        approvals: 3,
        threshold: 3,
        createdAt: '2024-02-13',
        // Still timelocked — unlocks at ledger 1500, currently at 1200
        unlockLedger: 1500,
        currentLedger: 1200,
    },
];

// ---------------------------------------------------------------------------
// TimelockCountdown helper component
// ---------------------------------------------------------------------------

interface TimelockCountdownProps {
    ledgersRemaining: number;
}

const TimelockCountdown: React.FC<TimelockCountdownProps> = ({ ledgersRemaining }) => {
    const totalSeconds = ledgersRemaining * SECONDS_PER_LEDGER;
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);

    useEffect(() => {
        if (secondsLeft <= 0) return;
        const interval = setInterval(() => setSecondsLeft(s => Math.max(0, s - 60)), 60_000);
        return () => clearInterval(interval);
    }, [secondsLeft]);

    const hours = Math.floor(secondsLeft / 3600);
    const minutes = Math.floor((secondsLeft % 3600) / 60);

    const label =
        hours > 0
            ? `Unlocks in ${hours}h ${minutes}m`
            : minutes > 0
            ? `Unlocks in ${minutes}m`
            : 'Unlocking soon…';

    return (
        <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium">
            <svg
                className="w-3.5 h-3.5 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            {label}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const Proposals: React.FC = () => {
    const { address, isConnected } = useWallet();
    const { notify } = useToast();
    const { rejectProposal, executeProposal, loading } = useVaultContract();
    const [proposals, setProposals] = useState<Proposal[]>(mockProposals);
    const [selectedProposal, setSelectedProposal] = useState<Proposal | null>(null);
    const [showRejectModal, setShowRejectModal] = useState(false);
    const [executingId, setExecutingId] = useState<number | null>(null);
    const [rejectingId, setRejectingId] = useState<number | null>(null);

    const userRole = 'Admin'; 

    // ---------------------------------------------------------------------------
    // Timelock helpers
    // ---------------------------------------------------------------------------

    const getLedgersRemaining = (proposal: Proposal): number => {
        if (!proposal.unlockLedger || proposal.unlockLedger === 0) return 0;
        const current = proposal.currentLedger ?? 0;
        return Math.max(0, proposal.unlockLedger - current);
    };

    const isTimelockExpired = (proposal: Proposal): boolean =>
        getLedgersRemaining(proposal) === 0;

    const canExecuteProposal = (proposal: Proposal): boolean =>
        proposal.status === 'Approved' &&
        proposal.approvals >= proposal.threshold &&
        isTimelockExpired(proposal);

    // ---------------------------------------------------------------------------
    // Reject handlers
    // ---------------------------------------------------------------------------

    const canRejectProposal = (proposal: Proposal): boolean => {
        if (!isConnected || !address) return true; // demo mode
        return proposal.proposer === address || userRole === 'Admin';
    };

    const handleRejectClick = (e: React.MouseEvent, proposalId: number) => {
        e.stopPropagation(); 
        setRejectingId(proposalId);
        setShowRejectModal(true);
    };

    const handleRejectConfirm = async (reason?: string) => {
        if (rejectingId === null) return;
        try {
            // Passing reason to contract or logging it to satisfy TS unused variable check
            console.log(`Rejecting proposal ${rejectingId} for reason: ${reason || 'No reason provided'}`);
            await rejectProposal(rejectingId);
            
            setProposals(prev =>
                prev.map(p =>
                    p.id === rejectingId ? { ...p, status: 'Rejected' as const } : p
                )
            );

            notify('proposal_rejected', `Proposal #${rejectingId} rejected successfully`, 'success');
            } catch (error: unknown) {
                const message = error instanceof Error ? error.message : 'Failed to reject proposal';

            notify('proposal_rejected', message, 'error'); 
        } finally {
            setShowRejectModal(false);
            setRejectingId(null);
        }
    };

        const handleRejectCancel = () => {
        setShowRejectModal(false);
        setRejectingId(null);
    };

    // ---------------------------------------------------------------------------
    // Execute handler
    // ---------------------------------------------------------------------------

    const handleExecuteClick = async (e: React.MouseEvent, proposalId: number) => {
        e.stopPropagation();
        setExecutingId(proposalId);
        try {
            const txHash = await executeProposal(proposalId);
            setProposals(prev =>
                prev.map(p =>
                    p.id === proposalId ? { ...p, status: 'Executed' as const } : p
                )
            );
            notify(
                'proposal_executed' as never,
                `Proposal #${proposalId} executed — funds transferred successfully`,
                'success'
            );
            console.log('Execution tx hash:', txHash);
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Failed to execute proposal';
            notify('proposal_executed' as never, message, 'error');
        } finally {
            setExecutingId(null);
        }
    };

    // ---------------------------------------------------------------------------
    // Styling helpers
    // ---------------------------------------------------------------------------

    const getStatusColor = (status: Proposal['status']) => {
        switch (status) {
            case 'Pending':  return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
            case 'Approved': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'Executed': return 'bg-green-500/10 text-green-400 border-green-500/20';
            case 'Rejected': return 'bg-red-500/10 text-red-400 border-red-500/20';
            case 'Expired':  return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
            default:         return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
        }
    };

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------


    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white tracking-tight">Proposals</h2>
                <button className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-500/20">
                    <Plus size={20} />
                    <span>New Proposal</span>
                </button>
            </div>

                        <div className="space-y-4">
                {proposals.length === 0 ? (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center text-gray-400">
                        <p>No proposals found.</p>
                    </div>
                ) : (
                    proposals.map((proposal) => {
                        const ledgersLeft = getLedgersRemaining(proposal);
                        const timelocked = ledgersLeft > 0;
                        const isExecuting = executingId === proposal.id && loading;

                        return (
                            <div
                                key={proposal.id}
                                onClick={() => setSelectedProposal(proposal)}
                                className="bg-gray-800/50 rounded-2xl border border-gray-700 hover:border-purple-500/50 cursor-pointer transition-all hover:scale-[1.01] p-4 sm:p-6 group"
                            >
                                <div className="space-y-4">
                                    {/* Header Row */}
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex items-center gap-4">
                                            <div className="p-3 bg-gray-900 rounded-xl text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                                                <ArrowUpRight size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-semibold text-white">
                                                    Proposal #{proposal.id}
                                                </h3>
                                                <p className="text-sm text-gray-400 mt-1">{proposal.memo}</p>
                                            </div>
                                        </div>
                                        <span
                                            className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(proposal.status)}`}
                                        >
                                            {proposal.status}
                                        </span>
                                    </div>

                                    {/* Details Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <span className="text-gray-400">Amount:</span>
                                            <span className="text-white ml-2 font-medium">
                                                {proposal.amount} {proposal.token}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Approvals:</span>
                                            <span className="text-white ml-2 font-medium">
                                                {proposal.approvals}/{proposal.threshold}
                                            </span>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <span className="text-gray-400">Recipient:</span>
                                            <span className="text-white ml-2 font-mono text-xs">
                                                {proposal.recipient}
                                            </span>
                                        </div>
                                        <div className="sm:col-span-2">
                                            <span className="text-gray-400">Proposer:</span>
                                            <span className="text-white ml-2 font-mono text-xs">
                                                {proposal.proposer}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-gray-400">Created:</span>
                                            <span className="text-white ml-2 flex items-center gap-1">
                                                <Clock size={12} /> {proposal.createdAt}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Timelock countdown */}
                                    {proposal.status === 'Approved' && timelocked && (
                                        <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
                                            <TimelockCountdown ledgersRemaining={ledgersLeft} />
                                            <span className="text-xs text-gray-400">
                                                (~{ledgersLeft.toLocaleString()} ledgers remaining)
                                            </span>
                                        </div>
                                    )}

                                    {/* Actions */}
                                    {proposal.status === 'Pending' && (
                                        <div className="flex flex-col sm:flex-row gap-3 pt-2">
                                            <button className="flex-1 sm:flex-none bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0">
                                                Approve
                                            </button>
                                            {canRejectProposal(proposal) && (
                                                <button
                                                    onClick={(e) => handleRejectClick(e, proposal.id)}
                                                    disabled={loading}
                                                    className="flex-1 sm:flex-none bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] sm:min-h-0"
                                                >
                                                    {loading && rejectingId === proposal.id ? '...' : 'Reject'}
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {proposal.status === 'Approved' && (
                                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-2">
                                            <button
                                                onClick={(e) => handleExecuteClick(e, proposal.id)}
                                                disabled={!canExecuteProposal(proposal) || isExecuting}
                                                title={
                                                    timelocked
                                                        ? `Timelocked — wait ${ledgersLeft} more ledgers`
                                                        : 'Execute this proposal to transfer funds'
                                                }
                                                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 sm:py-2 rounded-lg font-medium transition-colors min-h-[44px] sm:min-h-0"
                                            >
                                                {isExecuting ? (
                                                    <>
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                                                        </svg>
                                                        Executing…
                                                    </>
                                                ) : timelocked ? (
                                                    <>
                                                        <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                                        </svg>
                                                        Execute (Locked)
                                                    </>
                                                ) : (
                                                    'Execute'
                                                )}
                                            </button>
                                            {timelocked && (
                                                <p className="text-xs text-gray-400">
                                                    This proposal is timelocked for large transfers.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            <ProposalDetailModal 
                isOpen={!!selectedProposal} 
                onClose={() => setSelectedProposal(null)} 
                proposal={selectedProposal} 
            />

            <ConfirmationModal
                isOpen={showRejectModal}
                title="Reject Proposal"
                message="Are you sure you want to reject this? This action is permanent."
                onConfirm={handleRejectConfirm}
                onCancel={() => setShowRejectModal(false)}
                showReasonInput={true}
                isDestructive={true}
            />
        </div>
    );
};

export default Proposals;