import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { runClosingPrecheck } from '../bridge/StrategicBridge';
import {
    Lock,
    Unlock,
    AlertCircle,
    CheckCircle2,
    FileText,
    Calendar,
    History,
    ArrowRight,
    ShieldAlert,
    Clock,
    User,
    StickyNote,
    RefreshCw
} from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';
import { PremiumMonthPicker } from '../components/ui/PremiumMonthPicker';

export const ClosingManager: React.FC = () => {
    const { ledger, periods, closingRecords, performClosing, runAutoDepreciation, systemNow } = useAccounting();

    // CONSTITUTION v2.1: Default to the system's current context month
    const [selectedPeriod, setSelectedPeriod] = useState(() => {
        return systemNow.substring(0, 7);
    });
    const [isClosing, setIsClosing] = useState(false);
    const [closingNote, setClosingNote] = useState('');

    const periodStatus = useMemo(() => {
        return periods.find(p => p.period === selectedPeriod)?.status || 'OPEN';
    }, [periods, selectedPeriod]);

    const precheckResult = useMemo(() => {
        if (periodStatus === 'CLOSED') return null;
        return runClosingPrecheck(ledger, selectedPeriod);
    }, [ledger, selectedPeriod, periodStatus]);

    const handleClosing = async () => {
        if (isClosing) return;
        if (!precheckResult || precheckResult.errors.length > 0) return;
        if (!closingNote.trim()) {
            alert('결산 메모를 입력해주세요. (결산 증적을 위해 필수입니다)');
            return;
        }

        const confirmMsg = `[결산 확정] ${selectedPeriod} 기간을 마감하시겠습니까?\n마감 후에는 해당 기간의 전표 수정 및 정산이 불가능합니다.`;
        if (window.confirm(confirmMsg)) {
            setIsClosing(true);
            try {
                await performClosing(selectedPeriod, closingNote, 'Admin User');
                setClosingNote('');
                alert(`✅ ${selectedPeriod} 결산이 성공적으로 완료되었습니다. 경영 리포트가 생성되었습니다.`);
            } catch (error) {
                console.error("Closing failed:", error);
                alert('결산 도중 요류가 발생했습니다. AI 엔진 응답을 확인해주세요.');
            } finally {
                setIsClosing(false);
            }
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Sticky Page Header */}
            <header className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Lock className="text-indigo-500" size={32} />
                        결산 및 마감 관리 (Closing)
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Fiscal Period Finalization & Integrity Sealing
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 px-4 py-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                        <div className="flex flex-col items-end">
                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Dimension Time</span>
                            <span className="text-white font-mono text-xs font-bold">{systemNow}</span>
                        </div>
                        <Clock className="text-indigo-400" size={18} />
                    </div>
                    <PremiumMonthPicker
                        value={selectedPeriod}
                        onChange={(date) => setSelectedPeriod(date)}
                    />
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Card */}
                <div className={`p-8 rounded-[2.5rem] border flex flex-col items-center justify-center text-center transition-all ${periodStatus === 'CLOSED' ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-[#151D2E] border-white/5'
                    }`}>
                    {periodStatus === 'CLOSED' ? (
                        <>
                            <div className="w-20 h-20 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400 mb-4 shadow-xl shadow-indigo-500/20">
                                <Lock size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">{selectedPeriod} : CLOSED</h3>
                            <p className="text-slate-400 font-bold text-sm">해당 기간의 장부가 공식 마감되었습니다.</p>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-4 shadow-xl shadow-emerald-500/20">
                                <Unlock size={40} />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-2">{selectedPeriod} : OPEN</h3>
                            <p className="text-slate-400 font-bold text-sm">전표 입력 및 정산이 가능한 상태입니다.</p>
                        </>
                    )}
                </div>

                {/* Pre-check & Action */}
                <div className="lg:col-span-2 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 flex flex-col">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-black text-white flex items-center gap-2">
                            <ShieldAlert className="text-amber-400" size={24} />
                            결산 Pre-check 분석 결과
                        </h3>
                        {precheckResult && precheckResult.errors.length === 0 && (
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                <CheckCircle2 size={12} className="text-emerald-500" />
                                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Trust Index High</span>
                            </div>
                        )}
                    </div>

                    {periodStatus === 'CLOSED' ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-60">
                            <CheckCircle2 size={48} className="text-indigo-400 mb-4" />
                            <p className="text-white font-black text-lg">이미 마감된 기간입니다.</p>
                            <p className="text-slate-500 font-bold">하단의 결산 이력에서 스냅샷 정보를 확인하세요.</p>
                        </div>
                    ) : (
                        <div className="space-y-6 flex-1">
                            {/* Errors */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2">
                                    <AlertCircle size={12} /> 결산 불가 사유 (Hard Stop) : {precheckResult?.errors.length || 0}건
                                </p>
                                {precheckResult?.errors.length === 0 ? (
                                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                        <CheckCircle2 size={18} className="text-emerald-500" />
                                        <span className="text-xs font-bold text-emerald-400">결산을 방해하는 치명적인 데이터 오류가 없습니다.</span>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {precheckResult?.errors.map((err, i) => (
                                            <div key={i} className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl flex items-start gap-3">
                                                <AlertCircle size={18} className="text-rose-500 shrink-0" />
                                                <span className="text-xs font-bold text-rose-400">{err}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Warnings */}
                            <div className="space-y-3">
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2">
                                    <Clock size={12} /> 결산 주의 사항 (Soft Warning) : {precheckResult?.warnings.length || 0}건
                                </p>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    {precheckResult?.warnings.map((warn, i) => (
                                        <div key={i} className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl relative group">
                                            <p className="text-[9px] font-black text-amber-500/60 uppercase">{warn.type}</p>
                                            <p className="text-xs font-black text-white mt-1 break-words">{warn.message}</p>
                                            <p className="text-[10px] font-bold text-amber-400 mt-2">{formatCurrency(warn.amount)}</p>

                                            {/* Auto-Fix Action for Depreciation */}
                                            {warn.message.includes('감가상각') && (
                                                <button
                                                    onClick={() => runAutoDepreciation(selectedPeriod)}
                                                    className="mt-3 w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase rounded-lg border border-indigo-500/30 flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <RefreshCw size={12} />
                                                    지금 즉시 상각 실행
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                    {precheckResult?.warnings.length === 0 && (
                                        <div className="col-span-3 p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex items-center gap-3">
                                            <CheckCircle2 size={18} className="text-emerald-500" />
                                            <span className="text-xs font-bold text-emerald-400">모든 미결 항목이 정산되었습니다. 아주 깔끔한 상태입니다!</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Closing Form */}
                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">결산 메모 (담당자 노트)</label>
                                    <textarea
                                        value={closingNote}
                                        onChange={(e) => setClosingNote(e.target.value)}
                                        placeholder="이 기간의 특이사항이나 결산 검토 의견을 입력하세요..."
                                        className="w-full bg-[#0B1221] border border-white/5 rounded-2xl p-4 text-sm text-white focus:ring-1 focus:ring-indigo-500 outline-none h-24"
                                    />
                                </div>
                                <button
                                    onClick={handleClosing}
                                    disabled={isClosing || !precheckResult || precheckResult.errors.length > 0}
                                    className={`w-full py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${isClosing
                                            ? 'bg-slate-700 text-slate-400 cursor-wait'
                                            : precheckResult && precheckResult.errors.length === 0
                                                ? 'bg-indigo-600 text-white hover:bg-indigo-500 shadow-xl shadow-indigo-600/20 active:scale-[0.98]'
                                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        }`}
                                >
                                    {isClosing ? (
                                        <>
                                            <RefreshCw size={18} className="animate-spin" />
                                            {selectedPeriod} AI 결산 분석 중...
                                        </>
                                    ) : (
                                        <>
                                            {precheckResult && precheckResult.errors.length === 0 ? <Lock size={18} /> : <AlertCircle size={18} />}
                                            {selectedPeriod} 결산 공식 실행
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-bold text-slate-600">결산 이후에는 해당 기간의 모든 데이터 수정 권한이 소멸됩니다.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Closing History (Snapshots) */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5 flex justify-between items-center">
                    <h3 className="text-xl font-black text-white flex items-center gap-2">
                        <History className="text-indigo-400" size={24} />
                        결산 이력 및 스냅샷 (Closing History)
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0B1221]/50 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-8 py-4">대상 기간</th>
                                <th className="px-8 py-4">마감 일시</th>
                                <th className="px-8 py-4">재무 요약 (Assets / Profit)</th>
                                <th className="px-8 py-4">미결 스냅샷</th>
                                <th className="px-8 py-4">메모</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {closingRecords.slice().reverse().map((record) => (
                                <tr key={record.period} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5">
                                        <div className="flex items-center gap-2 text-white font-black">
                                            <Calendar size={14} className="text-indigo-500" />
                                            {record.period}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-slate-400 text-xs font-bold">{new Date(record.closedAt).toLocaleString()}</div>
                                        <div className="text-[10px] font-black text-slate-600 flex items-center gap-1 mt-1 uppercase">
                                            <User size={10} /> {record.closedBy}
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="text-white text-sm font-black">자산: {formatCurrency(record.summary.totalAssets)}</div>
                                        <div className={`text-[10px] font-black mt-1 ${record.summary.profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                            순이익: {formatCurrency(record.summary.profit)}
                                        </div>
                                        {record.summary.fixedAssetsNetBookValue !== undefined && (
                                            <div className="text-[10px] font-black mt-1 text-slate-500">
                                                고정자산(NBV): {formatCurrency(record.summary.fixedAssetsNetBookValue)}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-wrap gap-1">
                                            <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 text-[9px] font-black rounded border border-rose-500/20">
                                                가계정: {formatCurrency(record.unsettled.complianceAmount)}
                                            </span>
                                            <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-500 text-[9px] font-black rounded border border-amber-500/20">
                                                결산: {formatCurrency(record.unsettled.matchingAmount)}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 min-w-[300px]">
                                        <div className="flex items-start gap-2">
                                            <StickyNote size={14} className="text-slate-600 mt-0.5 shrink-0" />
                                            <p className="text-slate-400 text-xs font-medium leading-relaxed italic line-clamp-2">
                                                "{record.note}"
                                            </p>
                                        </div>
                                        {record.aiBriefing && (
                                            <div className="mt-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-3 relative group">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                                                        <RefreshCw size={10} className="animate-pulse" /> AI Closing Intelligence
                                                    </div>
                                                    <span className="text-[8px] text-indigo-500/60 font-black">Ref: Rule #7, #8</span>
                                                </div>
                                                <p className="text-indigo-200/80 text-[11px] font-bold leading-relaxed whitespace-pre-wrap">
                                                    {record.aiBriefing.replace(/###/g, '').replace(/\*\*/g, '')}
                                                </p>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {closingRecords.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold italic">
                                        아직 완료된 결산 이력이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
