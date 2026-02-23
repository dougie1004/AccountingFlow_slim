import React, { useMemo } from 'react';
import { X, AlertTriangle, TrendingDown, Users, CalendarDays, ExternalLink } from 'lucide-react';
import { JournalEntry } from '../../../types';

interface RiskEvidenceModalProps {
    riskId: 'strategy' | 'cash' | 'survival' | 'control';
    ledger: JournalEntry[];
    systemNow: string;
    onClose: () => void;
    onNavigate: (tabId: string) => void;
}

export const RiskEvidenceModal: React.FC<RiskEvidenceModalProps> = ({ riskId, ledger, systemNow, onClose, onNavigate }) => {

    // Stop event propagation out to the card click handler if we click inside the modal content
    const stopPropagation = (e: React.MouseEvent) => e.stopPropagation();

    const renderContent = () => {
        const approved = ledger.filter(e => e.status === 'Approved' && e.date <= systemNow);

        switch (riskId) {
            case 'strategy':
                return renderStrategyEvidence(approved);
            case 'cash':
                return renderCashEvidence(approved);
            case 'survival':
                return renderSurvivalEvidence(approved);
            case 'control':
                return renderControlEvidence(approved);
            default:
                return null;
        }
    };

    const renderStrategyEvidence = (approved: JournalEntry[]) => {
        const revenues = approved.filter(e => e.type === 'Revenue');
        const vendorMap = new Map<string, number>();
        let totalRev = 0;

        revenues.forEach(e => {
            const v = e.vendor || '기타';
            vendorMap.set(v, (vendorMap.get(v) || 0) + e.amount);
            totalRev += e.amount;
        });

        // Exclude generic consumer groups
        const validB2BVendors = Array.from(vendorMap.entries())
            .filter(v => v[0] !== 'SaaS 정기 구독자' && v[0] !== '기타')
            .sort((a, b) => b[1] - a[1]);

        return (
            <div className="space-y-6">
                <div className="bg-[#111827] p-4 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <Users size={14} /> Top 파이프라인 의존도 (엔터프라이즈 기준)
                    </h4>
                    {validB2BVendors.length > 0 ? (
                        <div className="space-y-3">
                            {validB2BVendors.slice(0, 3).map((v, idx) => {
                                const ratio = totalRev > 0 ? ((v[1] / totalRev) * 100).toFixed(1) : '0.0';
                                return (
                                    <div key={v[0]} className="flex justify-between items-center p-3 bg-white/5 rounded-xl border border-white/5">
                                        <div className="flex items-center gap-3">
                                            <span className="text-rose-400 font-black">#{idx + 1}</span>
                                            <span className="text-white font-bold">{v[0]}</span>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-black text-white">{ratio}%</div>
                                            <div className="text-[10px] text-slate-500">₩{v[1].toLocaleString()}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-6 text-slate-500 font-bold text-sm">
                            현재 인식된 주요 B2B/엔터프라이즈 거래처가 없습니다. (B2C 중심)
                        </div>
                    )}
                </div>
                <div className="text-sm text-slate-400 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl leading-relaxed">
                    <strong>CFO Insight:</strong> {
                        validB2BVendors.length > 0 && (validB2BVendors[0][1] / totalRev) > 0.3
                            ? `상위 고객(${validB2BVendors[0][0]}) 매출 비중이 높습니다. 해당 채널의 매출이 꺾일 경우를 대비한 플랜 B가 필요합니다.`
                            : `매출처가 잘 분산되어 있거나 특정 대형 고객사에 휘둘리지 않는 구조입니다. 현재의 영업 다변화 기조를 유지하십시오.`
                    }
                </div>
                <button
                    onClick={() => { onClose(); onNavigate('vendor-ledger'); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                    고객별 원장 상세 확인 <ExternalLink size={16} />
                </button>
            </div>
        );
    };

    const renderCashEvidence = (approved: JournalEntry[]) => {
        // Extract uncollected long-term AR
        const arAccounts = ['외상매출금', '미수금'];

        const overdueEntries = approved.filter(e =>
            arAccounts.some(acc => e.debitAccount.includes(acc)) &&
            !e.isSettled
        ).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const totalAR = overdueEntries.reduce((s, e) => s + e.amount, 0);
        const revenues = approved.filter(e => e.type === 'Revenue');
        const totalRev = revenues.reduce((s, e) => s + e.amount, 0);
        const arRatio = totalRev > 0 ? (totalAR / totalRev) : 0;

        return (
            <div className="space-y-6">
                <div className="bg-[#111827] p-4 rounded-2xl border border-white/5">
                    <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                        <TrendingDown size={14} /> 미회수 채권 리스트 (연령 분석)
                    </h4>
                    {overdueEntries.length > 0 ? (
                        <div className="space-y-3">
                            {overdueEntries.slice(0, 5).map(e => {
                                const daysOverdue = Math.floor((new Date(systemNow).getTime() - new Date(e.date).getTime()) / (1000 * 60 * 60 * 24));
                                return (
                                    <div key={e.id} className="flex justify-between items-center p-3 bg-rose-500/5 rounded-xl border border-rose-500/10">
                                        <div>
                                            <div className="text-white font-bold">{e.vendor || '알수없음'}</div>
                                            <div className="text-[10px] text-rose-400 font-black mt-1">발생일: {e.date} ({daysOverdue}일 경과)</div>
                                        </div>
                                        <div className="text-right font-black text-white">
                                            ₩{(e.amount + (e.vat || 0)).toLocaleString()}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center p-6 text-slate-500 font-bold text-sm">
                            현재 미결제된 악성 채권 이력이 없습니다.
                        </div>
                    )}
                </div>
                <div className="text-sm text-slate-400 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl leading-relaxed">
                    <strong>CFO Insight:</strong> {
                        arRatio > 0.2
                            ? `매출의 ${Math.round(arRatio * 100)}%가 현금으로 회수되지 않고 장부상에만 머물고 있습니다. 수금 지연은 이익이 나도 망하게 하는 '흑자 부도'의 원인이니 즉각적인 추심이 필요합니다.`
                            : `채권 회수가 매우 원활합니다. 장부상 이익이 현금 유입과 직결되고 있어 유동성 리스크가 매우 낮습니다.`
                    }
                </div>
                <button
                    onClick={() => { onClose(); onNavigate('arap-management'); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                    수금 현황(AR/AP) 데스크로 이동 <ExternalLink size={16} />
                </button>
            </div>
        );
    };

    const renderSurvivalEvidence = (approved: JournalEntry[]) => {
        let currentCash = 0;
        let totalExp = 0;

        approved.forEach(e => {
            if (e.debitAccount === '보통예금') currentCash += (e.amount + (e.vat || 0));
            if (e.creditAccount === '보통예금') currentCash -= (e.amount + (e.vat || 0));
            if (e.type === 'Expense' || e.type === 'Payroll') totalExp += e.amount;
        });

        const minDate = approved.reduce((min, e) => e.date < min ? e.date : min, approved[0]?.date || systemNow);
        const msActive = new Date(systemNow).getTime() - new Date(minDate).getTime();
        const monthsActive = Math.max(1, msActive / (1000 * 60 * 60 * 24 * 30));
        const monthlyBurn = totalExp / monthsActive;
        const runway = monthlyBurn > 0 ? (currentCash / monthlyBurn) : Infinity;

        return (
            <div className="space-y-6">
                <div className="bg-[#111827] p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-2">잔여 가용 자금</div>
                    <div className="text-4xl font-black text-white mb-6">₩{currentCash.toLocaleString()}</div>

                    <div className="w-full flex justify-between items-center border-t border-white/5 pt-4">
                        <div className="text-left">
                            <div className="text-[10px] text-slate-500 font-bold">월 평균 소모 속도 (Burn Rate)</div>
                            <div className="text-rose-400 font-black text-lg">₩{Math.round(monthlyBurn).toLocaleString()}/월</div>
                        </div>
                        <div className="text-right">
                            <div className="text-[10px] text-slate-500 font-bold">잔여 버퍼 (Runway)</div>
                            <div className="text-emerald-400 font-black text-lg">
                                {runway === Infinity ? '∞' : runway.toFixed(1)} 개월
                            </div>
                        </div>
                    </div>
                </div>
                <div className="text-sm text-slate-400 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl leading-relaxed">
                    <strong>CFO Insight:</strong> {
                        runway < 6
                            ? `생명줄이 ${runway.toFixed(1)}개월 남았습니다. 새로운 현금 유입(매출/투자)이 보장되지 않는다면 즉시 비용 다이어트를 고통스럽게 진행해야 합니다.`
                            : `현재 자금 운영에 여유가 있습니다. 생존을 걱정하기보다는 마일스톤 달성을 위한 전략적 투자를 고려할 시점입니다.`
                    }
                </div>
                <button
                    onClick={() => { onClose(); onNavigate('simulation-report'); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                    미래 손익 시뮬레이터 확인 <ExternalLink size={16} />
                </button>
            </div>
        );
    };

    const renderControlEvidence = (approved: JournalEntry[]) => {
        const latestMonth = systemNow.substring(0, 7);
        const thisMonthEntries = approved.filter(e => e.date.startsWith(latestMonth));

        let lastDaysCount = 0;
        let otherDaysCount = 0;

        thisMonthEntries.forEach(e => {
            const day = parseInt(e.date.split('-')[2]);
            if (day >= 28) lastDaysCount++;
            else otherDaysCount++;
        });

        const concentration = thisMonthEntries.length > 0 ? (lastDaysCount / thisMonthEntries.length) : 0;
        const lateSamples = thisMonthEntries.filter(e => parseInt(e.date.split('-')[2]) >= 28).slice(0, 3);

        return (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className={`bg-[#111827] p-4 rounded-2xl border ${concentration > 0.85 ? 'border-rose-500/50' : 'border-white/5'} text-center`}>
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">월말 (28~31일) 기장 건수</div>
                        <div className={`text-3xl font-black ${concentration > 0.85 ? 'text-rose-400' : 'text-slate-200'}`}>{lastDaysCount}건</div>
                    </div>
                    <div className="bg-[#111827] p-4 rounded-2xl border border-white/5 text-center">
                        <div className="text-[10px] font-black text-slate-400 uppercase mb-1">1~27일 분산 기장 건수</div>
                        <div className="text-3xl font-black text-slate-300">{otherDaysCount}건</div>
                    </div>
                </div>

                {lateSamples.length > 0 && (
                    <div className="bg-[#111827] p-4 rounded-2xl border border-white/5">
                        <h4 className="text-xs font-black text-slate-400 uppercase mb-3 flex items-center gap-2">
                            <CalendarDays size={14} /> 월말 몰아치기 기장 샘플 내역
                        </h4>
                        <div className="space-y-2">
                            {lateSamples.map(e => (
                                <div key={e.id} className="text-xs font-mono text-slate-300 flex justify-between bg-white/5 p-2 rounded-lg">
                                    <span>[{e.date}] {e.description.substring(0, 20)}...</span>
                                    <span className="text-rose-400">{e.amount.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="text-sm text-slate-400 bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl leading-relaxed">
                    <strong>CFO Insight:</strong> {
                        concentration > 0.85
                            ? `전표의 85% 이상이 월말에 몰려 있어 실시간 재무 파악이 불가능합니다. 이는 내부 통제 관점에서 매우 위험한 '사후 기록' 방식이니 즉시 개선이 필요합니다.`
                            : concentration > 0.65
                                ? `월말 기장 비중이 다소 높습니다만, 통상적인 결산 패턴 내에 있습니다. 다만 실시간 데이터의 정확성을 위해 주간 마감을 권장합니다.`
                                : `기장이 월중 고르게 분산되어 있습니다. 훌륭한 회계 프로세스를 갖추고 계시며, 언제든 최신의 재무 상태를 신뢰할 수 있습니다.`
                    }
                </div>
                <button
                    onClick={() => { onClose(); onNavigate('closing-manager'); }}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl transition-colors flex justify-center items-center gap-2"
                >
                    월마감/통제 센터 이동 <ExternalLink size={16} />
                </button>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-[#0B1221] border border-white/10 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                onClick={stopPropagation}
            >
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <AlertTriangle size={20} />
                        </div>
                        <div>
                            <h3 className="text-white font-black text-lg">CFO 리스크 구조 분석</h3>
                            <p className="text-xs font-bold text-slate-500">엔진이 해당 리스크를 판정한 근거 데이터입니다.</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 text-slate-400 hover:text-white rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {renderContent()}
                </div>
            </div>
        </div>
    );
};
