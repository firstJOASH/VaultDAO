import React, { useEffect, useState } from 'react';
import StatCard from '../../components/Layout/StatCard';
import { useVaultContract } from '../../hooks/useVaultContract';
import { LayoutDashboard, FileText, CheckCircle, Wallet, Loader2 } from 'lucide-react';

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

    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            try {
                const s = await getDashboardStats();
                if (isMounted) {
                    setStats(s as DashboardStats);
                }
            } catch (err) {
                console.error("Failed to fetch dashboard data", err);
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [getDashboardStats]);

    if (loading && !stats) {
        return (
            <div className="h-96 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-purple-500 animate-spin" />
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
                    subtitle={`Threshold: ${stats?.threshold || "0/0"}`} 
                    icon={LayoutDashboard} 
                    variant="primary" 
                />
            </div>
        </div>
    );
};

export default Overview;