import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { getAccountCategory } from '../constants/accounts';
import {
    FileText,
    Search,
    Calendar,
    ChevronDown,
    ArrowUpDown,
    ChevronUp,
    Filter,
    ArrowDownWideNarrow,
    ArrowUpWideNarrow,
    Calculator
} from 'lucide-react';
import { formatCurrency } from '../utils/formatUtils';

type SortField = 'date' | 'vendor' | 'description' | 'account' | 'amount';
type SortOrder = 'asc' | 'desc';

export const LedgerView: React.FC = () => {
    const { ledger, subLedger } = useAccounting();

    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('전체 계정');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'subledger'>('subledger');
    const [sortConfig, setSortConfig] = useState<{ field: SortField; order: SortOrder }>({ field: 'date', order: 'desc' });

    const activeData = viewMode === 'subledger' ? subLedger : ledger;

    const accounts = useMemo(() => {
        const accs = new Set<string>();
        activeData.forEach(e => {
            accs.add(e.debitAccount);
            accs.add(e.creditAccount);
            if (e.vat && e.vat > 0) {
                if (e.type === 'Revenue') accs.add('부가세예수금');
                else accs.add('부가세대급금');
            }
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

        activeData.forEach(e => {
            const vat = e.vat || 0;
            const vendor = e.vendor || '-';

            // Reconstruct professional double-entry split for G/L view
            if (e.type === 'Expense' || e.type === 'Asset') {
                refinedPush(rows, e.id + '-1', e.date, vendor, e.description, e.debitAccount, e.amount, true);
                if (vat > 0) refinedPush(rows, e.id + '-v', e.date, vendor, e.description + ' (부가세)', '부가세대급금', vat, true);
                refinedPush(rows, e.id + '-2', e.date, vendor, e.description, e.creditAccount, e.amount + vat, false);
            }
            else if (e.type === 'Revenue') {
                refinedPush(rows, e.id + '-1', e.date, vendor, e.description, e.debitAccount, e.amount + vat, true);
                if (vat > 0) refinedPush(rows, e.id + '-v', e.date, vendor, e.description + ' (부가세)', '부가세예수금', vat, false);
                refinedPush(rows, e.id + '-2', e.date, vendor, e.description, e.creditAccount, e.amount, false);
            }
            else {
                refinedPush(rows, e.id + '-1', e.date, vendor, e.description, e.debitAccount, e.amount, true);
                refinedPush(rows, e.id + '-2', e.date, vendor, e.description, e.creditAccount, e.amount, false);
            }
        });

        // 1. Filter
        let filtered = rows.filter(row => {
            const matchesAccount = selectedAccount === '전체 계정' || row.account === selectedAccount;
            const matchesSearch = !searchTerm ||
                row.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.description.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesDate = (!startDate || row.date >= startDate) && (!endDate || row.date <= endDate);
            return matchesAccount && matchesSearch && matchesDate;
        });

        // 2. Sort
        filtered.sort((a, b) => {
            const field = sortConfig.field;
            let valA = a[field];
            let valB = b[field];

            if (typeof valA === 'string' && typeof valB === 'string') {
                return sortConfig.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            if (typeof valA === 'number' && typeof valB === 'number') {
                return sortConfig.order === 'asc' ? valA - valB : valB - valA;
            }
            return 0;
        });

        return filtered;
    }, [activeData, selectedAccount, searchTerm, startDate, endDate, sortConfig]);

    const totals = useMemo(() => {
        let debit = 0;
        let credit = 0;
        processedData.forEach(row => {
            if (row.isDebit) debit += row.amount;
            else credit += row.amount;
        });

        if (selectedAccount === '전체 계정') {
            return { debit, credit, balance: debit - credit }; // Default to Dr-Cr or just 0
        }

        const category = getAccountCategory(selectedAccount);
        const isCreditNature = ['Liability', 'Equity', 'Revenue'].includes(category);
        const balance = isCreditNature ? credit - debit : debit - credit;

        return { debit, credit, balance };
    }, [processedData, selectedAccount]);

    const handleSort = (field: SortField) => {
        setSortConfig(prev => ({
            field,
            order: prev.field === field && prev.order === 'asc' ? 'desc' : 'asc'
        }));
    };

    function refinedPush(arr: any[], id: string, date: string, vendor: string, desc: string, acc: string, amt: number, isDr: boolean) {
        arr.push({ id, date, vendor, description: desc, account: acc, amount: amt, isDebit: isDr });
    }

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortConfig.field !== field) return <ArrowUpDown size={14} className="opacity-20" />;
        return sortConfig.order === 'asc' ? <ArrowUpWideNarrow size={14} className="text-indigo-400" /> : <ArrowDownWideNarrow size={14} className="text-indigo-400" />;
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">총계정원장 (General Ledger)</h1>
                    <p className="text-slate-400 font-bold">승인 완료된 거래의 계정별 상세 내역입니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex gap-2 p-1.5 bg-[#151D2E]/50 rounded-2xl border border-white/5">
                        <button onClick={() => setViewMode('subledger')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'subledger' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}>Sub-ledger</button>
                        <button onClick={() => setViewMode('all')} className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}>All Logs</button>
                    </div>
                </div>
            </header>

            <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-2 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="거래처 또는 적요 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-[#0B1221] border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-bold"
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <select
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                            className="w-full pl-12 pr-6 py-3.5 bg-[#0B1221] border border-white/5 rounded-2xl text-white outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none font-bold"
                        >
                            <option>전체 계정</option>
                            {accounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                        </select>
                        <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                    </div>
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="w-full pl-9 pr-2 py-3.5 bg-[#0B1221] border border-white/5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                            />
                        </div>
                        <div className="flex-1 relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="w-full pl-9 pr-2 py-3.5 bg-[#0B1221] border border-white/5 rounded-2xl text-xs text-white outline-none focus:ring-2 focus:ring-indigo-500/50 font-bold"
                            />
                        </div>
                    </div>
                </div>

                {selectedAccount !== '전체 계정' && (
                    <div className="flex items-center justify-between p-6 bg-indigo-500/5 rounded-2xl border border-indigo-500/10">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-500/10 rounded-xl flex items-center justify-center text-indigo-400">
                                <Calculator size={20} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Selected Account</p>
                                <h4 className="text-lg font-black text-white">{selectedAccount}</h4>
                            </div>
                        </div>
                        <div className="flex gap-8 text-right">
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Debit</p>
                                <h4 className="text-xl font-black text-emerald-400">{formatCurrency(totals.debit)}</h4>
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Credit</p>
                                <h4 className="text-xl font-black text-rose-400">{formatCurrency(totals.credit)}</h4>
                            </div>
                            <div className="pl-8 border-l border-white/10">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Net Balance</p>
                                <h4 className="text-2xl font-black text-white">{formatCurrency(totals.balance)}</h4>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th onClick={() => handleSort('date')} className="px-8 py-6 cursor-pointer group">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                        일자 <SortIcon field="date" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('vendor')} className="px-8 py-6 cursor-pointer group">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                        거래처 <SortIcon field="vendor" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('description')} className="px-8 py-6 cursor-pointer group">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                        적요 <SortIcon field="description" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('account')} className="px-8 py-6 cursor-pointer group">
                                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                        계정구분 <SortIcon field="account" />
                                    </div>
                                </th>
                                <th onClick={() => handleSort('amount')} className="px-8 py-6 cursor-pointer group text-right">
                                    <div className="flex items-center justify-end gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">
                                        금액 <SortIcon field="amount" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {processedData.map((row) => (
                                <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                    <td className="px-8 py-6 text-xs text-slate-400 font-mono font-bold">{row.date}</td>
                                    <td className="px-8 py-6 font-black text-white group-hover:text-indigo-300 transition-colors">{row.vendor}</td>
                                    <td className="px-8 py-6 text-sm text-slate-300 font-medium">"{row.description}"</td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${row.isDebit ? 'bg-indigo-500/10 text-indigo-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                                {row.isDebit ? 'Debit' : 'Credit'}
                                            </span>
                                            <span className="text-[11px] font-bold text-slate-400">{row.account}</span>
                                        </div>
                                    </td>
                                    <td className={`px-8 py-6 text-sm font-black text-right font-mono ${row.isDebit ? 'text-white' : 'text-slate-400'}`}>
                                        {formatCurrency(row.amount)}
                                    </td>
                                </tr>
                            ))}
                            {processedData.length === 0 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-24 text-center">
                                        <div className="flex flex-col items-center gap-3 text-slate-600">
                                            <Search size={48} className="opacity-20" />
                                            <p className="font-bold italic">조회 조건에 맞는 데이터가 없습니다.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LedgerView;
