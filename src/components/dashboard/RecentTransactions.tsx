import React from 'react';
import { JournalEntry } from '../../types';
import { ArrowUpRight, ArrowDownLeft, Clock } from 'lucide-react';

interface RecentTransactionsProps {
    transactions: JournalEntry[];
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ transactions }) => {
    return (
        <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <Clock size={20} />
                    </div>
                    <h3 className="text-lg font-black text-white">최근 거래 내역</h3>
                </div>
                <button className="text-xs font-bold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    전체 보기
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 -mr-2 space-y-3">
                {transactions.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <p className="text-sm font-bold">거래 내역이 없습니다</p>
                    </div>
                ) : (
                    transactions.map((t) => (
                        <div key={t.id} className="group flex items-center justify-between p-3 rounded-2xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                            <div className="flex items-center gap-4">
                                <div className={`p-2.5 rounded-xl ${t.type === 'Revenue' || t.debitAccount === 'Cash'
                                    ? 'bg-emerald-500/10 text-emerald-400'
                                    : 'bg-slate-500/10 text-slate-400'
                                    }`}>
                                    {t.type === 'Revenue' || t.debitAccount === 'Cash'
                                        ? <ArrowDownLeft size={18} />
                                        : <ArrowUpRight size={18} />
                                    }
                                </div>
                                <div className="min-w-0">
                                    <p className="font-bold text-white text-sm truncate">{t.description}</p>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-[10px] font-bold text-slate-400 bg-white/5 px-1.5 py-0.5 rounded text-xs truncate max-w-[120px]">
                                            {t.vendor || '내부 거래'}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-medium whitespace-nowrap">{t.date}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right shrink-0">
                                <p className={`font-black text-sm ${t.type === 'Revenue' || t.debitAccount === 'Cash'
                                    ? 'text-emerald-400'
                                    : 'text-white'
                                    }`}>
                                    {t.type === 'Revenue' || t.debitAccount === 'Cash' ? '+' : '-'}
                                    ₩{t.amount.toLocaleString()}
                                </p>
                                <span className={`text-[10px] font-bold uppercase tracking-wide ${t.status === 'Approved' ? 'text-indigo-400' : 'text-amber-500'
                                    }`}>
                                    {t.status === 'Approved' ? '완료' : '진행 중'}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
