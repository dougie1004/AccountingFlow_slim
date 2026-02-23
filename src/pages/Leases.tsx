import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { Asset, LeaseContract } from '../types';
import { formatCurrency } from '../utils/formatUtils';
import { calculateLeaseSchedule } from '../bridge/StrategicBridge';
import {
    Building2,
    Plus,
    Calendar,
    DollarSign,
    Briefcase,
    TrendingDown,
    ArrowRight,
    X,
    MoreHorizontal
} from 'lucide-react';

export const Leases: React.FC = () => {
    const { leases: rawLeases, addLease, addAsset, ledger, addEntries, systemNow } = useAccounting();
    const leases = useMemo(() => rawLeases.filter(l => !systemNow || l.startDate <= systemNow), [rawLeases, systemNow]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // New Lease Form State
    const [newLease, setNewLease] = useState<{
        name: string;
        vendor: string;
        startDate: string;
        termMonths: number;
        monthlyPayment: number;
        deposit: number;
        interestRate: number;
    }>({
        name: '',
        vendor: '',
        startDate: new Date().toISOString().split('T')[0],
        termMonths: 24,
        monthlyPayment: 0,
        deposit: 0,
        interestRate: 5.0
    });

    // --- Dashboard Metrics ---
    const activeLeases = useMemo(() => leases.filter(l => l.status === 'ACTIVE'), [leases]);

    const leaseMetrics = useMemo(() => {
        let totalLiability = 0; // Remaining Liability (approx based on ledger or schedule)
        let monthlyOutflow = 0;
        let weightedAvgRate = 0;

        // Calculate current liability from Ledger (Most accurate source of truth)
        // Similar to Closing logic
        let currentLiability = 0;
        ledger.forEach(e => {
            if (e.status !== 'Approved') return;
            if (e.creditAccount.includes('리스부채') || e.creditAccount.includes('Lease Liab')) {
                currentLiability += (e.amount + e.vat || 0);
            }
            if (e.debitAccount.includes('리스부채') || e.debitAccount.includes('Lease Liab')) {
                currentLiability -= (e.amount + e.vat || 0);
            }
        });
        totalLiability = Math.max(0, currentLiability);

        if (activeLeases.length > 0) {
            monthlyOutflow = activeLeases.reduce((sum, l) => sum + l.monthlyPayment, 0);
            weightedAvgRate = activeLeases.reduce((sum, l) => sum + l.interestRate, 0) / activeLeases.length;
        }

        return { totalLiability, monthlyOutflow, weightedAvgRate };
    }, [leases, ledger, activeLeases]);


    // --- Handlers ---
    const handleAddLease = () => {
        if (!newLease.name || newLease.monthlyPayment <= 0) {
            alert('계약명과 월 상환액을 올바르게 입력해주세요.');
            return;
        }

        // 1. Calculate PV (Present Value) = Initial Liability = Initial RoU Asset
        const r = (newLease.interestRate / 100) / 12;
        const n = newLease.termMonths;
        let pv = 0;

        if (r === 0) {
            pv = newLease.monthlyPayment * n;
        } else {
            pv = newLease.monthlyPayment * ((1 - Math.pow(1 + r, -n)) / r);
        }

        pv = Math.round(pv); // Round to integer

        // 2. Create Lease Object
        const leaseId = crypto.randomUUID();
        const endDate = new Date(new Date(newLease.startDate).setMonth(new Date(newLease.startDate).getMonth() + newLease.termMonths)).toISOString().split('T')[0];

        const lease: LeaseContract = {
            id: leaseId,
            name: newLease.name,
            vendor: newLease.vendor,
            startDate: newLease.startDate,
            endDate: endDate,
            monthlyPayment: newLease.monthlyPayment,
            deposit: newLease.deposit,
            interestRate: newLease.interestRate,
            status: 'ACTIVE',
            initialAssetValue: pv,
            initialLiability: pv
        };

        // 3. Create RoU Asset Object (Automatically linked)
        const rouAsset: Asset = {
            id: crypto.randomUUID(),
            name: `[사용권] ${newLease.name}`,
            depreciationMethod: 'StraightLine', // RoU reflects usage linearly usually
            acquisitionDate: newLease.startDate,
            cost: pv,
            usefulLife: Math.floor(newLease.termMonths / 12), // Approx years
            residualValue: 0,
            accumulatedDepreciation: 0,
            status: 'ACTIVE',
            linkedLeaseId: leaseId
        };

        // 4. Create Initial Recognition Journal Entry (IFRS 16)
        // Dr Use-of-Right Asset / Cr Lease Liability
        const initialUsageEntry = {
            id: crypto.randomUUID(),
            date: newLease.startDate,
            debitAccount: '사용권자산 (RoU Asset)',
            creditAccount: '리스부채 (Lease Liability)',
            amount: pv,
            description: `[리스 최초인식] ${newLease.name} (PV: ${pv.toLocaleString()})`,
            vendor: newLease.vendor,
            status: 'Approved',
            type: 'AUTO_LEASE_INITIAL',
            vat: 0
        };

        // 5. Commit
        addLease(lease);
        addAsset(rouAsset);
        addEntries([initialUsageEntry]);

        setIsModalOpen(false);
        alert(`✅ 리스 계약 [${lease.name}] 등록 완료.\n\n💰 리스부채 및 사용권자산(RoU)으로 ₩${pv.toLocaleString()}원이 인식되었습니다.`);
    };

    return (
        <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-3">
                        <Building2 className="text-indigo-500" size={32} />
                        리스 자산 및 부채 관리 (Leases)
                    </h2>
                    <p className="text-slate-500 font-bold mt-1">IFRS 16 기준에 따라 운용리스를 자산과 부채로 인식하고 관리합니다.</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-2xl font-black transition-all shadow-lg shadow-indigo-600/20 active:scale-95"
                >
                    <Plus size={20} />
                    신규 리스 계약 등록
                </button>
            </div>

            {/* Dashboard Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Briefcase size={80} />
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">총 리스 부채 (Lease Liability)</p>
                    <h3 className="text-2xl font-black text-rose-400">{formatCurrency(leaseMetrics.totalLiability)}</h3>
                </div>

                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <DollarSign size={80} />
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">월 리스료 지출 (Monthly)</p>
                    <h3 className="text-2xl font-black text-white">{formatCurrency(leaseMetrics.monthlyOutflow)}</h3>
                </div>

                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <TrendingDown size={80} />
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">평균 이자율 (Avg Rate)</p>
                    <h3 className="text-2xl font-black text-emerald-400">{leaseMetrics.weightedAvgRate.toFixed(2)}%</h3>
                </div>

                <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <Building2 size={80} />
                    </div>
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">총 계약 건수</p>
                    <h3 className="text-2xl font-black text-indigo-400">{activeLeases.length}건</h3>
                </div>
            </div>

            {/* Lease List */}
            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                <div className="p-8 border-b border-white/5">
                    <h3 className="text-xl font-black text-white">리스 계약 목록</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#0B1221] text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                <th className="px-8 py-4">계약명 / 거래처</th>
                                <th className="px-8 py-4">계약 기간</th>
                                <th className="px-8 py-4 text-right">최초 인식 부채(PV)</th>
                                <th className="px-8 py-4 text-right">월 상환액</th>
                                <th className="px-8 py-4 text-right">이자율</th>
                                <th className="px-8 py-4 text-center">상태</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {leases.map((lease) => (
                                <tr key={lease.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="text-white font-bold">{lease.name}</p>
                                            <p className="text-slate-500 text-xs mt-1">{lease.vendor}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold">
                                            <Calendar size={12} />
                                            {lease.startDate} ~ {lease.endDate}
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-rose-400 font-bold font-mono">{formatCurrency(lease.initialLiability)}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-white font-bold font-mono">{formatCurrency(lease.monthlyPayment)}</p>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <span className="px-2 py-1 bg-white/5 rounded-lg text-xs font-bold text-slate-300">
                                            {lease.interestRate}%
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        {lease.status === 'ACTIVE' ? (
                                            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase rounded border border-emerald-500/20">Active</span>
                                        ) : (
                                            <span className="px-2 py-1 bg-slate-700/20 text-slate-500 text-[10px] font-black uppercase rounded border border-white/5">Terminated</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {leases.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center text-slate-500 font-bold italic">
                                        등록된 리스 계약이 없습니다.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Registration Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151D2E] w-full max-w-2xl rounded-[2rem] border border-white/10 p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={24} /></button>

                        <h2 className="text-2xl font-black text-white mb-2">신규 리스 계약 등록</h2>
                        <p className="text-slate-500 text-sm font-bold mb-8">계약 정보를 입력하면 사용권자산(RoU)과 리스부채가 자동으로 생성됩니다.</p>

                        <div className="grid grid-cols-2 gap-6">
                            <div className="col-span-2">
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">리스 계약명 (자산명)</label>
                                <input
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="예: 강남 본사 사무실 임차 계약"
                                    value={newLease.name}
                                    onChange={e => setNewLease({ ...newLease, name: e.target.value })}
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">거래처 (임대인)</label>
                                <input
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                    placeholder="예: (주)테헤란빌딩"
                                    value={newLease.vendor}
                                    onChange={e => setNewLease({ ...newLease, vendor: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">계약 시작일</label>
                                <input
                                    type="date"
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                    value={newLease.startDate}
                                    onChange={e => setNewLease({ ...newLease, startDate: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">월 상환액 (Monthly Payment)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-500 font-bold">₩</span>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0B1221] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0"
                                        value={newLease.monthlyPayment || ''}
                                        onChange={e => setNewLease({ ...newLease, monthlyPayment: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">내재 이자율 (연 %)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                        value={newLease.interestRate}
                                        onChange={e => setNewLease({ ...newLease, interestRate: Number(e.target.value) })}
                                    />
                                    <span className="absolute right-4 top-3 text-slate-500 font-bold">%</span>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">계약 기간 (개월)</label>
                                <input
                                    type="number"
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                    value={newLease.termMonths}
                                    onChange={e => setNewLease({ ...newLease, termMonths: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-2">보증금 (참고용)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-3 text-slate-500 font-bold">₩</span>
                                    <input
                                        type="number"
                                        className="w-full bg-[#0B1221] border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-bold outline-none focus:border-indigo-500 transition-colors"
                                        placeholder="0"
                                        value={newLease.deposit || ''}
                                        onChange={e => setNewLease({ ...newLease, deposit: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">취소</button>
                            <button onClick={handleAddLease} className="flex-1 py-4 bg-indigo-600 rounded-xl font-black text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">리스 계약 등록 및 자산 생성</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
