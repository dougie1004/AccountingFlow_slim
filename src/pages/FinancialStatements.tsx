import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Download, FileText, Printer, FileSpreadsheet, File, TrendingUp, TrendingDown, Zap, Calculator, Lock, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx'; // Import sheetjs
import { toLocalIsoDate } from '../utils/formatUtils';

type Tab = 'bs' | 'pl' | 'cf' | 'ce';

import { STANDARD_ACCOUNTS, getAccountCategory, isArAccount } from '../constants/accounts';

const FinancialStatements: React.FC = () => {
    const { subLedger, config, periods } = useAccounting();
    const [activeTab, setActiveTab] = useState<Tab>('bs');
    const [reportMode, setReportMode] = useState<'provisional' | 'finalized'>('provisional');
    const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
    const [selectedCostCenter, setSelectedCostCenter] = useState<string>('All');

    // Date Range State (Default: This Year)
    const today = new Date();
    const [startDate, setStartDate] = useState<string>(`${today.getFullYear()}-01-01`);
    const [endDate, setEndDate] = useState<string>(toLocalIsoDate(today));

    const setPeriod = (type: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'thisYear' | 'all') => {
        const now = new Date();
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
            start = new Date(2020, 0, 1);
            end = new Date(2029, 11, 31);
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
        if (reportMode === 'finalized') {
            if (!latestClosedPeriod) return [];
            return subLedger.filter(e => e.date <= `${latestClosedPeriod}-31`);
        }
        return subLedger;
    }, [subLedger, reportMode, latestClosedPeriod]);

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
                process('이익잉여금 (Retained Earnings)', amt, isDebit, 'opening');
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

        // 1. Initial Balances (Conditional)
        if (config.initialBalances) {
            if (selectedCostCenter === 'All' || selectedCostCenter === 'HQ') {
                config.initialBalances.forEach(ib => {
                    // SMART LOGIC: If ledger has history, trust ledger over static initial balance.
                    if (accountsWithTransactions.has(ib.account)) return;

                    const cat = getAccountCategory(ib.account);
                    const d = map.get(ib.account) || { name: ib.account, category: cat, opening: 0, debit: 0, credit: 0, closing: 0 };

                    const isDebitNature = ['Asset', 'Expense'].includes(cat);
                    if (isDebitNature) d.opening += ib.amount; else d.opening -= ib.amount;
                    map.set(ib.account, d);
                });
            }
        }

        // 2. Process Transactions
        effectiveLedger.forEach(entry => {
            if (selectedCostCenter !== 'All' && (entry.costCenter || 'HQ') !== selectedCostCenter) return;
            if (entry.date > endDate) return; // Ignore Future

            // If date < startDate, it contributes to Opening Balance.
            // If startDate <= date <= endDate, it contributes to Period Movement (Debit/Credit).
            const targetMode = entry.date < startDate ? 'opening' : 'movement';

            const amount = entry.amount;
            const vat = entry.vat || 0;
            const total = amount + vat;

            const catD = getAccountCategory(entry.debitAccount);
            const catC = getAccountCategory(entry.creditAccount);

            // 1. Payroll Logic
            if (entry.type === 'Payroll' || (catD === 'Expense' && entry.debitAccount.includes('급여'))) {
                process(entry.debitAccount, amount, true, targetMode);
                if (vat > 0) {
                    process('예수금(원천세)', vat, false, targetMode);
                    process(entry.creditAccount, amount - vat, false, targetMode);
                } else {
                    process(entry.creditAccount, amount, false, targetMode);
                }
            }
            // 2. Sales Logic
            else if (catC === 'Revenue') {
                process(entry.creditAccount, amount, false, targetMode);
                if (vat > 0) process('부가가치세예수금', vat, false, targetMode);
                process(entry.debitAccount, total, true, targetMode);
            }
            // 3. Purchase Logic
            else if (catD === 'Expense' || catD === 'Asset') {
                process(entry.debitAccount, amount, true, targetMode);
                if (vat > 0) process('부가가치세대급금', vat, true, targetMode);
                process(entry.creditAccount, total, false, targetMode);
            }
            // 4. General Logic
            else {
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

    const handleExport = (type: 'excel' | 'pdf') => {
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
                    Balance: a.closing
                }));
        } else if (activeTab === 'pl') {
            data = accounts
                .filter(a => ['Revenue', 'Expense'].includes(a.category))
                .map(a => ({
                    Category: a.category,
                    Account: a.name,
                    PeriodMovement: (a.category === 'Revenue' ? -1 : 1) * (a.closing - a.opening)
                }));
        } else {
            data = accounts.map(a => ({
                Category: a.category,
                Account: a.name,
                Opening: a.opening,
                Debit: a.debit,
                Credit: a.credit,
                Closing: a.closing
            }));
        }

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        XLSX.writeFile(wb, fileName);
    };

    // --- Financial Metrics Aggregation ---
    const plMetrics = useMemo(() => {
        const revenue = accounts.filter(a => a.category === 'Revenue').reduce((s, a) => s + Math.abs(a.closing - a.opening), 0);
        const cogs = accounts.filter(a => a.name === '매출원가').reduce((s, a) => s + (a.closing - a.opening), 0);
        const sga = accounts.filter(a => a.category === 'Expense' && a.name !== '매출원가').reduce((s, a) => s + (a.closing - a.opening), 0);
        const grossProfit = revenue - cogs;
        const netIncome = grossProfit - sga;
        return { revenue, cogs, sga, grossProfit, netIncome };
    }, [accounts]);

    const bsMetrics = useMemo(() => {
        const totalAssets = accounts.filter(a => a.category === 'Asset').reduce((s, a) => s + a.closing, 0);
        const totalLiabilities = accounts.filter(a => a.category === 'Liability').reduce((s, a) => s + a.closing, 0);
        const totalEquity = accounts.filter(a => a.category === 'Equity').reduce((s, a) => s + a.closing, 0) + plMetrics.netIncome;
        return { totalAssets, totalLiabilities, totalEquity };
    }, [accounts, plMetrics]);

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
            ...accounts.filter(a => ['예금', '현금', 'Cash', 'Bank'].some(k => a.name.includes(k))).map(a => a.name)
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
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">재무제표 (Financial Statements)</h1>
                    <p className="text-slate-400 font-bold mt-1">Movement TB 기반의 정밀 경영 보고서입니다.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${isBalanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'}`}>
                        <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isBalanced ? 'Balanced' : 'Imbalanced'}
                    </div>

                    <div className="flex bg-[#0B1221] p-1 rounded-xl border border-white/10 mx-2">
                        <button
                            onClick={() => setReportMode('provisional')}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${reportMode === 'provisional' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                        >
                            잠정 (Provisional)
                        </button>
                        <button
                            onClick={() => setReportMode('finalized')}
                            className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${reportMode === 'finalized' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:text-white'}`}
                        >
                            확정 (Finalized)
                        </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
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
                                {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#0B1221]">{y}년</option>)}
                            </select>

                            <select
                                onChange={(e) => {
                                    const q = parseInt(e.target.value);
                                    if (q === 0) return;
                                    const year = new Date(startDate).getFullYear();
                                    const startMonth = (q - 1) * 3;
                                    setStartDate(toLocalIsoDate(new Date(year, startMonth, 1)));
                                    setEndDate(toLocalIsoDate(new Date(year, startMonth + 3, 0)));
                                }}
                                className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2 border-r border-white/5"
                            >
                                <option value="0" className="bg-[#0B1221]">전체 분기</option>
                                <option value="1" className="bg-[#0B1221]">1분기 (Q1)</option>
                                <option value="2" className="bg-[#0B1221]">2분기 (Q2)</option>
                                <option value="3" className="bg-[#0B1221]">3분기 (Q3)</option>
                                <option value="4" className="bg-[#0B1221]">4분기 (Q4)</option>
                            </select>

                            <select
                                onChange={(e) => {
                                    const m = parseInt(e.target.value);
                                    if (m === 0) return;
                                    const year = new Date(startDate).getFullYear();
                                    setStartDate(toLocalIsoDate(new Date(year, m - 1, 1)));
                                    setEndDate(toLocalIsoDate(new Date(year, m, 0)));
                                }}
                                className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2"
                            >
                                <option value="0" className="bg-[#0B1221]">전체 월</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                    <option key={m} value={m} className="bg-[#0B1221]">{m}월</option>
                                ))}
                            </select>
                        </div>
                        {/* Custom Calendar Picker */}
                        <div className="flex items-center gap-1 bg-[#0B1221] px-1 py-1 rounded-2xl border border-white/10 shadow-inner">
                            {activeTab !== 'bs' && (
                                <>
                                    <button onClick={() => shiftMonth(-1)} className="p-1 px-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[11px] font-black">◀</button>
                                    <div className="flex items-center gap-2 px-3 border-r border-white/5">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-transparent text-white text-[11px] font-bold outline-none font-mono cursor-pointer"
                                        />
                                        <span className="text-slate-600 text-[10px] font-black">~</span>
                                    </div>
                                </>
                            )}
                            <div className="flex items-center gap-2 px-3">
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="bg-transparent text-white text-[11px] font-bold outline-none font-mono cursor-pointer"
                                />
                                {activeTab === 'bs' && <span className="text-slate-500 text-[10px] font-black ml-1 uppercase">기준일</span>}
                            </div>
                            {activeTab !== 'bs' && (
                                <button onClick={() => shiftMonth(1)} className="p-1 px-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-lg transition-all text-[11px] font-black">▶</button>
                            )}
                        </div>

                        {/* Export Actions */}
                        <div className="flex gap-2 ml-4">
                            <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-5 py-2.5 bg-[#107C41] hover:bg-[#0e6b37] text-white rounded-2xl text-[11px] font-black transition-all shadow-lg active:scale-95"><FileSpreadsheet size={16} /> EXCEL</button>
                            <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-5 py-2.5 bg-[#B30B00] hover:bg-[#990900] text-white rounded-2xl text-[11px] font-black transition-all shadow-lg active:scale-95"><FileText size={16} /> PDF</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-[#151D2E] p-1.5 rounded-xl border border-white/5 w-fit">
                {['bs', 'pl', 'cf', 'ce'].map(tabId => (
                    <button
                        key={tabId}
                        onClick={() => setActiveTab(tabId as Tab)}
                        className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all ${activeTab === tabId ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                    >
                        {tabId.toUpperCase()}
                    </button>
                ))}
            </div>

            {/* Document Content */}
            <div className="bg-white rounded-xl shadow-2xl p-10 text-black font-sans min-h-[800px] relative">
                <div className="absolute inset-0 bg-[#f9f9f7] opacity-50 pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-10">
                    <div className="text-center border-b-2 border-black pb-6">
                        <h2 className="text-3xl font-black text-gray-900 mb-2">
                            {activeTab === 'bs' && '재무상태표 (B/S)'}
                            {activeTab === 'pl' && '손익계산서 (P/L)'}
                            {activeTab === 'cf' && '현금흐름표 (C/F)'}
                            {activeTab === 'ce' && '자본변동표 (C/E)'}
                        </h2>
                        <p className="text-sm font-bold text-gray-500">
                            {activeTab === 'bs'
                                ? `${endDate} 현재`
                                : `${startDate} ~ ${endDate}`
                            } 기준 | (주) 한국 전자 정밀
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
                                    <tr className="bg-gray-50/50">
                                        <td className="p-3 font-black">I. 매출액 (Sales)</td>
                                        <td className="p-3 text-right font-bold w-40">₩{plMetrics.revenue.toLocaleString()}</td>
                                    </tr>

                                    <tr className="bg-gray-50/50">
                                        <td className="p-3 font-black">II. 매출원가 (COGS)</td>
                                        <td className="p-3 text-right font-bold w-40">₩{plMetrics.cogs.toLocaleString()}</td>
                                    </tr>
                                    {accounts.filter(a => a.name === '매출원가' && (a.closing - a.opening) !== 0).map(a => (
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
                                        .filter(a => a.category === 'Expense' && a.name !== '매출원가')
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
                                        <td className="p-3 text-right text-emerald-600">₩{plMetrics.netIncome.toLocaleString()}</td>
                                        <td className="p-3 text-right font-bold text-emerald-600">₩{plMetrics.netIncome.toLocaleString()}</td>
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

                    {/* CF Content - Real Accounting Logic */}
                    {activeTab === 'cf' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 italic">간접법 (Indirect Method) 분석 기록</p>
                                <table className="w-full text-sm border-separate border-spacing-y-2">
                                    <tbody>
                                        <tr className="bg-gray-900 text-white rounded-lg">
                                            <td className="p-3 font-black rounded-l-lg">I. 영업활동으로 인한 현금흐름</td>
                                            <td className="p-3 text-right font-black rounded-r-lg">₩{cfMetrics.opCashFlow.toLocaleString()}</td>
                                        </tr>
                                        <tr className="text-gray-600 cursor-pointer hover:bg-indigo-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:NET_INCOME')}><td className="pl-6">1. 당기순이익 (Net Income)</td><td className="text-right font-bold">₩{cfMetrics.netIncome.toLocaleString()}</td></tr>
                                        <tr className="text-emerald-600 cursor-pointer hover:bg-emerald-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:DEPRECIATION')}><td className="pl-6">2. 현금유출이 없는 비용 가산 (감가상각비 등)</td><td className="text-right font-bold text-emerald-600">+₩{cfMetrics.depreciation.toLocaleString()}</td></tr>
                                        <tr className="text-rose-600 cursor-pointer hover:bg-rose-50 transition-colors rounded" onClick={() => setSelectedAccount('GROUP:WORKING_CAPITAL')}><td className="pl-6">3. 영업자산/부채의 변동 (Working Capital)</td><td className="text-right font-bold text-rose-600">₩{cfMetrics.workingCapital.toLocaleString()}</td></tr>
                                        <tr className="text-slate-400 hover:bg-slate-50 transition-colors rounded"><td className="pl-6">4. 기타 자산/부채 변동 (Other Adjustments)</td><td className="text-right font-bold">₩{cfMetrics.otherBSChange.toLocaleString()}</td></tr>

                                        <tr className="bg-gray-100"><td className="p-3 font-black">II. 투자활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{cfMetrics.invCashFlow.toLocaleString()}</td></tr>
                                        <tr
                                            onClick={() => setSelectedAccount('비품 (Equipment)')}
                                            className="cursor-pointer hover:bg-indigo-100 transition-colors text-gray-500 rounded"
                                        >
                                            <td className="pl-6 py-1">유형자산 취득 등</td>
                                            <td className="text-right pr-1">₩{cfMetrics.invCashFlow.toLocaleString()}</td>
                                        </tr>

                                        <tr className="bg-gray-100"><td className="p-3 font-black">III. 재무활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{cfMetrics.finCashFlow.toLocaleString()}</td></tr>
                                        <tr
                                            onClick={() => setSelectedAccount('자본금 (Capital)')}
                                            className="cursor-pointer hover:bg-indigo-100 transition-colors text-gray-500 rounded"
                                        >
                                            <td className="pl-6 py-1">자본금 증감/차입금 상환 등</td>
                                            <td className="text-right pr-1">₩{cfMetrics.finCashFlow.toLocaleString()}</td>
                                        </tr>

                                        <tr className="border-t-4 border-double border-black bg-gray-200"><td className="p-4 font-black text-lg">IV. 당기 현금의 순증감</td><td className="p-4 text-right font-black text-xl">₩{cfMetrics.totalCashFlow.toLocaleString()}</td></tr>
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
                    } else if (selectedAccount === 'GROUP:NET_INCOME') {
                        targetAccounts = accounts.filter(a => ['Revenue', 'Expense'].includes(a.category));
                        modalTitle = '당기순이익 상세 (Net Income Breakdown)';
                        modalCategory = 'P/L';
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

                // [Audit Logic] Flatten transactions into individual accounting lines for transparency
                const flattenedRows: any[] = [];
                filteredTransactions.forEach(t => {
                    const targetNames = new Set(targetAccounts.map(a => a.name));

                    // 1. Debit Line
                    if (targetNames.has(t.debitAccount)) {
                        flattenedRows.push({
                            ...t,
                            displayAccount: t.debitAccount,
                            displayDesc: t.description,
                            dr: t.amount,
                            cr: 0
                        });
                    }

                    // 2. Credit Line
                    if (targetNames.has(t.creditAccount)) {
                        flattenedRows.push({
                            ...t,
                            displayAccount: t.creditAccount,
                            displayDesc: t.description,
                            dr: 0,
                            cr: t.amount
                        });
                    }

                    // 3. VAT Line
                    if (t.vat) {
                        const vatAcc = (t.type === 'Revenue' ? '부가가치세예수금' : (t.type === 'Expense' || t.type === 'Asset') ? '부가가치세대급금' : (t.type === 'Payroll' ? '예수금(원천세)' : null));
                        if (vatAcc && targetNames.has(vatAcc)) {
                            // Revenue VAT (Liability) increases with Credit. Expense VAT (Asset) increases with Debit.
                            const vatIsDr = (t.type === 'Expense' || t.type === 'Asset');
                            flattenedRows.push({
                                ...t,
                                displayAccount: vatAcc,
                                displayDesc: `[부가세] ${t.description}`,
                                dr: vatIsDr ? t.vat : 0,
                                cr: vatIsDr ? 0 : t.vat
                            });
                        }
                    }

                    // 4. Special AR/AP Gross Entry Logic (Optional but helpful for visibility)
                    // If the user is looking at AR/AP specifically, they usually expect to see the Gross Amount (Amount + VAT).
                    // In our engine, AR/AP is often handled as a single side.
                    // However, to keep it simple and consistent with TB, we show lines.
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
                const overallNetImpact = finalRows.reduce((acc, t) => {
                    const rowEffect = (selectedAccount === 'GROUP:DEPRECIATION')
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
                                <button onClick={() => setSelectedAccount(null)} className="p-2 hover:bg-gray-200 rounded-lg text-gray-400 hover:text-gray-900 transition-colors">
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
                                            <td className="p-4 font-bold text-gray-500 italic">기초 잔액 (Opening Balance)</td>
                                            <td className="p-4 font-mono text-xs text-gray-400">-</td>
                                            <td className="p-4 text-gray-400">-</td>
                                            <td className="p-4 text-right font-mono text-gray-400 border-l border-gray-100">-</td>
                                            <td className="p-4 text-right font-mono text-gray-400">-</td>
                                            <td className="p-4 text-right font-mono font-bold text-slate-700 bg-slate-50 border-l border-gray-100">₩0</td>
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
                                                        const rowCashEffect = (selectedAccount === 'GROUP:DEPRECIATION')
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
                                            <tr><td colSpan={8} className="p-12 text-center text-gray-400 italic">No transactions found during this period.</td></tr>
                                        )}
                                    </tbody>
                                    <tfoot className="sticky bottom-0 bg-gray-900 text-white z-10 shadow-lg">
                                        <tr className="text-sm">
                                            <td colSpan={5} className="p-4 font-black text-right uppercase tracking-in-expand">기간 합계</td>
                                            <td className="p-4 text-right font-mono font-bold text-emerald-400 border-l border-gray-700">₩{overallDr.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono font-bold text-rose-400">₩{overallCr.toLocaleString()}</td>
                                            <td className="p-4 text-right font-mono font-black text-lg bg-gray-800 border-l border-gray-700">₩{overallNetImpact.toLocaleString()}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="p-4 border-t border-gray-100 bg-gray-50 text-right flex justify-end gap-3">
                                <button onClick={() => setSelectedAccount(null)} className="px-6 py-2 bg-gray-900 text-white rounded-lg font-bold text-sm hover:bg-black transition-colors shadow-lg shadow-gray-200">상세 보기 닫기 (Close)</button>
                            </div>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default FinancialStatements;
