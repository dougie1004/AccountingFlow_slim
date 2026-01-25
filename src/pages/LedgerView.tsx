import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { FileText, Search, Calendar, ChevronDown, ArrowUpDown, ChevronUp } from 'lucide-react';

const LedgerView: React.FC = () => {
    const { ledger, subLedger, partners } = useAccounting();

    // Filtering state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAccount, setSelectedAccount] = useState('전체 계정');
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'subledger'>('subledger');
    const [sortConfig, setSortConfig] = useState<{ key: 'date' | 'vendor' | 'amount'; direction: 'asc' | 'desc' }>({
        key: 'date',
        direction: 'desc'
    });

    const activeData = viewMode === 'subledger' ? subLedger : ledger;

    // Extract all unique accounts from both sides
    const accounts = useMemo(() => {
        const accs = new Set<string>();
        activeData.forEach(e => {
            accs.add(e.debitAccount);
            accs.add(e.creditAccount);
        });
        return Array.from(accs).sort();
    }, [activeData]);

    // Comprehensive filtering & sorting logic with Virtual VAT Expansion
    const processedData = useMemo(() => {
        const expandedRows: {
            id: string;
            date: string;
            vendor: string;
            description: string;
            account: string;
            amount: number;
            isDebit: boolean;
            ocrData?: string;
        }[] = [];

        activeData.forEach(entry => {
            const baseAmount = entry.amount;
            const vatAmount = entry.vat || 0;
            const totalAmount = baseAmount + vatAmount;

            if (entry.type === 'Revenue') {
                // DR AR (Total)
                expandedRows.push({
                    id: `${entry.id}-DR`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.debitAccount,
                    amount: totalAmount,
                    isDebit: true,
                    ocrData: entry.ocrData
                });
                // CR Sales (Base)
                expandedRows.push({
                    id: `${entry.id}-CR-BASE`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.creditAccount,
                    amount: baseAmount,
                    isDebit: false,
                    ocrData: entry.ocrData
                });
                // CR VAT (VAT)
                if (vatAmount > 0) {
                    expandedRows.push({
                        id: `${entry.id}-CR-VAT`,
                        date: entry.date,
                        vendor: entry.vendor || '-',
                        description: `[VAT] ${entry.description}`,
                        account: '부가가치세예수금',
                        amount: vatAmount,
                        isDebit: false,
                        ocrData: entry.ocrData
                    });
                }
            } else if (entry.type === 'Expense' || entry.type === 'Asset') {
                // DR Asset/Expense (Base)
                expandedRows.push({
                    id: `${entry.id}-DR-BASE`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.debitAccount,
                    amount: baseAmount,
                    isDebit: true,
                    ocrData: entry.ocrData
                });
                // DR VAT (VAT)
                if (vatAmount > 0) {
                    expandedRows.push({
                        id: `${entry.id}-DR-VAT`,
                        date: entry.date,
                        vendor: entry.vendor || '-',
                        description: `[VAT] ${entry.description}`,
                        account: '부가가치세대급금',
                        amount: vatAmount,
                        isDebit: true,
                        ocrData: entry.ocrData
                    });
                }
                // CR Cash/AP (Total)
                expandedRows.push({
                    id: `${entry.id}-CR`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.creditAccount,
                    amount: totalAmount,
                    isDebit: false,
                    ocrData: entry.ocrData
                });
            } else {
                // Standard Double Entry
                expandedRows.push({
                    id: `${entry.id}-DR`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.debitAccount,
                    amount: totalAmount,
                    isDebit: true,
                    ocrData: entry.ocrData
                });
                expandedRows.push({
                    id: `${entry.id}-CR`,
                    date: entry.date,
                    vendor: entry.vendor || '-',
                    description: entry.description,
                    account: entry.creditAccount,
                    amount: totalAmount,
                    isDebit: false,
                    ocrData: entry.ocrData
                });
            }
        });

        const filtered = expandedRows.filter(row => {
            // Account filter
            const matchesAccount = selectedAccount === '전체 계정' || row.account === selectedAccount;

            // Search filter
            const matchesSearch = !searchTerm ||
                row.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                row.account.toLowerCase().includes(searchTerm.toLowerCase());

            // Date range filter
            const matchesDate = (!startDate || row.date >= startDate) &&
                (!endDate || row.date <= endDate);

            return matchesAccount && matchesSearch && matchesDate;
        });

        // Sorting
        return [...filtered].sort((a, b) => {
            const { key, direction } = sortConfig;
            let comparison = 0;

            if (key === 'amount') {
                comparison = a.amount - b.amount;
            } else {
                const valA = (a[key as keyof typeof a] || '').toString().toLowerCase();
                const valB = (b[key as keyof typeof b] || '').toString().toLowerCase();
                comparison = valA.localeCompare(valB);
            }

            return direction === 'asc' ? comparison : -comparison;
        });
    }, [activeData, selectedAccount, searchTerm, startDate, endDate, sortConfig]);

    const handleSort = (key: 'date' | 'vendor' | 'amount') => {
        setSortConfig(prev => ({
            key,
            direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };

    // Calculate Balance for Selected Account
    const balanceStats = useMemo(() => {
        if (selectedAccount === '전체 계정') return null;

        let debitTotal = 0;
        let creditTotal = 0;
        processedData.forEach(row => {
            if (row.isDebit) debitTotal += row.amount;
            else creditTotal += row.amount;
        });

        // Determine if it's likely a credit-normal account (Liability, Equity, Revenue, or Contra-asset)
        const isCreditNormal = /매출|수익|부채|채무|미지급|예수|자본|누계액/.test(selectedAccount);
        const balance = isCreditNormal ? creditTotal - debitTotal : debitTotal - creditTotal;
        const balanceType = balance >= 0 ? (isCreditNormal ? 'Credit' : 'Debit') : (isCreditNormal ? 'Debit' : 'Credit');

        return { debitTotal, creditTotal, balance: Math.abs(balance), balanceType };
    }, [processedData, selectedAccount]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Area */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">계정별 원장 (G/L)</h1>
                    <p className="text-slate-400 font-bold">승인된 거래 데이터를 바탕으로 생성된 장부입니다.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex gap-2 p-1.5 bg-[#151D2E]/50 rounded-2xl border border-white/5">
                        <button
                            onClick={() => setViewMode('subledger')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'subledger' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
                        >
                            Sub-ledger (승인됨)
                        </button>
                        <button
                            onClick={() => setViewMode('all')}
                            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${viewMode === 'all' ? 'bg-white/10 text-white' : 'text-slate-500 hover:text-white'}`}
                        >
                            All Logs (미승인 포함)
                        </button>
                    </div>

                    <div className="flex items-center gap-3 bg-[#151D2E] p-2 rounded-2xl border border-white/5 shadow-inner">
                        <Calendar size={18} className="text-slate-500 ml-2" />
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0"
                        />
                        <span className="text-slate-700">~</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-transparent border-none text-sm font-bold text-white outline-none focus:ring-0 mr-2"
                        />
                    </div>
                </div>
            </div>

            {/* Filter & Summary Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-2xl space-y-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                            <input
                                type="text"
                                placeholder="거래처 또는 적요 검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-[#0B1221] border border-white/5 rounded-2xl text-sm font-bold text-white focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all shadow-inner placeholder:text-slate-600"
                            />
                        </div>

                        <div className="relative w-full md:w-64">
                            <select
                                value={selectedAccount}
                                onChange={(e) => setSelectedAccount(e.target.value)}
                                className="w-full pl-4 pr-10 py-3 bg-[#0B1221] border border-white/5 rounded-2xl text-sm font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 appearance-none cursor-pointer shadow-inner"
                            >
                                <option>전체 계정</option>
                                {accounts.map(acc => (
                                    <option key={acc} value={acc}>{acc}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
                        </div>
                    </div>
                </div>

                {balanceStats && (
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 p-6 rounded-[2rem] shadow-2xl text-white flex flex-col justify-center gap-1 group animate-in slide-in-from-right-4 duration-500">
                        <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest">{selectedAccount} 원장 잔액</p>
                        <div className="flex items-baseline gap-2">
                            <h3 className="text-3xl font-black">₩{balanceStats.balance.toLocaleString()}</h3>
                            <span className="text-xs font-black bg-white/20 px-2 py-0.5 rounded-md uppercase tracking-tighter">{balanceStats.balanceType}</span>
                        </div>
                        <div className="flex gap-4 mt-2 text-[10px] font-black text-indigo-200">
                            <span>DEBIT: ₩{balanceStats.debitTotal.toLocaleString()}</span>
                            <span>CREDIT: ₩{balanceStats.creditTotal.toLocaleString()}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Data Table */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th
                                    className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 cursor-pointer hover:text-indigo-400 transition-colors"
                                    onClick={() => handleSort('date')}
                                >
                                    <div className="flex items-center gap-2">
                                        일자
                                        {sortConfig.key === 'date' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                                <th
                                    className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 cursor-pointer hover:text-indigo-400 transition-colors"
                                    onClick={() => handleSort('vendor')}
                                >
                                    <div className="flex items-center gap-2">
                                        거래처 (Entity)
                                        {sortConfig.key === 'vendor' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">적요 / 추론</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">계정 구분</th>
                                <th
                                    className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-right cursor-pointer hover:text-indigo-400 transition-colors"
                                    onClick={() => handleSort('amount')}
                                >
                                    <div className="flex items-center justify-end gap-2">
                                        금액
                                        {sortConfig.key === 'amount' ? (
                                            sortConfig.direction === 'asc' ? <ChevronUp size={12} className="text-indigo-400" /> : <ChevronDown size={12} className="text-indigo-400" />
                                        ) : (
                                            <ArrowUpDown size={12} className="text-slate-600" />
                                        )}
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {processedData.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center">
                                        <FileText className="mx-auto text-slate-700 mb-4" size={48} />
                                        <div className="text-slate-500 font-black text-lg mb-2">표시할 데이터가 없습니다.</div>
                                        <p className="text-slate-600 text-sm font-bold">필터 조건을 변경하거나 거래처 승인 상태를 확인해 보세요.</p>
                                    </td>
                                </tr>
                            ) : (
                                processedData.map((row) => {
                                    const partner = partners.find(p => p.name === row.vendor);

                                    return (
                                        <tr key={row.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-8 py-6 text-xs font-bold text-slate-400 font-mono">{row.date}</td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{row.vendor}</span>
                                                    {partner?.partnerCode && (
                                                        <span className="text-[10px] text-indigo-500 font-black uppercase tracking-widest">{partner.partnerCode}</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-300">"{row.description}"</span>
                                                    <span className="text-[10px] text-slate-600 font-medium italic mt-1 line-clamp-1">{row.ocrData ? 'Digital Proof Attached' : 'Manual Entry'}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${row.isDebit
                                                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                                                        : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                                        }`}>
                                                        {row.isDebit ? 'Debit' : 'Credit'}
                                                    </span>
                                                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">
                                                        {row.account}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-sm font-black text-white text-right font-mono">
                                                ₩{row.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default LedgerView;
