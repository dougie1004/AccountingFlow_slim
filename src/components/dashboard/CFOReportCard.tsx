import React from 'react';
import {
    Clock,
    ArrowRight,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';

interface UnsettledStatusProps {
    metrics: {
        overdueReceivables: number;
        upcomingPayments: number;
    };
    onViewReport: () => void;
}

export const CFOReportCard: React.FC<UnsettledStatusProps> = ({ metrics, onViewReport }) => {
    return (
        <div className="bg-[#151D2E] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group h-full flex flex-col justify-between">

            {/* Header */}
            <div className="flex justify-between items-start z-10 relative mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                            <Clock size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-500/20 px-2 py-0.5 rounded-full bg-slate-500/5">
                            Pending Status
                        </span>
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        미결제 현황 (Unsettled)
                    </h2>
                    <p className="text-sm font-bold text-slate-400 mt-1">
                        현재 장부상 회수/지급되지 않은 건수입니다.
                    </p>
                </div>
                <button
                    onClick={onViewReport}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all group/btn"
                >
                    <ArrowRight size={20} className="group-hover/btn:translate-x-1 transition-transform" />
                </button>
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10 h-full">

                {/* 1. AR */}
                <div className="bg-[#0B1221]/50 border border-white/5 p-6 rounded-3xl hover:bg-[#0B1221] transition-all flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-emerald-400">
                        <ArrowDownLeft size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">To Collect</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mb-1">미수금 (받을 돈)</p>
                    <p className="text-2xl font-black text-white tracking-tight">
                        {formatCurrency(metrics.overdueReceivables)}
                    </p>
                </div>

                {/* 2. AP */}
                <div className="bg-[#0B1221]/50 border border-white/5 p-6 rounded-3xl hover:bg-[#0B1221] transition-all flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-2 text-rose-400">
                        <ArrowUpRight size={18} />
                        <span className="text-[10px] font-black uppercase tracking-widest">To Pay</span>
                    </div>
                    <p className="text-xs font-bold text-slate-500 mb-1">미지급금 (줄 돈)</p>
                    <p className="text-2xl font-black text-white tracking-tight">
                        {formatCurrency(metrics.upcomingPayments)}
                    </p>
                </div>
            </div>
        </div>
    );
};
