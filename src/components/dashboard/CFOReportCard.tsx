import React from 'react';
import {
    Clock,
    ArrowRight,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { formatCurrency } from '../../utils/formatUtils';

import { InfoTooltip } from '../ui/InfoTooltip';

interface UnsettledStatusProps {
    metrics: {
        overdueReceivables: number;
        upcomingPayments: number;
    };
    onViewReport: () => void;
}

export const CFOReportCard: React.FC<UnsettledStatusProps> = ({ metrics, onViewReport }) => {
    return (
        <div className="bg-[#151D2E] border border-white/5 rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group flex flex-col justify-between">

            {/* Header */}
            <div className="flex justify-between items-start z-10 relative mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                            <Clock size={20} />
                        </div>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border border-slate-500/20 px-2 py-0.5 rounded-full bg-slate-500/5">
                            대기 상태 (Pending)
                        </span>
                        <InfoTooltip
                            title="대기 상태 (Pending Status)"
                            content="장부에 기록되었으나 아직 현금 유출입이 완료되지 않은(isSettled=false) 거래들의 합계입니다."
                        />
                    </div>
                    <h2 className="text-2xl font-black text-white tracking-tight">
                        미결제 현황
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
                        <span className="text-[10px] font-black uppercase tracking-widest">수금 예정 (AR)</span>
                        <InfoTooltip
                            title="미수금 (Accounts Receivable)"
                            content="매출은 발생했으나 아직 대금을 받지 못한 금액입니다. 장부상 '미수금' 또는 '외상매출금' 계정 중 미결제된 항목의 합계입니다."
                        />
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
                        <span className="text-[10px] font-black uppercase tracking-widest">지급 예정 (AP)</span>
                        <InfoTooltip
                            title="미지급금 (Accounts Payable)"
                            content="비용은 발생했으나 아직 대금을 지급하지 않은 금액입니다. 장부상 '미지급금' 또는 '외상매입금' 계정 중 미결제된 항목의 합계입니다."
                        />
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
