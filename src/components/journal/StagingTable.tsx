import React, { useState, useContext } from 'react';
import { Loader2, Database, CheckCircle2, AlertTriangle, Zap, Trash2 } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { JournalEntry, Partner, ParsedTransaction } from '../../types';
import { AccountingContext } from '../../context/AccountingContext';
import { ALL_ACCOUNTS } from '../../constants/accounts';
import { cleanMarkdown } from '../../utils/textUtils';

interface StagingTableProps {
    data: ParsedTransaction[];
    partners: Partner[];
    onConfirm: (entries: JournalEntry[]) => void;
    onCancel?: () => void;
}

export const StagingTable: React.FC<StagingTableProps> = ({ data, partners, onConfirm }) => {
    const context = useContext(AccountingContext)!;
    const { parseTransaction, isParsing } = useAI();
    const [stagedData, setStagedData] = useState<ParsedTransaction[]>(data);
    const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);

    const runAIAnalysis = async () => {
        const newData = [...stagedData];
        for (let i = 0; i < newData.length; i++) {
            setAnalyzingIndex(i);
            const row = newData[i];
            const input = `Date: ${row.date}, Desc: ${row.description}, Amount: ${row.amount}, Vendor: ${row.vendor}`;
            const result = await parseTransaction(input, "General", partners, "default-tenant", "Solo");
            if (result?.transaction) {
                newData[i] = { ...result.transaction, date: result.transaction.date || row.date };
                setStagedData([...newData]);
            }
            await new Promise(r => setTimeout(r, 100));
        }
        setAnalyzingIndex(null);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">가공 대기 목록 ({stagedData.length}건)</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Slim Batch Processor</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={runAIAnalysis}
                        disabled={isParsing || analyzingIndex !== null}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 disabled:bg-white/5 disabled:text-slate-500 font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                        {analyzingIndex !== null ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                        AI 일괄 분석 실행
                    </button>
                    <button
                        onClick={() => {
                            const entries: JournalEntry[] = stagedData.map(d => ({
                                id: d.id || Math.random().toString(36).substr(2, 9),
                                date: d.date || new Date().toISOString().split('T')[0],
                                description: d.description || '',
                                vendor: d.vendor,
                                debitAccount: d.debitAccount || d.accountName || '미확정비용',
                                creditAccount: d.creditAccount || '미지급금',
                                amount: d.amount,
                                vat: d.vat,
                                type: d.entryType || 'Expense',
                                status: 'Unconfirmed',
                                controlTrail: d.controlTrail
                            }));
                            onConfirm(entries);
                        }}
                        className="bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 font-black text-sm"
                    >
                        장부 반영 ({stagedData.length}건)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 professional-card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#151D2E] text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-5">DATE</th>
                                    <th className="px-6 py-5">DESCRIPTION</th>
                                    <th className="px-6 py-5 text-right">AMOUNT</th>
                                    <th className="px-6 py-5">ACCOUNT</th>
                                    <th className="px-6 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stagedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setSelectedRow(idx)}
                                        className={`transition-all cursor-pointer ${selectedRow === idx ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs">{row.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-white font-black truncate max-w-[200px]">{cleanMarkdown(row.description)}</div>
                                            <div className="text-[10px] font-bold text-slate-500">{row.vendor || '거래처 미상'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-white">₩{row.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-lg font-black text-xs ${row.accountName ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-slate-600'}`}>
                                                {row.accountName || '대기 중'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button onClick={() => setStagedData(prev => prev.filter((_, i) => i !== idx))} className="text-slate-500 hover:text-rose-500">
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {selectedRow !== null && (
                        <div className="professional-card p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Detail View</h4>

                            {(stagedData[selectedRow] as any).attachmentUrl && (
                                <div className="rounded-xl overflow-hidden border border-white/10 relative group">
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white font-bold">
                                        원본 증빙
                                    </div>
                                    <img
                                        src={(stagedData[selectedRow] as any).attachmentUrl}
                                        alt="Evidence"
                                        className="w-full h-auto object-contain max-h-[300px] bg-white/5"
                                    />
                                    <button
                                        onClick={() => window.open((stagedData[selectedRow] as any).attachmentUrl, '_blank')}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity"
                                    >
                                        크게 보기
                                    </button>
                                </div>
                            )}

                            <div className="text-xl font-black text-white">{stagedData[selectedRow].description}</div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">계정과목</label>
                                    <input
                                        list="staging-account-list"
                                        value={stagedData[selectedRow].accountName || ""}
                                        onChange={(e) => {
                                            const newData = [...stagedData];
                                            newData[selectedRow].accountName = e.target.value;
                                            setStagedData(newData);
                                        }}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <datalist id="staging-account-list">
                                        {ALL_ACCOUNTS.map(acc => <option key={acc.code} value={acc.name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">Reasoning</label>
                                    <p className="text-sm text-slate-400 leading-relaxed bg-white/5 p-4 rounded-xl border border-white/5">
                                        {stagedData[selectedRow].reasoning}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
