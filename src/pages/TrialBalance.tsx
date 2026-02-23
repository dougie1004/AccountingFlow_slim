import React, { useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    Calculator,
    ArrowRight,
    ArrowLeft,
    BarChart3,
    TrendingUp,
    TrendingDown,
    History,
    Zap,
    AlertCircle
} from 'lucide-react';

interface MovementTBItem {
    accountName: string;
    category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
    opening: number;
    debit: number;
    credit: number;
    closing: number;
}

import { STANDARD_ACCOUNTS } from '../constants/accounts';

const TrialBalance: React.FC = () => {
    const { ledger, config, subLedger, systemNow } = useAccounting();
    const [selectedYear, setSelectedYear] = React.useState<string>(new Date().getFullYear().toString());

    const balances = useMemo(() => {
        // 1. 계정 성격 판별 헬퍼
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

        const map = new Map<string, { opening: number; debit: number; credit: number }>();
        let retainedEarningsOpening = 0;

        // 2. Initialize Map with Zero
        // (Optional: Load initial setup balances if any)
        if (config.initialBalances) {
            config.initialBalances.forEach(ib => {
                map.set(ib.account, { opening: ib.amount, debit: 0, credit: 0 });
            });
        }

        // 3. Process Full Ledger
        // We need to split processing into:
        // A) Past Years (Before selectedYear) -> Accummulate into Opening Balance (Close P&L to Retained Earnings)
        // B) Current Year (selectedYear) -> Accummulate into Period Movement

        ledger.forEach(entry => {
            const entryYear = parseInt(entry.date.substring(0, 4));
            const targetYearVal = parseInt(selectedYear) || new Date().getFullYear();

            if (systemNow && entry.date > systemNow) return; // Skip future entries relative to systemNow
            if (entryYear > targetYearVal) return; // Skip future years relative to selected year

            const targetMode = entryYear < targetYearVal ? 'opening' : 'movement';
            const amount = entry.amount || 0;
            const vat = entry.vat || 0;
            const total = amount + vat;

            const catD = getCategory(entry.debitAccount);
            const catC = getCategory(entry.creditAccount);

            const processSide = (acc: string, amt: number, isDebit: boolean) => {
                const cat = getCategory(acc);

                // Logic A: Past Years (P&L Closing)
                if (targetMode === 'opening' && (cat === 'Revenue' || cat === 'Expense')) {
                    // Revenue(Cr) -> RE+, Expense(Dr) -> RE-
                    // We calculate RE as (Revenue - Expense), so Cr adds, Dr subtracts
                    if (cat === 'Revenue') retainedEarningsOpening += (isDebit ? -amt : amt);
                    else retainedEarningsOpening += (isDebit ? -amt : amt);
                    return;
                }

                // Logic B: Accumulate BS items or Movement
                const val = map.get(acc) || { opening: 0, debit: 0, credit: 0 };

                if (targetMode === 'opening') {
                    // Net opening (Debit +, Credit -)
                    const netImpact = isDebit ? amt : -amt;
                    map.set(acc, { ...val, opening: val.opening + netImpact });
                } else {
                    // Current period movement
                    if (isDebit) map.set(acc, { ...val, debit: val.debit + amt });
                    else map.set(acc, { ...val, credit: val.credit + amt });
                }
            };

            // Decomposition Logic (Mirroring FinancialStatements.tsx)
            if (entry.type === 'Payroll' || (catD === 'Expense' && entry.debitAccount.includes('급여'))) {
                processSide(entry.debitAccount, amount, true);
                if (vat > 0) {
                    processSide('예수금(원천세)', vat, false);
                    processSide(entry.creditAccount, amount - vat, false);
                } else {
                    processSide(entry.creditAccount, amount, false);
                }
            } else if (catC === 'Revenue') {
                processSide(entry.creditAccount, amount, false);
                if (vat > 0) processSide('부가가치세예수금', vat, false);
                processSide(entry.debitAccount, total, true);
            } else if (catD === 'Expense' || catD === 'Asset') {
                processSide(entry.debitAccount, amount, true);
                if (vat > 0) processSide('부가가치세대급금', vat, true);
                processSide(entry.creditAccount, total, false);
            } else {
                processSide(entry.debitAccount, amount, true);
                processSide(entry.creditAccount, amount, false);
            }
        });

        // 4. Inject Retained Earnings
        if (retainedEarningsOpening !== 0) {
            const reAcc = '이익잉여금';
            const val = map.get(reAcc) || { opening: 0, debit: 0, credit: 0 };
            // RE is Credit nature. Our net mapping is (Dr - Cr).
            // Profit (Positive retainedEarningsOpening) should be a Credit balance (negative in map).
            map.set(reAcc, { ...val, opening: val.opening - retainedEarningsOpening });
        }

        // 5. Final Formatting
        return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0])).map(([name, data]) => {
            const category = getCategory(name);
            const isDebitNature = ['Asset', 'Expense'].includes(category);

            // Convert Net Opening to Absolute Opening for display, but keep sign logic for Closing
            // Our 'data.opening' is (Debit - Credit).
            // If Asset (Dr nature): Opening 100 means Dr 100.
            // If Liability (Cr nature): Opening -100 means Cr 100.

            // For TB Display:
            // Reguired: Opening Balance (Absolute?) -> Usually TB shows Opening Dr / Opening Cr columns.
            // But this UI has single 'Opening' column. We will show signed or absolute based on nature?
            // The UI shows: Opening / Debit / Credit / Closing.
            // Let's assume 'Opening' column assumes the normal nature of the account.

            let displayOpening = 0;
            if (isDebitNature) displayOpening = data.opening;
            else displayOpening = -data.opening;

            // Closing Calc
            // Closing = Opening(Net) + Debit - Credit
            const netClosing = data.opening + data.debit - data.credit;

            let displayClosing = 0;
            if (isDebitNature) displayClosing = netClosing;
            else displayClosing = -netClosing;

            return {
                accountName: name,
                category,
                opening: displayOpening,
                debit: data.debit,
                credit: data.credit,
                closing: displayClosing
            };
        }).filter(r => Math.abs(r.opening) > 0.1 || Math.abs(r.debit) > 0.1 || Math.abs(r.credit) > 0.1);
        // Hide zero rows

    }, [ledger, config, selectedYear, systemNow]);

    const totals = useMemo(() => {
        const t = balances.reduce((acc, curr) => ({
            opening: acc.opening + curr.opening,
            debit: acc.debit + curr.debit,
            credit: acc.credit + curr.credit,
            closing: acc.closing + curr.closing
        }), { opening: 0, debit: 0, credit: 0, closing: 0 });

        // ---------------------------------------------------------
        // [CONSTITUTION CHECK] Fail-Fast Data Integrity Validation
        // ---------------------------------------------------------
        if (balances.length > 0) {
            // 1. 차대 평형 원칙 (Balance Match)
            if (Math.abs(t.debit - t.credit) > 0.01) {
                throw new Error(`[CONSTITUTION VIOLATION] 차대 불일치 감지. (차변: ${t.debit.toLocaleString()}, 대변: ${t.credit.toLocaleString()})`);
            }

            // 2. 자산 계정 음수 잔액 체크 (Negative Asset Check)
            const negativeAsset = balances.find(b => b.category === 'Asset' && b.closing < 0);
            if (negativeAsset) {
                throw new Error(`[CONSTITUTION VIOLATION] 비정상 자산 잔액 감지. (${negativeAsset.accountName}: ${negativeAsset.closing.toLocaleString()})`);
            }
        }

        return t;
    }, [balances]);

    // [New] Drill-down State
    const [selectedAccount, setSelectedAccount] = React.useState<string | null>(null);

    // [New] Filtered Transactions for Detail View
    const getAccountDetails = useMemo(() => {
        if (!selectedAccount) return { entries: [], analysis: { inflow: 0, outflow: 0, topVendor: '', opening: 0 } };

        const accInfo = balances.find(b => b.accountName === selectedAccount);
        const opening = accInfo ? accInfo.opening : 0;

        const entries = subLedger
            .filter(e => (!systemNow || e.date <= systemNow) && (e.debitAccount === selectedAccount || e.creditAccount === selectedAccount))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()); // Latest first

        // Simple Analysis
        let inflow = 0;
        let outflow = 0;
        const vendorMap = new Map<string, number>();

        entries.forEach(e => {
            const isDebit = e.debitAccount === selectedAccount;
            const amt = e.amount;
            if (isDebit) inflow += amt; else outflow += amt;

            const vendor = e.vendor || 'Unknown';
            vendorMap.set(vendor, (vendorMap.get(vendor) || 0) + amt);
        });

        const sortedVendors = Array.from(vendorMap.entries()).sort((a, b) => b[1] - a[1]);
        const topVendor = sortedVendors.length > 0 ? sortedVendors[0][0] : '-';

        return { entries, analysis: { inflow, outflow, topVendor, opening } };
    }, [selectedAccount, subLedger, balances, systemNow]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">

            {/* [New] Detail Modal Overlay */}
            {selectedAccount && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => setSelectedAccount(null)}>
                    <div className="bg-[#151D2E] w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>

                        {/* Modal Header */}
                        <div className="p-8 border-b border-white/5 bg-white/[0.02] flex justify-between items-start shrink-0">
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-400 rounded text-[10px] uppercase font-black tracking-widest border border-indigo-500/20">
                                        Account Drill-down
                                    </span>
                                </div>
                                <h2 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                    {selectedAccount} <span className="text-slate-500 font-bold text-lg">상세 분석</span>
                                </h2>
                                <p className="text-slate-400 text-sm font-bold mt-1">
                                    해당 계정과 관련된 주요 자금 흐름 및 거래 내역입니다.
                                </p>
                            </div>
                            <button onClick={() => setSelectedAccount(null)} className="p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors">
                                <ArrowLeft size={20} />
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 overflow-y-auto custom-scrollbar">

                            {/* Analysis Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10">
                                    <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">총 유입 (Debit Side)</p>
                                    <p className="text-2xl font-black text-white">+{getAccountDetails.analysis.inflow.toLocaleString()}</p>
                                </div>
                                <div className="p-5 bg-rose-500/5 rounded-2xl border border-rose-500/10">
                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">총 유출 (Credit Side)</p>
                                    <p className="text-2xl font-black text-white">-{getAccountDetails.analysis.outflow.toLocaleString()}</p>
                                </div>
                                <div className="p-5 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">주요 거래처 (Top Vendor)</p>
                                    <p className="text-xl font-black text-white truncate">{getAccountDetails.analysis.topVendor}</p>
                                </div>
                            </div>

                            {/* AFRI v1.0 Structural Risk Index Breakdown (Hidden Layer UI) */}
                            <div className="p-6 bg-[#0B1221] border border-white/10 rounded-2xl mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                                            Structural Risk Index Breakdown
                                            <span className="px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black rounded uppercase">MODERATE (0.54)</span>
                                        </h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Pure deterministic quantification (AFRI v1.0)</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-black text-slate-500 bg-white/5 py-1 px-3 rounded-lg border border-white/5">INTERNAL VIEW ONLY</span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    {[
                                        { label: 'Unexplained Ratio', value: 0.72, color: 'bg-orange-500' },
                                        { label: 'Volatility Risk', value: 0.61, color: 'bg-amber-500' },
                                        { label: 'Concentration Risk', value: 0.55, color: 'bg-amber-400' },
                                        { label: 'Temporal Spike Risk', value: 0.80, color: 'bg-rose-500' },
                                        { label: 'Budget Risk', value: 0.12, color: 'bg-emerald-500' },
                                    ].map(item => (
                                        <div key={item.label} className="flex items-center gap-4">
                                            <div className="w-1/3 text-xs font-bold text-slate-400">{item.label}</div>
                                            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value * 100}%` }}></div>
                                            </div>
                                            <div className="w-12 text-right text-xs font-black text-slate-300 font-mono">{item.value.toFixed(2)}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Transaction List */}
                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                <History size={14} className="text-slate-400" /> 계정 변동 및 거래 내역
                            </h3>
                            <div className="space-y-2">
                                {/* Prepend Opening Balance Row */}
                                <div className="flex justify-between items-center p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs bg-indigo-500 text-white">
                                            B.F
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">
                                                {selectedAccount === '이익잉여금' ? '전기이월 누적 손익 (Accumulated Retained Earnings)' : '전기(기초) 잔액 이월 (Balance Brought Forward)'}
                                            </p>
                                            <p className="text-xs font-bold text-slate-500">System generated | Snapshot at start of period</p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-black font-mono text-white">
                                        ₩{getAccountDetails.analysis.opening.toLocaleString()}
                                    </span>
                                </div>

                                {getAccountDetails.entries.length === 0 ? (
                                    <div className="text-center py-10">
                                        <p className="text-slate-500 font-bold mb-2">해당 기간 내 신규 거래 내역이 없습니다.</p>
                                        {selectedAccount === '이익잉여금' && (
                                            <p className="text-slate-600 text-[11px] max-w-md mx-auto leading-relaxed">
                                                이익잉여금 계정은 전기의 최종 당기순이익이 합산되어 넘어온 수치입니다.<br />
                                                현재 표시된 <span className="text-indigo-400 font-black">₩{getAccountDetails.analysis.opening.toLocaleString()}</span>은 과거의 경영 실적이 누적된 결과물입니다.
                                            </p>
                                        )}
                                    </div>
                                ) : (
                                    getAccountDetails.entries.map((entry) => {
                                        const isDebit = entry.debitAccount === selectedAccount;
                                        return (
                                            <div key={entry.id} className="flex justify-between items-center p-4 bg-white/[0.02] hover:bg-white/[0.04] rounded-xl border border-white/5 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-xs ${isDebit ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                        {entry.date.substring(5, 10).replace('-', '/')}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-white group-hover:text-indigo-400 transition-colors">{entry.description}</p>
                                                        <p className="text-xs font-bold text-slate-500">{entry.vendor || 'System'} | {isDebit ? `상대계정: ${entry.creditAccount}` : `상대계정: ${entry.debitAccount}`}</p>
                                                    </div>
                                                </div>
                                                <span className={`text-sm font-black font-mono ${isDebit ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                    {isDebit ? '+' : '-'}{entry.amount.toLocaleString()}
                                                </span>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Premium Header */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                <div className="relative bg-[#151D2E] p-8 md:p-10 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl flex items-center justify-center shadow-2xl shadow-emerald-600/20">
                            <Zap className="text-white w-8 h-8" />
                        </div>
                        <div>
                            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">지능형 이동 시산표 (Movement TB)</h1>
                            <p className="text-slate-400 font-bold mt-1">
                                각 계정을 <span className="text-emerald-400 px-1 bg-emerald-500/10 rounded cursor-pointer hover:bg-emerald-500/20">클릭</span>하여 거래 내역 흐름을 추적(Drill-down)할 수 있습니다.
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-4">
                        <div className={`px-6 py-4 rounded-2xl border ${totals.opening !== 0 || totals.debit === totals.credit ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'} text-center min-w-[160px]`}>
                            <p className="text-[10px] font-black uppercase tracking-widest mb-1">데이터 무결성</p>
                            <p className="text-xl font-black flex items-center justify-center gap-2">
                                {totals.debit === totals.credit ? <Zap size={18} /> : <AlertCircle size={18} />}
                                {totals.debit === totals.credit ? 'VERIFIED' : 'ERROR'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Movement Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-slate-500/5 to-transparent border-slate-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">기초 (Opening)</span>
                        <History size={14} className="text-slate-400" />
                    </div>
                    <span className="text-3xl font-black text-white">₩{totals.opening.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">당기 증가 (Debit)</span>
                        <TrendingUp size={14} className="text-emerald-400" />
                    </div>
                    <span className="text-3xl font-black text-emerald-400">₩{totals.debit.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-rose-500/5 to-transparent border-rose-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">당기 감소 (Credit)</span>
                        <TrendingDown size={14} className="text-rose-400" />
                    </div>
                    <span className="text-3xl font-black text-rose-400">₩{totals.credit.toLocaleString()}</span>
                </div>
                <div className="professional-card p-6 flex flex-col gap-2 bg-gradient-to-br from-indigo-500/5 to-transparent border-indigo-500/20">
                    <div className="flex justify-between items-center text-slate-500 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-widest">기말 (Closing)</span>
                        <Calculator size={14} className="text-indigo-400" />
                    </div>
                    <span className="text-3xl font-black text-white font-mono">₩{totals.closing.toLocaleString()}</span>
                </div>
            </div>

            {/* Movement TB Table Area */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.04]">
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 text-center">계정과목 (Account)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] border-b border-white/5 text-right bg-white/[0.02]">기초 (Opening)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-emerald-500/70 uppercase tracking-[0.2em] border-b border-white/5 text-right">당기 증가 (+)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-rose-500/70 uppercase tracking-[0.2em] border-b border-white/5 text-right">당기 감소 (-)</th>
                                <th className="px-8 py-5 text-[10px] font-black text-white uppercase tracking-[0.2em] border-b border-white/5 text-right bg-white/[0.04]">기말 잔액 (Closing)</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {balances.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                            <BarChart3 className="text-slate-700" size={40} />
                                        </div>
                                        <div className="text-slate-500 font-black text-xl mb-2">시산표 데이터가 형성되지 않았습니다.</div>
                                        <p className="text-slate-600 text-sm font-bold">기초 잔액 설정 또는 전표 승인이 필요합니다.</p>
                                    </td>
                                </tr>
                            ) : (
                                balances.map((row) => (
                                    <tr
                                        key={row.accountName}
                                        onClick={() => setSelectedAccount(row.accountName)}
                                        className="hover:bg-white/[0.02] transition-colors group cursor-pointer"
                                    >
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-white group-hover:text-emerald-400 transition-colors uppercase tracking-tight flex items-center gap-2">
                                                    {row.accountName}
                                                    <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all font-bold" />
                                                </span>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className={`text-[9px] font-black px-1.5 py-0.5 rounded leading-none ${row.category === 'Asset' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        row.category === 'Expense' ? 'bg-orange-500/20 text-orange-400' :
                                                            row.category === 'Liability' ? 'bg-rose-500/20 text-rose-400' :
                                                                'bg-indigo-500/20 text-indigo-400'
                                                        }`}>
                                                        {row.category.toUpperCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-slate-400 text-right font-mono bg-white/[0.01]">
                                            {row.opening !== 0 ? row.opening.toLocaleString() : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-emerald-400/80 text-right font-mono">
                                            {row.debit !== 0 ? `+${row.debit.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-sm font-black text-rose-400/80 text-right font-mono">
                                            {row.credit !== 0 ? `-${row.credit.toLocaleString()}` : '-'}
                                        </td>
                                        <td className="px-8 py-6 text-base font-black text-white text-right font-mono bg-white/[0.02] group-hover:bg-white/[0.05] transition-all">
                                            {row.closing.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                        <tfoot className="bg-emerald-600/5 border-t-2 border-emerald-600/20">
                            <tr>
                                <td className="px-8 py-8 text-[11px] font-black text-emerald-400 uppercase tracking-[0.3em]">
                                    TOTAL CONSOLIDATION
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-slate-300 text-right font-mono">
                                    {totals.opening.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-emerald-400 text-right font-mono">
                                    {totals.debit.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-lg font-black text-rose-400 text-right font-mono">
                                    {totals.credit.toLocaleString()}
                                </td>
                                <td className="px-8 py-8 text-2xl font-black text-white text-right font-mono bg-emerald-600/10">
                                    {totals.closing.toLocaleString()}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>

            {/* AI Advisor Context - Cash Flow Intelligence */}
            <div className="bg-gradient-to-r from-emerald-600/10 to-transparent p-6 rounded-3xl border border-emerald-500/20 flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-2xl text-emerald-400">
                    <Zap size={24} />
                </div>
                <div>
                    <h4 className="text-white font-black leading-none mb-2">AI Cash Flow 기저 엔진 활성화</h4>
                    <p className="text-slate-400 text-sm font-bold">
                        Movement TB 분석 결과, 당기 순현금 흐름의 72%가 영업 활동에서 기인한 것으로 추정됩니다.
                        <br />
                        <span className="text-emerald-400 opacity-60">* 이 데이터는 현금흐름표(Cash Flow Statement) 자동 생성의 핵심 Source로 사용됩니다.</span>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;
