import React, { useState, useEffect } from 'react';
import { LiabilityRecord, LiabilityState } from '../../types';
import { useAccounting } from '../../hooks/useAccounting';
import { PremiumDatePicker } from '../ui/PremiumDatePicker';

interface ReviewLiabilityModalProps {
    isOpen: boolean;
    onClose: () => void;
    recordId: string;
}

export const ReviewLiabilityModal: React.FC<ReviewLiabilityModalProps> = ({ isOpen, onClose, recordId }) => {
    const { liabilities, updateLiability } = useAccounting();
    const [record, setRecord] = useState<LiabilityRecord | null>(null);

    // Form State
    const [intent, setIntent] = useState<'DEBT' | 'EQUITY' | 'GREY'>('DEBT');
    const [dueDate, setDueDate] = useState('');
    const [interestRate, setInterestRate] = useState('0');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (isOpen && recordId) {
            const target = liabilities.find(l => l.id === recordId);
            if (target) {
                setRecord(target);
                // Initialize form with existing data
                if (target.state === 'POTENTIAL_EQUITY') setIntent('EQUITY');
                else if (target.state === 'PLANNED') setIntent('DEBT');
                else setIntent('GREY');

                setDueDate(target.dueDate || '');
                setInterestRate(target.interestRate?.toString() || '0');
            }
        }
    }, [isOpen, recordId, liabilities]);

    const handleSave = () => {
        if (!record) return;

        let newState: LiabilityState = 'UNPLANNED';
        if (intent === 'DEBT') newState = 'PLANNED';
        if (intent === 'EQUITY') newState = 'POTENTIAL_EQUITY';
        if (intent === 'GREY') newState = 'GREY_ZONE';

        updateLiability(record.id, {
            state: newState,
            dueDate: intent === 'DEBT' ? dueDate : undefined,
            interestRate: intent === 'DEBT' ? parseFloat(interestRate) : undefined,
            decisionLog: [
                ...(record.decisionLog || []),
                {
                    decidedAt: new Date().toISOString(),
                    decidedBy: 'User',
                    intent: intent === 'EQUITY' ? 'Conversion Plan' : notes || 'Manually Reviewed'
                }
            ],
            updatedAt: new Date().toISOString()
        });

        onClose();
    };

    if (!isOpen || !record) return null;

    return (
        <div className="fixed inset-0 bg-[#070C18]/90 backdrop-blur-xl flex items-center justify-center z-[9999] animate-in fade-in duration-300">
            <div className="bg-[#151D2E] border border-white/10 rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-indigo-600/20 to-purple-600/20 px-8 py-6 border-b border-white/10">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-black text-white flex items-center gap-3">
                                <span className="text-3xl">⚖️</span> 책임의 정의
                            </h2>
                            <p className="text-sm text-slate-400 mt-2 leading-relaxed max-w-md">
                                이 자금의 성격을 정의해 주십시오.<br />
                                시스템은 이 결정에 따라 현금 흐름과 Runway를 예측합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-8 space-y-6">
                    {/* 1. Transaction Info Card */}
                    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">자금 출처</span>
                            <span className="text-white font-bold text-lg">{record.lender}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">금액</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-slate-500 text-sm">₩</span>
                                <span className="text-indigo-400 font-black text-2xl font-mono tracking-tight">
                                    {record.amount.toLocaleString()}
                                </span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-4">
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">현재 상태</span>
                            <span className={`font-black px-3 py-1.5 rounded-lg text-xs uppercase tracking-wider ${record.state === 'UNPLANNED' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                                record.state === 'PLANNED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                                }`}>
                                {record.state}
                            </span>
                        </div>
                    </div>

                    {/* 2. Intent Selection */}
                    <div className="space-y-4">
                        <label className="text-sm font-black text-slate-300 uppercase tracking-widest">경영진의 의도 (Strategic Intent)</label>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => setIntent('DEBT')}
                                className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all hover:scale-105 ${intent === 'DEBT'
                                    ? 'bg-rose-500/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-500/20'
                                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05] hover:border-white/20'
                                    }`}
                            >
                                <div className="text-2xl mb-2">💸</div>
                                단기 상환
                                <div className="text-[10px] opacity-70 mt-1 font-normal">Debt</div>
                            </button>
                            <button
                                onClick={() => setIntent('EQUITY')}
                                className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all hover:scale-105 ${intent === 'EQUITY'
                                    ? 'bg-blue-500/20 border-blue-500 text-blue-400 shadow-lg shadow-blue-500/20'
                                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05] hover:border-white/20'
                                    }`}
                            >
                                <div className="text-2xl mb-2">🏗️</div>
                                자본 확충
                                <div className="text-[10px] opacity-70 mt-1 font-normal">Equity</div>
                            </button>
                            <button
                                onClick={() => setIntent('GREY')}
                                className={`p-4 rounded-2xl border-2 text-sm font-bold transition-all hover:scale-105 ${intent === 'GREY'
                                    ? 'bg-slate-500/20 border-slate-500 text-slate-300 shadow-lg shadow-slate-500/20'
                                    : 'bg-white/[0.02] border-white/10 text-slate-400 hover:bg-white/[0.05] hover:border-white/20'
                                    }`}
                            >
                                <div className="text-2xl mb-2">😶</div>
                                판단 보류
                                <div className="text-[10px] opacity-70 mt-1 font-normal">Grey</div>
                            </button>
                        </div>
                    </div>

                    {/* 3. Conditional Fields (Only for DEBT) */}
                    {intent === 'DEBT' && (
                        <div className="space-y-4 bg-rose-500/5 border border-rose-500/20 rounded-2xl p-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                        상환 예정일 *
                                    </label>
                                    <PremiumDatePicker
                                        value={dueDate}
                                        onChange={setDueDate}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">
                                        이자율 (연 %)
                                    </label>
                                    <input
                                        type="number"
                                        value={interestRate}
                                        onChange={(e) => setInterestRate(e.target.value)}
                                        step="0.1"
                                        placeholder="0.0"
                                        className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    />
                                    {parseFloat(interestRate) < 4.6 && (
                                        <p className="text-[10px] text-yellow-400 mt-2 flex items-center gap-1 font-bold">
                                            <span>⚠️</span> 법정이자(4.6%) 미만 시 증여세 이슈 가능성
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {intent === 'EQUITY' && (
                        <div className="bg-blue-500/10 border border-blue-500/30 p-5 rounded-2xl">
                            <p className="text-sm text-blue-300 leading-relaxed">
                                <span className="text-lg mr-2">💡</span>
                                이 자금은 부채 비율 계산에서 제외되며, <strong className="text-blue-200">잠재적 자본(Equity)</strong>으로 분류됩니다.
                                추후 유상증자 시 이 기록을 참조하십시오.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-white/[0.02] px-8 py-6 border-t border-white/10 flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-slate-400 hover:text-white font-bold text-sm transition-all hover:bg-white/5 rounded-xl"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={intent === 'DEBT' && !dueDate}
                        className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${intent === 'DEBT' && !dueDate
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-105'
                            }`}
                    >
                        책임 확정 (Confirm)
                    </button>
                </div>
            </div>
        </div>
    );
};
