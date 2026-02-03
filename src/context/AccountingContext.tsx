import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { JournalEntry, Partner, Asset, LeaseContract, TenantConfig, ParsedTransaction, MappingRule, ClearingRecord, AccountingPeriod, ClosingRecord, MonthlyBudget, BudgetItem, RiskDecisionLog } from '../types';
import { getAccountCategory, isSuspenseAccount } from '../constants/accounts';
import { calculateFinancials, generateClosingSnapshot, calculatePeriodDepreciation } from '../core/accountingEngine';
import { generateCashForecast, calculateRunway, ProjectedCashFlow, RunwayAnalysis, ScenarioType } from '../core/forecastingEngine';
import { generateComprehensiveMockData, generateThreeYearSimulation } from '../utils/mockDataGenerator';

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
    leases: LeaseContract[];
    addLease: (lease: LeaseContract) => void;
    updateLease: (id: string, updates: Partial<LeaseContract>) => void;
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
    performClearing: (sourceEntryId: string, targetAccount: string | null, metadata: Omit<ClearingRecord, 'sourceEntryId' | 'clearingEntryId' | 'clearedAt'>) => void;
    // Closing v1.0
    periods: AccountingPeriod[];
    closingRecords: ClosingRecord[];
    performClosing: (period: string, note: string, userId: string) => void;
    isDateLocked: (date: string) => boolean;
    seedThreeYearSimulation: () => void;
    runAutoDepreciation: (period: string) => void;
    runAutoLeaseAccounting: (period: string) => void;
    // Budgeting (Phase 3)
    budgets: MonthlyBudget[];
    setBudget: (period: string, items: BudgetItem[]) => void;
    getBudget: (period: string) => MonthlyBudget | undefined;

    // Forecasting (Phase 4)
    getForecast: (targetPeriod: string, scenario?: ScenarioType) => ProjectedCashFlow;
    getRunway: (scenario?: ScenarioType) => RunwayAnalysis;

    // Risk Decisions (Phase 4.5.1)
    riskDecisions: RiskDecisionLog[];
    addRiskDecision: (log: RiskDecisionLog) => void;

    // Multilingual support
    language: import('../locales/i18n').Language;
    setLanguage: (lang: import('../locales/i18n').Language) => void;
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
    const [leases, setLeases] = useState<LeaseContract[]>(() => {
        const saved = localStorage.getItem('accounting_leases');
        return saved ? JSON.parse(saved) : [];
    });
    const [config, setConfig] = useState<TenantConfig>(() => {
        const saved = localStorage.getItem('accounting_config');
        return saved ? JSON.parse(saved) : {
            tenantId: 'default-tenant',
            taxPolicy: { vatFilingCycle: 'Quarterly' }
        };
    });
    const [periods, setPeriods] = useState<AccountingPeriod[]>(() => {
        const saved = localStorage.getItem('accounting_periods');
        return saved ? JSON.parse(saved) : [];
    });
    const [closingRecords, setClosingRecords] = useState<ClosingRecord[]>(() => {
        const saved = localStorage.getItem('accounting_closing_records');
        return saved ? JSON.parse(saved) : [];
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

    // 2. Auto-Save Effects (Debounced for ledger to handle stress tests)
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            localStorage.setItem('accounting_ledger', JSON.stringify(ledger));
        }, 1000);
        return () => clearTimeout(timeout);
    }, [ledger]);

    React.useEffect(() => {
        localStorage.setItem('accounting_partners', JSON.stringify(partners));
    }, [partners]);

    React.useEffect(() => {
        localStorage.setItem('accounting_assets', JSON.stringify(assets));
    }, [assets]);

    React.useEffect(() => {
        localStorage.setItem('accounting_leases', JSON.stringify(leases));
    }, [leases]);

    React.useEffect(() => {
        localStorage.setItem('accounting_config', JSON.stringify(config));
    }, [config]);

    React.useEffect(() => {
        localStorage.setItem('accounting_custom_accounts', JSON.stringify(customAccounts));
    }, [customAccounts]);

    React.useEffect(() => {
        localStorage.setItem('accounting_mapping_rules', JSON.stringify(mappingRules));
    }, [mappingRules]);

    React.useEffect(() => {
        localStorage.setItem('accounting_periods', JSON.stringify(periods));
    }, [periods]);

    React.useEffect(() => {
        localStorage.setItem('accounting_closing_records', JSON.stringify(closingRecords));
    }, [closingRecords]);

    // Budgeting State
    const [budgets, setBudgets] = useState<MonthlyBudget[]>(() => {
        const saved = localStorage.getItem('accounting_budgets');
        return saved ? JSON.parse(saved) : [];
    });
    React.useEffect(() => localStorage.setItem('accounting_budgets', JSON.stringify(budgets)), [budgets]);

    // Risk Decisions (Phase 4.5.1)
    const [riskDecisions, setRiskDecisions] = useState<RiskDecisionLog[]>(() => {
        const saved = localStorage.getItem('accounting_risk_decisions');
        return saved ? JSON.parse(saved) : [];
    });

    React.useEffect(() => {
        localStorage.setItem('accounting_risk_decisions', JSON.stringify(riskDecisions));
    }, [riskDecisions]);

    const [language, setLanguage] = useState<import('../locales/i18n').Language>(() => {
        const saved = localStorage.getItem('accounting_language');
        return (saved as any) || 'ko';
    });

    React.useEffect(() => {
        localStorage.setItem('accounting_language', language);
    }, [language]);

    const addRiskDecision = (log: RiskDecisionLog) => {
        setRiskDecisions(prev => [...prev, log]);
    };

    const isDateLocked = (dateStr: string) => {
        // 1. Check Monthly Closing Periods (v1.0)
        const periodKey = dateStr.substring(0, 7); // YYYY-MM
        const period = periods.find(p => p.period === periodKey);
        if (period?.status === 'CLOSED') return true;

        // 2. Legacy Check (Global closing date)
        if (config.closingDate && dateStr <= config.closingDate) return true;

        return false;
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
                    controlTrail: [...(entry.controlTrail || []), `[Standard Mapping] Rule applied for "${rule.keyword}" -> ${rule.targetAccount}`]
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

    const addAsset = (asset: Asset) => setAssets(prev => [...prev, { ...asset, status: asset.status || 'ACTIVE' }]);

    const updateAsset = (id: string, updates: Partial<Asset>) => {
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...updates } : a));
    };

    const addLease = (lease: LeaseContract) => setLeases(prev => [...prev, lease]);
    const updateLease = (id: string, updates: Partial<LeaseContract>) => {
        setLeases(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
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
        setLeases([]);
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
        localStorage.removeItem('accounting_leases');
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
        setLeases([]);
        setPartners([]);
        setStagingTransactions([]);
        setCustomAccounts([]);
        setPeriods([]);
        setClosingRecords([]);

        // 2. Load Fresh Mock Data
        const mockData = generateComprehensiveMockData();
        setLedger(mockData);
    };

    const seedThreeYearSimulation = () => {
        // 1. Reset Everything
        clearAllData();
        setPeriods([]);
        setClosingRecords([]);

        // 2. Generate 3 years of raw entries
        const simulatedEntries = generateThreeYearSimulation();
        setLedger(simulatedEntries);

        // 3. Automated "Bulk Closing" for the first 33 months (leave last quarter open)
        const entriesByMonth = new Map<string, JournalEntry[]>();
        simulatedEntries.forEach((e: JournalEntry) => {
            const key = e.date.substring(0, 7);
            const current = entriesByMonth.get(key) || [];
            entriesByMonth.set(key, [...current, e]);
        });

        const sortedMonths = Array.from(entriesByMonth.keys()).sort();
        const monthsToClose = sortedMonths.slice(0, 33); // Close all but the last 3 months

        const newClosingRecords: ClosingRecord[] = [];
        const newPeriods: AccountingPeriod[] = [];

        let lastRecord: ClosingRecord | null = null;
        monthsToClose.forEach(period => {
            // For simulation, we don't pass budget yet (or could generate mock budget)
            const snapshot = generateClosingSnapshot(simulatedEntries, [], [], period, `[Phase 1] 3개년 시나리오 자동 결산 (${period})`, 'System Controller', lastRecord, undefined);
            newClosingRecords.push(snapshot);
            lastRecord = snapshot;
            newPeriods.push({
                period,
                status: 'CLOSED',
                closedAt: snapshot.closedAt,
                closedBy: 'System Controller'
            });
        });

        setClosingRecords(newClosingRecords);
        setPeriods(newPeriods);
    };

    const performClearing = (
        sourceEntryId: string,
        targetAccount: string | null,
        metadata: Omit<ClearingRecord, 'sourceEntryId' | 'clearingEntryId' | 'clearedAt'>
    ) => {
        const sourceEntry = ledger.find(e => e.id === sourceEntryId);
        if (!sourceEntry) return;

        if (isDateLocked(sourceEntry.date)) {
            alert(`⛔ [마감된 기간] 마감된 전표는 처리할 수 없습니다.`);
            return;
        }

        const now = new Date().toISOString();

        if (metadata.status === 'BLOCKED') {
            // 1. Create the Blocked Record
            const clearingRecord: ClearingRecord = {
                ...metadata,
                sourceEntryId,
                clearedAt: now,
                status: 'BLOCKED'
            };

            // 2. Only update the source entry status to BLOCKED (stays in Ledger as unsettled but marked)
            setLedger(prev => prev.map(e =>
                e.id === sourceEntryId
                    ? { ...e, isSettled: false, clearingRecord }
                    : e
            ));
            return;
        }

        // --- CLEARED Logic ---
        if (!targetAccount) return;
        const clearingEntryId = crypto.randomUUID();

        // 1. Create the Clearing Record
        const clearingRecord: ClearingRecord = {
            ...metadata,
            sourceEntryId,
            clearingEntryId,
            clearedAt: now,
            status: 'CLEARED'
        };

        // 2. Prepare the new Journal Entry
        const isDebitSus = isSuspenseAccount(sourceEntry.debitAccount);
        const newEntry: JournalEntry = {
            id: clearingEntryId,
            date: now.split('T')[0],
            description: `[정산] ${sourceEntry.description}`,
            vendor: sourceEntry.vendor || '',
            debitAccount: isDebitSus ? targetAccount : sourceEntry.debitAccount,
            creditAccount: isDebitSus ? sourceEntry.debitAccount : targetAccount,
            amount: sourceEntry.amount,
            vat: sourceEntry.vat,
            type: isDebitSus ? 'Expense' : 'Revenue',
            status: 'Approved',
            clearingRecord: clearingRecord
        };

        // 3. Atomically update the ledger
        setLedger(prev => prev.map(e =>
            e.id === sourceEntryId
                ? { ...e, isSettled: true, settledDate: now.split('T')[0], clearingRecord }
                : e
        ).concat(newEntry));
    };

    const subLedger = useMemo(() => ledger.filter(entry => entry.status === 'Approved'), [ledger]);

    const financials = useMemo(() => {
        return calculateFinancials(subLedger);
    }, [subLedger]);

    const performClosing = (period: string, note: string, userId: string) => {
        // 1. Find Previous Record for AI Analysis
        // Assuming closingRecords are sorted or we find by period calculation
        // For MVP simplicity, we just look for any record that is temporally before this one (approx)
        // Better: look for period - 1 month
        const prevDate = new Date(`${period}-01`);
        prevDate.setMonth(prevDate.getMonth() - 1);
        const prevPeriod = prevDate.toISOString().substring(0, 7);
        const previousRecord = closingRecords.find(r => r.period === prevPeriod) || null;

        // Find Budget
        const budget = budgets.find(b => b.period === period);

        // 2. Generate the snapshot record with AI Briefing
        const snapshot = generateClosingSnapshot(ledger, assets, leases, period, note, userId, previousRecord, budget);

        // 2. Update States Atomically
        setClosingRecords(prev => [...prev.filter(r => r.period !== period), snapshot]);

        setPeriods(prev => {
            const exists = prev.find(p => p.period === period);
            if (exists) {
                return prev.map(p => p.period === period ? { ...p, status: 'CLOSED', closedAt: snapshot.closedAt, closedBy: userId } : p);
            }
            return [...prev, { period, status: 'CLOSED', closedAt: snapshot.closedAt, closedBy: userId }];
        });
    };

    const runAutoDepreciation = (period: string) => {
        if (isDateLocked(`${period}-01`)) {
            alert('⛔ [마감된 기간] 이미 마감된 달의 상각은 실행할 수 없습니다.');
            return;
        }

        const entries = calculatePeriodDepreciation(assets, period);
        if (entries.length > 0) {
            addEntries(entries);
            // Also update the local accumulated depreciation state to sync with the new entries
            setAssets(prev => prev.map(asset => {
                const entry = entries.find(e => e.id === `DEPR-${asset.id}-${period}`);
                if (entry) {
                    return { ...asset, accumulatedDepreciation: asset.accumulatedDepreciation + entry.amount };
                }
                return asset;
            }));
            alert(`✅ ${period}월 자동 감가상각 전표 ${entries.length}건이 생성되었습니다.`);
        } else {
            alert('상각 대상 자산이 없거나 이미 완료되었습니다.');
        }
    };

    const runAutoLeaseAccounting = (period: string) => {
        if (isDateLocked(`${period}-01`)) {
            alert('⛔ [마감된 기간] 이미 마감된 달의 리스 회계는 실행할 수 없습니다.');
            return;
        }

        import('../core/accountingEngine').then(({ calculatePeriodLeaseEntries }) => {
            const entries = calculatePeriodLeaseEntries(leases, period);
            if (entries.length > 0) {
                addEntries(entries);
                alert(`✅ ${period}월 리스 상각/이자비용 전표 ${entries.length}건이 생성되었습니다.`);
            } else {
                alert('해당 기간에 예정된 리스 스케줄이 없거나 이미 처리되었습니다.');
            }
        });
    };

    const setBudget = (period: string, items: BudgetItem[]) => {
        setBudgets(prev => {
            const existing = prev.find(b => b.period === period);
            if (existing) {
                return prev.map(b => b.period === period ? { ...b, items, updatedAt: new Date().toISOString() } : b);
            }
            return [...prev, {
                id: `BU_${period}`,
                period,
                items,
                updatedAt: new Date().toISOString()
            }];
        });
    };

    const getBudget = (period: string) => budgets.find(b => b.period === period);

    // Forecasting Functions
    const getForecast = (targetPeriod: string, scenario: ScenarioType = 'Baseline'): ProjectedCashFlow => {
        // Calculate current liquid assets (Cash + Bank) - simplified for MVP
        const currentCash = subLedger.reduce((sum, e) => {
            const isCashIn = ['현금', '보통예금'].includes(e.debitAccount);
            const isCashOut = ['현금', '보통예금'].includes(e.creditAccount);
            return sum + (isCashIn ? e.amount : 0) - (isCashOut ? e.amount : 0);
        }, 0);

        // Fetch Budget strategy: Target Period -> Fallback to Current Month
        // This ensures if user only planned for Feb, Feb's plan is used for March projection
        let budget = getBudget(targetPeriod);
        if (!budget) {
            const currentPeriod = new Date().toISOString().substring(0, 7);
            budget = getBudget(currentPeriod);
        }

        return generateCashForecast(subLedger, currentCash, targetPeriod, scenario, budget);
    };

    const getRunway = (scenario: ScenarioType = 'Baseline'): RunwayAnalysis => {
        const currentCash = subLedger.reduce((sum, e) => {
            const isCashIn = ['현금', '보통예금'].includes(e.debitAccount);
            const isCashOut = ['현금', '보통예금'].includes(e.creditAccount);
            return sum + (isCashIn ? e.amount : 0) - (isCashOut ? e.amount : 0);
        }, 0);

        // Use Next Month's Budget for Runway Calculation, fallback to Current
        const nextMonthDate = new Date();
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextPeriod = nextMonthDate.toISOString().substring(0, 7);

        let budget = getBudget(nextPeriod);
        if (!budget) {
            const currentPeriod = new Date().toISOString().substring(0, 7);
            budget = getBudget(currentPeriod);
        }

        return calculateRunway(currentCash, subLedger, scenario, budget);
    };

    return (
        <AccountingContext.Provider value={{
            ledger, addEntry, addEntries, approveEntry, bulkApprove, updateEntry, deleteEntry,
            partners, addPartner, updatePartner, financials,
            assets, addAsset, updateAsset, leases, addLease, updateLease, clearAllData, loadDemoData,
            stagingTransactions, setStagingTransactions,
            config, updateConfig, subLedger, transactions: ledger,
            customAccounts, addCustomAccount, removeCustomAccount,
            mappingRules, addMappingRule, removeMappingRule, applyMappingRules, performClearing,
            periods, closingRecords, performClosing, isDateLocked, seedThreeYearSimulation,
            runAutoDepreciation, runAutoLeaseAccounting,
            budgets, setBudget, getBudget,
            getForecast, getRunway,
            riskDecisions, addRiskDecision,
            language, setLanguage
        }}>
            {children}
        </AccountingContext.Provider>
    );
};
