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
    const [inventory, setInventory] = useState<InventoryItem[]>([
        {
            id: '1', name: '고성능 리튬 배터리 셀 (High-Cap BATT)', sku: 'BATT-500', category: 'Energy Storage',
            valuationMethod: 'FIFO',
            batches: [
                { id: 'B1', acquisitionDate: '2026-01-05', quantity: 500, unitCost: 45000 },
                { id: 'B2', acquisitionDate: '2026-02-15', quantity: 700, unitCost: 48000 }
            ],
            lastNrv: 46000
        },
        {
            id: '2', name: '정밀 서보 모터 (Precision Servo)', sku: 'MOTR-X100', category: 'Robotics',
            valuationMethod: 'FIFO',
            batches: [
                { id: 'B3', acquisitionDate: '2026-01-10', quantity: 50, unitCost: 1200000 }
            ],
            lastNrv: 1100000 // 저가법 평가 대상
        },
        {
            id: '3', name: '광학 센서 모듈 (Optic Sensor)', sku: 'SENS-OPT', category: 'Sensors',
            valuationMethod: 'FIFO',
            batches: [
                { id: 'B4', acquisitionDate: '2026-01-20', quantity: 1500, unitCost: 15000 }
            ]
        },
    ]);
    const [scmOrders, setScmOrders] = useState<Order[]>([
        {
            id: 'PO-2026-102',
            date: '2026-03-01',
            partnerId: '삼성SDI',
            typeField: 'PURCHASE',
            status: 'CONFIRMED',
            items: [{ sku: 'BATT-500', quantity: 100, unitPrice: 450000, amount: 45000000 }],
            totalAmount: 45000000,
            vat: 4500000
        },
        {
            id: 'PO-2026-105',
            date: '2026-03-05',
            partnerId: '글로벌부품 (Global Supply)',
            typeField: 'PURCHASE',
            status: 'FULFILLED',
            items: [{ sku: 'SENS-OPT', quantity: 500, unitPrice: 15000, amount: 7500000 }],
            totalAmount: 7500000,
            vat: 750000
        }
    ]);
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
        setInventory(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
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
        setPartners([
            { id: '1', name: '현대오일뱅크', partnerType: 'Vendor', status: 'Approved', partnerCode: 'V10001', regNo: '123-45-67890' },
            { id: '2', name: '쿠팡(주)', partnerType: 'Vendor', status: 'Approved', partnerCode: 'V10002', regNo: '987-65-43210' },
            { id: '3', name: 'AI Tech Corp', partnerType: 'Customer', status: 'Approved', partnerCode: 'C10001', regNo: '555-44-33221' }
        ]);
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

    const loadSimulation = (result: SimulationResult) => {
        // Simulation data usually comes as Approved
        setLedger(result.ledger.map(e => ({ ...e, status: 'Approved' })));
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
                const lowAcc = acc.toLowerCase();

                // 1. Asset/Liability/Equity accounts usually track the TOTAL flow (Cash, AR, AP)
                if (lowAcc.includes('현금') || lowAcc.includes('예금') || lowAcc === 'cash' || lowAcc.includes('bank')) {
                    cash += (amount * multiplier);
                } else if (lowAcc.includes('외상매출') || lowAcc.includes('미수')) {
                    ar += (amount * multiplier);
                } else if (lowAcc.includes('상품') || lowAcc.includes('재고') || lowAcc.includes('재료')) {
                    inventoryValue += (isDebit ? entry.amount : -entry.amount); // Inventory usually base
                } else if (lowAcc.includes('비품') || lowAcc.includes('기계') || lowAcc.includes('장치') || lowAcc.includes('차량') || lowAcc.includes('건물')) {
                    fixedAssets += (isDebit ? entry.amount : -entry.amount); // Fixed assets usually base
                } else if (lowAcc.includes('부가세') && lowAcc.includes('대급')) {
                    vatReceivable += (amount * multiplier);
                } else if (lowAcc.includes('외상매입') || lowAcc.includes('미지급')) {
                    ap += (amount * -multiplier);
                } else if (lowAcc.includes('부가세') && lowAcc.includes('예수')) {
                    vatPayable += (amount * -multiplier);
                } else if (lowAcc.includes('차입') || lowAcc.includes('예수금') || lowAcc.includes('부채')) {
                    otherLiabilities += (amount * -multiplier);
                } else if (lowAcc.includes('자본')) {
                    capital += (amount * -multiplier);
                }
                // 2. Revenue/Expense accounts track the BASE amount
                else if (entry.type === 'Revenue' || lowAcc.includes('매출') || lowAcc.includes('수익')) {
                    if (!isDebit) revenue += entry.amount; else revenue -= entry.amount;
                } else if (entry.type === 'Expense' || entry.type === 'Payroll' || lowAcc.includes('비용') || lowAcc.includes('급여') || lowAcc.includes('료') || lowAcc.includes('비')) {
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

        const netIncome = revenue - expenses;
        const totalAssets = cash + ar + inventoryValue + fixedAssets + vatReceivable;
        const totalLiabilities = ap + vatPayable + otherLiabilities;
        const totalEquity = capital + netIncome;

        return {
            cash, revenue, expenses, ar, ap,
            fixedAssets, vatNet: vatPayable - vatReceivable,
            netIncome, capital, retainedEarnings: netIncome,
            totalEquity,
            inventoryValue,
            totalAssets,
            totalLiabilities
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
