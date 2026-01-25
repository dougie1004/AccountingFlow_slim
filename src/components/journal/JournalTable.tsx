import React, { useContext, useRef } from 'react';
import { JournalEntry } from '../../types';
import { Paperclip, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { AccountingContext } from '../../context/AccountingContext';

interface JournalTableProps {
    entries: JournalEntry[];
}

const JournalTable: React.FC<JournalTableProps> = ({ entries }) => {
    const { attachEvidence, updateEntry, deleteEntry } = useContext(AccountingContext)!;
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [activeEntryId, setActiveEntryId] = React.useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && activeEntryId) {
            const url = URL.createObjectURL(file);
            attachEvidence(activeEntryId, url);
        }
    };

    // Grouping Logic for Composite Entries
    const processedEntries = React.useMemo(() => {
        const groups: Record<string, JournalEntry[]> = {};
        const singles: JournalEntry[] = [];

        entries.forEach(entry => {
            // Grouping Key: Primary transactionId if present, fallback to Date + Description heuristic
            const key = entry.transactionId || `${entry.date}-${entry.description}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(entry);
        });

        // Convert groups to renderable items
        return Object.values(groups).map(group => {
            // Filter out Clearing accounts for display
            const debits = group.map(e => ({ acc: e.debitAccount, amount: e.amount }))
                .filter(d => !d.acc.includes('클리어링') && !d.acc.includes('Clearing'));
            const credits = group.map(e => ({ acc: e.creditAccount, amount: e.amount }))
                .filter(c => !c.acc.includes('클리어링') && !c.acc.includes('Clearing'));

            // Deduplicate if needed (e.g. if A -> Clearing -> B structure results in double counting)
            // Ideally we just want unique real accounts.
            const uniqueDebits = Array.from(new Set(debits.map(d => `${d.acc}|${d.amount}`)))
                .map(s => { const [acc, amt] = s.split('|'); return { acc, amount: parseFloat(amt) }; });
            const uniqueCredits = Array.from(new Set(credits.map(c => `${c.acc}|${c.amount}`)))
                .map(s => { const [acc, amt] = s.split('|'); return { acc, amount: parseFloat(amt) }; });

            // Calculate total amount for the group (max of debit sum or credit sum)
            const totalAmount = Math.max(
                uniqueDebits.reduce((sum, d) => sum + d.amount, 0),
                uniqueCredits.reduce((sum, c) => sum + c.amount, 0)
            );

            return {
                ...group[0], // Use first entry as metadata holder
                debits: uniqueDebits,
                credits: uniqueCredits,
                displayAmount: totalAmount,
                isComposite: group.length > 1
            };
        });
    }, [entries]);

    return (
        <div className="overflow-x-auto bg-[#151D2E] rounded-2xl shadow-2xl border border-white/5">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                onChange={handleFileChange}
                accept="image/*"
            />
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-white/5 border-b border-white/5">
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래 일자</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래처명</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">거래 적요</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">증빙</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest">차변 / 대변 계정 (복합)</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-right">거래 금액</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">상태</th>
                        <th className="px-3 md:px-6 py-4 text-[10px] md:text-xs font-black text-slate-500 uppercase tracking-widest text-center">관리</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                    {processedEntries.length === 0 ? (
                        <tr>
                            <td colSpan={8} className="px-6 py-20 text-center text-slate-600 font-bold italic">
                                현재 표시할 회계 데이터가 존재하지 않습니다.
                            </td>
                        </tr>
                    ) : (
                        processedEntries.map((entry) => (
                            <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors group">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400 font-mono font-bold align-top">
                                    {entry.status === 'Approved' ? (
                                        entry.date
                                    ) : (
                                        <input
                                            type="date"
                                            value={entry.date}
                                            onChange={(e) => updateEntry(entry.id, { date: e.target.value })}
                                            className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[11px] text-white focus:ring-1 focus:ring-indigo-500 outline-none cursor-pointer hover:bg-white/10 transition-colors"
                                        />
                                    )}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-black align-top">
                                    {entry.vendor || '내부 정산'}
                                </td>
                                <td className="px-6 py-4 text-sm text-slate-300 max-w-xs break-words italic align-top">
                                    "{entry.description || '내용 없음'}"
                                    {entry.isComposite && <span className="ml-2 px-1.5 py-0.5 bg-indigo-500/20 text-indigo-300 text-[9px] rounded font-black">COMPOSITE</span>}
                                </td>
                                <td className="px-6 py-4 text-center align-top">
                                    <div className="flex items-center justify-center gap-2">
                                        <div
                                            className="relative cursor-pointer group/evidence"
                                            onClick={() => {
                                                if (entry.attachmentUrl) {
                                                    // Show preview modal (Simplified implementation for brevity)
                                                    alert('Preview: ' + entry.attachmentUrl);
                                                }
                                            }}
                                        >
                                            <Paperclip size={18} className={`${entry.attachmentUrl ? 'text-indigo-400' : 'text-slate-600'} group-hover/evidence:scale-125 transition-all`} />
                                            {entry.attachmentUrl && (
                                                <div className="absolute -top-1 -right-1 bg-indigo-600 rounded-full p-0.5 shadow-lg animate-in zoom-in">
                                                    <CheckCircle size={8} className="text-white" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap align-top">
                                    <div className="flex flex-col gap-2">
                                        {/* Debits */}
                                        {entry.debits.map((d, i) => (
                                            <div key={`dr-${i}`} className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase w-4 text-right">Dr</span>
                                                <span className="text-[11px] font-bold text-blue-400">{d.acc}</span>
                                                {entry.isComposite && <span className="text-[9px] text-slate-600 ml-1">₩{d.amount.toLocaleString()}</span>}
                                            </div>
                                        ))}
                                        {/* Divider if Composite */}
                                        {entry.isComposite && <div className="h-px bg-white/5 w-full my-1" />}
                                        {/* Credits */}
                                        {entry.credits.map((c, i) => (
                                            <div key={`cr-${i}`} className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase w-4 text-right">Cr</span>
                                                <span className="text-[11px] font-bold text-purple-400">{c.acc}</span>
                                                {entry.isComposite && <span className="text-[9px] text-slate-600 ml-1">₩{c.amount.toLocaleString()}</span>}
                                            </div>
                                        ))}
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-lg text-white font-black text-right font-mono align-top">
                                    ₩{entry.displayAmount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black border uppercase tracking-wider ${entry.status === 'Approved'
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]'
                                        : entry.status === 'Hold'
                                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                            : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                        }`}>
                                        {entry.status === 'Approved' ? 'CERTIFIED' : entry.status === 'Hold' ? 'HOLD' : 'PENDING'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center align-top">
                                    <button
                                        onClick={() => {
                                            if (window.confirm('정말 이 전표(그룹)를 삭제하시겠습니까?')) {
                                                deleteEntry(entry.id);
                                            }
                                        }}
                                        className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all"
                                        title="전표 삭제"
                                    >
                                        <Trash2 size={16} />
                                    </button>
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
