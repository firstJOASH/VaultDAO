import React, { useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Settings, Wallet, Menu, X, BarChart3 } from 'lucide-react';
import { useWallet } from '../../context/WalletContext';

const DashboardLayout: React.FC = () => {
    const { isConnected, address, connect, disconnect } = useWallet();
    const location = useLocation();
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const shortenAddress = (addr: string) => {
        return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
    };

    const navItems = [
        { label: 'Overview', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Proposals', path: '/dashboard/proposals', icon: FileText },
        { label: 'Settings', path: '/dashboard/settings', icon: Settings },
    ];

    return (
        <div className="flex h-screen bg-gray-900 text-white">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside className={`fixed md:static inset-y-0 left-0 z-30 w-64 bg-gray-800 border-r border-gray-700 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}>
                <div className="p-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                        VaultDAO
                    </h1>
                    <button className="md:hidden" onClick={() => setIsSidebarOpen(false)}>
                        <X size={24} />
                    </button>
                </div>

                <nav className="mt-6 px-4 space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${isActive
                                        ? 'bg-purple-600 text-white'
                                        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                                    }`}
                                onClick={() => setIsSidebarOpen(false)}
                            >
                                <Icon size={20} className="mr-3" />
                                <span>{item.label}</span>
                            </Link>
                        );
                    })}
                </nav>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Header */}
                <header className="bg-gray-800 border-b border-gray-700 h-16 flex items-center justify-between px-6 shadow-md">
                    <button
                        className="md:hidden text-gray-400 hover:text-white"
                        onClick={() => setIsSidebarOpen(true)}
                    >
                        <Menu size={24} />
                    </button>

                    <div className="flex-1"></div>

                    <div className="flex items-center space-x-4">
                        {isConnected && address ? (
                            <div className="flex items-center space-x-3 bg-gray-700 px-4 py-2 rounded-full">
                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                <span className="text-sm font-medium">{shortenAddress(address)}</span>
                                <button
                                    onClick={disconnect}
                                    className="text-xs text-gray-400 hover:text-white"
                                >
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={connect}
                                className="flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
                            >
                                <Wallet size={18} className="mr-2" />
                                Connect Wallet
                            </button>
                        )}
                    </div>
                </header>

                {/* Page Content */}
                <main className="flex-1 overflow-y-auto p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;
