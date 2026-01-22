import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { JournalEntry, Partner, SimulationResult, Asset, TenantConfig, InventoryItem, Order, FinancialSummary } from '../types';
import { generateMockBatch, simulateAIParsing } from '../utils/mockDataGenerator';

export interface AccountingContextType {
    ledger: JournalEntry[];
    partners: Partner[];
    addEntry: (entry: JournalEntry) => void;
    addPartner: (partner: Partner) => void;
    updatePartner: (id: string, updates: Partial<Partner>) => void;
    financials: FinancialSummary;
    loadSimulation: (result: Partial<SimulationResult>) => void;
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
    updateInventory: (id: string, updates: Partial<InventoryItem>) => void;
    scmOrders: Order[];
    addScmOrder: (order: Order) => void;
    updateScmOrder: (id: string, updates: Partial<Order>) => void;
    resetData: () => void;
    config: TenantConfig;
    updateConfig: (updates: Partial<TenantConfig>) => void;
    subLedger: JournalEntry[];
    inventory: InventoryItem[];
    transactions: JournalEntry[];
}

export const AccountingContext = createContext<AccountingContextType | undefined>(undefined);

const INITIAL_DATA: JournalEntry[] = [];

export const AccountingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [ledger, setLedger] = useState<JournalEntry[]>(INITIAL_DATA);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [scmOrders, setScmOrders] = useState<Order[]>([]);
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

    const updateInventory = (id: string, updates: Partial<InventoryItem>) => {
        setInventory(prev => {
            const index = prev.findIndex(item => item.id === id);
            if (index >= 0) {
                // Update existing
                const newInventory = [...prev];
                newInventory[index] = { ...newInventory[index], ...updates };
                // Special handling to merge batches if provided, instead of overwriting? 
                // For now, let's assume overwriting or smart merging isn't strictly requested, 
                // but for safety with multiple generations, let's append batches if both exist.
                if (updates.batches && prev[index].batches) {
                    newInventory[index].batches = [...prev[index].batches, ...updates.batches];
                }
                return newInventory;
            } else {
                // Insert new (Upsert)
                // Ensure the updates constitute a valid item (Settings.tsx provides enough data)
                return [...prev, updates as InventoryItem];
            }
        });
    };

    const addScmOrder = (order: Order) => {
        setScmOrders(prev => [...prev, order]);
    };

    const updateScmOrder = (id: string, updates: Partial<Order>) => {
        setScmOrders(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
    };

    const resetData = () => {
        setLedger([]);
        setInventory([]);
        setScmOrders([]);
        setAssets([]);
        setPartners([]);
    };

    React.useEffect(() => {
        (window as any).resetData = resetData;
    }, []);

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

    const loadSimulation = (result: Partial<SimulationResult>) => {
        if (result.ledger) setLedger(result.ledger.map(e => ({ ...e, status: 'Approved' })));
        if (result.assets) setAssets(result.assets);
        if (result.orders) setScmOrders(result.orders);
        if (result.companyConfig) setConfig(result.companyConfig);
    };

    const approvePartner = async (partner: Partner) => {
        if (!(window as any).__TAURI_INTERNALS__) {
            setPartners(prev => prev.map(p => p.id === partner.id ? { ...p, status: 'Approved' } : p));
            return;
        }
        try {
            const { invoke } = await import('@tauri-apps/api/core');
            const approved: Partner = await invoke('approve_partner', { partner, partners });
            setPartners(prev => prev.map(p => p.id === partner.id ? approved : p));
        } catch (e) {
            console.error("Failed to approve partner:", e);
        }
    };

    // G/L (General Ledger) contains all 'Approved' status transactions.
    // We allow entries without vendors (internal) to also appear in the ledger.
    const subLedger = useMemo(() => {
        return ledger.filter(entry => entry.status === 'Approved');
    }, [ledger]);

    // Initialized as empty for dynamic data migration

    const financials = useMemo(() => {
        let cash = 0;
        let ar = 0;
        let inventoryValue = 0;
        let fixedAssets = 0;
        let vatPayable = 0;
        let vatReceivable = 0;
        let ap = 0;
        let otherLiabilities = 0;
        let capital = 0;
        let revenue = 0;
        let expenses = 0;

        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        approvedLedger.forEach((entry) => {
            const totalAmount = entry.amount + (entry.vat || 0);

            const processAccount = (acc: string, amount: number, isDebit: boolean) => {
                const multiplier = isDebit ? 1 : -1;
                const lowAcc = (acc || '').toLowerCase().trim();

                // [Antigravity] Debug: Trace Cash Flow
                if (lowAcc.includes('보통') || lowAcc.includes('예금')) {
                    console.log(`[Financials] Cash Event: ${entry.date} | ${lowAcc} | ${isDebit ? 'Debit' : 'Credit'} | ${amount}`);
                }

                // 1. Asset/Liability/Equity accounts usually track the TOTAL flow (Cash, AR, AP)
                // Added '보통' (Common), '저축' (Savings), '입출금' (Checking)
                if (lowAcc.includes('현금') || lowAcc.includes('예금') || lowAcc === 'cash' || lowAcc.includes('bank') || lowAcc.includes('보통') || lowAcc.includes('저축') || lowAcc.includes('입출금')) {
                    cash += (amount * multiplier);
                } else if (lowAcc.includes('외상매출') || lowAcc.includes('미수') || lowAcc.includes('receivable')) {
                    ar += (amount * multiplier);
                } else if (lowAcc.includes('상품') || lowAcc.includes('재고') || lowAcc.includes('재료') || lowAcc.includes('inventory')) {
                    inventoryValue += (isDebit ? entry.amount : -entry.amount);
                } else if (lowAcc.includes('비품') || lowAcc.includes('기계') || lowAcc.includes('장치') || lowAcc.includes('차량') || lowAcc.includes('건물') || lowAcc.includes('asset')) {
                    fixedAssets += (isDebit ? entry.amount : -entry.amount);
                } else if (lowAcc.includes('부가세') && lowAcc.includes('대급')) {
                    vatReceivable += (amount * multiplier);
                } else if (lowAcc.includes('외상매입') || lowAcc.includes('미지급') || lowAcc.includes('payable')) {
                    ap += (amount * -multiplier);
                } else if (lowAcc.includes('부가세') && lowAcc.includes('예수')) {
                    vatPayable += (amount * -multiplier);
                } else if (lowAcc.includes('차입') || lowAcc.includes('예수금') || lowAcc.includes('부채') || lowAcc.includes('loan')) {
                    otherLiabilities += (amount * -multiplier);
                } else if (lowAcc.includes('자본') || lowAcc.includes('equity') || lowAcc.includes('stock')) {
                    capital += (amount * -multiplier);
                }
                // 2. Revenue/Expense accounts track the BASE amount
                else if (entry.type === 'Revenue' || lowAcc.includes('매출') || lowAcc.includes('수익') || lowAcc.includes('revenue')) {
                    if (!isDebit) revenue += entry.amount; else revenue -= entry.amount;
                } else if (entry.type === 'Expense' || entry.type === 'Payroll' || lowAcc.includes('비용') || lowAcc.includes('급여') || lowAcc.includes('료') || lowAcc.includes('비') || lowAcc.includes('expense')) {
                    if (isDebit) expenses += entry.amount; else expenses -= entry.amount;
                }
            };

            // Call with totalAmount for balancing, then internal logic separates it
            processAccount(entry.debitAccount, totalAmount, true);
            processAccount(entry.creditAccount, totalAmount, false);

            // Explicit VAT tracking to balance the equation
            if (entry.vat > 0) {
                if (entry.type === 'Revenue') {
                    vatPayable += entry.vat;
                } else if (entry.type === 'Expense' || entry.type === 'Asset') {
                    vatReceivable += entry.vat;
                }
            }
        });

        console.log(`[Financials] Aggregation Complete. Cash: ${cash}, AR: ${ar}, AP: ${ap}, Capital: ${capital}`);

        const netIncome = revenue - expenses;
        const totalAssets = cash + ar + inventoryValue + fixedAssets + vatReceivable;
        const totalLiabilities = ap + vatPayable + otherLiabilities;
        const totalEquity = capital + netIncome;

        // "Truthful" Cash: Cash - Accounts Payable - VAT Payable - (Government Grant balance which is restricted)
        // We find Grant Cash by looking for transactions with "보조금" or "출연금"
        let totalGrantCash = 0;
        approvedLedger.forEach(e => {
            const isGrant = e.description.includes('보조금') || e.description.includes('출연금');
            if (isGrant) {
                if (e.creditAccount.includes('보조금') || e.creditAccount.includes('출연금')) {
                    totalGrantCash += e.amount;
                }
                if (e.debitAccount.includes('보조금') || e.debitAccount.includes('출연금')) {
                    totalGrantCash -= e.amount;
                }
            }
        });

        const realAvailableCash = Math.max(0, cash - ap - vatPayable - totalGrantCash);

        return {
            cash, revenue, expenses, ar, ap,
            fixedAssets, vatNet: vatPayable - vatReceivable,
            netIncome, capital, retainedEarnings: netIncome,
            totalEquity,
            inventoryValue,
            totalAssets,
            totalLiabilities,
            realAvailableCash,
            totalGrantCash
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
            updateInventory,
            scmOrders,
            addScmOrder,
            updateScmOrder,
            resetData,
            subLedger,
            inventory,
            transactions: ledger
        }}>
            {children}
        </AccountingContext.Provider>
    );
};
