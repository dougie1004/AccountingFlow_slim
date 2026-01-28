import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Building, Search, Download, FileText } from 'lucide-react';
import { JournalEntry } from '../types';

const VendorLedger: React.FC = () => {
    const { ledger } = useAccounting();
    const [selectedVendor, setSelectedVendor] = useState<string>('All');
    const [searchTerm, setSearchTerm] = useState('');

    // 1. Extract Unique Vendors
    const vendors = useMemo(() => {
        const set = new Set(ledger.map(e => e.vendor).filter(Boolean));
        return Array.from(set).sort();
    }, [ledger]);

    // 2. Filter Transactions
    const filteredTransactions = useMemo(() => {
        let data = ledger.filter(e => e.status === 'Approved');

        if (selectedVendor !== 'All') {
            data = data.filter(e => e.vendor === selectedVendor);
        }

        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            data = data.filter(e =>
                e.description.toLowerCase().includes(lower) ||
                (e.vendor && e.vendor.toLowerCase().includes(lower))
            );
        }

        return data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [ledger, selectedVendor, searchTerm]);

    // 3. Calculate Summary per Vendor (Simple Aggregation)
    const summary = useMemo(() => {
        if (selectedVendor === 'All') return null;

        const totalAmount = filteredTransactions.reduce((sum, e) => sum + e.amount, 0);
        return { totalTransactions: filteredTransactions.length, totalVolume: totalAmount };
    }, [filteredTransactions, selectedVendor]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/5 pb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-pink-500 rounded-lg">
                            <Building className="text-white" size={20} />
                        </div>
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Partner Management</span>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">거래처 원장 (Vendor Ledger)</h1>
                    <p className="text-slate-400 font-bold mt-1">거래처별 상세 거래 내역 및 이력 조회</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[600px]">
                {/* Left: Vendor List */}
                <div className="lg:col-span-1 bg-[#151D2E] rounded-[2rem] border border-white/5 p-4 flex flex-col">
                    <div className="relative mb-4">
                        <Search className="absolute left-3 top-3 text-slate-500" size={16} />
                        <input
                            placeholder="거래처 검색..."
                            className="w-full bg-[#0B1221] border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white text-sm focus:border-pink-500 transition-colors"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        <button
                            onClick={() => setSelectedVendor('All')}
                            className={`w-full text-left p-3 rounded-xl transition-all text-sm font-bold flex justify-between group ${selectedVendor === 'All' ? 'bg-pink-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                        >
                            <span>전체 거래처</span>
                            <span className="opacity-50">{ledger.filter(e => e.status === 'Approved').length}</span>
                        </button>

                        {vendors.map(vendor => (
                            <button
                                key={vendor}
                                onClick={() => setSelectedVendor(vendor!)}
                                className={`w-full text-left p-3 rounded-xl transition-all text-sm font-bold flex justify-between group ${selectedVendor === vendor ? 'bg-pink-600 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                            >
                                <span className="truncate">{vendor}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Right: Transaction List */}
                <div className="lg:col-span-3 bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 flex flex-col">
                    {selectedVendor !== 'All' && summary && (
                        <div className="flex gap-6 mb-6 pb-6 border-b border-white/5">
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-black">Total Volume</p>
                                <p className="text-2xl font-black text-white">₩{summary.totalVolume.toLocaleString()}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 uppercase font-black">Transaction Count</p>
                                <p className="text-2xl font-black text-white">{summary.totalTransactions}건</p>
                            </div>
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto custom-scrollbar rounded-xl border border-white/5 bg-[#0B1221]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#151D2E] text-slate-400 text-xs uppercase font-bold sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Account</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredTransactions.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="text-center py-20 text-slate-500 italic">거래 내역이 없습니다.</td>
                                    </tr>
                                ) : (
                                    filteredTransactions.map(t => (
                                        <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4 text-slate-300 font-mono">{t.date}</td>
                                            <td className="px-6 py-4">
                                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 text-[10px] font-black">{t.status}</span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-bold text-xs">Dr. {t.debitAccount}</span>
                                                    <span className="text-slate-500 text-xs">Cr. {t.creditAccount}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-300 max-w-[200px] truncate" title={t.description}>{t.description}</td>
                                            <td className="px-6 py-4 text-right font-black text-white font-mono">
                                                ₩{t.amount.toLocaleString()}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VendorLedger;
