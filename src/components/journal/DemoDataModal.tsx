import React from 'react';
import { X, Database, Check, AlertCircle } from 'lucide-react';
import { getRawMockData } from '../../utils/mockDataGenerator';

interface DemoDataModalProps {
    onClose: () => void;
    onLoad: () => void;
}

export const DemoDataModal: React.FC<DemoDataModalProps> = ({ onClose, onLoad }) => {
    const { bankData } = getRawMockData();

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                            <Database className="text-indigo-600" />
                            Demo Data Inspector
                        </h2>
                        <p className="text-slate-500 font-medium mt-1">
                            AccountingFlow 생성 데모 데이터 프리뷰 (총 {bankData.length} + @ 건)
                        </p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
                    {/* Section 1: Bank Data */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-6 bg-emerald-500 rounded-sm"></span>
                            <h3 className="text-lg font-bold text-slate-800">1. Bank Statement Scenarios</h3>
                        </div>
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-100/50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                                    <tr>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Description</th>
                                        <th className="px-6 py-4 text-right">In (Deposit)</th>
                                        <th className="px-6 py-4 text-right">Out (Withdrawal)</th>
                                        <th className="px-6 py-4">Type Hint</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                                    {bankData.map((row: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-white transition-colors">
                                            <td className="px-6 py-4">{row.date}</td>
                                            <td className="px-6 py-4 font-bold text-slate-900">{row.desc}</td>
                                            <td className="px-6 py-4 text-right text-emerald-600">{row.in > 0 ? `₩${row.in.toLocaleString()}` : '-'}</td>
                                            <td className="px-6 py-4 text-right text-rose-500">{row.out > 0 ? `₩${row.out.toLocaleString()}` : '-'}</td>
                                            <td className="px-6 py-4">
                                                <span className="bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md text-xs font-bold border border-indigo-100">
                                                    {row.type}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Section 2: Other generated data info */}
                    <div className="p-6 bg-indigo-50 rounded-2xl border border-indigo-100 flex gap-4">
                        <AlertCircle className="text-indigo-600 shrink-0" />
                        <div className="space-y-2">
                            <h3 className="font-bold text-indigo-900">Additional Auto-Generated Data</h3>
                            <p className="text-indigo-700 text-sm">
                                위 데이터 외에도 <b>매입(Purchase) 20건</b>, <b>매출(Sales) 20건</b>의 거래가
                                랜덤 날짜와 금액으로 생성되어 총 45+건의 예제 데이터가 로드됩니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 shrink-0 rounded-b-[2rem]">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 rounded-xl transition-all"
                    >
                        취소 (Cancel)
                    </button>
                    <button
                        onClick={() => { onLoad(); onClose(); }}
                        className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center gap-2 transition-all active:scale-95"
                    >
                        <Check size={18} />
                        Load to Ledger
                    </button>
                </div>
            </div>
        </div>
    );
};
