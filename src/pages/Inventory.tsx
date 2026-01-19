import React, { useState, useEffect } from 'react';
import { Package, Zap, AlertCircle, TrendingDown, Info, ShieldCheck, Database, ArrowRight } from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { invoke } from '@tauri-apps/api/core';

interface ValuationSummary {
    totalCost: number;
    totalNrv: number;
    adjustmentNeeded: number;
    valuationLogs: string[];
}

export const Inventory: React.FC = () => {
    const context = useAccounting() as any;
    const { inventory = [], financials, addEntry } = context;
    const [summary, setSummary] = useState<ValuationSummary | null>(null);

    // AI/Backend 기반 재고자산 평가 실행 (LCM)
    useEffect(() => {
        const runValuation = async () => {
            if (!inventory || inventory.length === 0) return;
            try {
                const result = await invoke<ValuationSummary>('evaluate_inventory_assets', { inventory });
                setSummary(result);
            } catch (e) {
                console.error("Valuation failed:", e);
            }
        };
        runValuation();
    }, [inventory]);

    const totalQty = inventory?.reduce((acc: any, curr: any) => acc + (curr.batches?.reduce((bAcc: any, b: any) => bAcc + b.quantity, 0) || 0), 0) || 0;

    return (
        <div className="space-y-8 pb-20 bg-[#0B1221] min-h-screen p-6">
            <header className="flex flex-col gap-2">
                <div className="flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            <Database className="text-indigo-500" size={32} />
                            재고 자산 가치 평가 및 거버넌스
                        </h1>
                        <p className="text-slate-400 text-lg font-bold">K-IFRS/GAAP 기준 선입선출(FIFO) 및 저가법(LCM) 실시간 결산 시스템</p>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl font-black text-xs">
                        <ShieldCheck size={16} />
                        회계 기준 준수 중
                    </div>
                </div>
            </header>

            {/* 1. 평가 요약 대시보드 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-[#151D2E] border border-white/5 p-6 rounded-[2rem] shadow-2xl">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">장부 가액 (Cost Basis)</p>
                    <h3 className="text-2xl font-black text-white">₩{summary?.totalCost?.toLocaleString() ?? '0'}</h3>
                </div>

                <div className="bg-[#151D2E] border border-white/5 p-6 rounded-[2rem] shadow-2xl">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">순실현가능가액 (NRV)</p>
                    <h3 className="text-2xl font-black text-emerald-400">₩{summary?.totalNrv?.toLocaleString() ?? '0'}</h3>
                </div>

                <div className="bg-[#151D2E] border border-white/5 p-6 rounded-[2rem] shadow-2xl">
                    <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-2">평가 손실 발생 (Write-down)</p>
                    <h3 className={`text-2xl font-black ${(summary?.adjustmentNeeded ?? 0) > 0 ? 'text-rose-500' : 'text-slate-500'}`}>
                        ₩{summary?.adjustmentNeeded?.toLocaleString() ?? '0'}
                    </h3>
                </div>

                <div className="bg-indigo-600 p-6 rounded-[2rem] shadow-2xl text-white">
                    <p className="text-indigo-100 text-[10px] font-black uppercase tracking-widest mb-2">재고 보유 합계</p>
                    <h3 className="text-2xl font-black">{totalQty.toLocaleString()} Units</h3>
                    <div className="mt-2 flex items-center gap-1 text-[10px] font-bold">
                        <TrendingDown size={12} />
                        보유기일(DIO) 추정: 42.5일
                    </div>
                </div>
            </div>

            {/* 2. 품목별 상세 현황 (Batch 단위) */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-lg font-black text-white px-2">품목별 선입선출(FIFO) 현황</h3>
                    <div className="bg-[#151D2E]/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#151D2E]">
                                <tr>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">품목 및 배치 정보</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">수량</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">단가</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">합계</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {inventory?.map((item: any) => (
                                    <React.Fragment key={item.id}>
                                        <tr className="bg-white/[0.02]">
                                            <td colSpan={4} className="px-6 py-3">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-black text-indigo-400">{item.name}</span>
                                                    <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20">{item.valuationMethod}</span>
                                                    {item.lastNrv && item.lastNrv < (item.batches?.[0]?.unitCost || 0) && (
                                                        <span className="text-[10px] bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-full border border-rose-500/20 flex items-center gap-1">
                                                            <AlertCircle size={10} /> LCM 대상
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                        {item.batches?.map((batch: any) => (
                                            <tr key={batch.id} className="hover:bg-white/[0.01] transition-colors">
                                                <td className="px-8 py-3 text-xs text-slate-400">
                                                    <div className="flex items-center gap-2">
                                                        <ArrowRight size={12} className="text-slate-600" />
                                                        <span>Batch: {batch.id}</span>
                                                        <span className="text-[10px] font-mono opacity-50">({batch.acquisitionDate})</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-3 text-sm font-bold text-white text-right">{batch.quantity}</td>
                                                <td className="px-6 py-3 text-sm font-bold text-slate-400 text-right">₩{batch.unitCost?.toLocaleString() ?? '0'}</td>
                                                <td className="px-6 py-3 text-sm font-black text-white text-right">₩{(batch.quantity * batch.unitCost)?.toLocaleString() ?? '0'}</td>
                                            </tr>
                                        ))}
                                    </React.Fragment>
                                ))}
                                {(!inventory || inventory.length === 0) && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-20 text-center text-slate-500 font-bold">
                                            등록된 재고 품목이 없습니다.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. 감사 로그 */}
                <div className="space-y-4">
                    <h3 className="text-lg font-black text-white px-2 flex items-center gap-2">
                        <Zap size={18} className="text-amber-400" />
                        재고 자산 평가 감사 로그
                    </h3>
                    <div className="bg-[#151D2E] p-6 rounded-[2.5rem] border border-white/5 space-y-4 shadow-xl">
                        {summary?.valuationLogs && summary.valuationLogs.length > 0 ? (
                            summary.valuationLogs.map((log, idx) => (
                                <div key={idx} className={`p-4 rounded-2xl border text-xs font-bold leading-relaxed ${log.includes('감액') ? 'bg-rose-500/5 border-rose-500/10 text-rose-300' : 'bg-white/5 border-white/5 text-slate-400'
                                    }`}>
                                    {log}
                                </div>
                            ))
                        ) : (
                            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-500 italic text-center">
                                평가 로그가 없습니다.
                            </div>
                        )}
                        {summary?.adjustmentNeeded && summary.adjustmentNeeded > 0 && (
                            <div className="mt-6 p-4 bg-indigo-600 rounded-2xl text-white">
                                <p className="text-[10px] font-black uppercase mb-1">AI 경영 권고</p>
                                <p className="text-sm font-bold">평가손실 ₩{summary?.adjustmentNeeded?.toLocaleString() ?? '0'}원을 결산 전표에 반영해야 합니다.</p>
                                <button
                                    onClick={() => {
                                        if (!summary) return;
                                        const entry = {
                                            id: crypto.randomUUID(),
                                            date: new Date().toISOString().split('T')[0],
                                            description: `[AI 결산] 재고자산 저가법 평가손실 반영`,
                                            debitAccount: '재고자산평가손실',
                                            creditAccount: '재고자산평가충당금',
                                            amount: summary.adjustmentNeeded,
                                            vat: 0,
                                            type: 'Expense' as any,
                                            status: 'Unconfirmed' as any,
                                            taxCode: 'INVENTORY_LOSS' as any
                                        };
                                        addEntry(entry);
                                        alert('세무조정이 연동된 재고 감액 결산 전표가 생성되었습니다.');
                                    }}
                                    className="mt-3 w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-xs font-black transition-all"
                                >
                                    기말 결산 조정 전표 생성
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
