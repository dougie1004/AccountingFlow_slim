import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { JournalEntry, Partner, SimulationResult, Asset, TenantConfig } from '../types';
import { generateMockBatch, simulateAIParsing } from '../utils/mockDataGenerator';

interface AccountingContextType {
    ledger: JournalEntry[];
    partners: Partner[];
    addEntry: (entry: JournalEntry) => void;
    addPartner: (partner: Partner) => void;
    updatePartner: (id: string, updates: Partial<Partner>) => void;
    financials: {
        cash: number;
        revenue: number;
        expenses: number;
        ar: number;
        ap: number;
        netIncome: number;
        capital: number;
        retainedEarnings: number;
        fixedAssets: number;
        vatNet: number;
    };
    loadSimulation: (result: SimulationResult) => void;
    approvePartner: (partner: Partner) => Promise<void>;
    approveEntry: (id: string) => void;
    bulkApprove: (ids: string[]) => void;
    holdEntry: (id: string) => void;
    addEntries: (entries: JournalEntry[]) => void;
    updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
    attachEvidence: (id: string, url: string) => void;
    processBulkTax: () => void;
    deleteEntry: (id: string) => void;
    assets: Asset[];
    addAsset: (asset: Asset) => void;
    config: TenantConfig;
    updateConfig: (updates: Partial<TenantConfig>) => void;
    subLedger: JournalEntry[];
}

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const INITIAL_DATA: JournalEntry[] = [];

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ledger, setLedger] = useState<JournalEntry[]>(INITIAL_DATA);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [config, setConfig] = useState<TenantConfig>({
        tenantId: 'default-tenant',
        isReadOnly: false,
        taxPolicy: {
            depreciationMethod: 'StraightLine',
            entertainmentLimitBase: 12000000,
            vatFilingCycle: 'Quarterly',
            aiGovernanceThreshold: 1000000 // 1M KRW Asset Threshold
        }
    });

    const addEntry = (entry: JournalEntry) => {
        // Default to Unconfirmed for governance
        setLedger((prev) => [...prev, { ...entry, status: entry.status || 'Unconfirmed' }]);
    };

    const addEntries = (entries: JournalEntry[]) => {
        setLedger((prev) => [...prev, ...entries.map(e => ({ ...e, status: e.status || 'Unconfirmed' }))]);
    };

    const addPartner = (partner: Partner) => {
        setPartners(prev => [...prev, partner]);
    };

    const updatePartner = (id: string, updates: Partial<Partner>) => {
        setPartners(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
    };

    const approveEntry = (id: string) => {
        setLedger(prev => prev.map(e => e.id === id ? { ...e, status: 'Approved' } : e));
    };

    const bulkApprove = (ids: string[]) => {
        const idSet = new Set(ids);
        setLedger(prev => prev.map(e => idSet.has(e.id) ? { ...e, status: 'Approved' } : e));
    };

    const holdEntry = (id: string) => {
        setLedger(prev => prev.map(e => e.id === id ? { ...e, status: 'Hold' } : e));
    };

    const deleteEntry = (id: string) => {
        setLedger(prev => prev.filter(e => e.id !== id));
    };

    const updateEntry = (id: string, updates: Partial<JournalEntry>) => {
        setLedger(prev => prev.map(e => e.id === id ? { ...e, ...updates, version: (e.version || 1) + 1 } : e));
    };

    const addAsset = (asset: Asset) => {
        setAssets(prev => [...prev, asset]);
    };

    const updateConfig = (updates: Partial<TenantConfig>) => {
        setConfig(prev => ({ ...prev, ...updates }));
    };

    const attachEvidence = (id: string, url: string) => {
        setLedger(prev => prev.map(e => e.id === id ? { ...e, attachmentUrl: url, version: (e.version || 1) + 1 } : e));
    };

    const processBulkTax = () => {
        // Logic for bulk VAT/Withholding auto-journaling
        const unconfirmedExpenses = ledger.filter(e => e.type === 'Expense' && e.status === 'Unconfirmed');
        const adjustments = unconfirmedExpenses.map(e => ({
            ...e,
            vat: e.amount * 0.1, // Auto-calculate VAT if missing
            description: `[Auto-VAT] ${e.description}`
        }));
        setLedger(prev => prev.map(e => {
            const adj = adjustments.find(a => a.id === e.id);
            return adj || e;
        }));
    };

    const loadSimulation = (result: SimulationResult) => {
        // Simulation data usually comes as Approved
        setLedger(result.ledger.map(e => ({ ...e, status: 'Approved' })));
    };

    const approvePartner = async (partner: Partner) => {
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const approved: Partner = await invoke('approve_partner', { partner, partners });
            setPartners(prev => prev.map(p => p.id === partner.id ? approved : p));
        } catch (e) {
            console.error("Failed to approve partner:", e);
        }
    };

    // Sub-ledger strictly contains ONLY Approved Partners AND Approved Status Transactions
    const subLedger = useMemo(() => {
        const approvedPartnerNames = new Set(partners.filter(p => p.status === 'Approved').map(p => p.name));
        return ledger.filter(entry =>
            entry.status === 'Approved' &&
            approvedPartnerNames.has(entry.vendor || "")
        );
    }, [ledger, partners]);

    // Initialize mock partners
    React.useEffect(() => {
        if (partners.length === 0) {
            const mockPartners: Partner[] = [
                { id: '1', name: '현대오일뱅크', partnerType: 'Vendor', status: 'Approved', partnerCode: 'V10001', regNo: '123-45-67890' },
                { id: '2', name: '쿠팡(주)', partnerType: 'Vendor', status: 'Approved', partnerCode: 'V10002', regNo: '987-65-43210' },
                { id: '3', name: 'AI Tech Corp', partnerType: 'Customer', status: 'Approved', partnerCode: 'C10001', regNo: '555-44-33221' }
            ];
            setPartners(mockPartners);
        }
    }, [partners]);

    const financials = useMemo(() => {
        let cash = 0;
        let revenue = 0;
        let expenses = 0;
        let ar = 0;
        let ap = 0;
        let fixedAssets = 0;
        let vatNet = 0; // Negative means VAT Refundable, Positive means VAT Payable
        let capital = 0;

        // ONLY Approved entries impact financial statements
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        approvedLedger.forEach((entry) => {
            const totalAmount = entry.amount + (entry.vat || 0);

            // 1. Cash Tracking
            if (entry.debitAccount === 'Cash' || entry.debitAccount.includes('현금') || entry.debitAccount.includes('보통예금')) {
                cash += totalAmount;
            }
            if (entry.creditAccount === 'Cash' || entry.creditAccount.includes('현금') || entry.creditAccount.includes('보통예금')) {
                cash -= totalAmount;
            }

            // 2. Fixed Assets Tracking (Machinery, Equipment, etc.)
            if (entry.type === 'Asset') {
                if (!entry.debitAccount.includes('현금') && !entry.debitAccount.includes('외상')) {
                    fixedAssets += entry.amount;
                }
                if (entry.creditAccount.includes('비품') || entry.creditAccount.includes('기계') || entry.creditAccount.includes('Asset')) {
                    fixedAssets -= entry.amount;
                }
            }

            // 3. P&L Tracking (excludes VAT)
            if (entry.type === 'Revenue') {
                revenue += entry.amount;
                vatNet += (entry.vat || 0); // Output VAT
            }
            if (entry.type === 'Expense') {
                expenses += entry.amount;
                vatNet -= (entry.vat || 0); // Input VAT
            }
            if (entry.type === 'Asset') {
                vatNet -= (entry.vat || 0); // Asset Purchase input VAT
            }

            // 4. AR / AP logic
            if ((entry.type === 'Revenue' || entry.type === 'Asset') && (entry.debitAccount.includes('외상') || entry.debitAccount.includes('미수'))) {
                ar += totalAmount;
            }
            if ((entry.type === 'Expense' || entry.type === 'Asset') && (entry.creditAccount.includes('외상') || entry.creditAccount.includes('미지급'))) {
                ap += totalAmount;
            }

            // 5. Equity logic
            if (entry.type === 'Equity' && (entry.creditAccount.includes('자본') || entry.creditAccount.includes('Capital'))) {
                capital += entry.amount;
            }
        });

        const netIncome = revenue - expenses;
        const retainedEarnings = netIncome;

        return {
            cash, revenue, expenses, ar, ap,
            fixedAssets, vatNet,
            netIncome, capital, retainedEarnings
        };
    }, [ledger]);

    return (
        <AccountingContext.Provider value={{
            ledger,
            partners,
            assets,
            addAsset,
            config,
            updateConfig,
            addEntry,
            addPartner,
            updatePartner,
            financials,
            loadSimulation,
            approvePartner,
            approveEntry,
            bulkApprove,
            holdEntry,
            addEntries,
            updateEntry,
            deleteEntry,
            attachEvidence,
            processBulkTax,
            subLedger
        }}>
            {children}
        </AccountingContext.Provider>
    );
};
