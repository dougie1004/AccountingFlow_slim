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
                        <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">증빙</th>
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
                                        className="bg-transparent border-none text-[11px] text-white outline-none cursor-pointer focus:ring-1 focus:ring-indigo-500 rounded px-1"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        value={entry.vendor || ''}
                                        onChange={(e) => updateEntry(entry.id, { vendor: e.target.value })}
                                        className="bg-transparent border-none text-sm text-white font-black outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <input
                                        type="text"
                                        value={entry.description || ''}
                                        onChange={(e) => updateEntry(entry.id, { description: e.target.value })}
                                        className="bg-transparent border-none text-sm text-slate-300 italic outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                                    />
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-emerald-500 w-4">Dr</span>
                                            <div className="flex flex-col w-full">
                                                <input
                                                    type="text"
                                                    value={entry.debitAccount}
                                                    onChange={(e) => updateEntry(entry.id, { debitAccount: e.target.value })}
                                                    className="bg-transparent border-none text-[13px] font-bold text-white outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                                                />
                                                {entry.vat > 0 && (
                                                    <span className="text-[10px] text-emerald-400 font-bold px-1 flex items-center gap-1">
                                                        ↳ 부가세대급금 (VAT)
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] font-black text-rose-500 w-4">Cr</span>
                                            <input
                                                type="text"
                                                value={entry.creditAccount}
                                                onChange={(e) => updateEntry(entry.id, { creditAccount: e.target.value })}
                                                className="bg-transparent border-none text-[13px] font-bold text-slate-400 outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1 w-full"
                                            />
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center justify-end">
                                            <span className="text-slate-500 font-bold mr-1 text-[10px]">₩</span>
                                            <span className="text-white font-black text-sm font-mono tracking-tight">{Math.round((entry.amount || 0) + (entry.vat || 0)).toLocaleString()}</span>
                                        </div>
                                        {(entry.vat || 0) > 0 && (
                                            <div className="flex flex-col items-end text-[10px] text-slate-500 font-mono mt-0.5 border-t border-white/10 pt-1 w-full opacity-80 group-hover:opacity-100 transition-opacity">
                                                <div className="flex justify-between w-28">
                                                    <span>Supply:</span>
                                                    <span>{Math.round(entry.amount).toLocaleString()}</span>
                                                </div>
                                                <div className="flex justify-between w-28 text-emerald-400 font-bold">
                                                    <span>VAT (부가세):</span>
                                                    <span>{Math.round(entry.vat).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => updateEntry(entry.id, { status: entry.status === 'Approved' ? 'Unconfirmed' : 'Approved' })}
                                        className={`px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider transition-all ${entry.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}
                                    >
                                        {entry.status}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => alert('[Mock] 증빙 업로드/보기 창이 열립니다.\n실제 구현 시 파일 업로더가 연동됩니다.')}
                                        className="text-indigo-400 hover:text-white transition-colors text-[10px] font-bold border border-indigo-500/30 px-2 py-1 rounded bg-indigo-500/10"
                                    >
                                        증빙
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <button onClick={() => deleteEntry(entry.id)} className="text-slate-500 hover:text-rose-500 transition-colors"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
                {entries.length > 0 && (
                    <tfoot className="bg-[#0B1221] border-t border-white/10">
                        <tr>
                            <td colSpan={4} className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase tracking-widest">
                                합계 (Total)
                            </td>
                            <td className="px-6 py-4 text-right">
                                <span className="text-white font-black text-sm font-mono tracking-tight">
                                    ₩{entries.reduce((acc, cur) => acc + cur.amount + (cur.vat || 0), 0).toLocaleString()}
                                </span>
                                <div className="text-[10px] text-slate-500 font-mono mt-1">
                                    (Sup: ₩{entries.reduce((acc, cur) => acc + cur.amount, 0).toLocaleString()} / Vat: ₩{entries.reduce((acc, cur) => acc + (cur.vat || 0), 0).toLocaleString()})
                                </div>
                            </td>
                            <td colSpan={3}></td>
                        </tr>
                    </tfoot>
                )}
            </table>
        </div>
    );
};

export default JournalTable;
