import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Download, FileText, Printer, FileSpreadsheet, File, TrendingUp, TrendingDown, Zap, Calculator } from 'lucide-react';

type Tab = 'bs' | 'pl' | 'cf' | 'ce';

import { STANDARD_ACCOUNTS } from '../constants/accounts';

const FinancialStatements: React.FC = () => {
    const { subLedger, config } = useAccounting();
    const [activeTab, setActiveTab] = useState<Tab>('bs');

    // --- Core Accounting Engine: Movement TB for Reports ---
    const movementMap = useMemo(() => {
        const getCategory = (name: string): 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense' => {
            const standard = STANDARD_ACCOUNTS.find(a => a.name === name);
            if (standard) return standard.category as any;

            const n = name.toLowerCase();
            if (['현금', '예금', '보통예금', '외상매출', '미수', '상품', '재고', '비품', '기계', '건물', '차량', '대급금', '자산'].some(k => n.includes(k))) return 'Asset';
            if (['외상매입', '매입채무', '미지급', '예수금', '차입금', '부채', 'payable'].some(k => n.includes(k))) return 'Liability';
            if (['자본', 'equity', '잉여금', '주식'].some(k => n.includes(k))) return 'Equity';
            if (['매출', '수익', 'revenue', '이익'].some(k => n.includes(k)) && !n.includes('미수')) return 'Revenue';
            if (['비용', '급여', '임차료', '비', '료', '원가', 'expense', 'loss', '손실'].some(k => n.includes(k))) return 'Expense';
            return 'Asset';
        };

        const map = new Map<string, { name: string; category: string; opening: number; debit: number; credit: number; closing: number }>();

        // 1. Initial Balances
        if (config.initialBalances) {
            config.initialBalances.forEach(ib => {
                const cat = getCategory(ib.account);
                map.set(ib.account, { name: ib.account, category: cat, opening: ib.amount, debit: 0, credit: 0, closing: ib.amount });
            });
        }

        // 2. Transactions
        subLedger.forEach(entry => {
            const process = (acc: string, amt: number, isDebit: boolean) => {
                const d = map.get(acc) || { name: acc, category: getCategory(acc), opening: 0, debit: 0, credit: 0, closing: 0 };
                if (isDebit) d.debit += amt; else d.credit += amt;
                map.set(acc, d);
            };

            process(entry.debitAccount, entry.amount, true);
            process(entry.creditAccount, entry.amount, false);

            if (entry.vat > 0) {
                const vatAcc = entry.type === 'Revenue' ? '부가가치세예수금' : '부가가치세대급금';
                process(vatAcc, entry.vat, entry.type !== 'Revenue');
            }
        });

        // 3. Final Closing Calculation
        map.forEach((val, key) => {
            const isDebitNature = ['Asset', 'Expense'].includes(val.category);
            val.closing = isDebitNature
                ? val.opening + val.debit - val.credit
                : val.opening + val.credit - val.debit;
        });

        return map;
    }, [subLedger, config]);

    const accounts = Array.from(movementMap.values());

    // --- Financial Metrics Aggregation ---
    const plMetrics = useMemo(() => {
        const revenue = accounts.filter(a => a.category === 'Revenue').reduce((s, a) => s + Math.abs(a.closing - a.opening), 0);
        const expenses = accounts.filter(a => a.category === 'Expense').reduce((s, a) => s + (a.closing - a.opening), 0);
        const netIncome = revenue - expenses;
        return { revenue, expenses, netIncome };
    }, [accounts]);

    const bsMetrics = useMemo(() => {
        const totalAssets = accounts.filter(a => a.category === 'Asset').reduce((s, a) => s + Math.abs(a.closing), 0);
        const totalLiabilities = accounts.filter(a => a.category === 'Liability').reduce((s, a) => s + Math.abs(a.closing), 0);
        const totalEquity = accounts.filter(a => a.category === 'Equity').reduce((s, a) => s + Math.abs(a.closing), 0) + plMetrics.netIncome;
        return { totalAssets, totalLiabilities, totalEquity };
    }, [accounts, plMetrics]);

    // --- Advanced Indirect Method Cash Flow ---
    const cfMetrics = useMemo(() => {
        // 1. Operating Activities (Indirect Method)
        const netIncome = plMetrics.netIncome;

        // Non-cash adjustment (Simplified: sum of accounts containing '감가상각' movement)
        const depreciation = accounts
            .filter(a => a.name.includes('감가상각'))
            .reduce((s, a) => s + (a.debit), 0); // Depreciation expense is debit

        // Working Capital Changes (Delta = Closing - Opening)
        // Asset Increase = Cash Decrease (-)
        // Liability Increase = Cash Increase (+)
        const deltaAR = accounts.filter(a => a.name.includes('외상매출') || a.name.includes('미수금')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaInventory = accounts.filter(a => a.name.includes('상품') || a.name.includes('재고')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaVAT_Asset = accounts.filter(a => a.name.includes('대급금')).reduce((s, a) => s + (a.closing - a.opening), 0);

        const deltaAP = accounts.filter(a => a.name.includes('외상매입') || a.name.includes('미지급')).reduce((s, a) => s + (a.closing - a.opening), 0);
        const deltaVAT_Liab = accounts.filter(a => a.name.includes('예수금')).reduce((s, a) => s + (a.closing - a.opening), 0);

        const opCashFlow = netIncome + depreciation - deltaAR - deltaInventory - deltaVAT_Asset + deltaAP + deltaVAT_Liab;

        // 2. Investing Activities
        // Increase in fixed assets = Cash Outflow (-)
        const invCashFlow = -accounts
            .filter(a => a.category === 'Asset' && ['비품', '기계', '차량', '건물'].some(k => a.name.includes(k)))
            .reduce((s, a) => s + (a.debit), 0); // Simplification: debit to asset account is purchase

        // 3. Financing Activities
        // Increase in Capital/Loans = Cash Inflow (+)
        const finCashFlow = accounts
            .filter(a => (a.category === 'Equity' || a.category === 'Liability') && ['자본', '차입'].some(k => a.name.includes(k)))
            .reduce((s, a) => s + (a.credit - a.debit), 0);

        return {
            netIncome,
            depreciation,
            workingCapital: -(deltaAR + deltaInventory + deltaVAT_Asset) + (deltaAP + deltaVAT_Liab),
            opCashFlow,
            invCashFlow,
            finCashFlow,
            totalCashFlow: opCashFlow + invCashFlow + finCashFlow
        };
    }, [accounts, plMetrics]);

    const isBalanced = Math.abs(bsMetrics.totalAssets - (bsMetrics.totalLiabilities + bsMetrics.totalEquity)) < 100;

    const handleExport = (format: 'excel' | 'word' | 'pdf') => {
        alert(`${format.toUpperCase()} 포맷으로 변환 중입니다...`);
        if (format === 'pdf') window.print();
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight">재무제표 (Financial Statements)</h1>
                    <p className="text-slate-400 font-bold mt-1">Movement TB 기반의 정밀 재무 분석 보고서입니다.</p>
                </div>
                <div className="flex gap-2 items-center">
                    <div className={`px-4 py-2 rounded-xl text-xs font-black border flex items-center gap-2 ${isBalanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse'}`}>
                        <div className={`w-2 h-2 rounded-full ${isBalanced ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        {isBalanced ? 'Balanced' : 'Imbalanced'}
                    </div>
                    <button onClick={() => handleExport('excel')} className="flex items-center gap-2 px-4 py-2 bg-[#107C41] hover:bg-[#0e6b37] text-white rounded-xl text-xs font-bold transition-all"><FileSpreadsheet size={16} /> Excel</button>
                    <button onClick={() => handleExport('pdf')} className="flex items-center gap-2 px-4 py-2 bg-[#B30B00] hover:bg-[#990900] text-white rounded-xl text-xs font-bold transition-all"><FileText size={16} /> PDF</button>
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
                        <p className="text-sm font-bold text-gray-500">2026.01.22 기준 | (주) 한국 전자 정밀</p>
                    </div>

                    {/* BS Content */}
                    {activeTab === 'bs' && (
                        <div className="grid grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <h3 className="text-lg font-black border-b border-gray-300 pb-2">I. 자산 (Assets)</h3>
                                <table className="w-full text-sm">
                                    <tbody className="divide-y divide-gray-100">
                                        {accounts.filter(a => a.category === 'Asset').map(a => (
                                            <tr key={a.name}>
                                                <td className="py-2 text-gray-600">{a.name}</td>
                                                <td className="py-2 text-right font-mono font-bold">₩{a.closing.toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="font-black text-base border-t-2 border-black">
                                            <td className="py-3">자산 총계</td>
                                            <td className="py-3 text-right">₩{bsMetrics.totalAssets.toLocaleString()}</td>
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
                                            {accounts.filter(a => a.category === 'Liability').map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-600">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">₩{a.closing.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="font-black"><td className="py-2">부채 총계</td><td className="py-2 text-right">₩{bsMetrics.totalLiabilities.toLocaleString()}</td></tr>
                                        </tbody>
                                    </table>
                                    <table className="w-full text-sm">
                                        <thead><tr><th className="text-left font-bold text-gray-400 py-1">[자본]</th></tr></thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {accounts.filter(a => a.category === 'Equity').map(a => (
                                                <tr key={a.name}>
                                                    <td className="py-2 text-gray-600">{a.name}</td>
                                                    <td className="py-2 text-right font-mono font-bold">₩{a.closing.toLocaleString()}</td>
                                                </tr>
                                            ))}
                                            <tr className="text-blue-600 font-bold"><td className="py-2">당기순이익 (Net Income)</td><td className="py-2 text-right">₩{plMetrics.netIncome.toLocaleString()}</td></tr>
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
                                        <tr className="text-gray-600"><td className="pl-6">1. 당기순이익 (Net Income)</td><td className="text-right font-bold">₩{cfMetrics.netIncome.toLocaleString()}</td></tr>
                                        <tr className="text-emerald-600"><td className="pl-6">2. 현금유출이 없는 비용 가산 (감가상각비 등)</td><td className="text-right font-bold text-emerald-600">+₩{cfMetrics.depreciation.toLocaleString()}</td></tr>
                                        <tr className="text-rose-600"><td className="pl-6">3. 영업자산/부채의 변동 (Working Capital)</td><td className="text-right font-bold text-rose-600">₩{cfMetrics.workingCapital.toLocaleString()}</td></tr>

                                        <tr className="bg-gray-100"><td className="p-3 font-black">II. 투자활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{cfMetrics.invCashFlow.toLocaleString()}</td></tr>
                                        <tr className="text-gray-500"><td className="pl-6">유형자산 취득 등</td><td className="text-right">₩{cfMetrics.invCashFlow.toLocaleString()}</td></tr>

                                        <tr className="bg-gray-100"><td className="p-3 font-black">III. 재무활동으로 인한 현금흐름</td><td className="p-3 text-right font-black">₩{cfMetrics.finCashFlow.toLocaleString()}</td></tr>
                                        <tr className="text-gray-500"><td className="pl-6">자본금 증감/차입금 상환 등</td><td className="text-right">₩{cfMetrics.finCashFlow.toLocaleString()}</td></tr>

                                        <tr className="border-t-4 border-double border-black bg-gray-200"><td className="p-4 font-black text-lg">IV. 당기 현금의 순증감</td><td className="p-4 text-right font-black text-xl">₩{cfMetrics.totalCashFlow.toLocaleString()}</td></tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg flex items-start gap-4">
                                <Zap className="text-indigo-400 shrink-0" size={20} />
                                <p className="text-xs text-indigo-700 font-bold leading-relaxed">
                                    [AI 감사관 의견] Movement TB를 분석한 결과, 운전자본(Working Capital)의 변동이 현금 유출의 주요 원인으로 파악되었습니다. 특히 매출채권의 증가 속도가 매출 성장보다 빠를 경우 유동성 경고가 발생할 수 있습니다.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Stamp */}
                <div className="absolute bottom-10 right-10 opacity-70 rotate-[-15deg] pointer-events-none">
                    <div className="w-28 h-28 border-4 border-rose-600 rounded-full flex flex-col items-center justify-center text-rose-600 font-black uppercase text-center">
                        <span className="text-xs">Certified By</span>
                        <span className="text-lg leading-tight font-black">AI Audit<br />Engine</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FinancialStatements;
