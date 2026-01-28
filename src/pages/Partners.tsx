import React, { useContext, useState } from 'react';
import {
    Users,
    Search,
    ExternalLink,
    Building2,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { AccountingContext } from '../context/AccountingContext';
import { Partner } from '../types';

const Partners = () => {
    const context = useContext(AccountingContext);
    const [searchTerm, setSearchTerm] = useState('');

    if (!context) return null;
    const { partners, ledger } = context;

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.regNo?.includes(searchTerm)
    );

    const getPartnerStats = (partnerName: string) => {
        const partnerTransactions = ledger.filter(l => l.vendor === partnerName);
        const totalAmount = partnerTransactions.reduce((sum, t) => sum + t.amount, 0);
        const lastTransaction = partnerTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const typeCount = partnerTransactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const defaultType = (typeCount['Revenue'] || 0) > (typeCount['Expense'] || 0) ? 'Customer' : 'Vendor';
        return { totalAmount, lastDate: lastTransaction?.date || '-', type: defaultType };
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">거래처 네트워크</h1>
                    <p className="text-slate-400 font-bold">비즈니스 파트너 현황 및 거래 집계입니다.</p>
                </div>
                <div className="relative group w-full lg:w-80">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="업체명 검색..."
                        className="w-full pl-12 pr-6 py-3 bg-[#151D2E] border border-white/5 rounded-2xl text-white outline-none font-bold"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl"><Building2 size={24} /></div>
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">전체 거래처</span>
                    </div>
                    <div className="text-3xl font-black text-white">{partners.length} <span className="text-sm text-slate-500 uppercase">Registered</span></div>
                </div>
            </div>

            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">업체명</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">사업자등록번호</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">분류</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">누적 거래액</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredPartners.map((partner, idx) => {
                                const stats = getPartnerStats(partner.name);
                                return (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center font-black text-indigo-400 border border-white/5">
                                                    {partner.name[0]}
                                                </div>
                                                <span className="font-black text-white uppercase">{partner.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-slate-400 font-bold">{partner.regNo || '-'}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase border ${stats.type === 'Customer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                {stats.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-white font-mono">
                                            ₩{stats.totalAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Partners;
