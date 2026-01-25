import React from 'react';
import { TrendingDown, Calculator, ShieldCheck, Download, Calendar, ArrowRight, Activity, Zap, RefreshCw, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAccounting } from '../hooks/useAccounting';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export const LeaseLedger: React.FC = () => {
    const { ledger, subLedger, config, addEntries } = useAccounting();

    // Filter for Lease Recognition and Payment entries from Approved records
    const rouAssets = subLedger.filter(e => e.debitAccount.includes('사용권자산'));
    const leaseLiabilities = subLedger.filter(e => e.debitAccount.includes('리스부채') || e.creditAccount.includes('리스부채'));

    // Potential leases found in Unconfirmed records
    const pendingLeaseExpenses = ledger.filter(e => e.status === 'Unconfirmed' && (e.description.includes('리스') || e.description.includes('렌트')));

    const totalROUValue = rouAssets.reduce((sum, e) => sum + e.amount, 0);
    const activeLeases = rouAssets.length;

    const [isDepreciationModalOpen, setIsDepreciationModalOpen] = React.useState(false);

    const runLeaseDepreciation = () => {
        if (rouAssets.length === 0) {
            alert("상각할 활성 리스 자산이 없습니다.");
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        const depreciationEntries = rouAssets.map(asset => {
            // Simple straight line depreciation over 60 months (default)
            // In real app, we'd fetch the leaseTerm from ocrData or metadata
            const monthlyDep = Math.floor(asset.amount / 60);

            return {
                id: `LEASE-DEP-${crypto.randomUUID().slice(0, 8)}`,
                date: today,
                description: `[K-IFRS 1116] 사용권자산 감가상각 - ${asset.description}`,
                debitAccount: '감가상각비 (리스자산)',
                creditAccount: '감가상각누계액 (사용권자산)',
                amount: monthlyDep,
                vat: 0,
                type: 'Expense' as const,
                status: 'Approved' as const,
                auditTrail: [`Automated Lease Amortization posted on ${today}`]
            };
        });

        addEntries(depreciationEntries);
        alert(`${depreciationEntries.length}건의 리스 자산 상각 전표가 승인 상태로 발행되었습니다.`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">
                    <ShieldCheck size={14} /> K-IFRS 1116 Compliance Ready
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <TrendingDown className="text-emerald-400" />
                    Lease Accounting Management <span className="text-slate-500 font-normal text-lg ml-2">리스 회계 통합 관리</span>
                </h1>
                <p className="text-slate-400 max-w-2xl text-lg">
                    사용권자산(ROU) 및 리스부채의 현재가치(PV)를 시장 금리 기반으로 정밀하게 추적합니다.
                </p>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-6 rounded-3xl border border-white/5 space-y-2 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">운용 자산 총액 (ROU Assets)</p>
                    <div className="text-3xl font-black text-white">₩{totalROUValue.toLocaleString()}</div>
                    <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                        <Zap size={10} /> Active Leases: {activeLeases}건
                    </div>
                </div>

                <div className="bg-[#151D2E] p-6 rounded-3xl border border-white/5 space-y-2 relative overflow-hidden group">
                    <div className="absolute right-0 top-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Calculator size={80} />
                    </div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">평균 적용 이자율 (Avg. Rate)</p>
                    <div className="text-3xl font-black text-indigo-400">{((config.taxPolicy?.defaultLeaseRate || 0.072) * 100).toFixed(1)}%</div>
                    <p className="text-[10px] text-slate-500 font-bold italic">Market Reality Guided Base</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-600/20 to-blue-600/20 p-6 rounded-3xl border border-emerald-500/20 space-y-2">
                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Lease Settlement</p>
                    <div className="text-xl font-black text-white">결산 주기별 자동 상각</div>
                    <button
                        onClick={runLeaseDepreciation}
                        className="mt-2 w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-black rounded-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={12} /> 이번 달 리스 상각 실행
                    </button>
                </div>
            </div>

            {pendingLeaseExpenses.length > 0 && (
                <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-[2rem] flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-2xl text-amber-500">
                            <AlertTriangle size={24} />
                        </div>
                        <div>
                            <h4 className="text-white font-black text-sm uppercase">Unprocessed Lease Detected</h4>
                            <p className="text-slate-400 text-xs font-bold">처리 대기 중인 리스료 전표가 {pendingLeaseExpenses.length}건 있습니다. [거래 전표 관리]에서 자산화 처리가 권장됩니다.</p>
                        </div>
                    </div>
                    <button className="px-6 py-2 bg-amber-500 text-white text-[11px] font-black rounded-xl hover:bg-amber-600 transition-all">
                        지금 처리하기
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* List of Leases */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-slate-900/50 rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                <Calendar size={18} className="text-indigo-400" />
                                리스 계약 현황 및 상환 내역 (Approved Only)
                            </h3>
                            <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[11px] font-black text-slate-300 transition-all">
                                신규 리스 계약 등록
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-black/20 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-4">계약명 / 증빙</th>
                                        <th className="px-6 py-4">취득 일자</th>
                                        <th className="px-6 py-4">계약 기간</th>
                                        <th className="px-6 py-4 text-right">최초 가액 (PV)</th>
                                        <th className="px-8 py-4">상태</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {rouAssets.length > 0 ? rouAssets.map(entry => (
                                        <tr key={entry.id} className="hover:bg-white/5 transition-colors group">
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white">{entry.description}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold">{entry.vendor} | {entry.id}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6 text-[12px] font-bold text-slate-400">{entry.date}</td>
                                            <td className="px-6 py-6 text-[12px] font-bold text-slate-400">60 Months</td>
                                            <td className="px-6 py-6 text-right font-mono font-black text-indigo-400 text-sm">₩{entry.amount.toLocaleString()}</td>
                                            <td className="px-8 py-6">
                                                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black rounded-md uppercase">정상 상환 중</span>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold italic">
                                                등록된 활성 리스 계약이 없습니다.<br />거래 전표 관리에서 '리스' 관련 전표를 AI 조작기로 자산화하세요.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Sidebar Guidance */}
                <div className="space-y-6">
                    <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-8 opacity-20 transform translate-x-1/4 -translate-y-1/4 scale-150">
                            <Zap size={120} />
                        </div>
                        <h4 className="text-white font-black text-xl mb-4 relative z-10">AI Lease Insight</h4>
                        <p className="text-indigo-100/80 text-sm leading-relaxed mb-6 font-bold relative z-10">
                            "현재 설정된 시장 기본 금리는 {((config.taxPolicy?.defaultLeaseRate || 0.072) * 100).toFixed(1)}% 입니다.
                            자동차 리스의 경우 캐피탈사 스프레드를 고려하여 8.0% 내외로 조정하는 것이 실질 가치 평가에 유리합니다."
                        </p>
                        <button className="px-6 py-3 bg-white text-indigo-600 font-black rounded-xl text-xs hover:bg-slate-100 transition-all relative z-10">
                            시장 금리 설정 변경
                        </button>
                    </div>

                    <div className="bg-slate-900 border border-white/5 p-8 rounded-[2.5rem] space-y-4">
                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                            <Download size={18} />
                            <span className="text-xs font-black uppercase tracking-widest">Specialist Reports</span>
                        </div>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left">
                                <span className="text-xs font-bold text-slate-300">내재이자율 검토 리포트</span>
                                <ArrowRight size={14} className="text-slate-600" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-all text-left">
                                <span className="text-xs font-bold text-slate-300">부채비율 영향 분석 (IFRS)</span>
                                <ArrowRight size={14} className="text-slate-600" />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
