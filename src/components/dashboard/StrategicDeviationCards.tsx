import React, { useMemo } from 'react';
import { ShieldCheck, Crosshair, Zap, Activity, ShieldAlert, Target } from 'lucide-react';
import { JournalEntry } from '../../types';
import { analyzeStrategicDeviation } from '../../strategic_layer/deviationEngine';
import { formatCurrency } from '../../utils/formatUtils';

interface StrategicDeviationCardsProps {
    ledger: JournalEntry[];
    viewDate: string | null;
}

export const StrategicDeviationCards: React.FC<StrategicDeviationCardsProps> = ({ ledger, viewDate }) => {
    const deviations = useMemo(() => {
        try {
            // Apply date filter for the *current specific month* to get monthly metrics
            const targetMonth = viewDate ? viewDate.substring(0, 7) : new Date().toISOString().substring(0, 7);
            const monthlyLedger = ledger.filter(e => e.date.startsWith(targetMonth));
            return analyzeStrategicDeviation(monthlyLedger);
        } catch (e) {
            console.error("Deviation Analytics Error:", e);
            return [];
        }
    }, [ledger, viewDate]);

    // Only show actionable deviations or specific targets
    const displayDeviations = deviations.filter(d =>
        d.metric === 'BurnRate' ||
        d.metric === 'SalesConcentration' ||
        d.metric === 'InfraEfficiency'
    );

    if (displayDeviations.length === 0) return null;

    return (
        <div className="bg-[#151D2E] border border-white/5 rounded-[2.5rem] p-8 overflow-hidden relative group h-full">
            <div className="absolute top-0 right-0 p-8 text-indigo-500/5 group-hover:scale-110 transition-transform duration-700 pointer-events-none">
                <Target size={140} />
            </div>

            <div className="relative z-10 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Crosshair size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white">전략적 편차 (Deviation Cards)</h3>
                        <p className="text-xs font-bold text-slate-500 mt-1">경영진을 위한 핵심 리스크 & 기회 감지</p>
                    </div>
                </div>

                <div className="grid gap-4 flex-1">
                    {displayDeviations.map(d => {
                        const isCritical = d.severity === 'CRITICAL';
                        const isWatch = d.severity === 'WATCH';

                        let colorClass = 'text-emerald-500';
                        let bgClass = 'bg-emerald-500/5 border-emerald-500/20';
                        let badgeBg = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
                        let icon = <ShieldCheck size={16} />;

                        if (isCritical) {
                            colorClass = 'text-rose-500';
                            bgClass = 'bg-rose-500/5 border-rose-500/20';
                            badgeBg = 'bg-rose-500/20 text-rose-400 border-rose-500/30';
                            icon = <ShieldAlert size={16} className="animate-pulse" />;
                        } else if (isWatch) {
                            colorClass = 'text-amber-400';
                            bgClass = 'bg-amber-500/5 border-amber-500/20';
                            badgeBg = 'bg-amber-500/20 text-amber-400 border-amber-500/30';
                            icon = <Activity size={16} />;
                        }

                        let title: string = d.metric;
                        let displayValue = `${d.variancePercent > 0 ? '+' : ''}${Math.round(d.variancePercent)}%`;
                        let suffix = "목표 대비";

                        if (d.metric === 'BurnRate') {
                            title = '현금 연소율 (Burn Rate)';
                            displayValue = formatCurrency(d.actual);
                            suffix = "월";
                        }
                        if (d.metric === 'SalesConcentration') {
                            title = '매출 집중도';
                            displayValue = `${Math.round(d.actual)}%`;
                            suffix = "차지";
                        }
                        if (d.metric === 'InfraEfficiency') {
                            title = '인프라 효율성';
                            displayValue = `${Math.round(d.actual)}%`;
                            suffix = "비중";
                        }

                        return (
                            <div key={d.id} className={`${bgClass} border rounded-2xl p-4 transition-all hover:scale-[1.02]`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg border ${badgeBg}`}>
                                                {d.severity}
                                            </span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase">{d.category}</span>
                                        </div>
                                        <h4 className="text-sm font-black text-white">{title}</h4>
                                    </div>
                                    <div className={`p-2 rounded-xl bg-black/20 ${colorClass}`}>
                                        {icon}
                                    </div>
                                </div>
                                <div className="flex justify-between items-end mt-3">
                                    <div className="flex gap-2 items-baseline">
                                        <span className={`text-2xl font-black ${colorClass} tracking-tighter`}>{displayValue}</span>
                                        <span className="text-[10px] font-bold text-slate-500">
                                            {suffix}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs font-bold text-slate-400 mt-2 line-clamp-1 group-hover:line-clamp-none transition-all cursor-default">
                                    {d.insight}
                                </p>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};
