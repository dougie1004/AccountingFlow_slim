import React, { useState } from 'react';
import { X, Check, Calculator, Calendar, User, FileText, ArrowRightLeft, Clock } from 'lucide-react';
import { JournalEntry, EntryType, AccountNature, ConstitutionViolationError } from '../../types';
import { ALL_ACCOUNTS, getAccountNature, STANDARD_ACCOUNTS } from '../../constants/accounts';
import { ConstitutionMonitor } from '../../constitution/ConstitutionMonitor';

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: JournalEntry) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose, onSave }) => {
    React.useEffect(() => {
        if (isOpen) {
            ConstitutionMonitor.getInstance().setContext('REAL_WORLD');
        }
    }, [isOpen]);

    const [formData, setFormData] = useState<Partial<JournalEntry>>({
        date: new Date().toISOString().split('T')[0],
        description: '',
        vendor: '',
        debitAccount: '',
        creditAccount: '',
        vat: 0,
        type: 'Expense',
        status: 'Approved',
    });
    const [debitAmount, setDebitAmount] = useState<number>(0);
    const [creditAmount, setCreditAmount] = useState<number>(0);
    const [debitNature, setDebitNature] = useState<AccountNature | ''>('');
    const [creditNature, setCreditNature] = useState<AccountNature | ''>('');
    const [validationError, setValidationError] = useState<string | null>(null);
    const [isAiSuggesting, setIsAiSuggesting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // CONSTITUTION CHECK: Every account must have exactly one Nature (Art. 1)
        try {
            const dn = debitNature || getAccountNature(formData.debitAccount!);
            const cn = creditNature || getAccountNature(formData.creditAccount!);
            if (!dn || !cn) throw new Error('Missing Nature');
        } catch (err) {
            setValidationError('Constitutional Violation: All accounts must have a selected Nature (Article 1).');
            return;
        }

        // VALIDATION: Debit must equal Credit
        if (debitAmount !== creditAmount) {
            setValidationError(`Debit (₩${debitAmount.toLocaleString()}) does not match Credit (₩${creditAmount.toLocaleString()}). Difference: ₩${Math.abs(debitAmount - creditAmount).toLocaleString()}`);
            return;
        }

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: formData.date || new Date().toISOString().split('T')[0],
            transactionDate: formData.date || new Date().toISOString().split('T')[0],
            recognitionDate: formData.date || new Date().toISOString().split('T')[0],
            description: formData.description || 'Manual Entry',
            vendor: formData.vendor || undefined,
            debitAccount: formData.debitAccount!,
            creditAccount: formData.creditAccount!,
            amount: debitAmount || 0,
            vat: formData.vat || 0,
            type: formData.type || 'Expense',
            status: 'Approved',
            dueDate: formData.dueDate,
            isSettled: !formData.dueDate,
        };
        onSave(newEntry);

        setFormData({
            date: new Date().toISOString().split('T')[0],
            description: '',
            vendor: '',
            debitAccount: '',
            creditAccount: '',
            vat: 0,
            type: 'Expense',
            status: 'Approved',
        });
        setDebitAmount(0);
        setCreditAmount(0);
        setDebitNature('');
        setCreditNature('');
        setValidationError(null);
        onClose();
    };

    const handleSmartSuggest = (text: string, vendor: string) => {
        const full = (text + vendor).toLowerCase();
        let suggestedDebit = '';
        let suggestedCredit = '미지급금';

        if (full.includes('식사') || full.includes('밥') || full.includes('식당') || full.includes('카페') || full.includes('커피')) {
            suggestedDebit = '복리후생비';
        } else if (full.includes('택시') || full.includes('버스') || full.includes('지하철') || full.includes('kakaot')) {
            suggestedDebit = '여비교통비';
        } else if (full.includes('컴퓨터') || full.includes('노트북') || full.includes('모니터')) {
            suggestedDebit = '비품';
        } else if (full.includes('편의점') || full.includes('문구') || full.includes('소모품')) {
            suggestedDebit = '소모품비';
        } else if (full.includes('통신') || full.includes('핸드폰') || full.includes('인터넷') || full.includes('skt') || full.includes('kt')) {
            suggestedDebit = '통신비';
        } else if (full.includes('수수료') || full.includes('카드') || full.includes('지급수수료')) {
            suggestedDebit = '지급수수료';
        }

        if (suggestedDebit) {
            setIsAiSuggesting(true);
            setFormData(prev => ({
                ...prev,
                debitAccount: prev.debitAccount || suggestedDebit,
                creditAccount: prev.creditAccount || suggestedCredit
            }));
            setTimeout(() => setIsAiSuggesting(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/10 shadow-3xl w-full max-w-2xl flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-300">
                {/* Header - Fixed at top */}
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02] shrink-0">
                    <div>
                        <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">전표 수동 입력</h2>
                        <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-widest hidden sm:block">Manual Journal Entry for Adjustments & Closing</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <X size={24} />
                    </button>
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {/* Validation Error Toast */}
                    {validationError && (
                        <div className="mx-8 mt-6 p-4 bg-rose-500/10 border border-rose-500/50 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                            <div className="p-2 bg-rose-500 rounded-lg text-white shrink-0">
                                <ArrowRightLeft size={18} />
                            </div>
                            <div>
                                <h4 className="text-rose-400 font-black text-xs uppercase tracking-wider">차변/대변 불일치 (Unbalanced Entry)</h4>
                                <p className="text-slate-300 text-[11px] font-bold mt-1">{validationError}</p>
                            </div>
                        </div>
                    )}

                    <form id="manual-entry-form" onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Calendar size={12} /> 거래 일자
                                </label>
                                <input
                                    type="date"
                                    required
                                    className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-white outline-none shadow-inner focus:border-indigo-500/30 transition-all"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <ArrowRightLeft size={12} /> 전표 유형
                                </label>
                                <select
                                    className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-white outline-none shadow-inner appearance-none cursor-pointer focus:border-indigo-500/30 transition-all"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as EntryType })}
                                >
                                    <option value="Expense">비용 (Expense)</option>
                                    <option value="Revenue">수익 (Revenue)</option>
                                    <option value="Asset">자산 (Asset)</option>
                                    <option value="Liability">부채 (Liability)</option>
                                    <option value="Equity">자본 (Equity)</option>
                                    <option value="Payroll">급여 (Payroll)</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                <FileText size={12} /> 적요 (Description)
                            </label>
                            <input
                                required
                                placeholder="전표 내용을 입력하세요..."
                                className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-white outline-none shadow-inner focus:border-indigo-500/30 transition-all"
                                value={formData.description}
                                onChange={e => {
                                    setFormData({ ...formData, description: e.target.value });
                                    handleSmartSuggest(e.target.value, formData.vendor || '');
                                }}
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <User size={12} /> 거래처 (Vendor)
                                </label>
                                <input
                                    placeholder="거래처명 (선택)..."
                                    className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-indigo-400 outline-none shadow-inner focus:border-indigo-500/30 transition-all"
                                    value={formData.vendor}
                                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Clock size={12} /> 지급/회수 예정일
                                </label>
                                <input
                                    type="date"
                                    className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-slate-400 outline-none shadow-inner focus:border-indigo-500/30 transition-all"
                                    value={formData.dueDate || ''}
                                    onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Debit / Credit Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-white/[0.01] border border-white/5 rounded-3xl relative">
                            {/* Divider */}
                            <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/5 -translate-x-1/2 hidden md:block" />

                            {/* Debit Side */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <ArrowRightLeft size={12} /> 차변 계정 (Debit)
                                    </label>
                                    <input
                                        list="manual-account-list"
                                        required
                                        placeholder="계정과목 입력/선택"
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-rose-500/20 rounded-xl font-black text-white outline-none shadow-inner focus:border-rose-500/50 transition-all"
                                        value={formData.debitAccount}
                                        onChange={e => {
                                            setFormData({ ...formData, debitAccount: e.target.value });
                                            try { setDebitNature(getAccountNature(e.target.value)); } catch { setDebitNature(''); }
                                        }}
                                    />
                                    {formData.debitAccount && !STANDARD_ACCOUNTS.some(a => a.name === formData.debitAccount) && (
                                        <select
                                            className="w-full bg-rose-950/30 border border-rose-500/30 rounded-xl px-4 py-2 text-[10px] font-black text-rose-400 outline-none"
                                            value={debitNature}
                                            onChange={e => setDebitNature(e.target.value as AccountNature)}
                                            required
                                        >
                                            <option value="">Nature 필수 선택 (신규 계정)</option>
                                            {Object.values(AccountNature).map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Calculator size={12} /> 차변 금액
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-rose-500/10 rounded-xl font-black text-rose-400 outline-none shadow-inner font-mono text-right focus:border-rose-500/50 transition-colors"
                                        value={debitAmount || ''}
                                        onChange={e => setDebitAmount(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {/* Credit Side */}
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <ArrowRightLeft size={12} /> 대변 계정 (Credit)
                                    </label>
                                    <input
                                        list="manual-account-list"
                                        required
                                        placeholder="계정과목 입력/선택"
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-emerald-500/20 rounded-xl font-black text-white outline-none shadow-inner focus:border-emerald-500/50 transition-all"
                                        value={formData.creditAccount}
                                        onChange={e => {
                                            setFormData({ ...formData, creditAccount: e.target.value });
                                            try { setCreditNature(getAccountNature(e.target.value)); } catch { setCreditNature(''); }
                                        }}
                                    />
                                    {formData.creditAccount && !STANDARD_ACCOUNTS.some(a => a.name === formData.creditAccount) && (
                                        <select
                                            className="w-full bg-emerald-950/30 border border-emerald-500/30 rounded-xl px-4 py-2 text-[10px] font-black text-emerald-400 outline-none"
                                            value={creditNature}
                                            onChange={e => setCreditNature(e.target.value as AccountNature)}
                                            required
                                        >
                                            <option value="">Nature 필수 선택 (신규 계정)</option>
                                            {Object.values(AccountNature).map(n => <option key={n} value={n}>{n}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                        <Calculator size={12} /> 대변 금액
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-emerald-500/10 rounded-xl font-black text-emerald-400 outline-none shadow-inner font-mono text-right focus:border-emerald-500/50 transition-colors"
                                        value={creditAmount || ''}
                                        onChange={e => {
                                            const val = Number(e.target.value);
                                            setCreditAmount(val);
                                            if (debitAmount === 0) setDebitAmount(val);
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* VAT & Tax Type Section */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <Calculator size={12} /> 부가세 (VAT)
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/5 rounded-xl font-black text-slate-400 outline-none shadow-inner font-mono text-right focus:border-indigo-500/30 transition-all"
                                        value={formData.vat}
                                        onChange={e => setFormData({ ...formData, vat: Number(e.target.value) })}
                                    />
                                    <div className="absolute left-2 top-1/2 -translate-y-1/2 flex gap-1">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vat: Math.floor(debitAmount * 0.1) })}
                                            className="px-2 py-1 bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 rounded text-[9px] font-black text-slate-500 transition-all"
                                        >
                                            10%
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, vat: 0 })}
                                            className="px-2 py-1 bg-white/5 hover:bg-slate-300 hover:text-slate-900 rounded text-[9px] font-black text-slate-500 transition-all"
                                        >
                                            0%
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                                    <FileText size={12} /> 세무 구분
                                </label>
                                <div className="flex gap-2">
                                    {(['과세', '면세', '영세'] as const).map(type => (
                                        <button
                                            key={type}
                                            type="button"
                                            onClick={() => {
                                                const newVat = type === '과세' ? Math.floor(debitAmount * 0.1) : 0;
                                                setFormData({ ...formData, vat: newVat });
                                            }}
                                            className={`flex-1 py-3 rounded-xl text-[11px] font-black border transition-all ${((formData.vat || 0) > 0 && type === '과세') || ((formData.vat || 0) === 0 && type !== '과세')
                                                ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-400 shadow-lg shadow-indigo-500/10'
                                                : 'bg-[#0B1221] border-white/5 text-slate-500 hover:bg-white/5'
                                                }`}
                                        >
                                            {type}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className={`px-5 py-4 rounded-xl border flex items-center justify-between shadow-lg transition-all ${debitAmount === creditAmount
                            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                            <span className="text-[10px] font-black uppercase tracking-widest bg-white/5 px-2 py-1 rounded">대차차액 (Balance)</span>
                            <span className="font-mono font-black text-base">
                                {debitAmount === creditAmount ? 'Balanced' : `₩${Math.abs(debitAmount - creditAmount).toLocaleString()}`}
                            </span>
                        </div>

                        <datalist id="manual-account-list">
                            {ALL_ACCOUNTS.map((acc, idx) => (
                                <option key={`${acc.code}-${acc.name}-${idx}`} value={acc.name}>{acc.code} {acc.description}</option>
                            ))}
                        </datalist>
                    </form>
                </div>

                {/* Footer - Fixed at bottom */}
                <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex gap-3 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 py-4 bg-white/5 text-slate-400 font-black rounded-2xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                    >
                        취소
                    </button>
                    <button
                        type="submit"
                        form="manual-entry-form"
                        className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-widest text-[10px] active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Check size={16} />
                        전표 확정 및 원장 반영
                    </button>
                </div>
            </div>
        </div>
    );
};
