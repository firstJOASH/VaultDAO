import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, FileText, CheckCircle, Wallet, Loader2 } from 'lucide-react';
import StatCard from '../../components/Layout/StatCard';
import { useVaultContract } from '../../hooks/useVaultContract';
import { getAllTemplates, getMostUsedTemplates } from '../../utils/templates';

interface DashboardStats {
    totalBalance: string;
    totalProposals: number;
    pendingApprovals: number;
    readyToExecute: number;
    activeSigners: number;
    threshold: string;
}

const Overview: React.FC = () => {
    const { getDashboardStats, loading } = useVaultContract();
    const [stats, setStats] = useState<DashboardStats | null>(null);

    const quickActionTemplates = (() => {
        const mostUsed = getMostUsedTemplates(3);
        if (mostUsed.length > 0) {
            return mostUsed;
        }
        return getAllTemplates().slice(0, 3);
    })();

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const result = await getDashboardStats();
                if (isMounted) {
                    setStats(result as DashboardStats);
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data', error);
            }
        };
        fetchData();
        return () => {
            isMounted = false;
        };
    }, [getDashboardStats]);

    if (loading && !stats) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-purple-500" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold text-white tracking-tight">Treasury Overview</h2>
                <div className="text-sm text-gray-400 flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg border border-gray-700">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span>Network: Testnet</span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Vault Balance"
                    value={`${stats?.totalBalance || '0'} XLM`}
                    icon={Wallet}
                    variant="primary"
                />
                <StatCard
                    title="Active Proposals"
                    value={stats?.totalProposals || 0}
                    subtitle={`${stats?.pendingApprovals || 0} pending vote`}
                    icon={FileText}
                    variant="warning"
                />
                <StatCard
                    title="Ready to Execute"
                    value={stats?.readyToExecute || 0}
                    subtitle="Passed timelock"
                    icon={CheckCircle}
                    variant="success"
                />
                <StatCard
                    title="Active Signers"
                    value={stats?.activeSigners || 0}
                    subtitle={`Threshold: ${stats?.threshold || '0/0'}`}
                    icon={LayoutDashboard}
                    variant="primary"
                />
            </div>

            <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">Quick Actions</h3>
                    <Link to="/dashboard/templates" className="text-sm text-purple-300 hover:text-purple-200">
                        Manage templates
                    </Link>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {quickActionTemplates.map((template) => (
                        <Link
                            key={template.id}
                            to={`/dashboard/proposals?template=${encodeURIComponent(template.id)}`}
                            className="min-h-[44px] rounded-lg border border-gray-600 bg-gray-900 p-3 text-left transition-colors hover:border-purple-500"
                        >
                            <p className="font-medium text-white">{template.name}</p>
                            <p className="text-sm text-gray-400">{template.category}</p>
                            <p className="text-xs text-gray-500">Used {template.usageCount} times</p>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Overview;