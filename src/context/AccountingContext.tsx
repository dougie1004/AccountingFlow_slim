import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { JournalEntry, Partner, Asset, TenantConfig, ParsedTransaction, MappingRule } from '../types';
import { getAccountCategory } from '../constants/accounts';
import { calculateFinancials } from '../core/accountingEngine';
import { generateComprehensiveMockData } from '../utils/mockDataGenerator';

export interface AccountingContextType {
    ledger: JournalEntry[];
    partners: Partner[];
    addEntry: (entry: JournalEntry) => void;
    addPartner: (partner: Partner) => void;
    updatePartner: (name: string, updates: Partial<Partner>) => void;
    financials: any; // Simplified for MVP
    approveEntry: (id: string) => void;
    bulkApprove: (ids: string[]) => void;
    addEntries: (entries: JournalEntry[]) => void;
    updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
    deleteEntry: (id: string) => void;
    assets: Asset[];
    addAsset: (asset: Asset) => void;
    updateAsset: (id: string, updates: Partial<Asset>) => void;
    clearAllData: () => void;
    loadDemoData: () => void;
    stagingTransactions: ParsedTransaction[];
    setStagingTransactions: React.Dispatch<React.SetStateAction<ParsedTransaction[]>>;
    config: TenantConfig;
    updateConfig: (updates: Partial<TenantConfig>) => void;
    subLedger: JournalEntry[];
    transactions: JournalEntry[];
    // Custom Accounts (COA)
    customAccounts: string[];
    addCustomAccount: (account: string) => void;
    removeCustomAccount: (account: string) => void;
    // Mapping Rules (Standard Data Mapping)
    mappingRules: MappingRule[];
    addMappingRule: (rule: MappingRule) => void;
    removeMappingRule: (id: string) => void;
    applyMappingRules: (entries: JournalEntry[]) => JournalEntry[];
}

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // 1. Initialize State with LocalStorage
    const [ledger, setLedger] = useState<JournalEntry[]>(() => {
        const saved = localStorage.getItem('accounting_ledger');
        return saved ? JSON.parse(saved) : [];
    });
    const [partners, setPartners] = useState<Partner[]>(() => {
        const saved = localStorage.getItem('accounting_partners');
        return saved ? JSON.parse(saved) : [];
    });
    const [assets, setAssets] = useState<Asset[]>(() => {
        const saved = localStorage.getItem('accounting_assets');
        return saved ? JSON.parse(saved) : [];
    });
    const [config, setConfig] = useState<TenantConfig>(() => {
        const saved = localStorage.getItem('accounting_config');
        return saved ? JSON.parse(saved) : {
            tenantId: 'default-tenant',
            taxPolicy: { vatFilingCycle: 'Quarterly' }
        };
    });
    const [customAccounts, setCustomAccounts] = useState<string[]>(() => {
        const saved = localStorage.getItem('accounting_custom_accounts');
        return saved ? JSON.parse(saved) : [];
    });
    const [mappingRules, setMappingRules] = useState<MappingRule[]>(() => {
        const saved = localStorage.getItem('accounting_mapping_rules');
        return saved ? JSON.parse(saved) : [];
    });
    const [stagingTransactions, setStagingTransactions] = useState<ParsedTransaction[]>([]); // Staging data is transient, no need to persist

    // 2. Auto-Save Effects
    React.useEffect(() => {
        localStorage.setItem('accounting_ledger', JSON.stringify(ledger));
    }, [ledger]);

    React.useEffect(() => {
        localStorage.setItem('accounting_partners', JSON.stringify(partners));
    }, [partners]);

    React.useEffect(() => {
        localStorage.setItem('accounting_assets', JSON.stringify(assets));
    }, [assets]);

    React.useEffect(() => {
        localStorage.setItem('accounting_config', JSON.stringify(config));
    }, [config]);

    React.useEffect(() => {
        localStorage.setItem('accounting_custom_accounts', JSON.stringify(customAccounts));
    }, [customAccounts]);

    React.useEffect(() => {
        localStorage.setItem('accounting_mapping_rules', JSON.stringify(mappingRules));
    }, [mappingRules]);

    const isDateLocked = (dateStr: string) => {
        if (!config.closingDate) return false;
        return dateStr <= config.closingDate;
    };

    const addEntry = (entry: JournalEntry) => {
        if (isDateLocked(entry.date)) {
            alert(`⛔ [마감된 기간] ${config.closingDate} 이전의 전표는 추가할 수 없습니다.`);
            return;
        }
        setLedger((prev) => [...prev, { ...entry, status: entry.status || 'Unconfirmed' }]);
    };

    const applyMappingRules = (entries: JournalEntry[]) => {
        return entries.map(entry => {
            const rule = mappingRules.find(r =>
                entry.vendor?.includes(r.keyword) ||
                entry.description.includes(r.keyword)
            );
            if (rule) {
                const isExpense = rule.type === 'Expense';
                return {
                    ...entry,
                    debitAccount: isExpense ? rule.targetAccount : 'Cash',
                    creditAccount: isExpense ? 'Cash' : rule.targetAccount,
                    auditTrail: [...(entry.auditTrail || []), `[Standard Mapping] Rule applied for "${rule.keyword}" -> ${rule.targetAccount}`]
                };
            }
            return entry;
        });
    };

    const addEntries = (entries: JournalEntry[]) => {
        const locked = entries.some(e => isDateLocked(e.date));
        if (locked) {
            alert(`⛔ [마감된 기간] 포함된 전표 중 일부가 마감일(${config.closingDate}) 이전입니다.`);
            return;
        }

        const mappedEntries = applyMappingRules(entries);
        setLedger((prev) => [...prev, ...mappedEntries]);
    };

    const addPartner = (partner: Partner) => setPartners(prev => [...prev, partner]);
    const updatePartner = (name: string, updates: Partial<Partner>) => setPartners(prev => prev.map(p => p.name === name ? { ...p, ...updates } : p));

    const approveEntry = (id: string) => {
        const target = ledger.find(e => e.id === id);
        if (target && isDateLocked(target.date)) {
            alert(`⛔ [마감된 기간] 이 전표는 마감되어 승인 상태를 변경할 수 없습니다.`);
            return;
        }
        setLedger(prev => prev.map(e => e.id === id ? { ...e, status: 'Approved' } : e));
    };

    const bulkApprove = (ids: string[]) => {
        const targets = ledger.filter(e => ids.includes(e.id));
        if (targets.some(e => isDateLocked(e.date))) {
            alert(`⛔ [마감된 기간] 마감된 전표가 포함되어 있어 일괄 승인할 수 없습니다.`);
            return;
        }
        const idSet = new Set(ids);
        setLedger(prev => prev.map(e => idSet.has(e.id) ? { ...e, status: 'Approved' } : e));
    };

    const deleteEntry = (id: string) => {
        const target = ledger.find(e => e.id === id);
        if (target && isDateLocked(target.date)) {
            alert(`⛔ [마감된 기간] 이 전표는 마감되어 삭제할 수 없습니다.`);
            return;
        }
        setLedger(prev => prev.filter(e => e.id !== id));
    };

    const updateEntry = (id: string, updates: Partial<JournalEntry>) => {
        const target = ledger.find(e => e.id === id);
        if (!target) return;

        if (isDateLocked(target.date)) {
            alert(`⛔ [마감된 기간] 이 전표는 마감되어 수정할 수 없습니다.`);
            return;
        }
        if (updates.date && isDateLocked(updates.date)) {
            alert(`⛔ [마감된 기간] 마감일(${config.closingDate}) 이전으로 날짜를 변경할 수 없습니다.`);
            return;
        }

        setLedger(prev => prev.map(e => e.id === id ? { ...e, ...updates } : e));
    };

    const addAsset = (asset: Asset) => setAssets(prev => [...prev, asset]);

    const updateAsset = (id: string, updates: Partial<Asset>) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const updateConfig = (updates: Partial<TenantConfig>) => setConfig(prev => ({ ...prev, ...updates }));

    const addCustomAccount = (account: string) => {
        if (!customAccounts.includes(account)) setCustomAccounts(prev => [...prev, account]);
    };
    const removeCustomAccount = (account: string) => setCustomAccounts(prev => prev.filter(a => a !== account));

    const addMappingRule = (rule: MappingRule) => setMappingRules(prev => [...prev, rule]);
    const removeMappingRule = (id: string) => setMappingRules(prev => prev.filter(r => r.id !== id));

    const clearAllData = () => {
        setLedger([]);
        setAssets([]);
        setPartners([]);
        setStagingTransactions([]);
        setCustomAccounts([]);
        setConfig({
            tenantId: 'default-tenant',
            taxPolicy: { vatFilingCycle: 'Quarterly' },
            initialBalances: []
        });
        localStorage.removeItem('accounting_ledger');
        localStorage.removeItem('accounting_partners');
        localStorage.removeItem('accounting_assets');
        localStorage.removeItem('accounting_config');
        localStorage.removeItem('accounting_custom_accounts');
    };

    const loadDemoData = () => {
        // Enforce clean state logically, though setStates are batched.
        // We set values directly for the "Load" action.

        // 1. Wiped Config
        setConfig({
            tenantId: 'default-tenant',
            taxPolicy: { vatFilingCycle: 'Quarterly' },
            initialBalances: []
        });
        setAssets([]);
        setPartners([]);
        setStagingTransactions([]);
        setCustomAccounts([]);

        // 2. Load Fresh Mock Data
        const mockData = generateComprehensiveMockData();
        setLedger(mockData);
    };

    const subLedger = useMemo(() => ledger.filter(entry => entry.status === 'Approved'), [ledger]);

    const financials = useMemo(() => {
        return calculateFinancials(subLedger);
    }, [subLedger]);

    return (
        <AccountingContext.Provider value={{
            ledger, partners, assets, addAsset, updateAsset, config, updateConfig,
            addEntry, addPartner, updatePartner, financials,
            approveEntry, bulkApprove, addEntries, updateEntry, deleteEntry,
            clearAllData, loadDemoData, stagingTransactions, setStagingTransactions, subLedger,
            transactions: ledger,
            customAccounts, addCustomAccount, removeCustomAccount,
            mappingRules, addMappingRule, removeMappingRule, applyMappingRules
        }}>
            {children}
        </AccountingContext.Provider>
    );
};
