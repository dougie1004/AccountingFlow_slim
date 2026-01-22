import React, { useState } from 'react';
import { X, Check, Calculator, Calendar, User, FileText, ArrowRightLeft } from 'lucide-react';
import { JournalEntry, EntryType } from '../../types';
import { ALL_ACCOUNTS } from '../../constants/accounts';

interface ManualEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: JournalEntry) => void;
}

export const ManualEntryModal: React.FC<ManualEntryModalProps> = ({ isOpen, onClose, onSave }) => {
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
    const [validationError, setValidationError] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // VALIDATION: Debit must equal Credit
        if (debitAmount !== creditAmount) {
            setValidationError(`Debit (₩${debitAmount.toLocaleString()}) does not match Credit (₩${creditAmount.toLocaleString()}). Difference: ₩${Math.abs(debitAmount - creditAmount).toLocaleString()}`);
            return;
        }

        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: formData.date || new Date().toISOString().split('T')[0],
            description: formData.description || 'Manual Entry',
            vendor: formData.vendor || undefined,
            debitAccount: formData.debitAccount || 'Suspense',
            creditAccount: formData.creditAccount || 'Suspense',
            amount: debitAmount || 0, // Use the verified amount
            vat: formData.vat || 0,
            type: formData.type || 'Expense',
            status: 'Approved',
            version: 1,
        };
        onSave(newEntry);

        // Reset form and close
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
        setValidationError(null);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[110] flex items-center justify-center p-6">
            <div className="bg-[#151D2E] rounded-[3rem] border border-white/10 shadow-3xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">전표 수동 입력</h2>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Manual Journal Entry for Adjustments & Closing</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                        <X size={28} />
                    </button>
                </div>

                {/* Validation Error Toast */}
                {validationError && (
                    <div className="mx-10 mt-6 p-4 bg-rose-500/10 border border-rose-500/50 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-2">
                        <div className="p-2 bg-rose-500 rounded-lg text-white">
                            <ArrowRightLeft size={20} />
                        </div>
                        <div>
                            <h4 className="text-rose-400 font-black text-sm uppercase tracking-wider">차변/대변 불일치 (Unbalanced Entry)</h4>
                            <p className="text-slate-300 text-xs font-bold mt-1">{validationError}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="p-10 space-y-8">
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Calendar size={12} /> 거래 일자
                            </label>
                            <input
                                type="date"
                                required
                                className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white outline-none shadow-inner"
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <ArrowRightLeft size={12} /> 전표 유형
                            </label>
                            <select
                                className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white outline-none shadow-inner appearance-none cursor-pointer"
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

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <FileText size={12} /> 적요 (Description)
                        </label>
                        <input
                            required
                            placeholder="전표 내용을 입력하세요..."
                            className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white outline-none shadow-inner"
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                            <User size={12} /> 거래처 (Vendor)
                        </label>
                        <input
                            placeholder="거래처명을 입력하세요 (선택 사항)..."
                            className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-indigo-400 outline-none shadow-inner"
                            value={formData.vendor}
                            onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                        />
                    </div>

                    {/* Debit / Credit Section */}
                    <div className="grid grid-cols-2 gap-6 relative">
                        {/* Divider */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/5 -translate-x-1/2 hidden md:block" />

                        {/* Debit Side */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <ArrowRightLeft size={12} /> 차변 계정 (Debit)
                                </label>
                                <input
                                    list="manual-account-list"
                                    required
                                    placeholder="계정과목 입력/선택"
                                    className="w-full px-6 py-4 bg-[#0B1221] border border-rose-500/20 rounded-2xl font-black text-white outline-none shadow-inner"
                                    value={formData.debitAccount}
                                    onChange={e => setFormData({ ...formData, debitAccount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Calculator size={12} /> 차변 금액
                                </label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-6 py-4 bg-[#0B1221] border border-rose-500/10 rounded-2xl font-black text-rose-400 outline-none shadow-inner font-mono text-right focus:border-rose-500/50 transition-colors"
                                    value={debitAmount || ''}
                                    onChange={e => setDebitAmount(Number(e.target.value))}
                                />
                            </div>
                        </div>

                        {/* Credit Side */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <ArrowRightLeft size={12} /> 대변 계정 (Credit)
                                </label>
                                <input
                                    list="manual-account-list"
                                    required
                                    placeholder="계정과목 입력/선택"
                                    className="w-full px-6 py-4 bg-[#0B1221] border border-emerald-500/20 rounded-2xl font-black text-white outline-none shadow-inner"
                                    value={formData.creditAccount}
                                    onChange={e => setFormData({ ...formData, creditAccount: e.target.value })}
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                    <Calculator size={12} /> 대변 금액
                                </label>
                                <input
                                    type="number"
                                    required
                                    className="w-full px-6 py-4 bg-[#0B1221] border border-emerald-500/10 rounded-2xl font-black text-emerald-400 outline-none shadow-inner font-mono text-right focus:border-emerald-500/50 transition-colors"
                                    value={creditAmount || ''}
                                    onChange={e => setCreditAmount(Number(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Balance Indicator & VAT */}
                    <div className="grid grid-cols-2 gap-6 items-end">
                        <div className="space-y-3">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2 flex items-center gap-2">
                                <Calculator size={12} /> 부가세 (VAT)
                            </label>
                            <input
                                type="number"
                                className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-slate-400 outline-none shadow-inner font-mono text-right"
                                value={formData.vat}
                                onChange={e => setFormData({ ...formData, vat: Number(e.target.value) })}
                            />
                        </div>

                        <div className={`px-6 py-4 rounded-2xl border flex items-center justify-between shadow-lg ${debitAmount === creditAmount
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                            }`}>
                            <span className="text-xs font-black uppercase tracking-wider">대차차액 (Balance)</span>
                            <span className="font-mono font-black text-lg">
                                {debitAmount === creditAmount ? 'Balanced' : `Wait... ${Math.abs(debitAmount - creditAmount).toLocaleString()}`}
                            </span>
                        </div>
                    </div>

                    <datalist id="manual-account-list">
                        {ALL_ACCOUNTS.map(acc => (
                            <option key={acc.code} value={acc.name}>{acc.code} {acc.description}</option>
                        ))}
                    </datalist>

                    <div className="flex gap-4 pt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-5 bg-white/5 text-slate-400 font-black rounded-3xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest text-xs"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-widest text-xs active:scale-95 flex items-center justify-center gap-2"
                        >
                            <Check size={18} />
                            전표 확정 및 원장 반영
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
