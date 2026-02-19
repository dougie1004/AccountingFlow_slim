import React from 'react';
import { ShieldAlert, Calendar, ChevronDown } from 'lucide-react';

interface LiabilityAlertBannerProps {
    liabilities: any[];
    ledger: any[];
    setTab: (tab: string) => void;
}

export const LiabilityAlertBanner: React.FC<LiabilityAlertBannerProps> = ({ liabilities, ledger, setTab }) => {
    const unplannedLiabilities = liabilities.filter(l => l.state === 'UNPLANNED');
    if (unplannedLiabilities.length === 0) return null;

    const totalAmount = unplannedLiabilities.reduce((sum, l) => sum + l.remainingAmount, 0);

    // Group by year for better organization
    const liabilityGroups = unplannedLiabilities.reduce((groups, liability) => {
        const entry = ledger.find(e => e.id === liability.entryId);
        if (!entry) return groups;

        const year = entry.date.substring(0, 4);
        if (!groups[year]) groups[year] = [];
        groups[year].push({ liability, entry });
        return groups;
    }, {} as Record<string, Array<{ liability: any; entry: any }>>);

    const [isExpanded, setIsExpanded] = React.useState(false);

    return (
        <div className="bg-gradient-to-r from-amber-600/10 to-yellow-600/10 border-2 border-amber-500/30 rounded-[2rem] overflow-hidden shadow-xl">
            {/* Header - Always Visible */}
            <div
                className="p-6 cursor-pointer hover:bg-amber-500/5 transition-all"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-4 bg-amber-500/20 rounded-2xl border border-amber-500/40">
                            <ShieldAlert size={28} className="text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white flex items-center gap-2">
                                ⚠️ 미확인 부채 {unplannedLiabilities.length}건 발견
                                <span className="text-xs font-normal text-slate-500">
                                    ({Object.keys(liabilityGroups).length}개 연도)
                                </span>
                            </h3>
                            <p className="text-sm text-slate-400 mt-1 font-bold">
                                시스템이 <span className="text-amber-300">가수금, 차입금 등 부채성 계정</span>을 자동 감지했습니다.
                            </p>
                            <p className="text-sm text-amber-300 font-bold mt-1">
                                총 <span className="text-amber-200 font-black text-base">₩{totalAmount.toLocaleString()}</span> 상환 계획 미수립
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 font-bold">
                            {isExpanded ? '접기' : '상세 보기'}
                        </span>
                        <div className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
                            <ChevronDown size={20} className="text-amber-400" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Expandable List */}
            {isExpanded && (
                <div className="border-t border-amber-500/20 bg-black/20">
                    <div className="p-6 space-y-4">
                        {(Object.entries(liabilityGroups) as [string, Array<{ liability: any; entry: any }>][]).sort(([a], [b]) => a.localeCompare(b)).map(([year, items]) => (
                            <div key={year} className="space-y-2">
                                <div className="text-xs font-black text-amber-400 uppercase tracking-widest mb-2">
                                    {year}년 ({items.length}건)
                                </div>
                                {items.map(({ liability, entry }) => (
                                    <div
                                        key={liability.id}
                                        className="flex items-center justify-between p-4 bg-white/[0.02] border border-white/10 rounded-xl hover:bg-white/[0.05] transition-all"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <span className="text-sm font-mono text-slate-400">{entry.date}</span>
                                                <span className="text-sm font-bold text-white">{entry.description || '설명 없음'}</span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1">
                                                <span className="text-xs text-slate-500">
                                                    대변: <span className="text-amber-400 font-bold">{entry.creditAccount}</span>
                                                </span>
                                                <span className="text-xs text-slate-500">
                                                    출처: <span className="text-indigo-400 font-bold">{liability.lender}</span>
                                                </span>
                                                <span className="text-sm font-black text-amber-300">
                                                    ₩{liability.remainingAmount.toLocaleString()}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                localStorage.setItem('journal_filter_hint', JSON.stringify({
                                                    startDate: entry.date,
                                                    endDate: entry.date,
                                                    reason: 'liability_review'
                                                }));
                                                setTab('journal');
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl text-xs font-black transition-all hover:scale-105"
                                        >
                                            <Calendar size={14} />
                                            확인
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
