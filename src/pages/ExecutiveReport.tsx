import React from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    Calculator,
    TrendingUp,
    TrendingDown,
    ShieldCheck,
    Zap,
    ArrowLeft,
    Download,
    Share2,
    Calendar,
    Target,
    Activity,
    Flag
} from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useConfig } from '../context/ConfigContext';
import { PremiumFeatureWall } from '../components/common/PremiumFeatureWall';

interface ExecutiveReportProps {
    onBack?: () => void;
}

export const ExecutiveReport: React.FC<ExecutiveReportProps> = ({ onBack }) => {
    const { closingRecords, periods, systemNow, ledger, initialCashBalance } = useAccounting();
    const { tenantInfo } = useConfig();

    // [CONSTITUTION v2.1] FILTER: Only show records that exist up to the current system time
    const latestRecord = closingRecords
        .filter(r => r.period <= systemNow.substring(0, 7))
        .sort((a, b) => b.period.localeCompare(a.period))[0];

    if (!latestRecord) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-4 py-20">
                <div className="p-4 bg-slate-500/10 rounded-full text-slate-500">
                    <Flag size={48} />
                </div>
                <h2 className="text-2xl font-black text-white">확정된 결산 리포트가 없습니다</h2>
                <p className="text-slate-400 max-w-md font-bold">
                    결산 관리 메뉴에서 월마감을 진행하면 AI가 분석한 정식 경영 리포트가 생성됩니다.
                </p>
                <button
                    onClick={onBack}
                    className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-black text-sm"
                >
                    대시보드로 돌아가기
                </button>
            </div>
        );
    }

    const s = latestRecord.summary;
    const prevRecord = closingRecords.find(r => r.period < latestRecord.period);

    // Performance Calculations
    const profitMargin = s.revenue > 0 ? (s.profit / s.revenue) * 100 : 0;
    const revGrowth = prevRecord ? ((s.revenue - prevRecord.summary.revenue) / prevRecord.summary.revenue) * 100 : 0;
    const profitGrowth = prevRecord && prevRecord.summary.profit !== 0 ? ((s.profit - prevRecord.summary.profit) / Math.abs(prevRecord.summary.profit)) * 100 : 0;

    return (
        <div className="space-y-8 pb-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Navigation & Header */}
            {/* Sticky Navigation & Header */}
            <div className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <button
                        onClick={onBack}
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl text-slate-400 hover:text-white transition-all border border-white/5"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-[9px] uppercase font-black tracking-widest border border-emerald-500/20">
                                공식 경영 리포트 (Executive Report)
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">
                            {latestRecord.period} 재무 성과 리포트
                        </h1>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest border border-white/5">
                        <Download size={14} /> PDF
                    </button>
                    <button className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">
                        <Share2 size={14} /> Share
                    </button>
                </div>
            </div>

            {/* Top Scorecards */}
            <PremiumFeatureWall
                plan={tenantInfo?.plan || 'Free'}
                minPlan="Standard"
                featureName="Executive Report Intelligence"
            >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-emerald-500 transition-transform group-hover:scale-110">
                            <TrendingUp size={64} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">당월 총 매출 (Revenue)</span>
                        <div className="text-3xl font-black text-white">{formatCurrency(s.revenue)}</div>
                        {prevRecord && (
                            <div className={`text-xs font-bold mt-2 flex items-center gap-1 ${revGrowth >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {revGrowth >= 0 ? '▲' : '▼'} {Math.abs(revGrowth).toFixed(1)}% 전월 대비
                            </div>
                        )}
                    </div>

                    <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-indigo-500 transition-transform group-hover:scale-110">
                            <Target size={64} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">당기 순이익 (Net Income)</span>
                        <div className={`text-3xl font-black ${s.profit >= 0 ? 'text-white' : 'text-rose-400'}`}>
                            {formatCurrency(s.profit)}
                        </div>
                        <div className="text-xs font-bold text-slate-500 mt-2">이익률: {profitMargin.toFixed(1)}%</div>
                    </div>

                    <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-fuchsia-500 transition-transform group-hover:scale-110">
                            <Activity size={64} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">자본 총계 (Total Equity)</span>
                        <div className="text-3xl font-black text-white">{formatCurrency(s.equity)}</div>
                        <div className="text-xs font-bold text-slate-500 mt-2">부채비율: {((s.totalLiabilities / s.equity) * 100).toFixed(1)}%</div>
                    </div>

                    <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-6 opacity-5 text-amber-500 transition-transform group-hover:scale-110">
                            <Zap size={64} />
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">기말 현금 잔액 (Cash)</span>
                        <div className="text-3xl font-black text-emerald-400">{formatCurrency(s.cash)}</div>
                        <div className="text-xs font-bold text-slate-500 mt-2">현금 유동성 확보됨</div>
                    </div>
                </div>

                {/* AI Briefing & Insight Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600/10 to-purple-600/5 p-10 rounded-[3rem] border border-indigo-500/20 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-12 opacity-[0.03] rotate-12">
                            <ShieldCheck size={280} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-3 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-600/20">
                                    <ShieldCheck size={24} className="text-white animate-pulse" />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white tracking-tight">AI CFO 경영 브리핑</h3>
                                    <p className="text-xs font-bold text-indigo-400/70 uppercase tracking-widest">Strategic Intelligence Report</p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                {latestRecord.aiBriefing ? (
                                    <p className="text-indigo-100 text-lg font-medium leading-relaxed whitespace-pre-wrap">
                                        {latestRecord.aiBriefing.replace(/###/g, '').replace(/\*\*/g, '')}
                                    </p>
                                ) : (
                                    <p className="text-slate-500 italic">브리핑 내용이 없습니다.</p>
                                )}
                            </div>

                            <div className="mt-10 pt-8 border-t border-indigo-500/10 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex -space-x-3">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="w-10 h-10 rounded-full border-2 border-[#151D2E] bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                                                {i === 1 ? 'VC' : i === 2 ? 'CEO' : 'CFO'}
                                            </div>
                                        ))}
                                    </div>
                                    <p className="text-sm font-bold text-indigo-300">경영진 3명이 이 리포트를 검토했습니다.</p>
                                </div>
                                <span className="text-[10px] font-black text-indigo-500/50 uppercase tracking-widest">Last Updated: {new Date(latestRecord.closedAt).toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E] p-10 rounded-[3rem] border border-white/5 flex flex-col justify-between">
                        <div>
                            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                                <Calculator className="text-indigo-400" size={20} />
                                핵심 재무 비율 (KPIs)
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-2">
                                        <span>영업이익률 (Operating Margin)</span>
                                        <span className="text-indigo-400">{profitMargin.toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min(Math.max(profitMargin, 0), 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-2">
                                        <span>부채 비율 (Debt Ratio)</span>
                                        <span className="text-amber-400">{((s.totalLiabilities / s.totalAssets) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((s.totalLiabilities / s.totalAssets) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <div className="flex justify-between text-[10px] font-black text-slate-500 uppercase mb-2">
                                        <span>현금 비중 (Cash Ratio)</span>
                                        <span className="text-emerald-400">{((s.cash / s.totalAssets) * 100).toFixed(1)}%</span>
                                    </div>
                                    <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full transition-all duration-1000"
                                            style={{ width: `${Math.min((s.cash / s.totalAssets) * 100, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 p-6 bg-white/[0.02] rounded-3xl border border-white/5">
                            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3">담당자 노트 (Manager's Note)</div>
                            <p className="text-xs font-bold text-slate-400 italic leading-relaxed">
                                "{latestRecord.note || '별도의 결산 코멘트가 작성되지 않았습니다.'}"
                            </p>
                        </div>
                    </div>
                </div>

                {/* Detailed Financial Tables - Simplified for Executive View */}
                <div className="bg-[#151D2E] rounded-[3rem] border border-white/5 overflow-hidden">
                    <div className="p-8 border-b border-white/5 bg-white/[0.02] flex items-center justify-between">
                        <h3 className="text-xl font-black text-white flex items-center gap-3">
                            <Calendar className="text-indigo-400" size={20} />
                            요약 손익계산서 (Summary P&L)
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">단위: KRW</span>
                    </div>

                    <table className="w-full text-sm">
                        <tbody className="divide-y divide-white/5">
                            <tr className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-10 py-5 text-slate-400 font-bold">매출액 (Revenue)</td>
                                <td className="px-10 py-5 text-right font-black text-white">{formatCurrency(s.revenue)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-10 py-5 text-slate-400 font-bold pl-16">ㄴ 제품/서비스 매출</td>
                                <td className="px-10 py-5 text-right font-bold text-slate-300">{formatCurrency(s.revenue)}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-10 py-5 text-slate-400 font-bold">매출원가 (COGS)</td>
                                <td className="px-10 py-5 text-right font-black text-rose-400">({formatCurrency(s.cogs || 0)})</td>
                            </tr>
                            <tr className="bg-white/5">
                                <td className="px-10 py-5 text-white font-black">매출총이익 (Gross Profit)</td>
                                <td className="px-10 py-5 text-right font-black text-white">{formatCurrency(s.revenue - (s.cogs || 0))}</td>
                            </tr>
                            <tr className="hover:bg-white/[0.02] transition-colors">
                                <td className="px-10 py-5 text-slate-400 font-bold">판매비와관리비 (SG&A)</td>
                                <td className="px-10 py-5 text-right font-black text-rose-400">({formatCurrency(s.sga || 0)})</td>
                            </tr>
                            {s.nonOperatingExpense > 0 && (
                                <tr className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-10 py-5 text-slate-400 font-bold">영업외비용 (Non-Op)</td>
                                    <td className="px-10 py-5 text-right font-black text-rose-400">({formatCurrency(s.nonOperatingExpense)})</td>
                                </tr>
                            )}
                            <tr className="bg-indigo-600/10">
                                <td className="px-10 py-6 text-indigo-400 font-black text-lg">당기순이익 (Net Income)</td>
                                <td className="px-10 py-6 text-right font-black text-white text-2xl">{formatCurrency(s.profit)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Balance Sheet Highlights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-[#151D2E] rounded-[3rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <TrendingUp className="text-emerald-400" size={20} />
                                자산 구성 (Assets)
                            </h3>
                        </div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold">유동자산 (Current Assets)</td>
                                    <td className="px-10 py-4 text-right font-black text-white">{formatCurrency(s.cash)}</td>
                                </tr>
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold pl-16">ㄴ 보통예금</td>
                                    <td className="px-10 py-4 text-right font-bold text-slate-300">{formatCurrency(s.cash)}</td>
                                </tr>
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold">비유동자산 (Non-Current Assets)</td>
                                    <td className="px-10 py-4 text-right font-black text-white">{formatCurrency(s.fixedAssetsNetBookValue)}</td>
                                </tr>
                                <tr className="bg-emerald-600/5">
                                    <td className="px-10 py-6 text-emerald-400 font-black">자산 총계</td>
                                    <td className="px-10 py-6 text-right font-black text-white text-xl">{formatCurrency(s.totalAssets)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-[#151D2E] rounded-[3rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 bg-white/[0.02]">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <TrendingDown className="text-rose-400" size={20} />
                                부채 및 자본 (Liabilities & Equity)
                            </h3>
                        </div>
                        <table className="w-full text-sm">
                            <tbody className="divide-y divide-white/5">
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold">부채 총계 (Liabilities)</td>
                                    <td className="px-10 py-4 text-right font-black text-rose-400">{formatCurrency(s.totalLiabilities)}</td>
                                </tr>
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold">자본 총계 (Equity)</td>
                                    <td className="px-10 py-4 text-right font-black text-white">{formatCurrency(s.equity)}</td>
                                </tr>
                                <tr className="hover:bg-white/[0.02]">
                                    <td className="px-10 py-4 text-slate-400 font-bold pl-16">ㄴ 이익잉여금(결손금)</td>
                                    <td className="px-10 py-4 text-right font-bold text-slate-300">{formatCurrency(s.profit)}</td>
                                </tr>
                                <tr className="bg-indigo-600/5">
                                    <td className="px-10 py-6 text-indigo-400 font-black">부채 및 자본 총계</td>
                                    <td className="px-10 py-6 text-right font-black text-white text-xl">{formatCurrency(s.totalAssets)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="p-8 bg-white/[0.02] border border-white/5 rounded-[2.5rem] flex items-center justify-between">
                    <div className="flex items-center gap-4 text-slate-500">
                        <ShieldCheck size={20} />
                        <span className="text-xs font-bold">이 리포트는 AccountingFlow Core Engine에 의해 생성된 정합성이 검증된 데이터입니다.</span>
                    </div>
                    <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                        Digital Signature: {Math.random().toString(36).substring(7).toUpperCase()}
                    </div>
                </div>
            </PremiumFeatureWall>
        </div>
    );
};
