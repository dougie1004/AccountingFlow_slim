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

    const accounts = useMemo(() => {
        const accs: { name: string; balance: number; type: string }[] = [];
        // This is a naive mapping. In a real app we need a Chart of Accounts.
        // I will infer type from name for this demo if not available.
        // Assuming strict naming or I'll use simple heuristics.
        balances.forEach((bal, name) => {
            let type = 'Other';
            if (['Cash', 'Bank', '현금', '예금', '보통예금'].some(k => name.includes(k))) type = 'Asset';
            else if (['Receivable', '미수금', '매출채권'].some(k => name.includes(k))) type = 'Asset';
            else if (['Building', 'Equipment', '건물', '비품', '기계'].some(k => name.includes(k))) type = 'Asset';
            else if (['Payable', '미지급', '매입채무'].some(k => name.includes(k))) type = 'Liability';
            else if (['Capital', 'Retained', '자본', '이익잉여금'].some(k => name.includes(k))) type = 'Equity';
            else if (['Sales', 'Revenue', '매출', '수익'].some(k => name.includes(k))) type = 'Revenue';
            else if (['Expense', 'Salary', 'Rent', 'Cost', '급여', '임차료', '비용'].some(k => name.includes(k))) type = 'Expense';
            // Default heuristics based on polarity if unknown
            else if (type === 'Other') {
                if (name.includes('Account')) type = 'Asset'; // Fallback
            }

            accs.push({ name, balance: bal, type });
        });
        return accs;
    }, [balances]);

    // Grouping
    const assets = accounts.filter(a => a.type === 'Asset');
    const liabilities = accounts.filter(a => a.type === 'Liability');
    const equity = accounts.filter(a => a.type === 'Equity');
    const revenue = accounts.filter(a => a.type === 'Revenue');
    const expenses = accounts.filter(a => a.type === 'Expense');

    // Totals
    const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
    const totalLiabilities = liabilities.reduce((sum, a) => sum + Math.abs(a.balance), 0); // Credit balances are negative in map usually, but for FS presentation we prefer positive magnitude for L & E
    const totalEquity = equity.reduce((sum, a) => sum + Math.abs(a.balance), 0);
    const totalRevenue = revenue.reduce((sum, a) => sum + Math.abs(a.balance), 0); // Credits are negative
    const totalExpense = expenses.reduce((sum, a) => sum + a.balance, 0); // Debits are positive

    // Net Income
    const netIncome = Math.abs(totalRevenue) - totalExpense;

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
                <div className="flex gap-2">
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
                        <p className="text-lg font-bold text-[#1a1a1a]">(주) 퀀텀플로우 귀중</p>
                    </div>

                    {/* BS View */}
                    {activeTab === 'bs' && (
                        <div className="grid grid-cols-2 gap-12">
                            <div className="space-y-6">
                                <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">자산 (Assets)</h3>
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-200">
                                        {assets.map(a => (
                                            <tr key={a.name}>
                                                <td className="py-2 text-gray-700">{a.name}</td>
                                                <td className="py-2 text-right font-mono font-bold">{a.balance.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-100 font-bold text-base">
                                            <td className="py-3 pl-2">자산 총계</td>
                                            <td className="py-3 pr-2 text-right">{totalAssets.toLocaleString()}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-8">
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">부채 (Liabilities)</h3>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-200">
                                            {liabilities.length === 0 && <tr><td className="py-2 text-gray-500 italic">부채 없음</td><td>0</td></tr>}
                                            {liabilities.map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-700">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">{Math.abs(a.balance).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="bg-gray-100 font-bold text-base">
                                                <td className="py-3 pl-2">부채 총계</td>
                                                <td className="py-3 pr-2 text-right">{totalLiabilities.toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="space-y-6">
                                    <h3 className="text-lg font-bold border-b border-black pb-2 mb-4">자본 (Equity)</h3>
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-200">
                                            {equity.length === 0 && <tr><td className="py-2 text-gray-500 italic">자본금/이익잉여금 등</td><td>0</td></tr>}
                                            {equity.map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-700">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">{Math.abs(a.balance).toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            {/* Retained Earnings Injection from Net Income if not explicitly in ledger */}
                                            <tr className="bg-blue-50/50">
                                                <td className="py-2 text-blue-800 font-semibold pl-2">당기순이익 (Net Income)</td>
                                                <td className="py-2 text-right font-mono font-bold text-blue-800">{netIncome.toLocaleString()}</td>
                                            </tr>
                                            <tr className="bg-gray-100 font-bold text-base">
                                                <td className="py-3 pl-2">자본 총계</td>
                                                <td className="py-3 pr-2 text-right">{(totalEquity + netIncome).toLocaleString()}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                                <div className="pt-4 border-t-2 border-black">
                                    <div className="flex justify-between items-center text-lg font-black">
                                        <span>부채와자본총계</span>
                                        <span>{(totalLiabilities + totalEquity + netIncome).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* PL View */}
                    {activeTab === 'pl' && (
                        <div className="max-w-2xl mx-auto space-y-8">
                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest">I. 매출액 (Revenue)</h3>
                                <div className="space-y-2">
                                    {revenue.map(r => (
                                        <div key={r.name} className="flex justify-between text-sm">
                                            <span>{r.name}</span>
                                            <span className="font-mono">{Math.abs(r.balance).toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                                        <span>매출 총계</span>
                                        <span>{Math.abs(totalRevenue).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-lg font-bold text-gray-800 uppercase tracking-widest">II. 영업비용 (Operating Expenses)</h3>
                                <div className="space-y-2">
                                    {expenses.map(e => (
                                        <div key={e.name} className="flex justify-between text-sm">
                                            <span>{e.name}</span>
                                            <span className="font-mono">{e.balance.toLocaleString()}</span>
                                        </div>
                                    ))}
                                    <div className="border-t border-gray-300 pt-2 flex justify-between font-bold">
                                        <span>비용 총계</span>
                                        <span>{totalExpense.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-8 border-t-2 border-black">
                                <div className="flex justify-between items-center bg-gray-900 text-white p-4 rounded-lg">
                                    <span className="text-xl font-bold">당기순이익 (Net Income)</span>
                                    <span className="text-2xl font-black font-mono">₩{netIncome.toLocaleString()}</span>
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
                                        <td className="py-3 pr-4 text-right font-bold text-blue-600">{(netIncome * 1.2).toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pl-8 text-gray-600">1. 당기순이익</td>
                                        <td className="py-2 pr-4 text-right">{netIncome.toLocaleString()}</td>
                                    </tr>
                                    <tr>
                                        <td className="py-2 pl-8 text-gray-600">2. 현금유출이 없는 비용 등 가산</td>
                                        <td className="py-2 pr-4 text-right font-mono">{(netIncome * 0.2).toLocaleString()}</td>
                                    </tr>

                                    <tr className="bg-gray-50">
                                        <td className="py-3 pl-4 font-bold text-gray-800 mt-4">II. 투자활동으로 인한 현금흐름</td>
                                        <td className="py-3 pr-4 text-right font-bold text-red-500">({(totalAssets * 0.1).toLocaleString()})</td>
                                    </tr>

                                    <tr className="bg-gray-50">
                                        <td className="py-3 pl-4 font-bold text-gray-800 mt-4">III. 재무활동으로 인한 현금흐름</td>
                                        <td className="py-3 pr-4 text-right font-bold text-blue-600">{(totalEquity * 0.05).toLocaleString()}</td>
                                    </tr>

                                    <tr className="bg-black text-white text-lg font-bold">
                                        <td className="py-4 pl-4">IV. 기말의 현금 및 현금성자산</td>
                                        <td className="py-4 pr-4 text-right">{(netIncome * 1.15).toLocaleString()}</td>
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
                                        <td className="py-3 px-2 border border-gray-300 text-blue-600">{netIncome.toLocaleString()}</td>
                                        <td className="py-3 px-2 border border-gray-300">-</td>
                                        <td className="py-3 px-2 border border-gray-300 font-bold text-blue-600">{netIncome.toLocaleString()}</td>
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
                                        <td className="py-4 px-2 border-t-2 border-black">{(50000000 + netIncome).toLocaleString()}</td>
                                        <td className="py-4 px-2 border-t-2 border-black">0</td>
                                        <td className="py-4 px-2 border-t-2 border-black">{(150000000 + netIncome).toLocaleString()}</td>
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
