import React from 'react';
import {
    ShieldCheck,
    Cpu,
    Coins,
    Globe,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    AlertCircle
} from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';
import { formatCLevel } from '../../utils/formatUtils';

interface CFOReportCardProps {
    metrics: {
        totalRndInvestment: number;
        stockOptionExpense: number;
        fxGainLoss: number;
        fxExposure: number;
        estimatedTaxCredit: number;
    };
    certifications?: {
        hasRDDept?: boolean;
        hasRDLab?: boolean;
    };
    onViewReport?: () => void;
}

export const CFOReportCard: React.FC<CFOReportCardProps> = ({ metrics, certifications, onViewReport }) => {
    return (
        <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-indigo-500/30 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group">
            {/* Decors */}
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full group-hover:bg-indigo-500/20 transition-all duration-700" />

            <div className="relative z-10 flex flex-col gap-8">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-600/20">
                            <ShieldCheck className="text-white" size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">CFO Strategic Intelligence</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Automated Financial Controller</p>
                        </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full border border-indigo-500/20">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                            SYSTEM_LEVEL_VERIFIED
                        </div>
                        <div className="flex gap-2">
                            {certifications?.hasRDLab && (
                                <div className="text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                                    기업부설연구소 인증
                                </div>
                            )}
                            {certifications?.hasRDDept && (
                                <div className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md border border-blue-500/20">
                                    연구전담부서 인증
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/10 transition-all group/item">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl group-hover/item:scale-110 transition-transform">
                                <Cpu size={20} />
                            </div>
                            <InfoTooltip
                                title="R&D 투자 분석 (Tax/Asset)"
                                content="연구개발인력의 인건비 및 재료비 중 세액공제 대상이 되는 총 투입액입니다."
                                contextualTip={`비용 처리(Expense) 시 법인세 즉시 절감, 자산화(CapEx) 시 기업 가치(BPS) 약 ${((metrics.totalRndInvestment / 1000000) / 10).toFixed(2)}% 개선 효과가 있습니다. 현 시스템은 두 경로 모두 세액공제 대상으로 집계합니다.`}
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">R&D Total Investment</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">{formatCLevel(metrics.totalRndInvestment)}</span>
                            <div className="flex items-center text-emerald-400 text-[10px] mb-1 font-black">
                                <ArrowUpRight size={12} /> Tax Eligible
                            </div>
                        </div>
                    </div>

                    {/* SBC Impact */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/10 transition-all group/item">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl group-hover/item:scale-110 transition-transform">
                                <Coins size={20} />
                            </div>
                            <InfoTooltip
                                title="주식보상비용 (SBC)"
                                content="주식선택권(Stock Option) 부여에 따라 발생한 보상비용을 발생주의 원칙에 의거하여 계상한 금액입니다."
                                contextualTip="비현금성 비용(Non-cash items)으로, 기업 현금 흐름에는 실질적 영향이 없음을 유의 바랍니다."
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Stock Compensation</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">{formatCLevel(metrics.stockOptionExpense)}</span>
                            <div className="flex items-center text-slate-500 text-[10px] mb-1 font-black">
                                <AlertCircle size={12} className="mr-1" /> Non-cash
                            </div>
                        </div>
                    </div>

                    {/* FX Risk */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/10 transition-all group/item">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl group-hover/item:scale-110 transition-transform">
                                <Globe size={20} />
                            </div>
                            <InfoTooltip
                                title="외환 익스포저 (FX)"
                                content="외화 표기 자산 및 부채의 환율 변동에 따른 기말 환산 손익입니다."
                                contextualTip={metrics.fxGainLoss >= 0 ? "현재 환율 상승에 따른 평가 이익 구간입니다." : "환율 하락에 따른 평가 손실 리스크가 관측됩니다."}
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">FX Exposure</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">
                                {metrics.fxGainLoss >= 0 ? '+' : '-'}{formatCLevel(Math.abs(metrics.fxGainLoss))}
                            </span>
                            <div className={`flex items-center text-[10px] mb-1 font-black ${metrics.fxGainLoss >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {metrics.fxGainLoss >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                                {metrics.fxGainLoss >= 0 ? '환차익' : '환차손'}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <TrendingUp className="text-indigo-400" size={18} />
                        <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-300 font-bold">
                                <span className="text-indigo-400">Tactical Insight:</span> 기 분석된 세액공제 최적화 엔진을 통해 <span className="text-emerald-400">{formatCLevel(metrics.estimatedTaxCredit)}</span> 규모의 조세 절감액이 추산되었습니다. (R&D 투자액의 25% 적용)
                            </p>
                            <InfoTooltip
                                title="조세 최적화 시뮬레이션"
                                content="조세특례제한법에 근거한 연구인력개발비 및 고용증대 세액공제 추정치입니다."
                                contextualTip="해당 데이터는 가결산용 추정치이므로, 기말 정산 시 확정 세무 조정이 수반되어야 합니다."
                            />
                        </div>
                    </div>
                    <button
                        onClick={onViewReport}
                        className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors bg-white/5 px-3 py-1.5 rounded-lg hover:bg-white/10"
                    >
                        Report Details
                    </button>
                </div>
            </div>
        </div>
    );
};
