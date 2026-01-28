import React, { useState } from 'react';
import { MappingRule, JournalEntry } from '../../types';
import { Save, X, AlertCircle } from 'lucide-react';

interface MappingRuleModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (rule: MappingRule) => void;
    entry: JournalEntry | null;
}

export const MappingRuleModal: React.FC<MappingRuleModalProps> = ({ isOpen, onClose, onSave, entry }) => {
    const [keyword, setKeyword] = useState(entry?.vendor || entry?.description || '');
    const [targetAccount, setTargetAccount] = useState(entry?.debitAccount || '');
    const [type, setType] = useState<'Expense' | 'Revenue'>(entry?.type === 'Revenue' ? 'Revenue' : 'Expense');
    const [isAutoApprove, setIsAutoApprove] = useState(false);

    if (!isOpen || !entry) return null;

    const handleSave = () => {
        if (!keyword || !targetAccount) {
            alert('키워드와 대상 계정을 입력해주세요.');
            return;
        }

        onSave({
            id: crypto.randomUUID(),
            keyword,
            targetAccount,
            type,
            isAutoApprove
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="bg-[#151D2E] w-full max-w-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                <header className="p-6 border-b border-white/5 flex justify-between items-center bg-indigo-600/10">
                    <h3 className="text-white font-black flex items-center gap-2">
                        <Save size={18} className="text-indigo-400" /> 표준 매핑 규칙 추가
                    </h3>
                    <button onClick={onClose} className="text-slate-500 hover:text-white"><X size={20} /></button>
                </header>

                <div className="p-8 space-y-6">
                    <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex gap-3">
                        <AlertCircle className="text-amber-500 shrink-0" size={20} />
                        <p className="text-xs text-amber-200/80 leading-relaxed font-bold">
                            앞으로 <span className="text-white">"{keyword}"</span> 키워드가 포함된 전표가 들어오면 자동으로 <span className="text-white">"{targetAccount}"</span> 계정으로 처리합니다.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">매핑 키워드 (Keyword)</label>
                            <input
                                value={keyword}
                                onChange={(e) => setKeyword(e.target.value)}
                                className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                placeholder="거래처명 또는 적요 키워드"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">대상 계정 (Target Account)</label>
                            <input
                                value={targetAccount}
                                onChange={(e) => setTargetAccount(e.target.value)}
                                className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-all"
                                placeholder="예: 복리후생비, 여비교통비 등"
                            />
                        </div>

                        <div className="flex items-center gap-6 pt-2">
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={isAutoApprove}
                                    onChange={(e) => setIsAutoApprove(e.target.checked)}
                                    className="w-4 h-4 rounded bg-white/5 border-white/10"
                                    id="auto-approve"
                                />
                                <label htmlFor="auto-approve" className="text-xs font-bold text-slate-400 cursor-pointer">자동 승인까지 수행</label>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl text-slate-500 font-black text-sm hover:bg-white/5 transition-all">취소</button>
                        <button onClick={handleSave} className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-sm shadow-xl shadow-indigo-600/20 transition-all">규칙 저장</button>
                    </div>
                </div>
            </div>
        </div>
    );
};
