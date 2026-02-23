import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { useConfig } from '../context/ConfigContext';
import { Download, FileText, Printer, FileSpreadsheet, File, TrendingUp, TrendingDown, Zap, Calculator, Lock, Calendar, History, ShieldCheck, ShieldAlert, FileSearch, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import sheetjs
import { toLocalIsoDate } from '../utils/formatUtils';
import { generateFinancialHash } from '../utils/integrity';

type Tab = 'bs' | 'pl' | 'cf' | 'ce' | 'tb';

import { STANDARD_ACCOUNTS, getAccountCategory, getAccountNature, isArAccount, CashPolicy } from '../constants/accounts';
import { calculateFinancials } from '../bridge/StrategicBridge';

const FinancialStatements: React.FC<{ setTab?: (tab: string) => void }> = ({ setTab }) => {
    const { subLedger, config, periods, ledger, systemNow, initialCashBalance } = useAccounting();
    const { tenantInfo } = useConfig();

    // Intelligent Initialization from Context
    const [activeTab, setActiveTab] = useState<Tab>(() =>
        (localStorage.getItem('fs_initial_tab') as Tab) || 'bs'
    );

    // Auto-clear the intent so it doesn't persist forever
    // Clear context after consumption
    React.useEffect(() => {
        localStorage.removeItem('fs_initial_tab');
        localStorage.removeItem('fs_start_date');
        localStorage.removeItem('fs_end_date');
        localStorage.removeItem('fs_selected_account');
    }, []);

    const [reportMode, setReportMode] = useState<'provisional' | 'finalized'>('provisional');
    const [selectedAccount, setSelectedAccount] = useState<string | null>(() =>
        localStorage.getItem('fs_selected_account')
    );
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('All');

    // Date Range State (Context or Smart Default)
    const smartDates = useMemo(() => {
        const contextStart = localStorage.getItem('fs_start_date');
        const contextEnd = localStorage.getItem('fs_end_date');

        if (contextStart && contextEnd) {
            return { start: contextStart, end: contextEnd };
        }

        // CONSTITUTION v2.1: The system clock IS local reality.
        const currentSystemDate = systemNow ? new Date(systemNow) : new Date();

        // Default: If systemNow is set (e.g. 2026-04-30), range is 2026-01-01 ~ 2026-04-30
        return {
            start: `${currentSystemDate.getFullYear()}-01-01`,
            end: systemNow || toLocalIsoDate(currentSystemDate)
        };
    }, [systemNow]);

    const [startDate, setStartDate] = useState<string>(smartDates.start);
    const [endDate, setEndDate] = useState<string>(smartDates.end);

    // [INTEGRITY L4] Verification State
    const [verificationResult, setVerificationResult] = useState<{
        status: 'IDLE' | 'VERIFIED' | 'TAMPERED' | 'ERROR';
        message: string;
        details?: any;
    }>({ status: 'IDLE', message: '' });

    // [Sync Engine] Ensure reports follow the global system timeline
    React.useEffect(() => {
        setStartDate(smartDates.start);
        setEndDate(smartDates.end);
    }, [smartDates]);

    const setPeriod = (type: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
        // CONSTITUTION v2.1: Use systemNow as base for relative periods
        const now = new Date(systemNow);
        let start = new Date(now.getFullYear(), now.getMonth(), 1);
        let end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        if (type === 'lastMonth') {
            start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            end = new Date(now.getFullYear(), now.getMonth(), 0);
        } else if (type === 'thisQuarter') {
            const quarter = Math.floor(now.getMonth() / 3);
            start = new Date(now.getFullYear(), quarter * 3, 1);
            end = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        } else if (type === 'thisYear') {
            start = new Date(now.getFullYear(), 0, 1);
            end = new Date(now.getFullYear(), 11, 31);
        } else if (type === 'all') {
            // Use first/last known ledger dates or a wide range relative to now
            const sorted = ledger.map(e => e.date).sort();
            start = new Date(sorted[0] || '2023-01-01');
            end = new Date(sorted[sorted.length - 1] || '2029-12-31');
        }

        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const shiftMonth = (dir: number) => {
        const current = new Date(startDate);
        const start = new Date(current.getFullYear(), current.getMonth() + dir, 1);
        const end = new Date(current.getFullYear(), current.getMonth() + dir + 1, 0);
        setStartDate(start.toISOString().split('T')[0]);
        setEndDate(end.toISOString().split('T')[0]);
    };

    const costCenters = useMemo(() => ['All', ...Array.from(new Set(subLedger.map(e => e.costCenter || 'HQ'))).sort()], [subLedger]);

    const latestClosedPeriod = useMemo(() => {
        const closed = periods.filter(p => p.status === 'CLOSED').sort((a, b) => b.period.localeCompare(a.period));
        return closed.length > 0 ? closed[0].period : null;
    }, [periods]);

    const effectiveLedger = useMemo(() => {
        // CONSTITUTION v2.1: systemNow is the absolute barrier.
        // Nothing that happens after systemNow exists in this world view.
        const worldBarrier = systemNow ? systemNow : '9999-12-31';

        let data = subLedger.filter(e => e.date <= worldBarrier);

        if (reportMode === 'finalized') {
            if (!latestClosedPeriod) return [];
            data = data.filter(e => e.date <= `${latestClosedPeriod}-31`);
        }
        return data;
    }, [subLedger, reportMode, latestClosedPeriod, systemNow]);

    // --- Core Accounting Engine: Movement TB for Reports ---
    const movementMap = useMemo(() => {
        const map = new Map<string, { name: string; category: string; opening: number; debit: number; credit: number; closing: number }>();

        // Helper
        const process = (acc: string, amt: number, isDebit: boolean, target: 'opening' | 'movement') => {
            const cat = getAccountCategory(acc);
            const isDebitNature = ['Asset', 'Expense'].includes(cat);

            // [Advanced Logic] PL Accounts (Revenue/Expense) from "before" the period
            // are automatically closed into Retained Earnings (이익잉여금) to maintain B/S balance.
            if (target === 'opening' && ['Revenue', 'Expense'].includes(cat)) {
                // If it's a Debit (Expense), it decreases Equity (Credit Nature).
                // If it's a Credit (Revenue), it increases Equity.
                process('이익잉여금', amt, isDebit, 'opening');
                return;
            }

            const d = map.get(acc) || { name: acc, category: cat, opening: 0, debit: 0, credit: 0, closing: 0 };

            if (target === 'opening') {
                if (isDebitNature) {
                    if (isDebit) d.opening += amt; else d.opening -= amt;
                } else {
                    if (isDebit) d.opening -= amt; else d.opening += amt;
                }
            } else {
                if (isDebit) d.debit += amt; else d.credit += amt;
            }
            map.set(acc, d);
        };

        // 0. Identify accounts that have transaction history
        // If an account has transactions in the subLedger, we ignore the static 'initialBalance' config
        // to prevent double counting (e.g. user uploaded 2025 data AND set 2026 opening balance).
        const accountsWithTransactions = new Set<string>();
        subLedger.forEach(e => {
            accountsWithTransactions.add(e.debitAccount);
            accountsWithTransactions.add(e.creditAccount);
            if (e.vat) {
                if (e.type === 'Revenue') accountsWithTransactions.add('부가가치세예수금');
                else if (e.type === 'Expense' || e.type === 'Asset') accountsWithTransactions.add('부가가치세대급금');
            }
        });

        // 1. Initial Balances (Unconditional)
        if (config.initialBalances && (selectedCostCenter === 'All' || selectedCostCenter === 'HQ')) {
            config.initialBalances.forEach(ib => {
                const cat = getAccountCategory(ib.account);
                const d = map.get(ib.account) || { name: ib.account, category: cat, opening: 0, debit: 0, credit: 0, closing: 0 };
                // [FIX] opening should always accumulate the base balance
                d.opening += ib.amount;
                map.set(ib.account, d);
            });
        }

        // 2. Process Transactions (Unified Decomposition Logic)
        effectiveLedger.forEach(entry => {
            if (selectedCostCenter !== 'All' && (entry.costCenter || 'HQ') !== selectedCostCenter) return;
            // Note: effectiveLedger is already filtered by systemNow.
            // We only need to check against the REPORTING PERIOD (endDate) here.
            if (entry.date > endDate) return;

            const targetMode = entry.date < startDate ? 'opening' : 'movement';
            const amount = entry.amount || 0;
            const vat = entry.vat || 0;
            const total = amount + vat;

            const catD = getAccountCategory(entry.debitAccount);
            const catC = getAccountCategory(entry.creditAccount);

            // [CONSTITUTION] The core engine logic must be mirrored here
            if (entry.type === 'Payroll' || (catD === 'Expense' && entry.debitAccount.includes('급여'))) {
                process(entry.debitAccount, amount, true, targetMode);
                if (vat > 0) {
                    process('예수금(원천세)', vat, false, targetMode);
                    process(entry.creditAccount, amount - vat, false, targetMode);
                } else {
                    process(entry.creditAccount, amount, false, targetMode);
                }
            } else if (catC === 'Revenue') {
                process(entry.creditAccount, amount, false, targetMode);
                if (vat > 0) process('부가가치세예수금', vat, false, targetMode);
                process(entry.debitAccount, total, true, targetMode);
            } else if (catD === 'Expense' || catD === 'Asset') {
                process(entry.debitAccount, amount, true, targetMode);
                if (vat > 0) process('부가가치세대급금', vat, true, targetMode);
                process(entry.creditAccount, total, false, targetMode);
            } else {
                process(entry.debitAccount, amount, true, targetMode);
                process(entry.creditAccount, amount, false, targetMode);
            }
        });

        // 3. Final Closing Calculation
        map.forEach((val, key) => {
            const isDebitNature = ['Asset', 'Expense'].includes(val.category);
            // If PL Account, strictly speaking Opening should be 0 for 'Period View' if we ignore retained earnings.
            // But this is TB logic. View components (BS/PL) will decide what to render.
            // BS usually needs accumulated Opening. PL usually focuses on Debit/Credit movement.

            val.closing = isDebitNature
                ? val.opening + val.debit - val.credit
                : val.opening + val.credit - val.debit;
        });

        return map;
    }, [subLedger, config, selectedCostCenter, startDate, endDate]);


    // Drill-down Logic
    const drillDownTransactions = useMemo(() => {
        if (!selectedAccount) return [];
        return effectiveLedger.filter(e => {
            if (e.date < startDate) return false; // Filter out pre-period transactions (they are in Opening Balance)
            if (e.date > endDate) return false; // Filter out future transactions

            if (selectedCostCenter !== 'All' && (e.costCenter || 'HQ') !== selectedCostCenter) return false;

            return e.debitAccount === selectedAccount || e.creditAccount === selectedAccount || (e.vat && (e.type === 'Revenue' ? '부가가치세예수금' : (e.type === 'Expense' || e.type === 'Asset') ? '부가가치세대급금' : (e.type === 'Payroll' ? '예수금(원천세)' : null)) === selectedAccount);
        })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [effectiveLedger, selectedAccount, selectedCostCenter, startDate, endDate, activeTab]);

    // ... (rest of metrics logic)


    const accounts = Array.from(movementMap.values());

    const handleExport = async (type: 'excel' | 'pdf') => {
        if (type === 'pdf') {
            window.print();
            return;
        }

        // Excel Export Logic
        let data: any[] = [];
        let fileName = activeTab === 'bs'
            ? `Financial_BS_${endDate}.xlsx`
            : `Financial_${activeTab.toUpperCase()}_${startDate}_${endDate}.xlsx`;

        if (activeTab === 'bs') {
            data = accounts
                .filter(a => ['Asset', 'Liability', 'Equity'].includes(a.category))
                .map(a => ({
                    Category: a.category,
                    Account: a.name,
                    Balance: Math.round(a.closing)
                }));
        } else if (activeTab === 'pl') {
            data = accounts
                .filter(a => ['Revenue', 'Expense'].includes(a.category))
                .map(a => ({
                    Category: a.category,
                    Account: a.name,
                    PeriodMovement: Math.round((a.category === 'Revenue' ? -1 : 1) * (a.closing - a.opening))
                }));
        } else {
            data = accounts.map(a => ({
                Category: a.category,
                Account: a.name,
                Opening: Math.round(a.opening),
                Debit: Math.round(a.debit),
                Credit: Math.round(a.credit),
                Closing: Math.round(a.closing)
            }));
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Statement");

        // [INTEGRITY L4] Generate Canonical Hash for Sealing
        const hash = await generateFinancialHash(data);

        const metadata = [
            ["AccountingFlow Financial Integrity Metadata (Seal v2.0)"],
            ["Field", "Value"],
            ["Hash (SHA-256)", hash],
            ["Algorithm", "Strategic Canonicalization (Zero-Tolerance)"],
            ["Timestamp", new Date().toISOString()],
            ["Tab", activeTab],
            ["Start Date", startDate],
            ["End Date", endDate],
            ["Precision", "Integer (KRW)"]
        ];
        const wsMeta = XLSX.utils.aoa_to_sheet(metadata);
        XLSX.utils.book_append_sheet(wb, wsMeta, "Integrity Metadata");

        XLSX.writeFile(wb, fileName);
    };

    const handleVerifyUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setVerificationResult({ status: 'IDLE', message: 'Analyzing file integrity...' });

        try {
            const reader = new FileReader();
            reader.onload = async (evt) => {
                try {
                    const data = evt.target?.result;
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // 1. Extract Metadata
                    const metaSheet = workbook.Sheets["Integrity Metadata"];
                    if (!metaSheet) {
                        setVerificationResult({ status: 'ERROR', message: '봉인 정보(Metadata)를 찾을 수 없습니다. 외부에서 생성된 파일이거나 위변조되었습니다.' });
                        return;
                    }
                    const metaAoa = XLSX.utils.sheet_to_json(metaSheet, { header: 1 }) as any[][];
                    const storedHash = metaAoa.find(row => row[0] === "Hash (SHA-256)")?.[1];

                    // 2. Extract Data for Replay
                    const dataSheet = workbook.Sheets["Statement"];
                    if (!dataSheet) {
                        setVerificationResult({ status: 'ERROR', message: '회계 데이터(Statement) 시트가 누락되었습니다.' });
                        return;
                    }
                    const rawData = XLSX.utils.sheet_to_json(dataSheet);

                    // 3. Canonical Re-Hashing
                    const currentHash = await generateFinancialHash(rawData);

                    // 4. Verification Check
                    if (currentHash === storedHash) {
                        setVerificationResult({
                            status: 'VERIFIED',
                            message: '무결성 검증 완료. 데이터가 봉인 시점과 100% 일치하며 위변조되지 않았습니다.',
                            details: { hash: currentHash }
                        });
                    } else {
                        setVerificationResult({
                            status: 'TAMPERED',
                            message: '위변조 감지! 데이터가 사후 조작되었거나 엑셀 필드가 변경되었습니다. (Zero-Tolerance Violation)',
                            details: { expected: storedHash, found: currentHash }
                        });
                    }
                } catch (err) {
                    setVerificationResult({ status: 'ERROR', message: '파일 구조 해석 중 오류가 발생했습니다.' });
                }
            };
            reader.readAsBinaryString(file);
        } catch (err) {
            setVerificationResult({ status: 'ERROR', message: '파일을 읽는 중 시스템 오류가 발생했습니다.' });
        }
    };

    // --- Financial Metrics Aggregation ---
    const plMetrics = useMemo(() => {
        // [SYNC] Use the same logic as Dashboard for 100% consistency
        const rangeTransactions = (effectiveLedger || []).filter(e => e.date >= startDate && e.date <= endDate);
        const stats = calculateFinancials(rangeTransactions, undefined, 0, undefined, true);

        const rev = stats.revenue || 0;
        const cogs = stats.cogs || 0;
        const sga = stats.sga || 0;
        const nonOp = stats.nonOperatingExpense || 0;

        return {
            revenue: rev,
            cogs,
            sga,
            grossProfit: rev - cogs,
            operatingIncome: rev - cogs - sga,
            nonOpNet: -nonOp,
            netIncome: rev - cogs - sga - nonOp
        };
    }, [effectiveLedger, startDate, endDate]);

    const bsMetrics = useMemo(() => {
        // [SYNC] Core cumulative calculation at the report's end date
        // cumulativeAtEnd represents the WHOLE financial state at the snapshot moment.
        const cumulativeAtEnd = calculateFinancials(effectiveLedger, endDate, initialCashBalance);

        const totalAssets = cumulativeAtEnd.totalAssets;
        const totalLiabilities = cumulativeAtEnd.totalLiabilities;
        const totalEquity = totalAssets - totalLiabilities;

        return {
            totalAssets,
            totalLiabilities,
            totalEquity,
            actualCashDelta: accounts.filter(a => CashPolicy.includes(a.name)).reduce((s, a) => s + (a.closing - a.opening), 0),
            actualCashBalance: cumulativeAtEnd.cash // Guaranteed to match Dashboard
        };
    }, [accounts, plMetrics, effectiveLedger, endDate, initialCashBalance]);

    // --- Improved Indirect Method Cash Flow (Exhaustive) ---
    const cfMetrics = useMemo(() => {
        const netIncome = plMetrics.netIncome;

        // 1. Operating Activities
        // Non-cash adjustment
        const depreciation = accounts
            .filter(a => a.name.includes('감가상각'))
            .reduce((s, a) => s + (a.debit), 0);

        // Core Working Capital
        const deltaAR = accounts.filter(a => a.name.includes('외상매출') || a.name.includes('미수')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaInventory = accounts.filter(a => a.name.includes('상품') || a.name.includes('재고')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaVAT_Asset = accounts.filter(a => a.name.includes('대급금')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaPrepaid = accounts.filter(a => a.name.includes('선급')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaAP = accounts.filter(a => a.name.includes('외상매입') || a.name.includes('미지급')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaVAT_Liab = accounts.filter(a => a.name.includes('예수금')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaUnearned = accounts.filter(a => a.name.includes('선수')).reduce((s, a) => s + (a.closing - a.opening), 0);

        const coreWCChange = -(deltaAR + deltaInventory + deltaVAT_Asset + deltaPrepaid) + (deltaAP + deltaVAT_Liab + deltaUnearned);

        // 2. Investing Activities
        const invCashFlow = -accounts
            .filter(a => a.category === 'Asset' && ['비품', '기계', '차량', '건물'].some(k => a.name.includes(k)))
            .reduce((s, a) => s + (a.debit - a.credit), 0);

        // 3. Financing Activities
        const finCashFlow = accounts
            .filter(a => (a.category === 'Equity' || a.category === 'Liability') && ['자본', '차입'].some(k => a.name.includes(k)))
            .reduce((s, a) => s + (a.credit - a.debit), 0);

        // 4. Other BS Movements (Exhaustive Reconciler)
        // Identify all accounts already covered
        const coveredNames = new Set([
            ...accounts.filter(a => a.name.includes('감가상각')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('외상매출') || a.name.includes('미수')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('상품') || a.name.includes('재고')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('대급금')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('선급')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('외상매입') || a.name.includes('미지급')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('예수금')).map(a => a.name),
            ...accounts.filter(a => a.name.includes('선수')).map(a => a.name),
            ...accounts.filter(a => a.category === 'Asset' && ['비품', '기계', '차량', '건물'].some(k => a.name.includes(k))).map(a => a.name),
            ...accounts.filter(a => (a.category === 'Equity' || a.category === 'Liability') && ['자본', '차입'].some(k => a.name.includes(k))).map(a => a.name),
            ...accounts.filter(a => CashPolicy.includes(a.name)).map(a => a.name)
        ]);

        const otherBSChange = accounts
            .filter(a => !coveredNames.has(a.name) && ['Asset', 'Liability', 'Equity'].includes(a.category))
            .reduce((sum, a) => {
                const delta = a.closing - a.opening;
                if (a.category === 'Asset') return sum - delta;
                return sum + delta;
            }, 0);

        const opCashFlow = netIncome + depreciation + coreWCChange + otherBSChange;

        return {
            netIncome,
            depreciation,
            workingCapital: coreWCChange,
            otherBSChange,
            breakdown: {
                deltaAR, deltaInventory, deltaVAT_Asset, deltaPrepaid, deltaAP, deltaVAT_Liab, deltaUnearned
            },
            opCashFlow,
            invCashFlow,
            finCashFlow,
            totalCashFlow: opCashFlow + invCashFlow + finCashFlow
        };
    }, [accounts, plMetrics]);

    const isBalanced = Math.abs(bsMetrics.totalAssets - (bsMetrics.totalLiabilities + bsMetrics.totalEquity)) < 100;



    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            {/* Sticky Statement Header & Controls */}
            <div className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight">재무제표 (Financial Statements)</h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Official Financial Reporting & Integrity Analysis</p>
                    </div>
                    <div className="flex gap-2 items-center">
                        <div className={`px-4 py-2 rounded-xl text-[10px] font-black border flex items-center gap-2 ${isBalanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'}`}>
                            <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {isBalanced ? 'BALANCED' : 'IMBALANCED'}
                        </div>

                        <div className="flex bg-[#0B1221] p-1 rounded-xl border border-white/10 mx-2 shadow-inner">
                            <button
                                onClick={() => setReportMode('provisional')}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${reportMode === 'provisional' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                            >
                                PROVISIONAL
                            </button>
                            <button
                                onClick={() => setReportMode('finalized')}
                                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${reportMode === 'finalized' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                            >
                                FINALIZED
                            </button>
                        </div>

                        {/* Hierarchical Period Selector */}
                        <div className="flex items-center gap-2 bg-[#0B1221] p-1.5 rounded-2xl border border-white/10 shadow-inner">
                            <Calendar size={14} className="text-indigo-500 ml-2" />
                            <select
                                value={new Date(startDate).getFullYear()}
                                onChange={(e) => {
                                    const year = parseInt(e.target.value);
                                    setStartDate(`${year}-01-01`);
                                    setEndDate(`${year}-12-31`);
                                }}
                                className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2 border-r border-white/5"
                            >
                                {[2023, 2024, 2025, 2026, 2027, 2028].map(y => <option key={y} value={y} className="bg-[#0B1221]">{y}Y</option>)}
                            </select>

                            <select
                                onChange={(e) => {
                                    const q = parseInt(e.target.value);
                                    if (q === 0) {
                                        const year = new Date(startDate).getFullYear();
                                        setStartDate(`${year}-01-01`);
                                        setEndDate(`${year}-12-31`);
                                    } else {
                                        const year = new Date(startDate).getFullYear();
                                        const startMonth = (q - 1) * 3;
                                        setStartDate(toLocalIsoDate(new Date(year, startMonth, 1)));
                                        setEndDate(toLocalIsoDate(new Date(year, startMonth + 3, 0)));
                                    }
                                }}
                                className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2 border-r border-white/5"
                            >
                                <option value="0" className="bg-[#0B1221]">ALL Q</option>
                                <option value="1" className="bg-[#0B1221]">Q1</option>
                                <option value="2" className="bg-[#0B1221]">Q2</option>
                                <option value="3" className="bg-[#0B1221]">Q3</option>
                                <option value="4" className="bg-[#0B1221]">Q4</option>
                            </select>

                            <select
                                onChange={(e) => {
                                    const m = parseInt(e.target.value);
                                    const year = new Date(startDate).getFullYear();
                                    if (m === 0) {
                                        setStartDate(`${year}-01-01`);
                                        setEndDate(`${year}-12-31`);
                                    } else {
                                        setStartDate(toLocalIsoDate(new Date(year, m - 1, 1)));
                                        setEndDate(toLocalIsoDate(new Date(year, m, 0)));
                                    }
                                }}
                                className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2"
                            >
                                <option value="0" className="bg-[#0B1221]">ALL M</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                    <option key={m} value={m} className="bg-[#0B1221]">{m}M</option>
                                ))}
                            </select>
                        </div>

                        {/* Export Actions */}
                        <div className="flex gap-2">
                            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-5 py-2.5 bg-[#107C41] hover:bg-[#0e6b37] text-white rounded-2xl text-[11px] font-black transition-all shadow-lg active:scale-95"><FileSpreadsheet size={16} /> EXCEL</button>
                            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-5 py-2.5 bg-[#B30B00] hover:bg-[#990900] text-white rounded-2xl text-[11px] font-black transition-all shadow-lg active:scale-95"><FileText size={16} /> PDF</button>
                        </div>
                    </div>
                </div>

                {/* Tabs & Verification Area */}
                <div className="flex flex-col md:flex-row items-end justify-between gap-4">
                    <div className="flex gap-2 bg-[#151D2E] p-1.5 rounded-xl border border-white/5 w-fit shadow-inner">
                        {['bs', 'pl', 'tb', 'cf', 'ce'].map(tabId => (
                            <button
                                key={tabId}
                                onClick={() => setActiveTab(tabId as Tab)}
                                className={`px-6 py-2 rounded-lg text-xs font-black transition-all ${activeTab === tabId ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            >
                                {tabId === 'tb' ? '합계잔액시산표' : tabId.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    {/* [INTEGRITY L4] Verification Zone */}
                    <div className="flex items-center gap-4 bg-[#0B1221] p-2 pr-4 rounded-2xl border border-white/10 shadow-inner">
                        <div className="flex flex-col items-end pr-3 border-r border-white/5">
                            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Sealing Engine</span>
                            <div className="flex items-center gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full ${verificationResult.status === 'VERIFIED' ? 'bg-emerald-500 animate-pulse' : verificationResult.status === 'TAMPERED' ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`}></div>
                                <span className={`text-[10px] font-black ${verificationResult.status === 'VERIFIED' ? 'text-emerald-400' : verificationResult.status === 'TAMPERED' ? 'text-rose-400' : 'text-slate-400'}`}>
                                    {verificationResult.status === 'IDLE' ? 'READY' : verificationResult.status}
                                </span>
                            </div>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl transition-all group">
                            <FileSearch size={14} className="text-indigo-400 group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black text-white">VERIFY</span>
                            <input type="file" accept=".xlsx" className="hidden" onChange={handleVerifyUpload} />
                        </label>
                    </div>
                </div>
            </div>

            {/* Verification Result Toast/Banner */}
            {verificationResult.status !== 'IDLE' && (
                <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 animate-in slide-in-from-top-4 duration-300 ${verificationResult.status === 'VERIFIED' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                    verificationResult.status === 'TAMPERED' ? 'bg-rose-500/10 border-rose-500/20 text-rose-400' :
                        'bg-slate-500/10 border-slate-500/20 text-slate-400'
                    }`}>
                    <div className="flex items-center gap-3">
                        {verificationResult.status === 'VERIFIED' ? <ShieldCheck size={24} /> : (verificationResult.status === 'TAMPERED' ? <AlertTriangle size={24} /> : <ShieldAlert size={24} />)}
                        <div>
                            <p className="text-sm font-black">{verificationResult.message}</p>
                            {verificationResult.details && <p className="text-[10px] opacity-60 font-mono mt-1 break-all">Hash: {verificationResult.details.hash || verificationResult.details.found}</p>}
                        </div>
                    </div>
                    <button onClick={() => setVerificationResult({ status: 'IDLE', message: '' })} className="text-xs font-black hover:underline opacity-60">닫기</button>
                </div>
            )}

            {/* Document Content */}
            <div className="bg-white rounded-xl shadow-2xl p-10 text-black font-sans min-h-[800px] relative">
                <div className="absolute inset-0 bg-[#f9f9f7] opacity-50 pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                    <div className="text-center border-b-2 border-black pb-6">
                        <h2 className="text-3xl font-black text-gray-900 mb-2">
                            {activeTab === 'bs' && '재무상태표 (B/S)'}
                            {activeTab === 'pl' && '손익계산서 (P/L)'}
                            {activeTab === 'tb' && '합계잔액시산표 (T/B)'}
                            {activeTab === 'cf' && '현금흐름표 (C/F)'}
                            {activeTab === 'ce' && '자본변동표 (C/E)'}
                        </h2>
                        <p className="text-sm font-bold text-gray-500">
                            {activeTab === 'bs'
                                ? `${endDate} 현재`
                                : `${startDate} ~ ${endDate}`
                            } 기준 | {tenantInfo?.name || '(주) Insightrix-AI'}
                            {reportMode === 'finalized' && (
                                <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] uppercase font-black">
                                    <Lock size={10} /> Finalized
                                </span>
                            )}
                        </p>
                    </div>

                    {reportMode === 'finalized' && !latestClosedPeriod && (
                        <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl text-center">
                            <Lock className="mx-auto text-gray-300 mb-4" size={48} />
                            <p className="text-gray-500 font-bold">확정된 결산 기간이 없습니다.</p>
                            <p className="text-gray-400 text-xs mt-1">결산 및 마감 관리 메뉴에서 먼저 마감을 진행해주세요.</p>
                        </div>
                    )}

                    {/* BS Content */}
                    {activeTab === 'bs' && (
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-lg font-black border-b border-gray-300 pb-2">I. 자산 (Assets)</h3>
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        {accounts
                                            .filter(a => a.category === 'Asset')
                                            .sort((a, b) => {
                                                const sA = STANDARD_ACCOUNTS.find(s => s.name === a.name)?.sortOrder || 999;
                                                const sB = STANDARD_ACCOUNTS.find(s => s.name === b.name)?.sortOrder || 999;
                                                return sA - sB;
                                            })
                                            .map(a => (
                                                <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                                                    <td className="py-2 text-gray-600 group-hover:text-indigo-600 font-medium">{a.name}</td>
                                                    <td className={`py-2 text-right font-mono font-bold group-hover:text-indigo-600 ${a.closing < 0 ? 'text-rose-600' : ''}`}>
                                                        {a.closing < 0 ? '-' : ''}₩{Math.abs(a.closing).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-black text-base border-t-2 border-black">
                                            <td className="py-3">자산 총계</td>
                                            <td className={`py-3 text-right ${bsMetrics.totalAssets < 0 ? 'text-rose-600' : ''}`}>
                                                {bsMetrics.totalAssets < 0 ? '-' : ''}₩{Math.abs(bsMetrics.totalAssets).toLocaleString()}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="space-y-6">
                                <h3 className="text-lg font-black border-b border-gray-300 pb-2">II. 부채 및 자본</h3>
                                <div className="space-y-4">
                                    <table className="w-full text-sm">
                                        <thead><tr><th className="text-left font-bold text-gray-400 py-1">[부채]</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {accounts
                                                .filter(a => a.category === 'Liability')
                                                .sort((a, b) => {
                                                    const sA = STANDARD_ACCOUNTS.find(s => s.name === a.name)?.sortOrder || 999;
                                                    const sB = STANDARD_ACCOUNTS.find(s => s.name === b.name)?.sortOrder || 999;
                                                    return sA - sB;
                                                })
                                                .map(a => (
                                                    <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                                                        <td className="py-2 text-gray-600 group-hover:text-indigo-600 font-medium">{a.name}</td>
                                                        <td className={`py-2 text-right font-mono font-bold group-hover:text-indigo-600 ${a.closing < 0 ? 'text-rose-600' : ''}`}>
                                                            {a.closing < 0 ? '-' : ''}₩{Math.abs(a.closing).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            <tr className="font-black">
                                                <td className="py-2">부채 총계</td>
                                                <td className={`py-2 text-right ${bsMetrics.totalLiabilities < 0 ? 'text-rose-600' : ''}`}>
                                                    {bsMetrics.totalLiabilities < 0 ? '-' : ''}₩{Math.abs(bsMetrics.totalLiabilities).toLocaleString()}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table className="w-full text-sm">
                                        <thead><tr><th className="text-left font-bold text-gray-400 py-1">[자본]</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {accounts
                                                .filter(a => a.category === 'Equity')
                                                .sort((a, b) => {
                                                    const sA = STANDARD_ACCOUNTS.find(s => s.name === a.name)?.sortOrder || 999;
                                                    const sB = STANDARD_ACCOUNTS.find(s => s.name === b.name)?.sortOrder || 999;
                                                    return sA - sB;
                                                })
                                                .map(a => (
                                                    <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                                                        <td className="py-2 text-gray-600 group-hover:text-indigo-600 font-medium">{a.name}</td>
                                                        <td className={`py-2 text-right font-mono font-bold group-hover:text-indigo-600 ${a.closing < 0 ? 'text-rose-600' : ''}`}>
                                                            {a.closing < 0 ? '-' : ''}₩{Math.abs(a.closing).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                ))}
                                            <tr className={`${plMetrics.netIncome < 0 ? 'text-rose-600' : 'text-blue-600'} font-bold`}>
                                                <td className="py-2">{plMetrics.netIncome < 0 ? '당기순손실 (Net Loss)' : '당기순이익 (Net Income)'}</td>
                                                <td className="py-2 text-right">
                                                    {plMetrics.netIncome < 0 ? '-' : ''}₩{Math.abs(plMetrics.netIncome).toLocaleString()}
                                                </td>
                                            </tr>
                                            <tr className="font-black bg-gray-50"><td className="py-3 px-2">자본 총계</td><td className="py-3 px-2 text-right">₩{bsMetrics.totalEquity.toLocaleString()}</td></tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pt-4 border-t-2 border-black flex justify-between font-black text-lg">
                                    <span>부채와자본 총계</span>
                                    <span>₩{(bsMetrics.totalLiabilities + bsMetrics.totalEquity).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PL Content */}
                    {activeTab === 'pl' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <h3 className="text-xl font-black text-center mb-6 border-b-2 border-black pb-2">손익계산서 (Income Statement)</h3>
                            <table className="w-full text-sm font-medium">
                                <tbody className="divide-y divide-gray-200">
                                    <tr onClick={() => setSelectedAccount('GROUP:REVENUE')} className="bg-gray-50/50 cursor-pointer hover:bg-indigo-50 transition-colors">
                                        <td className="p-3 font-black">I. 매출액 (Sales)</td>
                                        <td className="p-3 text-right font-bold w-40">₩{plMetrics.revenue.toLocaleString()}</td>
                                    </tr>
                                    {accounts.filter(a => (getAccountNature(a.name) === 'NON_OPERATING' && (a.category === 'Revenue' || a.name.includes('매출'))) && (a.closing - a.opening) !== 0).map(a => (
                                        <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                            <td className="p-2 pl-10 text-gray-500 font-medium">{a.name}</td>
                                            <td className="p-2 text-right text-gray-600 font-mono italic">₩{Math.abs(a.closing - a.opening).toLocaleString()}</td>
                                        </tr>
                                    ))}

                                    <tr onClick={() => setSelectedAccount('GROUP:COGS')} className="bg-gray-50/50 cursor-pointer hover:bg-rose-50 transition-colors">
                                        <td className="p-3 font-black">II. 매출원가 (COGS)</td>
                                        <td className="p-3 text-right font-bold w-40">₩{plMetrics.cogs.toLocaleString()}</td>
                                    </tr>
                                    {accounts.filter(a => getAccountNature(a.name) === 'COGS' && (a.closing - a.opening) !== 0).map(a => (
                                        <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-slate-50 transition-colors">
                                            <td className="p-2 pl-10 text-gray-500 font-medium">{a.name}</td>
                                            <td className="p-2 text-right text-gray-600 font-mono italic">₩{(a.closing - a.opening).toLocaleString()}</td>
                                        </tr>
                                    ))}

                                    <tr className="bg-indigo-50/50">
                                        <td className="p-3 font-black text-indigo-700">III. 매출총이익 (Gross Profit)</td>
                                        <td className="p-3 text-right font-bold text-indigo-700">₩{plMetrics.grossProfit.toLocaleString()}</td>
                                    </tr>

                                    <tr className="bg-gray-50/50">
                                        <td className="p-3 font-black">IV. 판관비 (Operating Expenses / SG&A)</td>
                                        <td className="p-3 text-right font-bold w-40">₩{plMetrics.sga.toLocaleString()}</td>
                                    </tr>
                                    {accounts
                                        .filter(a => getAccountNature(a.name) === 'SG&A' && (a.closing - a.opening) !== 0)
                                        .sort((a, b) => {
                                            const sA = STANDARD_ACCOUNTS.find(s => s.name === a.name)?.sortOrder || 999;
                                            const sB = STANDARD_ACCOUNTS.find(s => s.name === b.name)?.sortOrder || 999;
                                            return sA - sB;
                                        })
                                        .map(a => (
                                            <tr key={a.name} onClick={() => setSelectedAccount(a.name)} className="cursor-pointer hover:bg-indigo-50 transition-colors group">
                                                <td className="p-2 pl-10 text-gray-500 group-hover:text-indigo-600 font-medium">{a.name}</td>
                                                <td className="p-2 text-right text-gray-600 group-hover:text-indigo-600 font-mono">₩{Math.abs(a.closing - a.opening).toLocaleString()}</td>
                                            </tr>
                                        ))}

                                    <tr className={`${plMetrics.netIncome < 0 ? 'bg-rose-600' : 'bg-gray-900'} text-white border-t-2 border-black transition-colors`}>
                                        <td className="p-4 text-lg font-black">
                                            V. {plMetrics.netIncome < 0 ? '당기순손실 (Net Loss)' : '당기순이익 (Net Income)'}
                                        </td>
                                        <td className="p-4 text-right text-xl font-black">
                                            {plMetrics.netIncome < 0 ? '-' : ''}₩{Math.abs(plMetrics.netIncome).toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* CE Content */}
                    {activeTab === 'ce' && (
                        <div className="max-w-2xl mx-auto space-y-6">
                            <h3 className="text-xl font-black text-center mb-6 border-b-2 border-black pb-2">자본변동표 (Statement of Changes in Equity)</h3>
                            <table className="w-full text-sm font-medium">
                                <thead className="bg-gray-100 uppercase text-xs font-black text-gray-500">
                                    <tr>
                                        <th className="p-3 text-left">항목 (Item)</th>
                                        <th className="p-3 text-right">자본금</th>
                                        <th className="p-3 text-right">이익잉여금</th>
                                        <th className="p-3 text-right">합계</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr>
                                        <td className="p-3 font-bold">1. 기초잔액 (Beginning Balance)</td>
                                        <td className="p-3 text-right text-gray-500">-</td>
                                        <td className="p-3 text-right text-gray-500">-</td>
                                        <td className="p-3 text-right font-bold text-gray-600">-</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-bold text-blue-600">2. 유상증자 (Capital Increase)</td>
                                        <td
                                            onClick={() => setSelectedAccount('자본금 (Capital)')}
                                            className="p-3 text-right text-blue-600 cursor-pointer hover:bg-indigo-50 transition-colors border rounded-lg border-transparent hover:border-indigo-100"
                                        >
                                            ₩{(accounts.find(a => a.name.includes('자본'))?.closing || 0).toLocaleString()}
                                        </td>
                                        <td className="p-3 text-right text-gray-400">-</td>
                                        <td className="p-3 text-right font-bold text-blue-600">₩{(accounts.find(a => a.name.includes('자본'))?.closing || 0).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="p-3 font-bold text-emerald-600">3. 당기순이익 (Net Income)</td>
                                        <td className="p-3 text-right text-gray-400">-</td>
                                        <td onClick={() => setSelectedAccount('GROUP:NET_INCOME')} className="p-3 text-right text-emerald-600 cursor-pointer hover:bg-emerald-50 rounded">₩{plMetrics.netIncome.toLocaleString()}</td>
                                        <td onClick={() => setSelectedAccount('GROUP:NET_INCOME')} className="p-3 text-right font-bold text-emerald-600 cursor-pointer hover:bg-emerald-50 rounded">₩{plMetrics.netIncome.toLocaleString()}</td>
                                    </tr>
                                    <tr className="bg-gray-900 text-white border-t-2 border-black">
                                        <td className="p-4 font-black">4. 기말잔액 (Ending Balance)</td>
                                        <td className="p-4 text-right font-bold">₩{(accounts.find(a => a.name.includes('자본'))?.closing || 0).toLocaleString()}</td>
                                        <td className="p-4 text-right font-bold">₩{plMetrics.netIncome.toLocaleString()}</td>
                                        <td className="p-4 text-right font-black text-lg">₩{bsMetrics.totalEquity.toLocaleString()}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* TB Content - Summation Trial Balance (합계잔액시산표) */}
                    {activeTab === 'tb' && (
                        <div className="space-y-6 overflow-x-auto">
                            <table className="w-full text-xs border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100 font-black text-center border-b-2 border-black">
                                        <th className="p-3 border-x border-gray-300 w-1/5" colSpan={2}>차변 (Debit)</th>
                                        <th className="p-3 border-x border-gray-300 w-1/5 bg-white" rowSpan={2}>계정과목</th>
                                        <th className="p-3 border-x border-gray-300 w-1/5" colSpan={2}>대변 (Credit)</th>
                                    </tr>
                                    <tr className="bg-gray-50 font-bold text-center border-b border-gray-300">
                                        <th className="p-2 border-x border-gray-300">잔액</th>
                                        <th className="p-2 border-x border-gray-300">합계</th>
                                        <th className="p-2 border-x border-gray-300">합계</th>
                                        <th className="p-2 border-x border-gray-300">잔액</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {(() => {
                                        // 1. Pre-calculate processed rows and totals for absolute consistency
                                        const rows = accounts
                                            .sort((a, b) => {
                                                const sA = STANDARD_ACCOUNTS.find(s => s.name === a.name)?.sortOrder || 999;
                                                const sB = STANDARD_ACCOUNTS.find(s => s.name === b.name)?.sortOrder || 999;
                                                return sA - sB;
                                            })
                                            .map(a => {
                                                const isDr = ['Asset', 'Expense'].includes(a.category);

                                                // [FIX] Decompose opening into its Dr/Cr components based on sign and nature
                                                // Nature logic: Assets/Expenses are Dr nature. Opening > 0 means Dr.
                                                // Liabilities/Equity/Revenue are Cr nature. Opening > 0 means Cr.
                                                // If Opening < 0, it moves to the opposite side.
                                                const openingDr = isDr ? (a.opening > 0 ? a.opening : 0) : (a.opening < 0 ? Math.abs(a.opening) : 0);
                                                const openingCr = !isDr ? (a.opening > 0 ? a.opening : 0) : (a.opening < 0 ? Math.abs(a.opening) : 0);

                                                const sumDr = openingDr + a.debit;
                                                const sumCr = openingCr + a.credit;
                                                const bal = sumDr - sumCr;

                                                return { name: a.name, sumDr, sumCr, bal };
                                            });

                                        const footTotals = rows.reduce((acc, r) => ({
                                            balDr: acc.balDr + (r.bal > 0 ? r.bal : 0),
                                            sumDr: acc.sumDr + r.sumDr,
                                            sumCr: acc.sumCr + r.sumCr,
                                            balCr: acc.balCr + (r.bal < 0 ? Math.abs(r.bal) : 0)
                                        }), { balDr: 0, sumDr: 0, sumCr: 0, balCr: 0 });

                                        return (
                                            <>
                                                {rows.map(r => (
                                                    <tr key={r.name} onClick={() => setSelectedAccount(r.name)} className="cursor-pointer hover:bg-indigo-50 transition-colors group text-center">
                                                        <td className="p-2 border-x border-gray-200 text-right font-mono font-bold text-indigo-700">
                                                            {r.bal > 0 ? `₩${r.bal.toLocaleString()}` : ''}
                                                        </td>
                                                        <td className="p-2 border-x border-gray-200 text-right font-mono text-gray-500">
                                                            {r.sumDr > 0 ? `₩${r.sumDr.toLocaleString()}` : ''}
                                                        </td>
                                                        <td className="p-2 border-x border-gray-200 font-bold text-gray-900 bg-gray-50/30">
                                                            {r.name}
                                                        </td>
                                                        <td className="p-2 border-x border-gray-200 text-right font-mono text-gray-500">
                                                            {r.sumCr > 0 ? `₩${r.sumCr.toLocaleString()}` : ''}
                                                        </td>
                                                        <td className="p-2 border-x border-gray-200 text-right font-mono font-bold text-rose-700">
                                                            {r.bal < 0 ? `₩${Math.abs(r.bal).toLocaleString()}` : ''}
                                                        </td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-900 text-white font-black text-center sticky bottom-0">
                                                    <td className="p-3 border-x border-white/10 text-right">₩{footTotals.balDr.toLocaleString()}</td>
                                                    <td className="p-3 border-x border-white/10 text-right">₩{footTotals.sumDr.toLocaleString()}</td>
                                                    <td className="p-3 border-x border-white/10">합계 (Total)</td>
                                                    <td className="p-3 border-x border-white/10 text-right">₩{footTotals.sumCr.toLocaleString()}</td>
                                                    <td className="p-3 border-x border-white/10 text-right">₩{footTotals.balCr.toLocaleString()}</td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* CF Content - Real Accounting Logic */}
                    {activeTab === 'cf' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">간접법 (Indirect Method) 분석 기록</p>
                                <table className="w-full text-sm border-separate border-spacing-y-2">
                                    <tbody>
                                        <tr className="bg-gray-900 text-white rounded-lg">
                                            <td className="p-3 font-black rounded-l-lg">I. 영업활동으로 인한 현금흐름</td>
                                            <td className="p-3 text-right font-black rounded-r-lg">₩{(cfMetrics.opCashFlow || 0).toLocaleString()}</td>
                                        </tr>
                                        <tr className="text-gray-600 cursor-pointer hover:bg-indigo-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:NET_INCOME')}><td className="pl-6">1. 당기순이익 (Net Income)</td><td className="text-right font-bold">₩{(cfMetrics.netIncome || 0).toLocaleString()}</td></tr>
                                        <tr className="text-emerald-600 cursor-pointer hover:bg-emerald-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:DEPRECIATION')}><td className="pl-6">2. 현금유출이 없는 비용 가산 (감가상각비 등)</td><td className="text-right font-bold text-emerald-600">+₩{(cfMetrics.depreciation || 0).toLocaleString()}</td></tr>
                                        <tr className="text-rose-600 cursor-pointer hover:bg-rose-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:WORKING_CAPITAL')}><td className="pl-6">3. 영업자산/부채의 변동 (Working Capital)</td><td className="text-right font-bold text-rose-600">₩{(cfMetrics.workingCapital || 0).toLocaleString()}</td></tr>
                                        <tr className="text-slate-400 hover:bg-slate-50 transition-colors rounded"><td className="pl-6">4. 기타 자산/부채 변동 (Other Adjustments)</td><td className="text-right font-bold">₩{(cfMetrics.otherBSChange || 0).toLocaleString()}</td></tr>

                                        <tr className="bg-gray-100"><td className="p-3 font-black">II. 투자활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{(cfMetrics.invCashFlow || 0).toLocaleString()}</td></tr>
                                        <tr
                                            onClick={() => setSelectedAccount('GROUP:INVESTING')}
                                            className="cursor-pointer hover:bg-indigo-100 transition-colors text-gray-500 rounded"
                                        >
                                            <td className="pl-6 py-1">유형자산 취득 등 (Investments)</td>
                                            <td className="text-right pr-1">₩{(cfMetrics.invCashFlow || 0).toLocaleString()}</td>
                                        </tr>
                                        <tr className="bg-gray-100"><td className="p-3 font-black">III. 재무활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{(cfMetrics.finCashFlow || 0).toLocaleString()}</td></tr>
                                        <tr
                                            onClick={() => setSelectedAccount('GROUP:FINANCING')}
                                            className="cursor-pointer hover:bg-indigo-100 transition-colors text-gray-500 rounded"
                                        >
                                            <td className="pl-6 py-1">자본금 증감/차입금 상환 등 (Financing)</td>
                                            <td className="text-right pr-1">₩{(cfMetrics.finCashFlow || 0).toLocaleString()}</td>
                                        </tr>

                                        <tr className="border-t-4 border-double border-black bg-gray-200">
                                            <td className="p-4 font-black text-lg flex items-center gap-2">
                                                IV. 당기 현금의 순증감
                                                {Math.abs((cfMetrics.totalCashFlow || 0) - (bsMetrics.actualCashDelta || 0)) < 100 && (
                                                    <span className="px-2 py-0.5 bg-emerald-500 text-white text-[10px] rounded font-black uppercase">Reconciled</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right font-black text-xl">₩{(cfMetrics.totalCashFlow || 0).toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-4">
                                <Zap className="text-indigo-400 shrink-0" size={20} />
                                <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                                    [Financial Insight] Movement TB를 분석한 결과, 운전자본(Working Capital)의 변동이 현금 유출의 주요 원인으로 파악되었습니다. 특히 매출채권의 증가 속도가 매출 성장보다 빠를 경우 유동성 경고가 발생할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stamp */}
                <div className="absolute bottom-10 right-10 opacity-70 rotate-[-15deg] pointer-events-none">
                    <div className="w-28 h-28 border-4 border-rose-400 rounded-full flex flex-col items-center justify-center text-rose-400 font-black uppercase text-center">
                        <span className="text-[10px]">Verified By</span>
                        <span className="text-sm leading-tight font-black">AI Controller<br />Engine</span>
                    </div>
                </div>
            </div>

            {/* Drill-down Modal (Ledger View) - Updated with Grouping */}
            {selectedAccount && (() => {
                // [Drill-down Enhancement] Determine if we are in "Single Account Mode" or "Group Mode"
                const isGroupMode = selectedAccount.startsWith('GROUP:');

                let targetAccounts: any[] = [];
                let modalTitle = selectedAccount;
                let modalCategory = 'General';

                if (isGroupMode) {
                    if (selectedAccount === 'GROUP:DEPRECIATION') {
                        targetAccounts = accounts.filter(a => a.name.includes('감가상각'));
                        modalTitle = '현금유출이 없는 비용 (Non-cash Expenses)';
                        modalCategory = 'Adjustment';
                    } else if (selectedAccount === 'GROUP:WORKING_CAPITAL') {
                        targetAccounts = accounts.filter(a =>
                            (['외상매출', '미수', '상품', '재고', '대급금', '선급', '외상매입', '미지급', '예수금', '선수'].some(k => a.name.includes(k))) ||
                            (a.name.includes('보증금') && a.category === 'Asset')
                        );
                        // [Fix] Broadened scope to include Deposits and Accrued items
                        modalTitle = '영업자산/부채의 변동 (Working Capital Changes)';
                        modalCategory = 'Operating Activity';
                    } else if (selectedAccount === 'GROUP:BURN_RATE') {
                        targetAccounts = accounts.filter(a => a.category === 'Expense');
                        modalTitle = '월간 지출 상세 (Burn Rate Reference)';
                        modalCategory = 'Cash Outflow';
                    } else if (selectedAccount === 'GROUP:NET_INCOME') {
                        targetAccounts = accounts.filter(a => ['Revenue', 'Expense'].includes(a.category) || a.name.includes('매출') || a.name.includes('원가'));
                        modalTitle = '당기순이익 상세 (Net Income Breakdown)';
                        modalCategory = 'P/L';
                    } else if (selectedAccount === 'GROUP:REVENUE') {
                        targetAccounts = accounts.filter(a => a.category === 'Revenue' || a.name.includes('매출'));
                        modalTitle = '매출액 총계 상세 (Total Revenue)';
                        modalCategory = 'P/L Revenue';
                    } else if (selectedAccount === 'GROUP:COGS') {
                        targetAccounts = accounts.filter(a => a.name.includes('원가'));
                        modalTitle = '매출원가 총계 상세 (Total COGS)';
                        modalCategory = 'P/L COGS';
                    } else if (selectedAccount === 'GROUP:INVESTING') {
                        targetAccounts = accounts.filter(a => a.category === 'Asset' && ['비품', '기계', '차량', '건물'].some(k => a.name.includes(k)));
                        modalTitle = '투자활동 현금흐름 상세 (Investing CF)';
                        modalCategory = 'Investing';
                    } else if (selectedAccount === 'GROUP:FINANCING') {
                        targetAccounts = accounts.filter(a => (a.category === 'Equity' || a.category === 'Liability') && ['자본', '차입'].some(k => a.name.includes(k)));
                        modalTitle = '재무활동 현금흐름 상세 (Financing CF)';
                        modalCategory = 'Financing';
                    }
                } else {
                    const acc = accounts.find(a => a.name === selectedAccount);
                    if (acc) targetAccounts = [acc];
                }

                // Calculate Opening Balance for the target set
                // Note: For P/L (Net Income), Opening is usually 0 for the period view, but we sum what's in the map.
                // Calculate Opening Balance for the target set
                // [Fix] For Cash Flow 'Changes' view, we focus on the Delta, not the Balance Sheet position.
                // Setting opening to 0 ensures the running balance reflects the cumulative impact during the period.
                let opening = 0;
                if (selectedAccount === 'GROUP:WORKING_CAPITAL') {
                    opening = 0;
                } else {
                    opening = targetAccounts.reduce((sum, a) => sum + (a.opening || 0), 0);
                }

                // Determine "Nature" for visual coloring (Debit vs Credit)
                // If mixed, default to Asset/Debit nature
                const isDebitNature = targetAccounts.every(a => ['Asset', 'Expense'].includes(a.category))
                    || (selectedAccount === 'GROUP:WORKING_CAPITAL' && false) // WC is mixed, but treat neutral or specific logic?
                    || (selectedAccount === 'GROUP:DEPRECIATION'); // Expense is Debit nature


                // [Drill-down Enhancement] Filter transactions for the group
                const filteredTransactions = effectiveLedger.filter(e => {
                    if (e.date < startDate) return false;
                    if (e.date > endDate) return false;
                    if (selectedCostCenter !== 'All' && (e.costCenter || 'HQ') !== selectedCostCenter) return false;

                    if (isGroupMode) {
                        if (selectedAccount === 'GROUP:BURN_RATE') {
                            // Burn Rate reference includes all Expenses and Payroll
                            return e.type === 'Expense' || e.type === 'Payroll';
                        }
                        const targetNames = new Set(targetAccounts.map(a => a.name));
                        // Check if ANY side of the transaction touches the target accounts
                        // Note: Complex logic for VAT/Split is simplified here to "Does it touch?"
                        // Ideally we should use the same logic as drillDownTransactions but adapted for groups.
                        const d = e.debitAccount;
                        const c = e.creditAccount;
                        // Check VAT implied accounts
                        if (e.vat) {
                            if (e.type === 'Revenue' && targetNames.has('부가가치세예수금')) return true;
                            if ((e.type === 'Expense' || e.type === 'Asset') && targetNames.has('부가가치세대급금')) return true;
                            if (e.type === 'Payroll' && targetNames.has('예수금(원천세)')) return true;
                        }
                        return targetNames.has(d) || targetNames.has(c);
                    } else {
                        // Single Account Logic (Original)
                        return e.debitAccount === selectedAccount || e.creditAccount === selectedAccount || (e.vat && (e.type === 'Revenue' ? '부가가치세예수금' : (e.type === 'Expense' || e.type === 'Asset') ? '부가가치세대급금' : (e.type === 'Payroll' ? '예수금(원천세)' : null)) === selectedAccount);
                    }
                }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                // [Audit Logic] Standardized Row Decomposition for Drill-down
                const flattenedRows: any[] = [];
                filteredTransactions.forEach(t => {
                    const targetNames = new Set(targetAccounts.map(a => a.name));
                    const amt = t.amount || 0;
                    const vat = t.vat || 0;
                    const total = amt + vat;

                    const catD = getAccountCategory(t.debitAccount);
                    const catC = getAccountCategory(t.creditAccount);

                    // Reconstruct exactly how movementMap processed this entry
                    if (t.type === 'Payroll' || (catD === 'Expense' && t.debitAccount.includes('급여'))) {
                        if (targetNames.has(t.debitAccount)) flattenedRows.push({ ...t, displayAccount: t.debitAccount, displayDesc: t.description, dr: amt, cr: 0 });
                        if (vat > 0 && targetNames.has('예수금(원천세)')) flattenedRows.push({ ...t, displayAccount: '예수금(원천세)', displayDesc: `[원천세] ${t.description}`, dr: 0, cr: vat });
                        if (targetNames.has(t.creditAccount)) flattenedRows.push({ ...t, displayAccount: t.creditAccount, displayDesc: t.description, dr: 0, cr: amt - vat });
                    } else if (catC === 'Revenue') {
                        if (targetNames.has(t.creditAccount)) flattenedRows.push({ ...t, displayAccount: t.creditAccount, displayDesc: t.description, dr: 0, cr: amt });
                        if (vat > 0 && targetNames.has('부가가치세예수금')) flattenedRows.push({ ...t, displayAccount: '부가가치세예수금', displayDesc: `[부가세] ${t.description}`, dr: 0, cr: vat });
                        if (targetNames.has(t.debitAccount)) flattenedRows.push({ ...t, displayAccount: t.debitAccount, displayDesc: t.description, dr: total, cr: 0 });
                    } else if (catD === 'Expense' || catD === 'Asset') {
                        if (targetNames.has(t.debitAccount)) flattenedRows.push({ ...t, displayAccount: t.debitAccount, displayDesc: t.description, dr: amt, cr: 0 });
                        if (vat > 0 && targetNames.has('부가가치세대급금')) flattenedRows.push({ ...t, displayAccount: '부가가치세대급금', displayDesc: `[부가세] ${t.description}`, dr: vat, cr: 0 });
                        if (targetNames.has(t.creditAccount)) flattenedRows.push({ ...t, displayAccount: t.creditAccount, displayDesc: t.description, dr: 0, cr: total });
                    } else {
                        if (targetNames.has(t.debitAccount)) flattenedRows.push({ ...t, displayAccount: t.debitAccount, displayDesc: t.description, dr: amt, cr: 0 });
                        if (targetNames.has(t.creditAccount)) flattenedRows.push({ ...t, displayAccount: t.creditAccount, displayDesc: t.description, dr: 0, cr: amt });
                    }
                });

                let runningBalance = opening;
                const finalRows = flattenedRows.map(r => {
                    if (isDebitNature) runningBalance += (r.dr - r.cr);
                    else runningBalance += (r.cr - r.dr);
                    return { ...r, balance: runningBalance };
                });

                // Grouping Logic for UI
                const grouped = finalRows.reduce((acc, row) => {
                    const key = row.slipNumber || `NO_SLIP_${row.id}`;
                    if (!acc[key]) acc[key] = [];
                    acc[key].push(row);
                    return acc;
                }, {} as Record<string, any[]>);

                const overallDr = finalRows.reduce((s, r) => s + r.dr, 0);
                const overallCr = finalRows.reduce((s, r) => s + r.cr, 0);

                // [Fix] Corrected net impact calculation to be point-in-time vs delta aware
                const isCashDrilldown = !isGroupMode && CashPolicy.includes(selectedAccount);
                const overallNetImpact = finalRows.reduce((acc, t) => {
                    const rowEffect = (isCashDrilldown || selectedAccount === 'GROUP:DEPRECIATION')
                        ? (t.dr - t.cr)
                        : (t.cr - t.dr);
                    return acc + rowEffect;
                }, 0);

                // [Debug Feature] Breakdown for Working Capital
                // This helps users reconcile manual calculations (e.g., 5.145m vs 4.507m) with system logic.
                const wcBreakdown = isGroupMode && selectedAccount === 'GROUP:WORKING_CAPITAL' ? [
                    { label: '매출채권 (AR)', delta: cfMetrics.breakdown.deltaAR, impact: -cfMetrics.breakdown.deltaAR },
                    { label: '재고자산 (Inv)', delta: cfMetrics.breakdown.deltaInventory, impact: -cfMetrics.breakdown.deltaInventory },
                    { label: '선급/자산 (Prepaid/Asset)', delta: cfMetrics.breakdown.deltaVAT_Asset + cfMetrics.breakdown.deltaPrepaid, impact: -(cfMetrics.breakdown.deltaVAT_Asset + cfMetrics.breakdown.deltaPrepaid) },
                    { label: '매입채무 (AP)', delta: cfMetrics.breakdown.deltaAP, impact: cfMetrics.breakdown.deltaAP },
                    { label: '예수금/부채 (Unearned/Liab)', delta: cfMetrics.breakdown.deltaVAT_Liab + cfMetrics.breakdown.deltaUnearned, impact: cfMetrics.breakdown.deltaVAT_Liab + cfMetrics.breakdown.deltaUnearned },
                ] : [];

                // Calculate Total Impact for Display
                const totalWCImpact = wcBreakdown.reduce((sum, item) => sum + item.impact, 0);

                return (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[100] animate-in fade-in duration-200" onClick={() => setSelectedAccount(null)}>
                        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden border border-white/10" onClick={e => e.stopPropagation()}>
                            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                                        <FileText size={20} className="text-gray-400" />
                                        {modalTitle}
                                    </h3>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded border bg-blue-50 text-blue-600 border-blue-200`}>
                                            {modalCategory}
                                        </span>
                                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Grouped Transaction History</p>
                                    </div>
                                </div>
                                <button onClick={() => {
                                    setSelectedAccount(null);
                                    const returnTab = localStorage.getItem('fs_return_tab');
                                    if (returnTab) {
                                        localStorage.removeItem('fs_return_tab');
                                        setTab?.(returnTab);
                                    }
                                }} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-900 transition-colors">
                                    <span className="sr-only">Close</span>
                                    <div className="text-2xl leading-none">&times;</div>
                                </button>
                            </div>

                            {/* [Newly Added] Component Breakdown Section */}
                            {selectedAccount === 'GROUP:WORKING_CAPITAL' && (
                                <div className="bg-slate-50 border-b border-slate-100 p-4 grid grid-cols-6 gap-4">
                                    {wcBreakdown.map((item, idx) => (
                                        <div key={idx} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight mb-1">{item.label}</p>
                                            <div className="flex justify-between items-end">
                                                <span className={`font-mono text-sm font-black ${item.delta > 0 ? 'text-slate-800' : 'text-slate-400'}`}>
                                                    {item.delta !== 0 ? `Δ ${item.delta.toLocaleString()}` : '-'}
                                                </span>
                                            </div>
                                            <p className={`text-[10px] text-right font-bold mt-1 ${item.impact > 0 ? 'text-emerald-500' : item.impact < 0 ? 'text-rose-500' : 'text-gray-300'}`}>
                                                {item.impact > 0 ? '+' : ''}{item.impact !== 0 ? item.impact.toLocaleString() : '0'} (Cash)
                                            </p>
                                        </div>
                                    ))}
                                    {/* Total Card */}
                                    <div className="bg-indigo-600 p-3 rounded-lg border border-indigo-500 shadow-sm flex flex-col justify-center">
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-tight mb-1">현금흐름 조정 합계</p>
                                        <p className={`text-lg text-right font-black ${totalWCImpact > 0 ? 'text-emerald-200' : totalWCImpact < 0 ? 'text-rose-200' : 'text-white'}`}>
                                            {totalWCImpact > 0 ? '+' : ''}{totalWCImpact.toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <div className="overflow-y-auto p-0 flex-1 bg-white">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 border-b border-gray-100 z-10 shadow-sm">
                                        <tr>
                                            <th className="p-4 w-32 bg-gray-50">Date</th>
                                            <th className="p-4 w-32 bg-gray-50">Slip #</th>
                                            <th className="p-4 bg-gray-50">Description</th>
                                            <th className="p-4 w-24 bg-gray-50">Dept.</th>
                                            <th className="p-4 w-24 bg-gray-50">Type</th>
                                            <th className="p-4 text-right w-32 bg-gray-50 text-gray-400 border-l border-gray-100">Debit</th>
                                            <th className="p-4 text-right w-32 bg-gray-50 text-gray-400">Credit</th>
                                            <th className="p-4 text-right w-32 bg-slate-100 text-slate-600 border-l border-gray-200">Cash Effect</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        <tr className="bg-yellow-50/50">
                                            <td className="p-4 font-mono text-xs text-gray-400">-</td>
                                            <td className="p-4 font-mono text-xs text-gray-400">-</td>
                                            <td className="p-4 font-bold text-gray-500 italic">
                                                {selectedAccount === '이익잉여금' ? '전기이월 이익잉여금 (Accumulated P&L)' : '기초 잔액 (Opening Balance Brought Forward)'}
                                            </td>
                                            <td className="p-4 font-mono text-xs text-gray-400">-</td>
                                            <td className="p-4 text-gray-400">-</td>
                                            <td className="p-4 text-right font-mono text-gray-400 border-l border-gray-100">-</td>
                                            <td className="p-4 text-right font-mono text-gray-400">-</td>
                                            <td className={`p-4 text-right font-mono font-black border-l border-gray-100 ${opening > 0 ? 'text-indigo-600' : opening < 0 ? 'text-rose-600' : 'text-gray-400'}`}>
                                                ₩{opening.toLocaleString()}
                                            </td>
                                        </tr>

                                        {Object.entries(grouped).map(([slipId, groupRows]) => {
                                            return (
                                                <React.Fragment key={slipId}>
                                                    {(groupRows as any[]).map((t: any, idx: number) => {
                                                        // [Crucial Fix] Standardized Cash Flow Signs for Indirect Method
                                                        // Asset Increase (Dr) -> (-) Cash Outflow
                                                        // Liability Increase (Cr) -> (+) Cash Inflow (NI adjustment)
                                                        // Universal formula for BS items: (Credit - Debit)
                                                        // Exception: Depreciation (Non-cash Expense) adjustment is (Debit - Credit)
                                                        const rowCashEffect = (isCashDrilldown || selectedAccount === 'GROUP:DEPRECIATION')
                                                            ? (t.dr - t.cr)
                                                            : (t.cr - t.dr);

                                                        return (
                                                            <tr key={`${t.id}_${idx}`} className={`hover:bg-gray-50 transition-colors group ${idx === 0 ? 'border-t-2 border-indigo-100/50' : ''} ${idx === (groupRows as any[]).length - 1 ? 'border-b border-gray-100' : ''}`}>
                                                                <td className="p-4 font-mono text-xs text-gray-500">{idx === 0 ? t.date : ''}</td>
                                                                <td className="p-4 font-mono text-xs font-bold text-indigo-500">{idx === 0 ? (t.slipNumber || '-') : ''}</td>
                                                                <td className="p-4 font-medium text-gray-900">
                                                                    <div className="flex flex-col">
                                                                        <span>{t.displayDesc}</span>
                                                                        <span className="text-[10px] text-indigo-400 font-bold uppercase">{t.displayAccount}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="p-4 text-xs text-gray-600">{t.costCenter || '-'}</td>
                                                                <td className="p-4"><span className="px-2 py-1 bg-gray-100 rounded text-[10px] font-bold text-gray-500 uppercase">{t.type}</span></td>
                                                                <td className="p-4 text-right font-mono text-sm border-l border-gray-100">
                                                                    {t.dr > 0 ? <span className="text-emerald-600 font-bold">₩{t.dr.toLocaleString()}</span> : <span className="text-gray-200">-</span>}
                                                                </td>
                                                                <td className="p-4 text-right font-mono text-sm">
                                                                    {t.cr > 0 ? <span className="text-rose-600 font-bold">₩{t.cr.toLocaleString()}</span> : <span className="text-gray-200">-</span>}
                                                                </td>
                                                                <td className={`p-4 text-right font-mono text-sm font-bold bg-slate-50 group-hover:bg-indigo-50/50 border-l border-gray-100 transition-colors ${rowCashEffect > 0 ? 'text-emerald-600' : rowCashEffect < 0 ? 'text-rose-600' : 'text-gray-500'}`}>
                                                                    {rowCashEffect > 0 ? '+' : ''}{rowCashEffect.toLocaleString()}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </React.Fragment>
                                            );
                                        })}

                                        {finalRows.length === 0 && (
                                            <tr>
                                                <td colSpan={8} className="p-20 text-center">
                                                    <div className="flex flex-col items-center gap-4">
                                                        <History className="text-gray-200" size={48} />
                                                        <div className="max-w-md mx-auto">
                                                            <p className="text-gray-500 font-bold">해당 기간 내 신규 거래 내역이 없습니다.</p>
                                                            {selectedAccount === '이익잉여금' && (
                                                                <p className="text-gray-400 text-xs mt-2 leading-relaxed">
                                                                    이익잉여금은 전기(이전 연도)의 누적 당기순이익이 자본으로 전입된 수치입니다. <br />
                                                                    현재 표시된 <span className="text-indigo-600 font-black">₩{opening.toLocaleString()}</span>은 과거 결산 결과가 이월된 기초 잔액입니다.
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-gray-900 text-white z-10 shadow-lg">
                                        <tr className="text-sm">
                                            <td colSpan={5} className="p-4 font-black text-right uppercase tracking-in-expand">
                                                {selectedAccount === 'GROUP:BURN_RATE' ? '기간 총 지출 (Total Outflow)' : '기간 합계'}
                                            </td>
                                            <td className="p-4 text-right font-mono font-bold text-emerald-400 border-l border-gray-700">₩{overallDr.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono font-bold text-rose-400">₩{overallCr.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono font-black text-lg bg-gray-800 border-l border-gray-700">
                                                ₩{overallNetImpact.toLocaleString()}
                                            </td>
                                        </tr>
                                        {selectedAccount === 'GROUP:BURN_RATE' && (
                                            <tr className="bg-rose-950/80 text-rose-200 text-[11px] font-black border-t border-rose-900/50">
                                                <td colSpan={8} className="p-3 px-10 text-right uppercase tracking-widest">
                                                    {(() => {
                                                        const start = new Date(startDate);
                                                        const end = new Date(endDate);
                                                        const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
                                                        const monthlyBurn = (overallDr / days) * 30.41;
                                                        return `선택 기간 분석: 총 ${days}일간 지출 | 월평균 환산액: ₩${Math.round(monthlyBurn).toLocaleString()} (대시보드 기준)`;
                                                    })()}
                                                </td>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right flex justify-end gap-3">
                                <button onClick={() => {
                                    setSelectedAccount(null);
                                    const returnTab = localStorage.getItem('fs_return_tab');
                                    if (returnTab) {
                                        localStorage.removeItem('fs_return_tab');
                                        setTab?.(returnTab);
                                    }
                                }} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg shadow-gray-200">상세 보기 닫기 (Close)</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default FinancialStatements;
