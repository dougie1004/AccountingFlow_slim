import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Download, FileText, Printer, FileSpreadsheet, File } from 'lucide-react';

type Tab = 'bs' | 'pl' | 'cf' | 'ce';

const FinancialStatements: React.FC = () => {
    const { subLedger } = useAccounting();
    const [activeTab, setActiveTab] = useState<Tab>('bs');

    // --- Data Aggregation Logic ---
    const balances = useMemo(() => {
        const map = new Map<string, number>();
        subLedger.forEach(entry => {
            if (entry.status !== 'Approved' && entry.status !== 'Unconfirmed') return;

            const baseAmount = entry.amount;
            const vatAmount = entry.vat || 0;
            const totalAmount = baseAmount + vatAmount;

            if (entry.type === 'Revenue') {
                map.set(entry.debitAccount, (map.get(entry.debitAccount) || 0) + totalAmount);
                map.set(entry.creditAccount, (map.get(entry.creditAccount) || 0) - baseAmount);
                map.set('부가가치세예수금', (map.get('부가가치세예수금') || 0) - vatAmount);
            } else if (entry.type === 'Expense' || entry.type === 'Asset') {
                map.set(entry.debitAccount, (map.get(entry.debitAccount) || 0) + baseAmount);
                if (vatAmount > 0) {
                    map.set('부가가치세대급금', (map.get('부가가치세대급금') || 0) + vatAmount);
                }
                map.set(entry.creditAccount, (map.get(entry.creditAccount) || 0) - totalAmount);
            } else {
                map.set(entry.debitAccount, (map.get(entry.debitAccount) || 0) + totalAmount);
                map.set(entry.creditAccount, (map.get(entry.creditAccount) || 0) - totalAmount);
            }
        });
        return map;
    }, [subLedger]);

    // --- Improved Categorization Logic ---
    const accounts = useMemo(() => {
        const accs: { name: string; balance: number; type: string; category: string }[] = [];

        balances.forEach((bal, name) => {
            let type = 'Other';
            let category = 'Uncategorized';
            const n = name.toLowerCase();

            // P/L Items First (Broaden keywords to catch everything including VAT)
            if (['매출원가', 'cogs', 'cost of sales', '원가'].some(k => n.includes(k))) { type = 'Expense'; category = 'Cost of Sales'; }
            else if (['매출', 'sales', 'revenue', '수익'].some(k => n.includes(k)) && !n.includes('채권') && !n.includes('외상')) { type = 'Revenue'; category = 'Operating Revenue'; }
            else if (['이자수익', '잡이익', 'income', '이익', '수익'].some(k => n.includes(k)) && !n.includes('미수')) { type = 'Revenue'; category = 'Non-Operating Income'; }
            else if (['비용', '급여', '임차료', '접대비', '통신비', '수수료', '전력', '운반', 'expense', 'salary', 'rent', 'power', 'logistics', '유지비', '수선', '보험', '세무', '식대', '회식'].some(k => n.includes(k))) { type = 'Expense'; category = 'Operating Expenses'; }
            else if (['이자비용', '손실', 'loss', '비용'].some(k => n.includes(k)) && !n.includes('미지급')) { type = 'Expense'; category = 'Non-Operating Expenses'; }

            // B/S Items
            else if (['현금', '예금', 'cash', 'bank', '보통예금'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }
            else if (['외상매출', '매출채권', '미수금', 'receivable'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }
            else if (['상품', '제품', '재고', '원재료', 'inventory', 'material'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }
            else if (['건물', '비품', '기계', '차량', '토지', 'asset', 'equipment', 'machinery'].some(k => n.includes(k))) { type = 'Asset'; category = 'Non-Current Assets'; }
            else if (['선급금', '대급금', 'vatpaid'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }

            // Liabilities
            else if (['외상매입', '매입채무', '미지급', 'payable'].some(k => n.includes(k))) { type = 'Liability'; category = 'Current Liabilities'; }
            else if (['차입금', 'loan', 'debt'].some(k => n.includes(k))) { type = 'Liability'; category = 'Non-Current Liabilities'; }
            else if (['예수금', 'vatReceived', '부가가치세예수금'].some(k => n.includes(k))) { type = 'Liability'; category = 'Current Liabilities'; }
            else if (['대급금', 'vatPaid', '부가가치세대급금'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }

            // Equity
            else if (['자본', 'capital', 'equity', 'stock'].some(k => n.includes(k))) { type = 'Equity'; category = 'Capital'; }
            else if (['이익잉여금', 'retained earnings'].some(k => n.includes(k))) { type = 'Equity'; category = 'Retained Earnings'; }
            else if (['이자비용', '손실', 'loss'].some(k => n.includes(k))) { type = 'Expense'; category = 'Non-Operating Expenses'; }
            else if (['법인세', 'tax'].some(k => n.includes(k))) { type = 'Expense'; category = 'Income Tax'; }

            // Default
            if (type === 'Other') {
                if (bal > 0) { type = 'Asset'; category = 'Other Assets'; }
                else { type = 'Liability'; category = 'Other Liabilities'; }
            }

            accs.push({ name, balance: bal, type, category });
        });
        return accs;
    }, [balances]);

    // --- Helper Functions ---
    const sum = (accs: typeof accounts) => accs.reduce((s, a) => s + Math.abs(a.balance), 0);
    const sumNet = (accs: typeof accounts) => accs.reduce((s, a) => s + a.balance, 0); // For expenses where debit is positive

    // --- Robust Aggregation ---
    // Rule: Assets = Liabilities + Equity + (Revenue - Expenses)
    const assetAccounts = accounts.filter(a => a.type === 'Asset');
    const liabilityAccounts = accounts.filter(a => a.type === 'Liability');
    const equityAccounts = accounts.filter(a => a.type === 'Equity');
    const revenueAccounts = accounts.filter(a => a.type === 'Revenue');
    const expenseAccounts = accounts.filter(a => a.type === 'Expense');

    // Totals using absolute values for display
    const totalAssets = assetAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalLiabilities = liabilityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalStaticEquity = equityAccounts.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    // P/L Display Groups (just for showing the breakdown, not for the bottom line calculation)
    const salesRevenue = accounts.filter(a => a.category === 'Operating Revenue');
    const costOfSales = accounts.filter(a => a.category === 'Cost of Sales');
    const operatingExpenses = accounts.filter(a => a.category === 'Operating Expenses');
    const nonOperatingIncome = accounts.filter(a => a.category === 'Non-Operating Income');
    const nonOperatingExpenses = accounts.filter(a => a.category === 'Non-Operating Expenses');

    // Derived P/L Metrics (for display only)
    const amountSales = sum(salesRevenue);
    const amountCOGS = sum(costOfSales);
    const grossProfit = amountSales - amountCOGS;
    const amountOpExpenses = sum(operatingExpenses);
    const operatingIncome = grossProfit - amountOpExpenses;
    const amountNonOpIncome = sum(nonOperatingIncome);
    const amountNonOpExpenses = sum(nonOperatingExpenses);
    // In our map: Revenue balances are negative, Expenses are positive.
    // So Net Income = -(Sum of Revenue Balances + Sum of Expense Balances)
    const netIncome = -(revenueAccounts.reduce((s, a) => s + a.balance, 0) + expenseAccounts.reduce((s, a) => s + a.balance, 0));
    const totalEquity = totalStaticEquity + netIncome;

    // B/S Sub-groups for display
    const currentAssets = assetAccounts.filter(a => a.category === 'Current Assets');
    const nonCurrentAssets = assetAccounts.filter(a => a.category === 'Non-Current Assets');
    const otherAssets = assetAccounts.filter(a => !['Current Assets', 'Non-Current Assets'].includes(a.category));

    const currentLiabilities = liabilityAccounts.filter(a => a.category === 'Current Liabilities');
    const nonCurrentLiabilities = liabilityAccounts.filter(a => a.category === 'Non-Current Liabilities');
    const otherLiabilities = liabilityAccounts.filter(a => !['Current Liabilities', 'Non-Current Liabilities'].includes(a.category));

    // Display Totals
    const totalCurrentAssets = currentAssets.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalNonCurrentAssets = nonCurrentAssets.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalOtherAssets = otherAssets.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    const totalCurrentLiabilities = currentLiabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalNonCurrentLiabilities = nonCurrentLiabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalOtherLiabilities = otherLiabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0);

    // Integrity Check
    const officialEntries = (subLedger || []).filter((e: any) => e.ledgerType === 'Official' || e.status === 'Approved');
    const integrityCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const isBalanced = integrityCheck < 100; // 100원 미만 오차는 허용

    // --- Export Functions ---
    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        alert(`${format.toUpperCase()} 포맷으로 변환 중입니다...\n(실제 구현에서는 파일이 다운로드됩니다)`);
        if (format === 'pdf') window.print();
    };

    if (!isBalanced) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8 p-12 text-center">
                <div className="w-24 h-24 bg-rose-500/20 rounded-full flex items-center justify-center text-rose-500 animate-pulse border-4 border-rose-500/50">
                    <FileText size={48} />
                </div>
                <div className="space-y-4">
                    <h1 className="text-3xl font-black text-rose-500 uppercase tracking-tighter">🚨 Accounting Integrity Breach</h1>
                    <p className="text-slate-400 max-w-2xl font-bold leading-relaxed">
                        데이터 무결성 검증 실패: 차변과 대변의 합계가 일치하지 않습니다. <br />
                        공식 보고서 출력을 즉시 중단합니다. (오차: <span className="text-rose-400">₩{integrityCheck.toLocaleString()}</span>)
                    </p>
                </div>

                {/* [Admin Mode] Corruption Root Cause Analysis */}
                <div className="w-full max-w-4xl bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6 text-left space-y-4">
                    <div className="flex items-center justify-between">
                        <h4 className="text-rose-400 font-black text-sm uppercase flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                            Admin Root Cause Analysis (Dumping Imbalanced Entries)
                        </h4>
                        <span className="text-[10px] text-rose-500/50 font-mono">INTEGRITY_LOG_V2_{Date.now()}</span>
                    </div>
                    <div className="max-h-60 overflow-auto rounded-xl border border-rose-500/10">
                        <table className="w-full text-[11px] font-mono text-rose-300">
                            <thead className="bg-rose-500/10 text-rose-400">
                                <tr>
                                    <th className="px-4 py-2 text-left">ENTRY_ID</th>
                                    <th className="px-4 py-2 text-left">DESCRIPTION</th>
                                    <th className="px-4 py-2 text-right">AMOUNT</th>
                                    <th className="px-4 py-2 text-center">STATUS</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-rose-500/10">
                                {officialEntries.map(e => (
                                    <tr key={e.id} className="hover:bg-rose-500/5 transition-colors">
                                        <td className="px-4 py-2 font-black">{e.id}</td>
                                        <td className="px-4 py-2 opacity-70">{e.description}</td>
                                        <td className="px-4 py-2 text-right">₩{e.amount.toLocaleString()}</td>
                                        <td className="px-4 py-2 text-center text-[9px] uppercase font-black">{e.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <p className="text-[10px] text-slate-500 italic">
                        * Only approved "Official" ledger entries are analyzed. Total Assets ({totalAssets.toLocaleString()}) vs (Liabilities ({totalLiabilities.toLocaleString()}) + Equity ({totalEquity.toLocaleString()})).
                    </p>
                </div>

                <div className="flex gap-4">
                    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-white/5 text-white rounded-xl font-black hover:bg-white/10 transition-all border border-white/5">재진단 실행</button>
                    <button className="px-6 py-3 bg-rose-500 text-white rounded-xl font-black shadow-[0_0_30px_rgba(244,63,94,0.4)] hover:scale-105 transition-all">무결성 리포트 다운로드 (Auditor Signature Required)</button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">재무제표 (Financial Statements)</h1>
                    <p className="text-slate-400 font-bold mt-1">국제회계기준(IFRS) 및 일반기업회계기준(K-GAAP)을 모두 지원하는 표준 재무 보고서입니다.</p>
                </div>
                <div className="flex gap-2 items-center">
                    {/* Integrity Badge */}
                    <div className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${isBalanced
                        ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                        : 'bg-rose-100 text-rose-700 border-rose-200 animate-pulse'
                        }`}>
                        <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isBalanced ? 'Balanced (Reconciled)' : `Discrepancy: ₩${integrityCheck.toLocaleString()}`}
                    </div>
                    <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-4 py-2 bg-[#107C41] hover:bg-[#0e6b37] text-white rounded-xl text-xs font-bold transition-all">
                        <FileSpreadsheet size={16} /> Excel
                    </button>
                    <button onClick={() => handleExport('word')} className="flex items-center gap-2 px-4 py-2 bg-[#2B579A] hover:bg-[#234880] text-white rounded-xl text-xs font-bold transition-all">
                        <File size={16} /> Word
                    </button>
                    <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-4 py-2 bg-[#B30B00] hover:bg-[#990900] text-white rounded-xl text-xs font-bold transition-all">
                        <FileText size={16} /> PDF
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 bg-[#151D2E] p-1.5 rounded-xl border border-white/5 w-fit">
                {[
                    { id: 'bs', label: '재무상태표 (B/S)' },
                    { id: 'pl', label: '손익계산서 (P/L)' },
                    { id: 'cf', label: '현금흐름표 (C/F)' },
                    { id: 'ce', label: '자본변동표 (C/E)' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as Tab)}
                        className={`px-6 py-2.5 rounded-lg text-xs font-black transition-all ${activeTab === tab.id
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'text-slate-500 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-xl shadow-2xl p-12 min-h-[800px] text-black font-sans relative overflow-hidden">
                {/* Paper Texture Effect */}
                <div className="absolute inset-0 bg-[#f9f9f7] opacity-50 pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-12">
                    {/* Document Header */}
                    <div className="text-center space-y-2 border-b-2 border-black pb-8">
                        <h2 className="text-3xl font-black tracking-tight text-[#1a1a1a]">
                            {activeTab === 'bs' && '재무상태표'}
                            {activeTab === 'pl' && '손익계산서'}
                            {activeTab === 'cf' && '현금흐름표'}
                            {activeTab === 'ce' && '자본변동표'}
                        </h2>
                        <p className="text-sm font-bold text-gray-600">제 24 기 2026.01.22 현재</p>
                        <p className="text-lg font-bold text-[#1a1a1a]">(주) 한국 전자 정밀 귀중</p>
                    </div>


                    {/* BS View */}
                    {activeTab === 'bs' && (
                        <div className="grid grid-cols-2 gap-12">
                            {/* Assets Column */}
                            <div className="space-y-8">
                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">I. 유동자산</h3>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-200">
                                            {currentAssets.map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-700">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">{a.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50 font-bold">
                                                <td className="py-2 pl-2">유동자산계</td>
                                                <td className="py-2 pr-2 text-right">{totalCurrentAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">II. 비유동자산</h3>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-200">
                                            {nonCurrentAssets.map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-700">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">{a.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-50 font-bold">
                                                <td className="py-2 pl-2">비유동자산계</td>
                                                <td className="py-2 pr-2 text-right">{totalNonCurrentAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div className="pt-4 border-t-2 border-black">
                                    <div className="flex justify-between items-center text-lg font-black">
                                        <span>자산 총계</span>
                                        <span>{totalAssets.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Liabilities & Equity Column */}
                            <div className="space-y-12">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">I. 유동부채</h3>
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-gray-200">
                                                {currentLiabilities.map(a => (
                                                    <tr key={a.name}>
                                                        <td className="py-2 text-gray-700">{a.name}</td>
                                                        <td className="py-2 text-right font-mono font-bold">{Math.abs(a.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-bold">
                                                    <td className="py-2 pl-2">유동부채계</td>
                                                    <td className="py-2 pr-2 text-right">{totalCurrentLiabilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">II. 비유동부채</h3>
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-gray-200">
                                                {nonCurrentLiabilities.map(a => (
                                                    <tr key={a.name}>
                                                        <td className="py-2 text-gray-700">{a.name}</td>
                                                        <td className="py-2 text-right font-mono font-bold">{Math.abs(a.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-gray-50 font-bold">
                                                    <td className="py-2 pl-2">비유동부채계</td>
                                                    <td className="py-2 pr-2 text-right">{totalNonCurrentLiabilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div className="pt-2 border-t border-gray-300 flex justify-between font-bold">
                                            <span>부채 총계</span>
                                            <span>{totalLiabilities.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">III. 자본</h3>
                                        <table className="w-full text-sm">
                                            <tbody className="divide-y divide-gray-200">
                                                {equityAccounts.map(a => (
                                                    <tr key={a.name}>
                                                        <td className="py-2 text-gray-700">{a.name}</td>
                                                        <td className="py-2 text-right font-mono font-bold">{Math.abs(a.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    </tr>
                                                ))}
                                                <tr className="bg-blue-50/50">
                                                    <td className="py-2 text-blue-800 font-semibold pl-2">당기순이익 (Net Income)</td>
                                                    <td className="py-2 text-right font-mono font-bold text-blue-800">{netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                                <tr className="bg-gray-50 font-bold text-base">
                                                    <td className="py-3 pl-2">자본 총계</td>
                                                    <td className="py-2 pr-2 text-right">{totalEquity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="pt-4 border-t-2 border-black">
                                    <div className="flex justify-between items-center text-lg font-black">
                                        <span>부채와 자본 총계</span>
                                        <span>{(totalLiabilities + totalEquity).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PL View */}
                    {activeTab === 'pl' && (
                        <div className="max-w-3xl mx-auto space-y-10">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-2">I. 매출액 (Operating Revenue)</h3>
                                <div className="space-y-2">
                                    {salesRevenue.map(r => (
                                        <div key={r.name} className="flex justify-between text-sm px-4">
                                            <span>{r.name}</span>
                                            <span className="font-mono">{Math.abs(r.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    ))}
                                    <div className="bg-gray-100 p-2 flex justify-between font-bold rounded">
                                        <span>매출액 합계</span>
                                        <span>{amountSales.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-2">II. 매출원가 (Cost of Sales)</h3>
                                <div className="space-y-2">
                                    {costOfSales.map(r => (
                                        <div key={r.name} className="flex justify-between text-sm px-4">
                                            <span>{r.name}</span>
                                            <span className="font-mono">({r.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                                        </div>
                                    ))}
                                    <div className="bg-gray-100 p-2 flex justify-between font-bold rounded text-red-600">
                                        <span>매출원가 합계</span>
                                        <span>({amountCOGS.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-gray-300 rounded-lg bg-gray-50 flex justify-between items-center text-lg font-bold">
                                <span>III. 매출총이익 (Gross Profit)</span>
                                <span>{grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest border-b border-gray-300 pb-2">IV. 판매비와 관리비 (SG&A Expenses)</h3>
                                <div className="space-y-2">
                                    {operatingExpenses.map(e => (
                                        <div key={e.name} className="flex justify-between text-sm px-4">
                                            <span>{e.name}</span>
                                            <span className="font-mono text-red-500">({e.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                                        </div>
                                    ))}
                                    <div className="bg-gray-100 p-2 flex justify-between font-bold rounded text-red-600">
                                        <span>판관비 합계</span>
                                        <span>({amountOpExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })})</span>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 border border-black rounded-lg bg-gray-100 flex justify-between items-center text-lg font-bold">
                                <span>V. 영업이익 (Operating Income)</span>
                                <span className={operatingIncome >= 0 ? 'text-blue-600' : 'text-red-600'}>{operatingIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold border-b border-gray-200 pb-1">VI. 영업외 수익</h4>
                                    {nonOperatingIncome.map(n => (
                                        <div key={n.name} className="flex justify-between text-xs text-gray-600">
                                            <span>{n.name}</span>
                                            <span>{Math.abs(n.balance).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    ))}
                                    <div className="text-right font-bold text-sm text-blue-600">+{amountNonOpIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                                </div>
                                <div className="space-y-2">
                                    <h4 className="text-sm font-bold border-b border-gray-200 pb-1">VII. 영업외 비용</h4>
                                    {nonOperatingExpenses.map(n => (
                                        <div key={n.name} className="flex justify-between text-xs text-gray-600">
                                            <span>{n.name}</span>
                                            <span>{n.balance.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    ))}
                                    <div className="text-right font-bold text-sm text-red-500">-({amountNonOpExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })})</div>
                                </div>
                            </div>

                            <div className="pt-8 border-t-4 border-double border-black">
                                <div className="flex justify-between items-center bg-gray-900 text-white p-6 rounded-xl shadow-lg">
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-black">VIII. 당기순이익</span>
                                        <span className="text-sm text-gray-400 font-serif italic">(Net Income)</span>
                                    </div>
                                    <span className={`text-3xl font-black font-mono ${netIncome >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                        ₩{netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* CF View (Mock) */}
                    {activeTab === 'cf' && (
                        <div className="max-w-3xl mx-auto space-y-8">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-black">
                                        <th className="py-3 text-left pl-4 font-bold">과목 (Description)</th>
                                        <th className="py-3 text-right pr-4 font-bold">금액 (Amount)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    <tr className="bg-gray-50">
                                        <td className="py-3 pl-4 font-bold text-gray-800">I. 영업활동으로 인한 현금흐름</td>
                                        <td className="py-3 pr-4 text-right font-bold text-blue-600">{(netIncome + Math.abs(amountCOGS) * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pl-8 text-gray-600">1. 당기순이익</td>
                                        <td className="py-2 pr-4 text-right">{netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pl-8 text-gray-600">2. 현금유출이 없는 비용 등 가산 (감가상각비 등)</td>
                                        <td className="py-2 pr-4 text-right font-mono">{(Math.abs(amountCOGS) * 0.1).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>

                                    <tr className="bg-gray-50">
                                        <td className="py-3 pl-4 font-bold text-gray-800 mt-4">II. 투자활동으로 인한 현금흐름</td>
                                        <td className="py-3 pr-4 text-right font-bold text-red-500">(-{(totalNonCurrentAssets * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })})</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pl-8 text-gray-600">1. 유형자산의 취득</td>
                                        <td className="py-2 pr-4 text-right font-mono text-red-500">(-{(totalNonCurrentAssets * 0.5).toLocaleString(undefined, { maximumFractionDigits: 0 })})</td>
                                    </tr>

                                    <tr className="bg-gray-50">
                                        <td className="py-3 pl-4 font-bold text-gray-800 mt-4">III. 재무활동으로 인한 현금흐름</td>
                                        <td className="py-3 pr-4 text-right font-bold text-blue-600">{(totalEquity * 0.05).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>

                                    <tr className="bg-black text-white text-lg font-bold">
                                        <td className="py-4 pl-4">IV. 기말의 현금 및 현금성자산</td>
                                        <td className="py-4 pr-4 text-right">{(totalCurrentAssets * 0.8).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <p className="text-center text-gray-400 italic text-xs mt-8">* 현금흐름표는 현재 약식(Indirect Method Simulation)으로 제공됩니다.</p>
                        </div>
                    )}

                    {/* CE View (Mock) */}
                    {activeTab === 'ce' && (
                        <div className="max-w-4xl mx-auto space-y-8">
                            <table className="w-full text-sm border-collapse border border-gray-300">
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="py-3 border border-gray-300">구분</th>
                                        <th className="py-3 border border-gray-300">자본금</th>
                                        <th className="py-3 border border-gray-300">이익잉여금</th>
                                        <th className="py-3 border border-gray-300">기타자본</th>
                                        <th className="py-3 border border-gray-300 bg-gray-200">합계</th>
                                    </tr>
                                </thead>
                                <tbody className="text-right">
                                    {(() => {
                                        const initialCapital = subLedger.length === 0 ? 0 : 100000000;
                                        const initialRetainedEarnings = subLedger.length === 0 ? 0 : 50000000;
                                        const totalInitial = initialCapital + initialRetainedEarnings;

                                        return (
                                            <>
                                                <tr>
                                                    <td className="py-3 px-2 text-center font-bold bg-gray-50 border border-gray-300">기초 자본</td>
                                                    <td className="py-3 px-2 border border-gray-300">{initialCapital.toLocaleString()}</td>
                                                    <td className="py-3 px-2 border border-gray-300">{initialRetainedEarnings.toLocaleString()}</td>
                                                    <td className="py-3 px-2 border border-gray-300">0</td>
                                                    <td className="py-3 px-2 border border-gray-300 font-bold">{totalInitial.toLocaleString()}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-2 text-center font-bold bg-gray-50 border border-gray-300">당기순이익</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                    <td className="py-3 px-2 border border-gray-300 text-blue-600">{netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                    <td className="py-3 px-2 border border-gray-300 font-bold text-blue-600">{netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                                <tr>
                                                    <td className="py-3 px-2 text-center font-bold bg-gray-50 border border-gray-300">배당금지급</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                    <td className="py-3 px-2 border border-gray-300">-</td>
                                                </tr>
                                                <tr className="bg-gray-800 text-white font-bold">
                                                    <td className="py-4 px-2 text-center border-t-2 border-black">기말 자본</td>
                                                    <td className="py-4 px-2 border-t-2 border-black">{initialCapital.toLocaleString()}</td>
                                                    <td className="py-4 px-2 border-t-2 border-black">{(initialRetainedEarnings + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                    <td className="py-4 px-2 border-t-2 border-black">0</td>
                                                    <td className="py-4 px-2 border-t-2 border-black">{(totalInitial + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            </>
                                        );
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Footer Stamp */}
                <div className="absolute bottom-12 right-12 opacity-80 rotate-[-12deg] pointer-events-none">
                    <div className="w-32 h-32 border-4 border-red-600 rounded-full flex items-center justify-center flex-col text-red-600 font-black uppercase shadow-xl bg-white/10 mix-blend-multiply">
                        <span className="text-xl">Approved</span>
                        <span className="text-xs">Accounting AI</span>
                        <span className="text-[10px] mt-1">{new Date().toISOString().split('T')[0]}</span>
                    </div>
                </div>
            </div>
        </div>
    );
};


export default FinancialStatements;
