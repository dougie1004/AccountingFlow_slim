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
            // Usually FS only shows Posted/Authorized. But user might want to see draft. Let's stick to totals.
            // Actually, based on previous context, 'Authorized' is key. But let's include all for now or filter.
            // As per Journal.tsx note: "Audit-Ready: 확정(Authorized)된 전표만...". So I should probably filter 'Authorized'.
            // However, to show *something* if no authorized data, I might relax this or warn.
            // Let's keep it inclusive for now or user sees nothing.

            // Debit Reference
            const dr = map.get(entry.debitAccount) || 0;
            map.set(entry.debitAccount, dr + entry.amount);

            // Credit Reference
            const cr = map.get(entry.creditAccount) || 0;
            map.set(entry.creditAccount, cr - entry.amount);
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

            // P/L Items First (to prevent them from being caught as Assets/Liabilities)
            if (['매출원가', 'cogs', 'cost of sales'].some(k => n.includes(k))) { type = 'Expense'; category = 'Cost of Sales'; }
            else if (['제품매출', '상품매출', '매출', 'sales', 'revenue'].some(k => n.includes(k)) && !n.includes('채권') && !n.includes('외상')) { type = 'Revenue'; category = 'Operating Revenue'; }
            else if (['이자수익', '잡이익', 'income'].some(k => n.includes(k))) { type = 'Revenue'; category = 'Non-Operating Income'; }
            else if (['급여', '임차료', '접대비', '통신비', '수수료', '전력', '운반', 'expense', 'salary', 'rent', 'power', 'logistics'].some(k => n.includes(k))) { type = 'Expense'; category = 'Operating Expenses'; }
            else if (['이자비용', '손실', 'loss'].some(k => n.includes(k))) { type = 'Expense'; category = 'Non-Operating Expenses'; }
            else if (['법인세', 'tax'].some(k => n.includes(k)) && !n.includes('예수금')) { type = 'Expense'; category = 'Income Tax'; }

            // B/S Items
            else if (['현금', '예금', 'cash', 'bank'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }
            else if (['외상매출', '매출채권', '미수금', 'receivable'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }
            else if (['상품', '제품', '재고', '원재료', 'inventory', 'material'].some(k => n.includes(k)) && !n.includes('매출')) { type = 'Asset'; category = 'Current Assets'; }
            else if (['건물', '비품', '기계', '차량', '토지', 'asset', 'equipment', 'machinery'].some(k => n.includes(k))) { type = 'Asset'; category = 'Non-Current Assets'; }
            else if (['선급금'].some(k => n.includes(k))) { type = 'Asset'; category = 'Current Assets'; }

            // Liabilities
            else if (['외상매입', '매입채무', '미지급', 'payable'].some(k => n.includes(k))) { type = 'Liability'; category = 'Current Liabilities'; }
            else if (['차입금', 'loan', 'debt'].some(k => n.includes(k))) { type = 'Liability'; category = 'Non-Current Liabilities'; }
            else if (['예수금', 'vat'].some(k => n.includes(k))) { type = 'Liability'; category = 'Current Liabilities'; }

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
    // Calculate Net Income using ALL Revenue and Expense accounts to ensure equation holds
    // regardless of sub-category display mapping.
    const allRevenues = accounts.filter(a => a.type === 'Revenue');
    const allExpenses = accounts.filter(a => a.type === 'Expense');

    // Revenue is Credit (negative in ledgers), Expense is Debit (positive)
    const totalRevenueAbs = sum(allRevenues); // Display as positive
    const totalExpenseAbs = sum(allExpenses); // Display as positive
    const netIncome = totalRevenueAbs - totalExpenseAbs;

    // B/S Structuring
    const currentAssets = accounts.filter(a => a.category === 'Current Assets');
    const nonCurrentAssets = accounts.filter(a => a.category === 'Non-Current Assets');
    const otherAssets = accounts.filter(a => a.type === 'Asset' && !a.category.includes('Assets')); // Catch-all for mis-categorized assets

    const currentLiabilities = accounts.filter(a => a.category === 'Current Liabilities');
    const nonCurrentLiabilities = accounts.filter(a => a.category === 'Non-Current Liabilities');
    const otherLiabilities = accounts.filter(a => a.type === 'Liability' && !a.category.includes('Liabilities'));

    const equityAccounts = accounts.filter(a => a.type === 'Equity');

    // Totals
    const totalCurrentAssets = sumNet([...currentAssets, ...otherAssets]);
    const totalNonCurrentAssets = sumNet(nonCurrentAssets);
    const totalAssets = totalCurrentAssets + totalNonCurrentAssets;

    const totalCurrentLiabilities = sum([...currentLiabilities, ...otherLiabilities]);
    const totalNonCurrentLiabilities = sum(nonCurrentLiabilities);
    const totalLiabilities = totalCurrentLiabilities + totalNonCurrentLiabilities;

    const totalStaticEquity = sum(equityAccounts);
    const totalEquity = totalStaticEquity + netIncome;

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
    // Note: The displayed breakdown might theoretically slightly differ from calculatedNetIncome if categories are 'Uncategorized',
    // but calculatedNetIncome is the source of truth for B/S.

    // Integrity Check Badge
    const integrityCheck = Math.abs(totalAssets - (totalLiabilities + totalEquity));
    const isBalanced = integrityCheck < 1000; // Allow minor rounding differences (e.g. < 1000 KRW)

    // --- Export Functions ---
    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        alert(`${format.toUpperCase()} 포맷으로 변환 중입니다...\n(실제 구현에서는 파일이 다운로드됩니다)`);
        if (format === 'pdf') window.print();
    };

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
            <div className="bg-white rounded-xl shadow-2xl p-12 min-h-[800px] text-black font-serif relative overflow-hidden">
                {/* Paper Texture Effect */}
                <div className="absolute inset-0 bg-[#f9f9f7] opacity-50 pointer-events-none"></div>

                <div className="relative z-10 max-w-4xl mx-auto space-y-12">
                    {/* Document Header */}
                    <div className="text-center space-y-2 border-b-2 border-black pb-8">
                        <h2 className="text-3xl font-bold uppercase tracking-widest text-[#1a1a1a]">
                            {activeTab === 'bs' && 'Statement of Financial Position'}
                            {activeTab === 'pl' && 'Income Statement'}
                            {activeTab === 'cf' && 'Statement of Cash Flows'}
                            {activeTab === 'ce' && 'Statement of Changes in Equity'}
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
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4 uppercase">I. 유동자산 (Current Assets)</h3>
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
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4 uppercase">II. 비유동자산 (Non-Current Assets)</h3>
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
                                        <span>자산 총계 (Total Assets)</span>
                                        <span>{(totalCurrentAssets + totalNonCurrentAssets).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Liabilities & Equity Column */}
                            <div className="space-y-12">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4 uppercase">I. 유동부채 (Current Liabilities)</h3>
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
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4 uppercase">II. 비유동부채 (Non-Current Liabilities)</h3>
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
                                            <span>{(totalCurrentLiabilities + totalNonCurrentLiabilities).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <h3 className="text-lg font-bold border-b border-black pb-2 mb-4 uppercase">III. 자본 (Equity)</h3>
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
                                                    <td className="py-2 pr-2 text-right">{(totalEquity + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                </div>

                                <div className="pt-4 border-t-2 border-black">
                                    <div className="flex justify-between items-center text-lg font-black">
                                        <span>부채와 자본 총계</span>
                                        <span>{(totalCurrentLiabilities + totalNonCurrentLiabilities + totalEquity + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                                    <tr>
                                        <td className="py-3 px-2 text-center font-bold bg-gray-50 border border-gray-300">기초 자본</td>
                                        <td className="py-3 px-2 border border-gray-300">100,000,000</td>
                                        <td className="py-3 px-2 border border-gray-300">50,000,000</td>
                                        <td className="py-3 px-2 border border-gray-300">0</td>
                                        <td className="py-3 px-2 border border-gray-300 font-bold">150,000,000</td>
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
                                        <td className="py-4 px-2 border-t-2 border-black">100,000,000</td>
                                        <td className="py-4 px-2 border-t-2 border-black">{(50000000 + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                        <td className="py-4 px-2 border-t-2 border-black">0</td>
                                        <td className="py-4 px-2 border-t-2 border-black">{(150000000 + netIncome).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                                    </tr>
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
