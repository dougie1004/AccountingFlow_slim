import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, TrendingDown, DollarSign, Calculator } from 'lucide-react';
import { Asset, AssetSchedule } from '../../types';
import { invoke } from '@tauri-apps/api/core';

interface DepreciationScheduleModalProps {
    asset: Asset;
    onClose: () => void;
}

export const DepreciationScheduleModal: React.FC<DepreciationScheduleModalProps> = ({ asset, onClose }) => {
    const [schedule, setSchedule] = useState<AssetSchedule | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSchedule = async () => {
            try {
                const result = await invoke<AssetSchedule>('get_depreciation_schedule', { asset });
                setSchedule(result);
            } catch (error) {
                console.error('Failed to fetch depreciation schedule:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSchedule();
    }, [asset]);

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('ko-KR', {
            style: 'currency',
            currency: 'KRW',
        }).format(value);
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#151D2E] border border-white/10 rounded-[2.5rem] shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black text-white">{asset.name} 감가상각 스케줄</h3>
                                <p className="text-slate-400 text-sm font-medium">
                                    {asset.depreciationMethod === 'STRAIGHT_LINE' ? '정액법' : '정률법'} • {asset.usefulLife}년 • 취득원가 {formatCurrency(asset.cost)}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-3 hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                                <p className="text-slate-400 font-bold">스케줄을 계산 중입니다...</p>
                            </div>
                        ) : schedule ? (
                            <div className="space-y-6">
                                {/* Summary stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 text-indigo-400 mb-2">
                                            <Calendar size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">총 기간</span>
                                        </div>
                                        <p className="text-2xl font-black text-white">{asset.usefulLife} Years</p>
                                    </div>
                                    <div className="bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 text-emerald-400 mb-2">
                                            <DollarSign size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">잔존 가액</span>
                                        </div>
                                        <p className="text-2xl font-black text-white">{formatCurrency(asset.residualValue)}</p>
                                    </div>
                                    <div className="bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                                        <div className="flex items-center gap-2 text-rose-400 mb-2">
                                            <TrendingDown size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">총 상각대상액</span>
                                        </div>
                                        <p className="text-2xl font-black text-white">{formatCurrency(asset.cost - asset.residualValue)}</p>
                                    </div>
                                </div>

                                {/* Table */}
                                <div className="bg-[#0B1221] border border-white/5 rounded-2xl overflow-hidden">
                                    <table className="w-full text-left">
                                        <thead>
                                            <tr className="border-b border-white/5 bg-white/5">
                                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-center">회차</th>
                                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">기초 가액</th>
                                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">상각비</th>
                                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">상각 누계</th>
                                                <th className="px-6 py-4 text-xs font-black text-slate-500 uppercase tracking-widest text-right">기말 가액</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {schedule.items.map((item, idx) => (
                                                <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="text-slate-500 font-mono text-xs">{item.period}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-slate-400 font-medium text-sm">{formatCurrency(item.beginningValue)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-indigo-400 font-black text-sm">{formatCurrency(item.depreciationExpense)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-rose-500/70 font-medium text-sm">{formatCurrency(item.accumulatedDepreciation)}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <span className="text-emerald-400 font-black text-sm">{formatCurrency(item.endingValue)}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-20">
                                <p className="text-rose-400 font-bold">스케줄 데이터를 불러올 수 없습니다.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-8 border-t border-white/5 bg-[#0B1221]/50">
                        <button
                            onClick={onClose}
                            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 active:scale-[0.98]"
                        >
                            닫기
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};
