import React, { useContext, useState } from 'react';
import {
    Users,
    Search,
    Plus,
    ExternalLink,
    Building2,
    User,
    CreditCard,
    ArrowUpRight,
    ArrowDownLeft
} from 'lucide-react';
import { AccountingContext } from '../context/AccountingContext';
import { Partner } from '../types';

const Partners = () => {
    const context = useContext(AccountingContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'approved' | 'pending'>('approved');

    if (!context) return null;
    const { partners, updatePartner, ledger, approvePartner } = context;

    const filteredPartners = partners.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.regNo?.includes(searchTerm);
        if (activeTab === 'approved') return matchesSearch && p.status === 'Approved';
        return matchesSearch && p.status === 'Pending';
    });

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

    const handleUpdatePartner = (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedPartner) {
            updatePartner(selectedPartner.id, selectedPartner);
            setIsEditModalOpen(false);
        }
    };

    const handleApprovePartner = async () => {
        if (selectedPartner) {
            await approvePartner(selectedPartner);
            setIsEditModalOpen(false);
            setActiveTab('approved');
        }
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-2">거래처 네트워크</h1>
                    <p className="text-slate-400 font-bold">인공지능이 분석한 비즈니스 파트너 현황 및 거버넌스 관리입니다.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="relative group w-full lg:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400" size={18} />
                        <input
                            type="text"
                            placeholder="업체명 또는 사업자번호 검색..."
                            className="w-full pl-12 pr-6 py-3 bg-[#151D2E] border border-white/5 rounded-2xl text-white shadow-inner focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all font-bold placeholder:text-slate-600"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Governance Tabs */}
            <div className="flex gap-2 p-1.5 bg-[#151D2E]/50 rounded-2xl border border-white/5 w-fit">
                <button
                    onClick={() => setActiveTab('approved')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'approved' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
                >
                    승인된 거래처 (Master)
                </button>
                <button
                    onClick={() => setActiveTab('pending')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20' : 'text-slate-500 hover:text-white'}`}
                >
                    승인 대기 (Pending)
                    {partners.filter(p => p.status === 'Pending').length > 0 && (
                        <span className="px-1.5 py-0.5 bg-white text-rose-600 text-[10px] rounded-full">
                            {partners.filter(p => p.status === 'Pending').length}
                        </span>
                    )}
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-2xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                            <Building2 size={24} />
                        </div>
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">전체 거래처</span>
                    </div>
                    <div className="text-3xl font-black text-white">{partners.filter(p => p.status === 'Approved').length}<span className="text-lg ml-1 text-slate-500">Approved</span></div>
                </div>
                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-2xl hover:-translate-y-1 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-2xl">
                            <ArrowUpRight size={24} />
                        </div>
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">매출(수익)처</span>
                    </div>
                    <div className="text-3xl font-black text-white">
                        {partners.filter(p => p.status === 'Approved' && getPartnerStats(p.name).type === 'Customer').length}<span className="text-lg ml-1 text-slate-500">Customers</span>
                    </div>
                </div>
                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-2xl hover:-translate-y-1 transition-all duration-300 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl">
                            <ArrowDownLeft size={24} />
                        </div>
                        <span className="text-slate-500 font-black uppercase text-[10px] tracking-widest">승인 대기 중</span>
                    </div>
                    <div className="text-3xl font-black text-white">
                        {partners.filter(p => p.status === 'Pending').length}<span className="text-lg ml-1 text-slate-500">Requests</span>
                    </div>
                </div>
            </div>

            {/* Partners Table */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden p-1">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-separate border-spacing-0">
                        <thead>
                            <tr className="bg-white/[0.02]">
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">업체명 (Entity)</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">사업자등록번호</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">분류 / 상태</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-right">누적 거래액</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5">관리 코드</th>
                                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] border-b border-white/5 text-center">관리</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                            {filteredPartners.map((partner) => {
                                const stats = getPartnerStats(partner.name);
                                return (
                                    <tr key={partner.id} className="hover:bg-white/[0.02] transition-colors group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-white/5 rounded-[1rem] flex items-center justify-center font-black text-indigo-400 group-hover:scale-110 transition-transform border border-white/5">
                                                    {partner.name?.[0] || '?'}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-black text-white group-hover:text-indigo-400 transition-colors uppercase tracking-tight">{partner.name}</span>
                                                    <span className="text-[10px] text-slate-600 font-bold uppercase tracking-widest">{partner.representative || '대표자 미지정'}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className="font-mono text-slate-400 font-bold tracking-tighter">{partner.regNo || 'PENDING'}</span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit ${stats.type === 'Customer'
                                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                                    }`}>
                                                    {stats.type}
                                                </span>
                                                <span className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest w-fit ${partner.status === 'Approved'
                                                    ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                                    }`}>
                                                    {partner.status}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right font-black text-white font-mono">
                                            ₩{stats.totalAmount.toLocaleString()}
                                        </td>
                                        <td className="px-8 py-6 text-slate-500 font-black text-xs font-mono">
                                            {partner.partnerCode || (partner.status === 'Pending' ? '[WAITING]' : '-')}
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => {
                                                    setSelectedPartner(partner);
                                                    setIsEditModalOpen(true);
                                                }}
                                                className="p-3 text-slate-600 hover:text-white hover:bg-white/5 rounded-2xl transition-all active:scale-90"
                                            >
                                                <ExternalLink size={20} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit/Approval Modal */}
            {isEditModalOpen && selectedPartner && (
                <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 lg:p-12">
                    <div className="bg-[#151D2E] rounded-[3rem] border border-white/10 shadow-3xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="px-10 py-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                            <div>
                                <h2 className="text-2xl font-black text-white tracking-tight">
                                    {selectedPartner.status === 'Pending' ? '거래처 승인 데스크' : '거래처 마스터 정보'}
                                </h2>
                                <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">
                                    {selectedPartner.status === 'Pending' ? 'AI Detection & Governance Review' : 'Partner Data Synchronization'}
                                </p>
                            </div>
                            <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-xl transition-all">
                                <Plus className="rotate-45" size={28} />
                            </button>
                        </div>
                        <form onSubmit={handleUpdatePartner} className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">공식 명칭 (Entity Name)</label>
                                <input
                                    className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white outline-none shadow-inner"
                                    value={selectedPartner.name}
                                    onChange={(e) => setSelectedPartner({ ...selectedPartner, name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">사업자번호</label>
                                    <input
                                        className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner font-mono"
                                        placeholder="000-00-00000"
                                        value={selectedPartner.regNo || ''}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, regNo: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">법정 대표자</label>
                                    <input
                                        className="w-full px-6 py-4 bg-[#0B1221] border border-white/5 rounded-2xl font-black text-white focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                                        value={selectedPartner.representative || ''}
                                        onChange={(e) => setSelectedPartner({ ...selectedPartner, representative: e.target.value })}
                                    />
                                </div>
                            </div>

                            {selectedPartner.status === 'Pending' && (
                                <div className="p-6 bg-rose-500/5 border border-rose-500/20 rounded-[2rem] space-y-2">
                                    <div className="flex items-center gap-2 text-rose-400 font-black text-xs uppercase tracking-widest">
                                        <CreditCard size={14} />
                                        거버넌스 체크리스트
                                    </div>
                                    <ul className="text-[11px] text-slate-400 font-bold list-disc list-inside space-y-1">
                                        <li>사업자등록번호 유효성을 확인하십시오.</li>
                                        <li>지급을 위한 계좌정보(Bank Details)가 입력되지 않았습니다.</li>
                                        <li>승인 전까지는 '지급 보류(Hold Payment)' 상태로 유지됩니다.</li>
                                    </ul>
                                </div>
                            )}

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 py-5 bg-white/5 text-slate-400 font-black rounded-3xl hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest text-xs"
                                >
                                    Cancel
                                </button>
                                {selectedPartner.status === 'Pending' ? (
                                    <button
                                        type="button"
                                        onClick={handleApprovePartner}
                                        className="flex-[2] py-5 bg-emerald-600 text-white font-black rounded-3xl hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all uppercase tracking-widest text-xs active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <Building2 size={16} />
                                        최종 승인 및 코드 부여
                                    </button>
                                ) : (
                                    <button
                                        type="submit"
                                        className="flex-[2] py-5 bg-indigo-600 text-white font-black rounded-3xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all uppercase tracking-widest text-xs active:scale-95"
                                    >
                                        Update Master Data
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Partners;
