import React, { useState } from 'react';
import { X, CheckCircle2, Shield, FileText, AlertCircle, Zap, Calculator, ShieldAlert } from 'lucide-react';
import { CLEARING_REASON, BLOCKED_REASON, ClearingReasonCode, BlockedReasonCode, ACCOUNT_NAMES } from '../../constants/accounts';
import { JournalEntry, ClearingRecord } from '../../types';

interface ClearingModalProps {
    entry: JournalEntry;
    onClose: () => void;
    onConfirm: (targetAccount: string | null, metadata: Omit<ClearingRecord, 'sourceEntryId' | 'clearingEntryId' | 'clearedAt'>) => void;
}

export const ClearingModal: React.FC<ClearingModalProps> = ({ entry, onClose, onConfirm }) => {
    const [mode, setMode] = useState<'CLEARED' | 'BLOCKED'>('CLEARED');
    const [targetAccount, setTargetAccount] = useState('복리후생비');
    const [reasonCode, setReasonCode] = useState<ClearingReasonCode>('EXP_CONFIRMED');
    const [blockedReasonCode, setBlockedReasonCode] = useState<BlockedReasonCode>('EVIDENCE_MISSING');
    const [reasonText, setReasonText] = useState('');
    const [evidenceType, setEvidenceType] = useState<ClearingRecord['evidenceType']>('RECEIPT');
    const [searchTerm, setSearchTerm] = useState('');

    const filteredAccounts = ACCOUNT_NAMES.filter(name =>
        name.includes(searchTerm)
    ).slice(0, 5);

    const handleConfirm = () => {
        if (mode === 'CLEARED' && !targetAccount) return;
        if (mode === 'BLOCKED' && !reasonText) {
            alert('정산 불가 사유를 상세히 입력해 주세요.');
            return;
        }

        onConfirm(mode === 'CLEARED' ? targetAccount : null, {
            reasonCode: mode === 'CLEARED' ? reasonCode : blockedReasonCode,
            reasonText,
            evidenceType,
            status: mode,
        });
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#030712]/90 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#111827] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className={`p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r ${mode === 'CLEARED' ? 'from-amber-500/10' : 'from-rose-500/10'} to-transparent`}>
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${mode === 'CLEARED' ? 'bg-amber-500 shadow-amber-500/20' : 'bg-rose-500 shadow-rose-500/20'} rounded-2xl flex items-center justify-center shadow-lg text-white`}>
                            {mode === 'CLEARED' ? <Zap size={24} /> : <ShieldAlert size={24} />}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">
                                {mode === 'CLEARED' ? '가계정 스마트 정산' : '가계정 정산 불가(Blocked) 처리'}
                            </h2>
                            <p className="text-slate-400 text-sm font-bold flex items-center gap-2 mt-0.5">
                                <span className={mode === 'CLEARED' ? 'text-amber-400' : 'text-rose-400'}>"{entry.description}"</span> 판단 기록을 작성합니다.
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-6">
                    {/* Mode Toggle */}
                    <div className="flex bg-[#0B1221] p-1.5 rounded-[1.5rem] border border-white/5">
                        <button
                            onClick={() => setMode('CLEARED')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${mode === 'CLEARED' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            <Zap size={14} /> 정산 실행 (Clearing)
                        </button>
                        <button
                            onClick={() => setMode('BLOCKED')}
                            className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${mode === 'BLOCKED' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}
                        >
                            <ShieldAlert size={14} /> 정산 불가 처리 (Blocked)
                        </button>
                    </div>

                    {/* Source Info */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">원본 거래 정보</p>
                            <p className="text-sm font-bold text-slate-300">{entry.date} · {entry.debitAccount} / {entry.creditAccount}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">정산 금액</p>
                            <p className="text-lg font-black text-white font-mono">₩{(entry.amount + (entry.vat || 0)).toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Step 1: Target Account (Only for CLEARED) */}
                    {mode === 'CLEARED' && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                                <Calculator size={12} className="text-indigo-400" />
                                1. 정산 대상 계정 (Target Account)
                            </label>
                            <div className="relative">
                                <input
                                    placeholder="계정 과목 검색 (예: 복리후생비, 여비교통비...)"
                                    value={searchTerm || targetAccount}
                                    onChange={(e) => {
                                        setSearchTerm(e.target.value);
                                        setTargetAccount(e.target.value);
                                    }}
                                    className="w-full px-5 py-4 bg-[#0B1221] border border-white/10 rounded-2xl text-white font-bold text-sm focus:ring-2 focus:ring-amber-500/50 outline-none"
                                />
                                {searchTerm && filteredAccounts.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-[#151D2E] border border-white/10 rounded-xl overflow-hidden z-10 shadow-2xl">
                                        {filteredAccounts.map(account => (
                                            <button
                                                key={account}
                                                onClick={() => {
                                                    setTargetAccount(account);
                                                    setSearchTerm('');
                                                }}
                                                className="w-full px-4 py-3 text-left text-sm font-bold text-slate-300 hover:bg-amber-500/10 hover:text-white transition-colors"
                                            >
                                                {account}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Reason Code */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <Shield size={12} className="text-indigo-400" />
                            2. {mode === 'CLEARED' ? '정산 사유 (Reason Code)' : '정산 불가 사유 선택'}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {mode === 'CLEARED' ? (
                                (Object.entries(CLEARING_REASON) as [ClearingReasonCode, typeof CLEARING_REASON[ClearingReasonCode]][]).map(([code, def]) => (
                                    <button
                                        key={code}
                                        onClick={() => setReasonCode(code)}
                                        className={`px-4 py-3 text-xs font-black rounded-xl border transition-all text-left flex items-center justify-between ${reasonCode === code ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                    >
                                        {def.label}
                                        {reasonCode === code && <CheckCircle2 size={12} />}
                                    </button>
                                ))
                            ) : (
                                (Object.entries(BLOCKED_REASON) as [BlockedReasonCode, typeof BLOCKED_REASON[BlockedReasonCode]][]).map(([code, def]) => (
                                    <button
                                        key={code}
                                        onClick={() => setBlockedReasonCode(code)}
                                        className={`px-4 py-3 text-xs font-black rounded-xl border transition-all text-left flex items-center justify-between ${blockedReasonCode === code ? 'bg-rose-500/10 border-rose-500 text-rose-400' : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/10'}`}
                                    >
                                        {def.label}
                                        {blockedReasonCode === code && <CheckCircle2 size={12} />}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Step 3: Description */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <FileText size={12} className="text-indigo-400" />
                            3. {mode === 'CLEARED' ? '상세 설명 (Optional)' : '불가 사유 상세 기술 (Required)'}
                        </label>
                        <textarea
                            placeholder={mode === 'CLEARED'
                                ? "정산과 관련된 추가적인 판단 근거를 입력하세요."
                                : "왜 정산이 불가능한지, 현재 상황과 향후 계획을 상세히 기록해 주세요."}
                            value={reasonText}
                            onChange={(e) => setReasonText(e.target.value)}
                            className={`w-full px-5 py-4 bg-[#0B1221] border border-white/10 rounded-2xl text-white font-bold text-sm focus:ring-2 ${mode === 'CLEARED' ? 'focus:ring-amber-500/50' : 'focus:ring-rose-500/50'} outline-none h-24 resize-none`}
                        />
                    </div>

                    {/* Step 4: Evidence Type */}
                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                            <AlertCircle size={12} className="text-indigo-400" />
                            4. 증빙 유형 (Evidence)
                        </label>
                        <div className="flex bg-[#0B1221] p-1 rounded-2xl border border-white/5">
                            {(['RECEIPT', 'EMAIL', 'APPROVAL', 'NONE'] as const).map((type) => (
                                <button
                                    key={type}
                                    onClick={() => setEvidenceType(type)}
                                    className={`flex-1 py-2 rounded-xl text-[10px] font-black transition-all ${evidenceType === type ? 'bg-white/10 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {type === 'RECEIPT' ? '영수증' : type === 'EMAIL' ? '이메일' : type === 'APPROVAL' ? '전자결재' : '근거없음'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <button
                        onClick={onClose}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all"
                    >
                        취소
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={mode === 'CLEARED' && !targetAccount}
                        className={`px-10 py-4 ${mode === 'CLEARED' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20' : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'} text-white rounded-2xl font-black text-sm transition-all shadow-xl active:scale-95 flex items-center gap-2 disabled:opacity-50`}
                    >
                        <CheckCircle2 size={20} />
                        <span>{mode === 'CLEARED' ? '정산 및 전표 생성' : '정산 불가 확정'}</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
