import React, { useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    ArrowRight,
    Activity,
    Lock,
    Sparkles,
    Lightbulb,
    ShieldAlert,
    AlertTriangle,
    Clock,
    BarChart3,
    PieChart as PieChartIcon,
    ArrowUpRight,
    ArrowDownRight,
    Search,
    Filter
} from 'lucide-react';
import { formatCurrency, formatPercent } from '../utils/formatUtils';
import {
    PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { isSuspenseAccount, BLOCKED_REASON } from '../constants/accounts';
import { analyzeIntelligence } from '../core/intelligenceEngine';
import { IntelligenceSnapshot } from '../types/intelligence';

export const RiskDashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const { ledger, financials } = useAccounting();

    const stats = useMemo(() => {
        const today = new Date();
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(today.getDate() - 90);

        // Detect Unsettled Items by Pillar (Broadened)
        const isSuspense = (name: string) => ['가지급금', '가수금', '전도금', 'suspense', 'petty'].some(k => name.toLowerCase().includes(k));
        const isArAp = (name: string) => ['외상매출', '외상매입', '미수금', '미지급금', '매출채권', '매입채무', 'receivable', 'payable'].some(k => name.toLowerCase().includes(k));
        const isMatching = (name: string) => ['선급금', '선수금', '선급비용', '선수수익', 'prepayment', 'advance', 'deferred', 'accrued'].some(k => name.toLowerCase().includes(k));

        const unsettledEntries = ledger.filter(e => !e.isSettled);

        // 1. Compliance Risk (가계정)
        const complianceEntries = unsettledEntries.filter(e => isSuspense(e.debitAccount) || isSuspense(e.creditAccount));
        const complianceAmount = complianceEntries.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

        // 2. Operational Risk (상거래 미결)
        const opEntries = unsettledEntries.filter(e => isArAp(e.debitAccount) || isArAp(e.creditAccount));
        const opAmount = opEntries.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

        // 3. Matching Risk (선급/선수/상각)
        const matchingEntries = unsettledEntries.filter(e => isMatching(e.debitAccount) || isMatching(e.creditAccount));
        const matchingAmount = matchingEntries.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

        const totalUnsettledAmount = complianceAmount + opAmount + matchingAmount;
        const totalAssets = financials?.totalAssets || 1;

        // Blocked & Aging logic (Keep for compatibility/depth)
        const blocked = unsettledEntries.filter(e => e.clearingRecord?.status === 'BLOCKED');
        const blockedAmount = blocked.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

        const aging90 = unsettledEntries.filter(e => new Date(e.date) < ninetyDaysAgo);
        const overdue90Amount = aging90.reduce((s, e) => s + (e.amount + (e.vat || 0)), 0);

        const pillarData = [
            { name: '가계정 (Compliance)', value: complianceAmount, color: '#ef4444' },
            { name: '상거래 미결 (Operational)', value: opAmount, color: '#3b82f6' },
            { name: '결산/상각 관리 (Matching)', value: matchingAmount, color: '#10b981' },
        ];

        // Status logic for Pie Chart
        const statusData = [
            { name: '정상 미결 (Open)', value: totalUnsettledAmount - blockedAmount, color: '#3b82f6' },
            { name: '기한 경과/중단 (High Risk)', value: blockedAmount + overdue90Amount, color: '#ef4444' },
        ];

        const snapshot: IntelligenceSnapshot = {
            companyId: 'default-tenant',
            asOfDate: today.toISOString(),
            metrics: {
                totalAssets,
                unsettledAmount: totalUnsettledAmount,
                suspenseRatio: complianceAmount / totalAssets,
                opRiskRatio: opAmount / (totalUnsettledAmount || 1),
                matchingRiskRatio: matchingAmount / (totalUnsettledAmount || 1),
                blockedAmount,
                blockedRatio: blockedAmount / (totalUnsettledAmount || 1),
                overdue90Amount,
                overdue90Ratio: overdue90Amount / (totalUnsettledAmount || 1)
            },
            breakdowns: {
                byStatus: {
                    OPEN: totalUnsettledAmount - blockedAmount,
                    BLOCKED: blockedAmount,
                    CLEARED: 0
                },
                byRiskReason: {}
            }
        };

        const findings = analyzeIntelligence(snapshot);

        // Check if matching items exist for checklist
        const hasPrepayments = matchingEntries.some(e => e.debitAccount.includes('선급'));
        const hasAdvances = matchingEntries.some(e => e.creditAccount.includes('선수'));

        return {
            totalUnsettledAmount,
            complianceAmount,
            opAmount,
            matchingAmount,
            blockedAmount,
            overdue90Amount,
            pillarData,
            statusData,
            blockedCount: blocked.length,
            aging90Count: aging90.length,
            findings,
            hasPrepayments,
            hasAdvances
        };
    }, [ledger, financials]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Lock className="text-rose-500" size={32} />
                        결산 및 자금 통제 센터 (Closing & Fund Control)
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">상거래 채권/채무, 선급/선수금 및 가계정 미결 항목의 결산 리스크를 통합 관리합니다.</p>
                </div>
                <div className="flex items-center gap-3 bg-[#151D2E] p-1 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 px-4 py-2">
                    <Activity size={12} className="text-emerald-500 animate-pulse" />
                    Live Risk Monitoring
                </div>
            </header>

            {/* Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-rose-500/30 transition-all cursor-pointer" onClick={() => setTab('arap-management')}>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">BLOCKED 총액</p>
                    <h4 className="text-2xl font-black text-rose-500">{formatCurrency(stats.blockedAmount)}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-2 flex items-center gap-1">
                        <ShieldAlert size={12} /> {stats.blockedCount}건의 공식 리스크 관리 중
                    </p>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldAlert size={64} />
                    </div>
                </div>

                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">90일 초과 미정산</p>
                    <h4 className="text-2xl font-black text-white">{formatCurrency(stats.overdue90Amount)}</h4>
                    <p className="text-[10px] font-bold text-amber-500 mt-2 flex items-center gap-1">
                        <Clock size={12} /> {stats.aging90Count}건의 장기 미결 항목 존재
                    </p>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Clock size={64} />
                    </div>
                </div>

                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-indigo-500/30 transition-all">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">상거래 미결 리스크</p>
                    <h4 className="text-2xl font-black text-white">{formatCurrency(stats.opAmount)}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">외상매출/매입 등 영업 미결 항목</p>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <BarChart3 size={64} />
                    </div>
                </div>

                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">매칭 이슈 리스크</p>
                    <h4 className="text-2xl font-black text-emerald-400">{formatCurrency(stats.matchingAmount)}</h4>
                    <p className="text-[10px] font-bold text-slate-400 mt-2">선급금/선수금 등 계약 미완료 항목</p>
                    <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Activity size={64} />
                    </div>
                </div>
            </div>

            {/* Intelligence & Closing Checklist */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-12 mb-2">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] px-4">Flow Intelligence & Closing Operations</p>
                </div>

                <div className="lg:col-span-8 bg-[#151D2E] rounded-[2.5rem] border border-indigo-500/20 overflow-hidden shadow-2xl shadow-indigo-500/5">
                    <div className="p-8 border-b border-white/5 bg-gradient-to-r from-indigo-500/10 to-transparent flex justify-between items-center">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <Sparkles className="text-indigo-400" size={20} />
                            인텔리전스 경영 통찰 (Intelligence Findings)
                        </h3>
                    </div>
                    <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                        {stats.findings.map((insight) => (
                            <div key={insight.id} className="bg-[#0B1221] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${insight.severity === 'URGENT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                            insight.severity === 'ATTENTION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                                insight.severity === 'STABLE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                                    'bg-slate-500/20 text-slate-400 border border-slate-500/30'
                                            }`}>
                                            {insight.severity}
                                        </div>
                                    </div>
                                    <div>
                                        <h4 className="text-white font-black text-lg mb-2">{insight.title}</h4>
                                        <p className="text-slate-400 text-sm font-medium leading-relaxed">{insight.description}</p>
                                    </div>
                                </div>
                                <div className="mt-6 pt-6 border-t border-white/5">
                                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Lightbulb size={12} /> 권고 (Recommendation)
                                    </p>
                                    <p className="text-slate-300 text-xs font-bold">{insight.recommendation}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="lg:col-span-4 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex flex-col">
                    <h3 className="text-xl font-black text-white flex items-center gap-2 mb-6">
                        <Activity className="text-emerald-400" size={20} />
                        월결산 체크리스트
                    </h3>
                    <div className="space-y-4 flex-1">
                        <div className={`p-4 rounded-2xl border ${stats.complianceAmount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/5 border-white/5'} transition-all`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${stats.complianceAmount > 0 ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-black ${stats.complianceAmount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>가계정(가수/가지급) 소명 및 정산</span>
                            </div>
                            {stats.complianceAmount > 0 && <p className="text-[10px] font-bold text-slate-500 mt-2 ml-5">확인되지 않은 입출금 {formatCurrency(stats.complianceAmount)}에 대한 실질 계정 대체가 필요합니다.</p>}
                        </div>

                        <div className={`p-4 rounded-2xl border ${stats.hasPrepayments ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/5'} transition-all`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${stats.hasPrepayments ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-black ${stats.hasPrepayments ? 'text-amber-400' : 'text-slate-400'}`}>선급비용 월할 상각 (Amortization)</span>
                            </div>
                            {stats.hasPrepayments && <p className="text-[10px] font-bold text-slate-500 mt-2 ml-5">당기 귀속분 비용 처리를 위한 상각 전표 발행 대상이 존재합니다.</p>}
                        </div>

                        <div className={`p-4 rounded-2xl border ${stats.hasAdvances ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/5 border-white/5'} transition-all`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${stats.hasAdvances ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-black ${stats.hasAdvances ? 'text-amber-400' : 'text-slate-400'}`}>선수금 매출 인식 (Matching)</span>
                            </div>
                            {stats.hasAdvances && <p className="text-[10px] font-bold text-slate-500 mt-2 ml-5">서비스 인도 완료 여부에 따른 수익 인식 시점을 검토하세요.</p>}
                        </div>

                        <div className={`p-4 rounded-2xl border ${stats.blockedCount > 0 ? 'bg-rose-500/5 border-rose-500/20' : 'bg-white/5 border-white/5'} transition-all`}>
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${stats.blockedCount > 0 ? 'bg-rose-500' : 'bg-emerald-500'}`} />
                                <span className={`text-xs font-black ${stats.blockedCount > 0 ? 'text-rose-400' : 'text-slate-400'}`}>Blocked 리스크 항목 소명</span>
                            </div>
                            {stats.blockedCount > 0 && <p className="text-[10px] font-bold text-slate-500 mt-2 ml-5">증빙 누락 등으로 정산이 중단된 {stats.blockedCount}건의 예외 승인을 검토하세요.</p>}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Chart */}
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <PieChartIcon className="text-indigo-400" size={20} />
                                정산 리스크 유형 분포 (Risk Pillars)
                            </h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">미결 항목을 성격별로 분류한 리스크 분포입니다.</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={stats.pillarData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={80}
                                    outerRadius={110}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {stats.pillarData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                    formatter={(v: any) => [`${v.toLocaleString()}원`, '금액']}
                                />
                                <Legend verticalAlign="bottom" height={36} />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Risk Reason Top List */}
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5">
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <BarChart3 className="text-rose-400" size={20} />
                                정산 집중 관리 상태 (Clearing Status)
                            </h3>
                            <p className="text-xs font-bold text-slate-500 mt-1">미결 항목 중 내부 통제에 의한 조치 상태입니다.</p>
                        </div>
                    </div>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.statusData} layout="vertical">
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#ffffff05" />
                                <XAxis type="number" hide />
                                <YAxis
                                    dataKey="name"
                                    type="category"
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }}
                                    axisLine={false}
                                    tickLine={false}
                                    width={120}
                                />
                                <Tooltip
                                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                    contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                                    formatter={(v: any) => [`${v.toLocaleString()}원`, '금액']}
                                />
                                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Drill-down Section */}
            <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-rose-500/10 rounded-2xl flex items-center justify-center text-rose-500 border border-rose-500/20">
                        <AlertTriangle size={32} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black text-white">상세 리스크 항목 검토가 필요합니까?</h4>
                        <p className="text-sm font-bold text-slate-500">BLOCKED 처리되었거나 90일이 경과한 개별 전표를 직접 확인하고 조치할 수 있습니다.</p>
                    </div>
                </div>
                <button
                    onClick={() => setTab('arap-management')}
                    className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all flex items-center gap-2 border border-white/5 active:scale-95"
                >
                    상세 리스트로 이동
                    <ArrowRight size={18} />
                </button>
            </div>
        </div>
    );
};
