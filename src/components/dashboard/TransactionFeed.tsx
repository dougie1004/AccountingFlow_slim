import React, { useState, useContext } from 'react';
import { Sparkles, Check, X, Loader2, Send } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { Partner, JournalEntry, ParsedTransaction } from '../../types';
import { AccountingContext } from '../../context/AccountingContext';
import { ALL_ACCOUNTS } from '../../constants/accounts';

interface TransactionFeedProps {
    onConfirm: (entry: JournalEntry) => void;
}

export const TransactionFeed: React.FC<TransactionFeedProps> = ({ onConfirm }) => {
    const context = useContext(AccountingContext);
    const [input, setInput] = useState('');
    const [analysis, setAnalysis] = useState<ParsedTransaction | null>(null);
    const { partners } = context!;
    const { parseTransaction, isParsing, error } = useAI();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isParsing) return;

        const result = await parseTransaction(input, "Default", partners, "default", "Solo");
        if (result?.transaction) {
            setAnalysis(result.transaction);
        }
    };

    const handleConfirm = () => {
        if (!analysis) return;
        const newEntry: JournalEntry = {
            id: crypto.randomUUID(),
            date: analysis.date || new Date().toISOString().split('T')[0],
            description: analysis.description,
            vendor: analysis.vendor,
            debitAccount: analysis.accountName || 'Expenses',
            creditAccount: 'Cash',
            amount: analysis.amount,
            vat: analysis.vat,
            type: (analysis.entryType as any) || 'Expense',
            status: 'Unconfirmed',
            controlTrail: analysis.controlTrail
        };
        onConfirm(newEntry);
        setAnalysis(null);
        setInput('');
    };

    return (
        <div className="flex flex-col h-full w-full bg-[#0B1221] p-6 space-y-6">
            <header className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl"><Sparkles size={18} className="text-indigo-400" /></div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider">AI Journaling</h2>
            </header>

            <div className="space-y-4">
                <div className="bg-[#151D2E] rounded-3xl border border-white/5 p-1">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="거래 내역을 입력하세요 (예: 점심 식대 15,000원 스타벅스)"
                        className="w-full h-32 px-5 py-4 bg-transparent border-none text-white text-lg font-bold resize-none outline-none"
                    />
                    <div className="flex justify-end p-2 bg-[#0B1221]/30 rounded-b-3xl">
                        <button
                            onClick={handleSubmit}
                            disabled={isParsing || !input.trim()}
                            className="bg-indigo-600 text-white px-8 py-2.5 rounded-2xl font-black text-xs"
                        >
                            {isParsing ? <Loader2 className="animate-spin" size={16} /> : '분기 생성'}
                        </button>
                    </div>
                </div>

                {analysis && (
                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/10 p-8 space-y-6 animate-in slide-in-from-top-4">
                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">Account</p>
                                <input
                                    list="feed-accounts"
                                    value={analysis.accountName || ''}
                                    onChange={(e) => setAnalysis({ ...analysis, accountName: e.target.value })}
                                    className="bg-transparent text-lg font-black text-white outline-none w-full"
                                />
                                <datalist id="feed-accounts">
                                    {ALL_ACCOUNTS.map(acc => <option key={acc.code} value={acc.name} />)}
                                </datalist>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-slate-500 uppercase">Vendor</p>
                                <p className="text-lg font-black text-indigo-400">{analysis.vendor || 'Unknown'}</p>
                            </div>
                            <div className="col-span-2 py-4 bg-[#0B1221]/50 rounded-2xl border border-white/5 px-4 font-bold text-slate-300">
                                {analysis.description}
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase">Amount</p>
                                <p className="text-2xl font-black text-white font-mono">₩{analysis.amount.toLocaleString()}</p>
                            </div>
                            <div className="flex justify-end gap-3 items-end">
                                <button onClick={() => setAnalysis(null)} className="px-6 py-3 text-slate-400 font-black">Cancel</button>
                                <button onClick={handleConfirm} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black transition-all active:scale-95"><Check size={18} /></button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
