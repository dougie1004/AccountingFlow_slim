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
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newPartner, setNewPartner] = useState({ name: '', regNo: '' });

    if (!context) return null;
    const { partners, ledger, addPartner } = context;

    const filteredPartners = partners.filter(p =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.regNo?.includes(searchTerm)
    );

    const getPartnerStats = (partnerName: string) => {
        const partnerTransactions = ledger.filter(l => l.vendor === partnerName);
        const totalAmount = partnerTransactions.reduce((sum, t) => sum + (t.amount + (t.vat || 0)), 0);
        const lastTransaction = partnerTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        const typeCount = partnerTransactions.reduce((acc, t) => {
            acc[t.type] = (acc[t.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        const defaultType = (typeCount['Revenue'] || 0) > (typeCount['Expense'] || 0) ? 'Customer' : 'Vendor';
        return { totalAmount, lastDate: lastTransaction?.date || '-', type: defaultType };
    };

    const handleAddPartner = () => {
        if (!newPartner.name) return;
        addPartner({ name: newPartner.name, regNo: newPartner.regNo });
        setNewPartner({ name: '', regNo: '' });
        setIsModalOpen(false);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2 flex items-center gap-3">
                        <Users className="text-indigo-400" size={32} />
                        거래처 네트워크
                    </h1>
                    <p className="text-slate-400 font-bold">비즈니스 파트너 현황 및 거래 집계입니다.</p>
                </div>
                <div className="flex items-center gap-4 w-full lg:w-auto">
                    <div className="relative group flex-1 lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-indigo-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="업체명 검색..."
                            className="w-full pl-12 pr-6 py-3.5 bg-[#151D2E] border border-white/5 rounded-2xl text-white outline-none font-bold focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-xl"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all active:scale-95 shadow-lg shadow-indigo-600/20 whitespace-nowrap"
                    >
                        신규 등록
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
                    <div className="flex items-center gap-4 mb-4 relative z-10">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl group-hover:scale-110 transition-transform"><Building2 size={24} /></div>
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">전체 거래처</span>
                    </div>
                    <div className="text-4xl font-black text-white relative z-10">{partners.length} <span className="text-sm text-slate-500 uppercase">Registered</span></div>
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Users size={80} />
                    </div>
                </div>
            </div>

            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-white/[0.02] border-b border-white/5">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">업체명</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest">사업자등록번호</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">분류</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-right">누적 거래액</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">최근 거래일</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredPartners.length > 0 ? filteredPartners.map((partner, idx) => {
                                const stats = getPartnerStats(partner.name);
                                return (
                                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center font-black text-indigo-400 border border-white/5 group-hover:border-indigo-500/30 transition-all">
                                                    {partner.name[0]}
                                                </div>
                                                <div>
                                                    <span className="font-black text-white uppercase block">{partner.name}</span>
                                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Partner ID: {idx + 101}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-slate-400 font-bold bg-[#0B1221] px-3 py-1.5 rounded-lg border border-white/5">{partner.regNo || '-'}</span>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase border-2 ${stats.type === 'Customer' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'}`}>
                                                {stats.type}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-white font-mono text-lg">
                                            ₩{stats.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <span className="text-slate-400 font-bold text-xs">{stats.lastDate}</span>
                                        </td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={5} className="px-8 py-20 text-center text-slate-600 font-bold italic">
                                        등록된 거래처가 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#151D2E] w-full max-w-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-8 space-y-6">
                            <h3 className="text-2xl font-black text-white mb-2">신규 거래처 등록</h3>
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">업체명 (필수)</label>
                                    <input
                                        type="text"
                                        placeholder="예: (주)에이아이플로우"
                                        className="w-full bg-[#0B1221] border border-white/5 rounded-2xl px-5 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newPartner.name}
                                        onChange={e => setNewPartner({ ...newPartner, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">사업자등록번호</label>
                                    <input
                                        type="text"
                                        placeholder="000-00-00000"
                                        className="w-full bg-[#0B1221] border border-white/5 rounded-2xl px-5 py-3.5 text-white font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                                        value={newPartner.regNo}
                                        onChange={e => setNewPartner({ ...newPartner, regNo: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button onClick={() => setIsModalOpen(false)} className="flex-1 px-6 py-4 rounded-2xl text-slate-400 font-black hover:bg-white/5 transition-all">취소</button>
                                <button
                                    onClick={handleAddPartner}
                                    className="flex-1 px-6 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/20 transition-all active:scale-95"
                                >
                                    등록 완료
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;
