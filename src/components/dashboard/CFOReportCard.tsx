import React from 'react';
import {
    ShieldCheck,
    Cpu,
    Coins,
    Globe,
    ArrowUpRight,
    ArrowDownRight,
    TrendingUp,
    AlertCircle,
    ReceiptText
} from 'lucide-react';
import { InfoTooltip } from '../ui/InfoTooltip';

interface CFOReportCardProps {
    metrics: {
        rndAssetValue: number;
        stockOptionExpense: number;
        fxGainLoss: number;
        fxExposure: number;
        estimatedTaxCredit: number;
    }
}

export const CFOReportCard: React.FC<CFOReportCardProps> = ({ metrics }) => {
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
                            <h3 className="text-xl font-black text-white tracking-tight">CFO 전략적 리포트 카드</h3>
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Strategic Finance Overview</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 text-[10px] font-black text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        REAL-TIME OPTIMIZED
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* R&D Optimization */}
                    <div className="bg-white/5 border border-white/5 p-6 rounded-3xl hover:bg-white/10 transition-all group/item">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl group-hover/item:scale-110 transition-transform">
                                <Cpu size={20} />
                            </div>
                            <InfoTooltip
                                title="R&D CapEx"
                                content="비용으로 사라질 돈을 회사의 가치(자산)로 바꾼 금액입니다."
                                contextualTip={`인건비 중 개발비로 분류되어 주당순자산(BPS)이 약 ${((metrics.rndAssetValue / 1000000) / 10).toFixed(2)}% 개선되었습니다.`}
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">R&D Capitalization</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">₩{(metrics.rndAssetValue / 10000).toLocaleString()}만</span>
                            <div className="flex items-center text-emerald-400 text-[10px] mb-1 font-black">
                                <ArrowUpRight size={12} /> BPS 상승
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
                                title="Stock Compensation"
                                content="임직원에게 부여한 스톡옵션이 재무제표상 비용으로 인식된 금액입니다."
                                contextualTip="실제 현금이 나가는 것이 아닌 장부상 비용이므로 VC 실사 시 가산될 금액입니다."
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">Stock Compensation</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">₩{(metrics.stockOptionExpense / 10000).toLocaleString()}만</span>
                            <div className="flex items-center text-slate-500 text-[10px] mb-1 font-black">
                                <AlertCircle size={12} className="mr-1" /> 비현금성
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
                                title="FX Exposure"
                                content="환율 변동에 따라 위험해질 수 있는 외화 자산 규모입니다."
                                contextualTip={metrics.fxGainLoss >= 0 ? "현재 환율 상승으로 이익 구간입니다." : "환율 하락에 따른 평가 손실 리스크가 있습니다."}
                            />
                        </div>
                        <p className="text-xs font-bold text-slate-400 mb-1">FX Exposure</p>
                        <div className="flex items-end gap-2 text-white">
                            <span className="text-2xl font-black">
                                {metrics.fxGainLoss >= 0 ? '+' : '-'}₩{Math.abs(metrics.fxGainLoss / 10000).toLocaleString()}만
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
                                <span className="text-indigo-400">AI CFO Insight:</span> 현재 세액공제 최적화로 약 <span className="text-emerald-400">₩{(metrics.estimatedTaxCredit / 10000).toFixed(0)}만원</span>의 가처분 이익이 추가 확보되었습니다.
                            </p>
                            <InfoTooltip
                                title="Tax Optimization"
                                content="정부의 조세특례제한법에 따른 세액공제 혜택 추정치입니다."
                                contextualTip="연구인력개발비 및 청년고용 공제가 주로 반영되었습니다."
                            />
                        </div>
                    </div>
                    <button className="text-[10px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">
                        상세 리포트 보기
                    </button>
                </div>
            </div>
        </div>
    );
};
