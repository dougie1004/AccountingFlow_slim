import React, { useContext } from 'react';
import { JournalEntry } from '../../types';
import { Trash2 } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';

interface JournalTableProps {
    entries: JournalEntry[];
}

const JournalTable: React.FC<JournalTableProps> = ({ entries }) => {
    const { updateEntry, deleteEntry } = useContext(AccountingContext)!;

    return (
        <div className="overflow-x-auto bg-[#151D2E] rounded-2xl shadow-2xl border border-white/5">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">일자</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">거래처</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">적요</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">계정 (차/대)</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">금액</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">상태</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {entries.length === 0 ? (
                        <tr><td colSpan={7} className="px-6 py-20 text-center text-slate-600 font-bold italic">현재 데이터가 없습니다.</td></tr>
                    ) : (
                        entries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-white/[0.02]">
                                <td className="px-6 py-4 text-xs text-slate-400 font-mono font-bold">
                                    <input
                                        type="date"
                                        value={entry.date}
                                        onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                        className="bg-transparent border-none text-[11px] text-white outline-none cursor-pointer"
                                    />
                                </td>
                                <td className="px-6 py-4 text-sm text-white font-black">{entry.vendor || '-'}</td>
                                <td className="px-6 py-4 text-sm text-slate-300 italic">"{entry.description}"</td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Dr</span>
                                            <span className="text-[11px] font-bold text-blue-400">{entry.debitAccount}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Cr</span>
                                            <span className="text-[11px] font-bold text-purple-400">{entry.creditAccount}</span>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-lg text-white font-black text-right font-mono">₩{entry.amount.toLocaleString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${entry.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                        {entry.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => deleteEntry(entry.id)} className="text-slate-500 hover:text-rose-500"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};

export default JournalTable;
