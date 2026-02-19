import React, { createContext, useContext, useState, useEffect } from 'react';
import { TenantConfig, TenantInfo, SubscriptionLevel } from '../types';

interface ConfigContextType {
    config: TenantConfig | null;
    tenantInfo: TenantInfo | null;
    updateConfig: (newConfig: TenantConfig) => void;
    updateTenantInfo: (newInfo: TenantInfo) => void;
    checkPermission: (feature: 'NarrativeReport' | 'AuditScenario' | 'AICall') => boolean;
    isInitialized: boolean;
    usageStatus: 'normal' | 'warning' | 'blocked';
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [config, setConfig] = useState<TenantConfig | null>(null);
    const [tenantInfo, setTenantInfo] = useState<TenantInfo | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Persistence: Load from LocalStorage on mount
    useEffect(() => {
        const savedConfig = localStorage.getItem('accounting_flow_config');
        const savedTenant = localStorage.getItem('accounting_flow_tenant');

        if (savedConfig) {
            try {
                setConfig(JSON.parse(savedConfig));
            } catch (e) { console.error("Failed to parse config", e); }
        }

        if (savedTenant) {
            try {
                setTenantInfo(JSON.parse(savedTenant));
            } catch (e) { console.error("Failed to parse tenant info", e); }
        } else {
            // Default Mock Tenant for Trial (Phase 6 MVP)
            const mockTenant: TenantInfo = {
                id: 'TNT-LOCAL-001',
                name: '(주) Insightrix-AI',
                plan: 'Professional',
                aiUsageLimit: 1000,
                aiUsageCurrent: 12,
                enforcedUntil: '2026-12-31'
            };
            setTenantInfo(mockTenant);
        }

        setIsInitialized(true);
    }, []);

    const updateConfig = (newConfig: TenantConfig) => {
        setConfig(newConfig);
        localStorage.setItem('accounting_flow_config', JSON.stringify(newConfig));
    };

    const updateTenantInfo = (newInfo: TenantInfo) => {
        setTenantInfo(newInfo);
        localStorage.setItem('accounting_flow_tenant', JSON.stringify(newInfo));
    };

    const usageStatus = React.useMemo(() => {
        if (!tenantInfo) return 'normal';
        const ratio = tenantInfo.aiUsageCurrent / tenantInfo.aiUsageLimit;
        if (ratio >= 1.0) return 'blocked';
        if (ratio >= 0.8) return 'warning';
        return 'normal';
    }, [tenantInfo]);

    const checkPermission = (feature: 'NarrativeReport' | 'AuditScenario' | 'AICall'): boolean => {
        if (!tenantInfo) return false;

        const plan = tenantInfo.plan;

        switch (feature) {
            case 'NarrativeReport':
                return plan === 'Standard' || plan === 'Professional';
            case 'AuditScenario':
                return plan !== 'Free';
            case 'AICall':
                // Soft Limit Logic: Allow viewing/rendering if it's based on existing data?
                // For now, pure AI "Calls" are blocked at 100%
                return usageStatus !== 'blocked';
            default:
                return false;
        }
    };

    return (
        <ConfigContext.Provider value={{
            config,
            tenantInfo,
            updateConfig,
            updateTenantInfo,
            checkPermission,
            isInitialized,
            usageStatus
        }}>
            {children}
        </ConfigContext.Provider>
    );
};

export const useConfig = () => {
    const context = useContext(ConfigContext);
    if (!context) throw new Error('useConfig must be used within a ConfigProvider');
    return context;
};
