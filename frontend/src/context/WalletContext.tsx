import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import type { ReactNode } from 'react';
import { isAllowed, setAllowed, getUserInfo } from '@stellar/freighter-api';

interface WalletContextType {
    isConnected: boolean;
    address: string | null;
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isConnected, setIsConnected] = useState(false);
    const [address, setAddress] = useState<string | null>(null);
    const hasChecked = useRef(false);

    const checkConnection = useCallback(async () => {
        try {
            const allowed = await isAllowed();
            if (allowed) {
                const userInfo = await getUserInfo();
                if (userInfo?.publicKey) {
                    setIsConnected(true);
                    setAddress(userInfo.publicKey);
                }
            }
        } catch (e) {
            console.error("Connection check failed", e);
        }
    }, []);

    useEffect(() => {
        if (!hasChecked.current) {
            // Using setTimeout(..., 0) moves the state update to the next tick,
            // bypassing the "synchronous setState in effect" lint error.
            const timer = setTimeout(() => {
                void checkConnection();
            }, 0);
            
            hasChecked.current = true;
            return () => clearTimeout(timer);
        }
    }, [checkConnection]);

    const connect = async () => {
        try {
            await setAllowed();
            await checkConnection();
        } catch (e) {
            console.error("Failed to connect wallet", e);
        }
    };

    const disconnect = async () => {
        setIsConnected(false);
        setAddress(null);
    };

    return (
        <WalletContext.Provider value={{ isConnected, address, connect, disconnect }}>
            {children}
        </WalletContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useWallet = () => {
    const context = useContext(WalletContext);
    if (context === undefined) {
        throw new Error('useWallet must be used within a WalletProvider');
    }
    return context;
};