import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantConfig } from '../types';

interface ConfigContextType {
    config: TenantConfig | null;
    updateConfig: (newConfig: TenantConfig) => void;
    isInitialized: boolean;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<TenantConfig | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Persistence: Load from LocalStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('accounting_flow_config');
        if (saved) {
            try {
                setConfig(JSON.parse(saved));
                setIsInitialized(true);
            } catch (e) {
                console.error("Failed to parse config", e);
            }
        }
    }, []);

    const updateConfig = (newConfig: TenantConfig) => {
        setConfig(newConfig);
        localStorage.setItem('accounting_flow_config', JSON.stringify(newConfig));
        setIsInitialized(true);
    };

    return (
        <ConfigContext.Provider value={{ config, updateConfig, isInitialized }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
