import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { FileText, Search, Calendar, ChevronDown, ArrowUpDown, ChevronUp } from 'lucide-react';

const LedgerView: React.FC = () => {
    const { ledger, subLedger } = useAccounting();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('전체 계정');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'subledger'>('subledger');

    const activeData = viewMode === 'subledger' ? subLedger : ledger;

    const accounts = useMemo(() => {
        const accs = new Set<string>();
        activeData.forEach(e => {
            accs.add(e.debitAccount);
            accs.add(e.creditAccount);
        });
        return Array.from(accs).sort();
    }, [activeData]);

    const processedData = useMemo(() => {
        const rows: {
            id: string;
            date: string;
            vendor: string;
            description: string;
            account: string;
            amount: number;
            isDebit: boolean;
        }[] = [];

        activeData.forEach(entry => {
            rows.push({
                id: `${entry.id}-DR`,
                date: entry.date,
                vendor: entry.vendor || '-',
                description: entry.description,
                account: entry.debitAccount,
                amount: entry.amount,
                isDebit: true
            });
            rows.push({
                id: `${entry.id}-CR`,
                date: entry.date,
                vendor: entry.vendor || '-',
                description: entry.description,
                account: entry.creditAccount,
                amount: entry.amount,
                isDebit: false
            });
        });

        return rows.filter(row => {
            const matchesAccount = selectedAccount === '전체 계정' || row.account === selectedAccount;
            const matchesSearch = !searchTerm ||
                row.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate);
            return matchesAccount && matchesSearch && matchesDate;
        }).sort((a, b) => b.date.localeCompare(a.date));
    }, [activeData, selectedAccount, searchTerm, startDate, endDate]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">계정별 원장 (G/L)</h1>
                    <p className="text-slate-400 font-bold">확정된 분수계 기록입니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 p-1.5 bg-[#151D2E]/50 rounded-2xl border border-white/5">
                        <button onClick={() => setViewMode('subledger')} className={`px-4 py-2 rounded-xl text-xs font-black ${viewMode === 'subledger' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Sub-ledger</button>
                        <button onClick={() => setViewMode('all')} className={`px-4 py-2 rounded-xl text-xs font-black ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-slate-500'}`}>All Logs</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="검색어..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-6 py-3 bg-[#151D2E] border border-white/5 rounded-2xl text-white outline-none"
                />
                <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full px-6 py-3 bg-[#151D2E] border border-white/5 rounded-2xl text-white outline-none"
                >
                    <option>전체 계정</option>
                    {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                </select>
            </div>

            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-white/[0.02] border-b border-white/5">
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase">일자</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase">거래처</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase">적요</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase">계구분</th>
                            <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase text-right">금액</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                        {processedData.map((row) => (
                            <tr key={row.id} className="hover:bg-white/[0.02]">
                                <td className="px-8 py-6 text-xs text-slate-400 font-mono">{row.date}</td>
                                <td className="px-8 py-6 font-black text-white">{row.vendor}</td>
                                <td className="px-8 py-6 text-sm text-slate-300">"{row.description}"</td>
                                <td className="px-8 py-6">
                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase ${row.isDebit ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {row.isDebit ? 'Debit' : 'Credit'}
                                    </span>
                                    <span className="text-[10px] text-slate-500 ml-2">{row.account}</span>
                                </td>
                                <td className="px-8 py-6 text-sm font-black text-white text-right font-mono">₩{row.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default LedgerView;
