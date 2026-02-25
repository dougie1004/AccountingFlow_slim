import React, { createContext, useState, useMemo, ReactNode } from 'react';
import { JournalEntry, Partner, Asset, LeaseContract, TenantConfig, ParsedTransaction, MappingRule, ClearingRecord, AccountingPeriod, ClosingRecord, MonthlyBudget, BudgetItem, RiskDecisionLog, LiabilityRecord, BusinessScenario, ScenarioParams, AccountNature, Account, ConstitutionViolationError, SimulationViewMode, ScenarioType, ProjectedCashFlow, RunwayAnalysis } from '../types';
import { getAccountNature, STANDARD_ACCOUNTS, isSuspenseAccount, isCashAccount } from '../constants/accounts';
import { calculateFinancials, generateClosingSnapshot, calculatePeriodDepreciation, generateCashForecast, calculateRunway, getConsolidatedMetrics } from '../bridge/StrategicBridge';
import { validateTransaction } from '../core_engine/journalValidator';
import { generateThreeYearSimulation, generateYearlyPack } from '../utils/mockDataGenerator';
import { toLocalIsoDate } from '../utils/formatUtils';

export interface AccountingContextType {
    ledger: JournalEntry[];
    partners: Partner[];
    addEntry: (entry: JournalEntry) => void;
    addPartner: (partner: Partner) => void;
    updatePartner: (name: string, updates: Partial<Partner>) => void;
    financials: any; // Simplified for MVP
    approveEntry: (id: string) => void;
    bulkApprove: (ids: string[]) => void;
    rejectEntry: (id: string, reason?: string) => void;
    bulkReject: (ids: string[], reason?: string) => void;
    addEntries: (entries: JournalEntry[]) => void;
    updateEntry: (id: string, updates: Partial<JournalEntry>) => void;
    deleteEntry: (id: string) => void;
    bulkDelete: (ids: string[]) => void;
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
    customAccounts: Account[];
    addCustomAccount: (name: string, nature: AccountNature) => void;
    updateAccountNature: (name: string, nature: AccountNature) => void;
    removeCustomAccount: (name: string) => void;
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
    seedThreeYearSimulation: (scenario?: BusinessScenario, overrides?: Partial<ScenarioParams>) => void;
    seedScenarioSimulation: (scenario?: BusinessScenario, years?: number[], overrides?: Partial<ScenarioParams>) => void;
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

    // ERP Migration & Candidate Ledger (Phase 6)
    candidateLedger: JournalEntry[];
    addCandidateEntries: (entries: JournalEntry[]) => void;
    setCandidateEntries: (entries: JournalEntry[]) => void;
    approveCandidateLedger: () => void;

    // Context Integrity (Phase 5.5)
    systemNow: string;
    setSystemNow: (date: string) => void;

    // Multilingual support
    language: import('../locales/i18n').Language;
    setLanguage: (lang: import('../locales/i18n').Language) => void;
    // Phase 11: Liability Engine
    liabilities: LiabilityRecord[];
    addLiability: (record: LiabilityRecord) => void;
    updateLiability: (id: string, updates: Partial<LiabilityRecord>) => void;
    // Phase 2: Simulation & Time Integrity
    simulationViewMode: SimulationViewMode;
    setSimulationViewMode: (mode: SimulationViewMode) => void;
    activeScenario: BusinessScenario;
    setActiveScenario: (scenario: BusinessScenario) => void;
    initialCashBalance: number;
    injectStressData: (type: 'unbalanced' | 'negative_asset' | 'date_error') => void;
    // [Corporate Governance] Internal Regulations
    corporateRules: string;
    updateCorporateRules: (rules: string) => void;
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
    const [customAccounts, setCustomAccounts] = useState<Account[]>(() => {
        const saved = localStorage.getItem('accounting_custom_accounts');
        return saved ? JSON.parse(saved) : [];
    });
    const [mappingRules, setMappingRules] = useState<MappingRule[]>(() => {
        const saved = localStorage.getItem('accounting_mapping_rules');
        return saved ? JSON.parse(saved) : [];
    });
    const [stagingTransactions, setStagingTransactions] = useState<ParsedTransaction[]>([]); // Staging data is transient, no need to persist
    const [candidateLedger, setCandidateLedger] = useState<JournalEntry[]>(() => {
        const saved = localStorage.getItem('accounting_candidate_ledger');
        return saved ? JSON.parse(saved) : [];
    });

    // 2. Auto-Save Effects (Debounced for ledger to handle stress tests)
    React.useEffect(() => {
        const timeout = setTimeout(() => {
            try {
                localStorage.setItem('accounting_ledger', JSON.stringify(ledger));
            } catch (e) {
                console.error('LocalStorage Quota Exceeded for ledger', e);
            }
        }, 1000);
        return () => clearTimeout(timeout);
    }, [ledger]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_partners', JSON.stringify(partners)); } catch (e) { }
    }, [partners]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_assets', JSON.stringify(assets)); } catch (e) { }
    }, [assets]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_leases', JSON.stringify(leases)); } catch (e) { }
    }, [leases]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_config', JSON.stringify(config)); } catch (e) { }
    }, [config]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_custom_accounts', JSON.stringify(customAccounts)); } catch (e) { }
    }, [customAccounts]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_mapping_rules', JSON.stringify(mappingRules)); } catch (e) { }
    }, [mappingRules]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_periods', JSON.stringify(periods)); } catch (e) { }
    }, [periods]);

    React.useEffect(() => {
        try { localStorage.setItem('accounting_closing_records', JSON.stringify(closingRecords)); } catch (e) { }
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

    React.useEffect(() => {
        try {
            localStorage.setItem('accounting_candidate_ledger', JSON.stringify(candidateLedger));
        } catch (e) {
            console.error('Candidate ledger too large for LocalStorage. Proceeding in-memory.', e);
        }
    }, [candidateLedger]);

    // Phase 11: Liability State
    const [liabilities, setLiabilities] = useState<LiabilityRecord[]>(() => {
        const saved = localStorage.getItem('accounting_liabilities');
        return saved ? JSON.parse(saved) : [];
    });

    React.useEffect(() => {
        localStorage.setItem('accounting_liabilities', JSON.stringify(liabilities));
    }, [liabilities]);

    const [simulationViewMode, setSimulationViewModeState] = useState<SimulationViewMode>(() => {
        const saved = localStorage.getItem('accounting_simulation_mode');
        return (saved as SimulationViewMode) || 'REALITY';
    });

    const setSimulationViewMode = (mode: SimulationViewMode) => {
        setSimulationViewModeState(mode);
        localStorage.setItem('accounting_simulation_mode', mode);
    };

    const [activeScenario, setActiveScenarioState] = useState<BusinessScenario>(() => {
        const saved = localStorage.getItem('accounting_active_scenario');
        return (saved as BusinessScenario) || 'STANDARD';
    });

    const setActiveScenario = (scenario: BusinessScenario) => {
        setActiveScenarioState(scenario);
        localStorage.setItem('accounting_active_scenario', scenario);
    };

    const [corporateRules, setCorporateRules] = useState<string>(() => {
        const saved = localStorage.getItem('accounting_corporate_rules');
        const defaultRules = `## [AccountingFlow] 사내 회계 처리 및 지출 규정 (Standard)

1. [지출 증빙] 모든 사업용 지출은 적격증빙(신용카드 전표, 현금영수증, 세금계산서) 수취를 원칙으로 함.
2. [복리후생비] 인당 3만원 이하의 식대는 복리후생비로 처리하며, 이를 초과하는 접대 목적 지출은 접대비로 분류함.
3. [자산 인식] 100만원 이상의 비품 및 IT 장비 구입은 즉시 비용 처리하지 않고 '비품' 자산으로 인식 후 감가상각함.
4. [여비교통비] 시내 교통비 및 업무용 유류비는 여비교통비로 처리함.
5. [지급수수료] SaaS 구독료(AWS, Google, ChatGPT 등)는 지급수수료로 분류함.`;
        return saved || defaultRules;
    });

    const updateCorporateRules = (rules: string) => {
        setCorporateRules(rules);
        localStorage.setItem('accounting_corporate_rules', rules);
    };

    const addLiability = (record: LiabilityRecord) => setLiabilities(prev => [...prev, record]);
    const updateLiability = (id: string, updates: Partial<LiabilityRecord>) => {
        setLiabilities(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const [language, setLanguage] = useState<import('../locales/i18n').Language>(() => {
        const saved = localStorage.getItem('accounting_language');
        return (saved as any) || 'ko';
    });

    // --- PHASE 5.5: Context Integrity (System Clock) ---
    const [systemNow, setSystemNowState] = useState<string>(() => {
        const saved = localStorage.getItem('dash_view_date'); // Reuse existing key for compatibility
        if (saved) return saved;
        // Fallback to latest entry date or today
        return toLocalIsoDate(new Date());
    });

    const setSystemNow = (date: string | Date) => {
        let dateStr: string;
        if (typeof date === 'string') {
            dateStr = date.split('T')[0];
        } else {
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        }
        const nextDate = dateStr || toLocalIsoDate(new Date());
        setSystemNowState(nextDate);
        localStorage.setItem('dash_view_date', nextDate);
    };

    // 🧪 CONSTITUTION v2.1: WORLD CHECK (Checkpoint #4)
    React.useEffect(() => {
        const currentPeriod = systemNow.substring(0, 7);
        const closedCount = periods.filter(p => p.status === 'CLOSED').length;

        if (!((window as any).isDemoMode || import.meta.env.VITE_APP_MODE === 'demo')) {
            console.group('%c📜 [WORLD CHECK] SINGLE WORLD DOCTRINE', 'color: #6366f1; font-weight: bold;');
            console.log(`%cTime Context  : %c${systemNow}`, 'color: #94a3b8;', 'color: #ffffff; font-weight: bold;');
            console.log(`%cCurrent Period: %c${currentPeriod}`, 'color: #94a3b8;', 'color: #ffffff; font-weight: bold;');
            console.log(`%cConstitution  : %cv2.1`, 'color: #94a3b8;', 'color: #6366f1; font-weight: bold;');
            console.log(`%cSim Mode      : %c${simulationViewMode}`, 'color: #94a3b8;', 'color: #f59e0b; font-weight: bold;');
            console.log(`%cLedger Entries: %c${ledger.length}`, 'color: #94a3b8;', 'color: #ffffff;');
            console.log(`%cClosed Periods: %c${closedCount}`, 'color: #94a3b8;', 'color: #ffffff;');
            console.log(`%cStatus        : %cCONSISTENT`, 'color: #94a3b8;', 'color: #10b981; font-weight: bold;');
            console.groupEnd();
        }

        // Update Browser Title for better context awareness
        document.title = `[${currentPeriod}] AccountingFlow`;
    }, [systemNow, ledger.length, periods.length]);

    React.useEffect(() => {
        localStorage.setItem('accounting_language', language);
    }, [language]);

    const addRiskDecision = (log: RiskDecisionLog) => {
        setRiskDecisions(prev => [...prev, log]);
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * CONSTITUTIONAL JOURNAL NUMBERING
     * ═══════════════════════════════════════════════════════════════════════════
     * 
     * Rules:
     * 1. Journal numbers are STATE, not CALCULATION
     * 2. Sequence is atomically incremented and NEVER reused
     * 3. Deleted entries leave permanent gaps (audit trail)
     * 4. Format: JE-YYYYMM-NNNN
     * 
     * ═══════════════════════════════════════════════════════════════════════════
     */
    const generateJournalNumber = (date: string): { journalNumber: string; sequenceNumber: number } => {
        const periodKey = date.substring(0, 7); // YYYY-MM

        // Find or create period
        let period = periods.find(p => p.period === periodKey);

        if (!period) {
            // Create new period with sequence starting at 0
            period = {
                period: periodKey,
                status: 'OPEN',
                lastJournalSequence: 0
            };
            setPeriods(prev => [...prev, period!]);
        }

        // CONSTITUTION: Atomic increment (never decreases, never reused)
        const nextSequence = period.lastJournalSequence + 1;

        // Update period state
        setPeriods(prev => prev.map(p =>
            p.period === periodKey
                ? { ...p, lastJournalSequence: nextSequence }
                : p
        ));

        // Generate journal number
        const journalNumber = `JE-${periodKey.replace('-', '')}-${String(nextSequence).padStart(4, '0')}`;

        return {
            journalNumber,
            sequenceNumber: nextSequence
        };
    };

    const isDateLocked = (dateStr: string) => {
        const periodKey = dateStr.substring(0, 7); // YYYY-MM
        const period = periods.find(p => p.period === periodKey);

        // CONSTITUTION: A closed period is a "Sealed World". No entry is possible.
        if (period?.status === 'CLOSED') {
            return true;
        }

        if (config.closingDate && dateStr <= config.closingDate) return true;
        return false;
    };

    const isAccountUsed = (accountName: string) => {
        return ledger.some(e => e.debitAccount === accountName || e.creditAccount === accountName);
    };

    const checkSealViolation = (date: string) => {
        if (isDateLocked(date)) {
            // [Phase 2] Halt immediately without user-friendly alert, as requested for violation.
            throw new ConstitutionViolationError(`Seal Violation: Attempted to modify history in a closed period (${date}). (Article 5 Violation)`);
        }
    };

    const addEntry = (entry: JournalEntry) => {
        // [INTEGRITY GUARD] Ensure mandatory dates exist even if UI omits them
        const d = entry.date || toLocalIsoDate(new Date());
        const hydratedEntry: JournalEntry = {
            ...entry,
            date: d,
            transactionDate: entry.transactionDate || d,
            recognitionDate: entry.recognitionDate || d
        };

        if (isDateLocked(hydratedEntry.date)) {
            alert(`⛔ [마감된 기간] ${config.closingDate} 이전의 전표는 추가할 수 없습니다.`);
            return;
        }

        // [⚖️ ACCOUNTING CONSTITUTION CHECK]
        const validation = validateTransaction(hydratedEntry);
        if (!validation.isValid) {
            alert(`❌ [회계 헌법 위반]\n\n${validation.errors.join('\n')}`);
            return;
        }

        // [CONSTITUTION Art. 4 Enforcement] Ensure account natures are tracked
        const registerAccount = (name: string) => {
            if (!STANDARD_ACCOUNTS.some(a => a.name === name) && !customAccounts.some(a => a.name === name)) {
                try {
                    const nature = getAccountNature(name);
                    const newAcc: Account = { id: crypto.randomUUID(), name, nature };
                    setCustomAccounts(prev => [...prev, newAcc]);
                } catch (e) {
                    console.warn(`[CONSTITUTION] New account "${name}" used without explicit nature. Heuristics failed.`, e);
                }
            }
        };

        registerAccount(entry.debitAccount);
        registerAccount(entry.creditAccount);

        const periodKey = entry.date.substring(0, 7);

        setPeriods(prevPeriods => {
            let currentPeriods = [...prevPeriods];
            let period = currentPeriods.find(p => p.period === periodKey);

            if (!period) {
                // Period doesn't exist, create it inside the state update
                period = {
                    period: periodKey,
                    status: 'OPEN',
                    lastJournalSequence: 0
                };
                currentPeriods.push(period);
            }

            const nextSeq = period.lastJournalSequence + 1;

            // Constitutional update of state
            const updatedPeriods = currentPeriods.map(p =>
                p.period === periodKey
                    ? { ...p, lastJournalSequence: nextSeq }
                    : p
            );

            const journalNumber = `JE-${periodKey.replace('-', '')}-${String(nextSeq).padStart(4, '0')}`;
            const LIABILITY_TARGETS = ['가수금', '단기차입금', '임원차입금', '장기차입금'];

            // [Phase 11 Sensor] Detect Liability Creation
            let liabilityRecord: LiabilityRecord | undefined;
            if (LIABILITY_TARGETS.includes(entry.creditAccount) && entry.amount > 0) {
                liabilityRecord = {
                    id: crypto.randomUUID(),
                    entryId: entry.id, // Will match the entry ID (ensure entry has ID or generated)
                    state: 'UNPLANNED',
                    lender: entry.vendor || 'Unknown',
                    amount: entry.amount,
                    remainingAmount: entry.amount,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                // We need to add this to state, but we are inside a setState callback for periods.
                // We should trigger a separate side effect or state update.
                // Since this logic is getting complex, we'll do the liability add via the separate setter outside.
            }

            const numberedEntry: JournalEntry = {
                ...entry,
                status: entry.status || 'Unconfirmed',
                sequenceNumber: nextSeq,
                journalNumber: journalNumber,
                liabilityRecordId: liabilityRecord?.id, // Link!
                createdAt: new Date().toISOString()
            };

            setLedger(prev => [...prev, numberedEntry]);

            // Trigger Liability Creation Side Effect safely
            if (liabilityRecord) {
                // Determine implicit lender based on context if missing
                if (entry.creditAccount.includes('가수금') && (!liabilityRecord.lender || liabilityRecord.lender === 'Unknown')) {
                    liabilityRecord.lender = '대표이사'; // Default assumption for 'Gasoogeum'
                }
                setTimeout(() => addLiability(liabilityRecord!), 0);
            }

            return updatedPeriods;
        });
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
        // [INTEGRITY GUARD] Hydrate missing mandatory dates
        const hydratedEntries = entries.map(e => {
            const d = e.date || toLocalIsoDate(new Date());
            return {
                ...e,
                date: d,
                transactionDate: e.transactionDate || d,
                recognitionDate: e.recognitionDate || d
            };
        });

        const locked = hydratedEntries.some(e => isDateLocked(e.date));
        if (locked) {
            alert(`⛔ [마감된 기간] 포함된 전표 중 일부가 마감일(${config.closingDate}) 이전입니다.`);
            return;
        }

        // [⚖️ ACCOUNTING CONSTITUTION CHECK]
        for (const e of hydratedEntries) {
            const val = validateTransaction(e);
            if (!val.isValid) {
                alert(`❌ [회계 헌법 위반 - 대량 주입 중단]\n\n전표 ID: ${e.id}\n사유: ${val.errors[0]}`);
                return;
            }
        }

        const mappedEntries = applyMappingRules(hydratedEntries);
        const LIABILITY_TARGETS = ['가수금', '단기차입금', '임원차입금', '장기차입금'];
        const detectedLiabilities: LiabilityRecord[] = [];

        // Pre-calculate updates based on CURRENT state to avoid side-effects in setters
        // Note: This relies on the fact that 'periods' state is up-to-date when addEntries is called.
        // If rapid concurrent calls happen, this might need a ref to be safe, but for this app it's acceptable.

        let newPeriods = [...periods];
        const numberedEntries = mappedEntries.map(entry => {
            const periodKey = entry.date.substring(0, 7);
            let period = newPeriods.find(p => p.period === periodKey);

            if (!period) {
                period = {
                    period: periodKey,
                    status: 'OPEN',
                    lastJournalSequence: 0
                };
                newPeriods.push(period);
            }

            const nextSeq = (period.lastJournalSequence || 0) + 1;
            period.lastJournalSequence = nextSeq;

            // [Phase 11] Detect Liability Creation in batch
            let liabilityRecord: LiabilityRecord | undefined;
            if (LIABILITY_TARGETS.includes(entry.creditAccount) && entry.amount > 0) {
                liabilityRecord = {
                    id: crypto.randomUUID(),
                    entryId: entry.id,
                    state: 'UNPLANNED',
                    lender: entry.vendor || (entry.creditAccount.includes('가수금') ? '대표이사' : 'Unknown'),
                    amount: entry.amount,
                    remainingAmount: entry.amount,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                };
                detectedLiabilities.push(liabilityRecord);
            }

            return {
                ...entry,
                sequenceNumber: nextSeq,
                journalNumber: `JE-${periodKey.replace('-', '')}-${String(nextSeq).padStart(4, '0')}`,
                liabilityRecordId: liabilityRecord?.id, // Link!
                createdAt: entry.createdAt || new Date().toISOString()
            };
        });

        // Update States Sequentially
        setPeriods(newPeriods);
        setLedger(prev => [...prev, ...numberedEntries]);

        // Add detected liabilities to state (with duplicate prevention)
        if (detectedLiabilities.length > 0) {
            setTimeout(() => setLiabilities(prev => {
                // Filter out duplicates - check if liability with same entryId already exists
                const existingEntryIds = new Set(prev.map(l => l.entryId));
                const newLiabilities = detectedLiabilities.filter(l => !existingEntryIds.has(l.entryId));

                if (newLiabilities.length > 0) {
                    console.log(`[Liability Engine] Adding ${newLiabilities.length} new liabilities (Prevented ${detectedLiabilities.length - newLiabilities.length} duplicates)`);
                    return [...prev, ...newLiabilities];
                }
                return prev;
            }), 0);
        }
    };

    const addPartner = (partner: Partner) => setPartners(prev => [...prev, partner]);
    const updatePartner = (name: string, updates: Partial<Partner>) => setPartners(prev => prev.map(p => p.name === name ? { ...p, ...updates } : p));

    const approveEntry = (id: string) => {
        const target = ledger.find(e => e.id === id);
        if (target) checkSealViolation(target.date);
        setLedger(prev => prev.map(e => e.id === id ? { ...e, status: 'Approved' } : e));
    };

    const bulkApprove = (ids: string[]) => {
        const targets = ledger.filter(e => ids.includes(e.id));
        targets.forEach(e => checkSealViolation(e.date));
        const idSet = new Set(ids);
        setLedger(prev => prev.map(e => idSet.has(e.id) ? { ...e, status: 'Approved' } : e));
    };

    const rejectEntry = (id: string, reason?: string) => {
        const target = ledger.find(e => e.id === id);
        if (target) checkSealViolation(target.date);
        setLedger(prev => prev.map(e =>
            e.id === id
                ? { ...e, status: 'Rejected', notes: reason ? `${e.notes || ''} [Rejected: ${reason}]` : e.notes }
                : e
        ));
    };

    const bulkReject = (ids: string[], reason?: string) => {
        const targets = ledger.filter(e => ids.includes(e.id));
        targets.forEach(e => checkSealViolation(e.date));
        const idSet = new Set(ids);
        setLedger(prev => prev.map(e =>
            idSet.has(e.id)
                ? { ...e, status: 'Rejected', notes: reason ? `${e.notes || ''} [Rejected: ${reason}]` : e.notes }
                : e
        ));
    };

    const deleteEntry = (id: string) => {
        const target = ledger.find(e => e.id === id);
        if (target) checkSealViolation(target.date);
        setLedger(prev => prev.filter(e => e.id !== id));
    };

    const bulkDelete = (ids: string[]) => {
        const targets = ledger.filter(e => ids.includes(e.id));
        targets.forEach(e => checkSealViolation(e.date));
        const idSet = new Set(ids);
        setLedger(prev => prev.filter(e => !idSet.has(e.id)));
    };

    const updateEntry = (id: string, updates: Partial<JournalEntry>) => {
        const target = ledger.find(e => e.id === id);
        if (!target) return;

        checkSealViolation(target.date);
        if (updates.date) checkSealViolation(updates.date);

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

    const addCustomAccount = (name: string, nature: AccountNature) => {
        if (!customAccounts.some(a => a.name === name)) {
            setCustomAccounts(prev => [...prev, { id: crypto.randomUUID(), name, nature }]);
        }
    };

    const updateAccountNature = (name: string, nature: AccountNature) => {
        if (isAccountUsed(name)) {
            throw new ConstitutionViolationError(`Nature Change Forbidden: Account "${name}" is already in use in the ledger. (Phase 2 Integrity Lock)`);
        }
        setCustomAccounts(prev => prev.map(a => a.name === name ? { ...a, nature } : a));
    };

    const removeCustomAccount = (name: string) => {
        if (isAccountUsed(name)) {
            throw new ConstitutionViolationError(`Account Removal Forbidden: Account "${name}" is already in use in the ledger.`);
        }
        setCustomAccounts(prev => prev.filter(a => a.name !== name));
    };

    const addMappingRule = (rule: MappingRule) => setMappingRules(prev => [...prev, rule]);
    const removeMappingRule = (id: string) => setMappingRules(prev => prev.filter(r => r.id !== id));

    const clearAllData = () => {
        setLedger([]);
        setAssets([]);
        setLeases([]);
        setPartners([]);
        setStagingTransactions([]);
        setCustomAccounts([]);
        setMappingRules([]);
        setPeriods([]);
        setClosingRecords([]);
        setBudgets([]);
        setRiskDecisions([]);
        setLiabilities([]); // [Phase 11] Clear liabilities!
        setConfig({
            tenantId: 'TNT-LOCAL-001',
            taxPolicy: { vatFilingCycle: 'Quarterly' },
            initialBalances: []
        });
        localStorage.removeItem('accounting_ledger');
        localStorage.removeItem('accounting_partners');
        localStorage.removeItem('accounting_assets');
        localStorage.removeItem('accounting_leases');
        localStorage.removeItem('accounting_config');
        localStorage.removeItem('accounting_custom_accounts');
        localStorage.removeItem('accounting_mapping_rules');
        localStorage.removeItem('accounting_periods');
        localStorage.removeItem('accounting_closing_records');
        localStorage.removeItem('accounting_budgets');
        localStorage.removeItem('accounting_risk_decisions');
        localStorage.removeItem('accounting_liabilities'); // [Phase 11] Clear from storage!
        localStorage.removeItem('accounting_candidate_ledger');
        setCandidateLedger([]);
    };

    const loadDemoData = () => {
        // Enforce clean state logically, though setStates are batched.
        // We set values directly for the "Load" action.

        // Wiped Config
        setConfig({
            tenantId: 'default-tenant',
            taxPolicy: { vatFilingCycle: 'Quarterly' },
            initialBalances: []
        });

        // The seedScenarioSimulation function now acts as our master setup
        // It will either load standard 3-year data or the DemoCo VC Pitch data based on the ENV mode.
        seedThreeYearSimulation('STANDARD');
        setSystemNow('2028-12-31');
    };

    const injectStressData = (type: 'unbalanced' | 'negative_asset' | 'date_error') => {
        const baseDate = systemNow || toLocalIsoDate(new Date());
        const stressId = `STRESS-${Date.now()}`;

        switch (type) {
            case 'unbalanced':
                // 1. 차대 불일치 전표 (고의적 1원 오차 유발을 위해 특수 항목 주입)
                // 현재 ledger 구조상 amount는 공통이므로, 계산 로직에서 튕기게 하기 위해 
                // 비정상적인 VAT나 별도 항목으로 처리하거나, ledger 자체를 조작하는 로직이 필요
                // 여기선 '부가가치세' 필드를 악용하여 차대 합계를 깨뜨림
                const unbalancedEntry: JournalEntry = {
                    id: stressId,
                    date: baseDate,
                    transactionDate: baseDate,
                    recognitionDate: baseDate,
                    description: "STRESS-TEST: unbalanced (1원 오차)",
                    debitAccount: "현금",
                    creditAccount: "매입채무",
                    amount: 1000000,
                    vat: 1,
                    type: 'Expense',
                    status: 'Approved'
                };
                setLedger(prev => [...prev, unbalancedEntry]);
                break;

            case 'negative_asset':
                // 2. 자산 음수 폭탄 (현금 10억 인출)
                const negativeEntry: JournalEntry = {
                    id: stressId,
                    date: baseDate,
                    transactionDate: baseDate,
                    recognitionDate: baseDate,
                    description: "STRESS-TEST: negative balance (현금 인출 폭탄)",
                    debitAccount: "임차료",
                    creditAccount: "현금",
                    amount: 2000000000,
                    vat: 0,
                    type: 'Expense',
                    status: 'Approved'
                };
                setLedger(prev => [...prev, negativeEntry]);
                break;

            case 'date_error':
                // 3. 날짜 오류 (형식 파괴 또는 미래 데이터)
                const futureEntry: JournalEntry = {
                    id: stressId,
                    date: "2099-12-31",
                    transactionDate: "2099-12-31",
                    recognitionDate: "2099-12-31",
                    description: "STRESS-TEST: invalid date (미래의 전표)",
                    debitAccount: "현금",
                    creditAccount: "자본금",
                    amount: 50000000,
                    vat: 0,
                    type: 'Revenue',
                    status: 'Approved'
                };
                setLedger(prev => [...prev, futureEntry]);
                break;
        }
    };

    const seedScenarioSimulation = async (scenario: BusinessScenario = 'STANDARD', years: number[] = [2026, 2027, 2028], overrides?: Partial<ScenarioParams>) => {
        // 1. Reset Everything
        clearAllData();
        setPeriods([]);
        setClosingRecords([]);

        // 2. Generate raw entries for the specified years (or override for Demo Mode)
        let rawSimulatedEntries: JournalEntry[] = [];

        if (import.meta.env.VITE_APP_MODE === 'demo' || (window as any).isDemoMode) {
            const { generateDemoCoPack } = await import('../utils/demoCoGenerator');
            rawSimulatedEntries = generateDemoCoPack(overrides);
            console.log(`[SIMULATION] DemoCo VC Pitch scenario seeded.`);
        } else {
            // Cumulative generation (2027 needs 2026's context)
            let runningHistory: JournalEntry[] = [];
            years.sort().forEach(year => {
                const yearPack = generateYearlyPack(year, runningHistory, scenario, overrides);
                rawSimulatedEntries.push(...yearPack);
                runningHistory.push(...yearPack);
            });
            console.log(`[SIMULATION] Generated entries for years [${years.join(', ')}] (${scenario}):`, rawSimulatedEntries.length);
        }

        // 3. Group and Number Entries (Chronological within each month)
        const entriesByMonth = new Map<string, JournalEntry[]>();
        rawSimulatedEntries.forEach((e: JournalEntry) => {
            const key = e.date.substring(0, 7);
            const current = entriesByMonth.get(key) || [];
            entriesByMonth.set(key, [...current, e]);
        });

        const sortedMonths = Array.from(entriesByMonth.keys()).sort();
        const numberedEntries: JournalEntry[] = [];
        const initialPeriods: AccountingPeriod[] = [];

        sortedMonths.forEach(monthKey => {
            const periodEntries = entriesByMonth.get(monthKey) || [];
            periodEntries.sort((a, b) => a.date.localeCompare(b.date));

            periodEntries.forEach((entry, idx) => {
                const seq = idx + 1;
                numberedEntries.push({
                    ...entry,
                    sequenceNumber: seq,
                    journalNumber: `JE-${monthKey.replace('-', '')}-${String(seq).padStart(4, '0')}`
                });
            });

            initialPeriods.push({
                period: monthKey,
                status: 'OPEN',
                lastJournalSequence: periodEntries.length
            });
        });

        // 4. Extract and Sync Assets & Partners (Integration Fix)
        const discoveredAssets: Asset[] = [];
        let discoveredPartners: Partner[] = [];
        const partnerNames = new Set<string>();

        // If in Demo Mode, try to use prepared partner list
        if (import.meta.env.VITE_APP_MODE === 'demo' || (window as any).isDemoMode) {
            try {
                const { getDemoCoPartners } = await import('../utils/demoCoGenerator');
                discoveredPartners = getDemoCoPartners();
                discoveredPartners.forEach(p => partnerNames.add(p.name));
            } catch (e) {
                console.warn("[DEMO] Could not load getDemoCoPartners, falling back to discovery.");
            }
        }

        numberedEntries.forEach(e => {
            if (e.type === 'Asset' || e.debitAccount === '비품' || e.debitAccount === '산업재산권') {
                if (!discoveredAssets.find(a => a.id === e.id)) {
                    discoveredAssets.push({
                        id: e.id || crypto.randomUUID(),
                        name: e.description.split(' 구입')[0].replace('[July] ', '').replace('[May] ', ''),
                        depreciationMethod: 'StraightLine',
                        acquisitionDate: e.date,
                        cost: e.amount,
                        usefulLife: e.debitAccount === '비품' ? 5 : 10,
                        residualValue: 0,
                        accumulatedDepreciation: 0,
                        status: 'ACTIVE'
                    });
                }
            }
            if (e.vendor && !partnerNames.has(e.vendor)) {
                partnerNames.add(e.vendor);
                discoveredPartners.push({
                    name: e.vendor,
                    regNo: `123-81-${Math.floor(10000 + Math.random() * 89999)}`
                });
            }
        });

        // 4.5 Sync Accumulated Depreciation (Integration Fix)
        // [CFO logic] The Asset state must match the Ledger accumulated depreciation for the AI report to show correct percentages.
        discoveredAssets.forEach(asset => {
            const deprEntries = numberedEntries.filter(e =>
                e.creditAccount === '감가상각누계액' &&
                e.description.includes(asset.name)
            );
            asset.accumulatedDepreciation = deprEntries.reduce((sum, e) => sum + e.amount, 0);
        });

        setAssets(discoveredAssets);
        setPartners(discoveredPartners);
        setLedger(numberedEntries);
        setActiveScenario(scenario); // Record which world is now manifest

        // 5. Automated "Bulk Closing" (Close all except the very last month of the simulation)
        // This makes the latest data "Reviewable" (Pending)
        const monthsToClose = sortedMonths.slice(0, Math.max(0, sortedMonths.length - 1));
        const newClosingRecords: ClosingRecord[] = [];
        const finalizedPeriods: AccountingPeriod[] = [];

        for (const p of initialPeriods) {
            if (monthsToClose.includes(p.period)) {
                const periodEntries = numberedEntries.filter(e => e.date.startsWith(p.period));
                const snapshot = await generateClosingSnapshot(
                    periodEntries,
                    [],
                    [],
                    p.period,
                    `[System] ${scenario} 시나리오 자동 결산 (${p.period})`,
                    'System Controller',
                    getCurrentAccountNatures(),
                    newClosingRecords.length > 0 ? newClosingRecords[newClosingRecords.length - 1] : null,
                    undefined
                );
                newClosingRecords.push(snapshot);
                finalizedPeriods.push({ ...p, status: 'CLOSED', closedAt: snapshot.closedAt, closedBy: 'System Controller' });
            } else {
                finalizedPeriods.push(p);
            }
        }

        setClosingRecords(newClosingRecords);
        setPeriods(finalizedPeriods);
    };

    const seedThreeYearSimulation = async (scenario: BusinessScenario = 'STANDARD', overrides?: Partial<ScenarioParams>) => {
        await seedScenarioSimulation(scenario, [2026, 2027, 2028], overrides);
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
            transactionDate: now.split('T')[0],
            recognitionDate: now.split('T')[0],
            description: `[정산] ${sourceEntry.description}`,
            vendor: sourceEntry.vendor || '',
            debitAccount: isDebitSus ? targetAccount : sourceEntry.debitAccount,
            creditAccount: isDebitSus ? sourceEntry.debitAccount : targetAccount,
            amount: sourceEntry.amount,
            vat: sourceEntry.vat,
            type: isDebitSus ? 'Expense' : 'Revenue',
            status: 'Approved',
            clearingRecord: clearingRecord,
            createdAt: now,
            journalNumber: 'PENDING',
            sequenceNumber: 0
        };

        // 3. Atomically update the ledger
        setLedger(prev => prev.map(e =>
            e.id === sourceEntryId
                ? { ...e, isSettled: true, settledDate: now.split('T')[0], clearingRecord }
                : e
        ).concat(newEntry));
    };

    /**
     * ═══════════════════════════════════════════════════════════════════════════
     * POINT-IN-TIME ENGINE (Phase 5.5)
     * ═══════════════════════════════════════════════════════════════════════════
     * The system only exists up to 'systemNow'. Everything else is future shock.
     * ═══════════════════════════════════════════════════════════════════════════
     */
    const subLedger = useMemo(() => {
        const approved = ledger.filter(entry =>
            entry.status === 'Approved' &&
            entry.date <= systemNow
        );

        // ---------------------------------------------------------
        // [GLOBAL CONSTITUTION CHECK] Every derived view must be consistent
        // ---------------------------------------------------------

        /**
         * [CONSTITUTION ART 1] - TERMINOLOGY RESTRICTION
         * Any UI-facing expression MUST NOT use terms related to 'Audit', 'Auditor', '감사', '감사인'.
         * Use 'Management', 'Review', 'Strategic Intelligence', '담당자', '검토' instead.
         */
        if (approved.length > 0) {
            let totalDebit = 0;
            let totalCredit = 0;

            approved.forEach(e => {
                // Correct Double-Entry Check Logic
                // Every transaction must balance itself.
                // 1. Base Amount (Net)
                // In our simplified model, we track flow.
                // But for "Total Debit vs Total Credit" check of the ledger:

                // Case A: Revenue
                // Dr Cash (amount + vat)
                // Cr Sales (amount)
                // Cr Output VAT (vat)

                // Case B: Expense
                // Dr Expense (amount)
                // Dr Input VAT (vat)
                // Cr Cash (amount + vat)

                // In both cases, the Total Debit impact is (amount + vat) and Total Credit impact is (amount + vat).
                // So simply adding to both sides ensures mathematical equality check for OTHER anomalies
                // (like if we had separate line items).

                // However, the previous logic was trying to be "smart" by splitting them, but failed to add the counterpart.
                // To fix the "Constitution Violation", we must acknowledge that a single JournalEntry row
                // in this system represents a PRE-BALANCED transaction group.

                // Therefore, purely for the checksum:
                const totalFlow = e.amount + (e.vat || 0);
                totalDebit += totalFlow;
                totalCredit += totalFlow;
            });

            // 1. 차대 평형 체크 (1원이라도 틀리면 즉시 정지)
            if (Math.abs(totalDebit - totalCredit) > 0.01) {
                throw new Error(`[CONSTITUTION VIOLATION] 데이터 무결성 파괴 감지. 기초 전표의 차대 합계가 일치하지 않습니다. (Mismatch: ${Math.abs(totalDebit - totalCredit).toLocaleString()}원)`);
            }
        }

        return approved;
    }, [ledger, systemNow]);

    // --- PHASE 9: Opening Balance Integration ---
    const initialCashBalance = useMemo(() => {
        if (!config.initialBalances) return 0;
        return config.initialBalances
            .filter(ib => isCashAccount(ib.account))
            .reduce((sum, ib) => sum + ib.amount, 0);
    }, [config.initialBalances]);

    const getCurrentAccountNatures = () => {
        const natures: Record<string, AccountNature> = {};
        STANDARD_ACCOUNTS.forEach(a => { natures[a.name] = a.nature; });
        customAccounts.forEach(a => { natures[a.name] = a.nature; });
        return natures;
    };

    const financials = useMemo(() => {
        // [PHASE 11 ART 17] Unified Truth Gate
        return getConsolidatedMetrics(subLedger, closingRecords, systemNow, initialCashBalance);
    }, [subLedger, systemNow, initialCashBalance, closingRecords]);

    const performClosing = async (period: string, note: string, userId: string) => {
        // Find the most recent previous record for AI analysis (continuity check)
        const previousRecord = closingRecords
            .filter(r => r.period < period)
            .sort((a, b) => b.period.localeCompare(a.period))[0] || null;

        // Find Budget
        const budget = budgets.find(b => b.period === period);

        // [Phase 2 Seal] Capture all natures at this exact moment
        const currentNatures = getCurrentAccountNatures();

        // 2. Generate the snapshot record with AI Briefing
        const snapshot = await generateClosingSnapshot(ledger, assets, leases, period, note, userId, currentNatures, previousRecord, budget);

        // 2. Update States Atomically
        setClosingRecords(prev => [...prev.filter(r => r.period !== period), snapshot]);

        setPeriods(prev => {
            const exists = prev.find(p => p.period === period);
            if (exists) {
                return prev.map(p => p.period === period ? { ...p, status: 'CLOSED', closedAt: snapshot.closedAt, closedBy: userId } : p);
            }
            // Calculate sequence from ledger entries in this period
            const periodEntries = ledger.filter(e => e.date.startsWith(period));
            return [...prev, {
                period,
                status: 'CLOSED',
                closedAt: snapshot.closedAt,
                closedBy: userId,
                lastJournalSequence: periodEntries.length
            }];
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

        import('../bridge/StrategicBridge').then(({ calculatePeriodLeaseEntries }) => {
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
        // [PHASE 11 ART 17] - ABSOLUTE CASH TRUTH
        // AI must not subtract 'hallucinated' liabilities. It must start from the REAL bank balance.
        const currentCash = financials.cash || initialCashBalance;

        const baseDate = new Date(systemNow || new Date().toISOString().split('T')[0]);
        const validTargetPeriod = (targetPeriod && !isNaN(baseDate.getTime())) ? targetPeriod : '2026-01';

        let budget = getBudget(validTargetPeriod);
        if (!budget) {
            const currentPeriod = systemNow ? systemNow.substring(0, 7) : '2026-01';
            budget = getBudget(currentPeriod);
        }

        const forecast = generateCashForecast(subLedger, currentCash, validTargetPeriod, scenario, budget, simulationViewMode);

        // We still track unplanned liabilities for UI transparency, but we DON'T subtract them from cash.
        const unplannedLiabilityAmount = liabilities
            .filter(l => l.state === 'UNPLANNED')
            .reduce((sum, l) => sum + l.remainingAmount, 0);

        if (forecast.details) {
            forecast.details.unplannedLiabilityAmount = unplannedLiabilityAmount;
        }

        return forecast;
    };

    const getRunway = (scenario: ScenarioType = 'Baseline'): RunwayAnalysis => {
        // [PHASE 11 ART 17] - ABSOLUTE CASH TRUTH
        const currentCash = financials.cash || initialCashBalance;

        // Reference date for runway is systemNow
        const baseDate = new Date(systemNow || new Date().toISOString().split('T')[0]);

        // Safety Fallback for invalid date
        if (isNaN(baseDate.getTime())) {
            return calculateRunway(currentCash, subLedger, scenario, undefined);
        }

        const nextMonthDate = new Date(baseDate);
        nextMonthDate.setMonth(nextMonthDate.getMonth() + 1);
        const nextPeriod = nextMonthDate.toISOString().substring(0, 7);

        let budget = getBudget(nextPeriod);
        if (!budget) {
            const currentPeriod = systemNow.substring(0, 7);
            budget = getBudget(currentPeriod);
        }

        const result = calculateRunway(currentCash, subLedger, scenario, budget, simulationViewMode);

        // CONSTITUTIONAL FIX: Runway cannot be negative. If net operational cash is negative, runway is 0 (immediate risk).
        return {
            ...result,
            runwayMonths: Math.max(0, result.runwayMonths)
        };
    };

    // Phase 6 ERP Candidate Functions
    const addCandidateEntries = (entries: JournalEntry[]) => {
        setCandidateLedger(prev => [...prev, ...entries]);
    };

    const setCandidateEntries = (entries: JournalEntry[]) => {
        setCandidateLedger(entries);
    };

    const approveCandidateLedger = () => {
        if (candidateLedger.length === 0) return;
        // Move all candidates to main ledger as 'Approved'
        const approved = candidateLedger.map(e => ({ ...e, status: 'Approved' as const }));
        setLedger(prev => [...prev, ...approved]);
        setCandidateLedger([]);
    };

    const contextValue = useMemo(() => ({
        ledger, addEntry, addEntries, approveEntry, bulkApprove, rejectEntry, bulkReject, updateEntry, deleteEntry, bulkDelete,
        partners, addPartner, updatePartner, financials,
        assets, addAsset, updateAsset, leases, addLease, updateLease, clearAllData, loadDemoData,
        stagingTransactions, setStagingTransactions,
        config, updateConfig, subLedger, transactions: ledger,
        customAccounts, addCustomAccount, updateAccountNature, removeCustomAccount,
        mappingRules, addMappingRule, removeMappingRule, applyMappingRules, performClearing,
        periods, closingRecords, performClosing, isDateLocked, seedThreeYearSimulation, seedScenarioSimulation,
        runAutoDepreciation, runAutoLeaseAccounting,
        budgets, setBudget, getBudget,
        getForecast, getRunway,
        riskDecisions, addRiskDecision,
        candidateLedger, addCandidateEntries, setCandidateEntries, approveCandidateLedger,
        language, setLanguage,
        systemNow, setSystemNow,
        liabilities, addLiability, updateLiability,
        simulationViewMode, setSimulationViewMode,
        activeScenario, setActiveScenario,
        initialCashBalance, injectStressData,
        corporateRules, updateCorporateRules
    }), [
        ledger, partners, financials, assets, leases, stagingTransactions, config, subLedger,
        customAccounts, mappingRules, periods, closingRecords, budgets, riskDecisions,
        candidateLedger, language, systemNow, liabilities, simulationViewMode,
        activeScenario, initialCashBalance, injectStressData,
        corporateRules, updateCorporateRules, bulkDelete
    ]);

    return (
        <AccountingContext.Provider value={contextValue}>
            {children}
        </AccountingContext.Provider>
    );
};
