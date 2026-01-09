import React from 'react';
import { AlertTriangle } from 'lucide-react';

export interface AdjustmentItem {
    category: string;
    bookAmount: number;
    taxAmount: number;
    difference: number;
    adjustmentType: string;
    disposal: string;
}

interface AdjustmentTableProps {
    items: AdjustmentItem[];
}

export const AdjustmentTable: React.FC<AdjustmentTableProps> = ({ items }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                    <tr>
                        <th className="px-4 py-3">과목 (Category)</th>
                        <th className="px-4 py-3 text-right">장부상 금액 (Book)</th>
                        <th className="px-4 py-3 text-right">세무상 금액 (Tax)</th>
                        <th className="px-4 py-3 text-right">세무조정 (Diff)</th>
                        <th className="px-4 py-3 text-center">조정 유형</th>
                        <th className="px-4 py-3">소득처분 (Disposal)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {items.length === 0 ? (
                        <tr>
                            <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-medium">
                                세무 조정 사항이 없습니다. (No adjustments found)
                            </td>
                        </tr>
                    ) : (
                        items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 font-bold text-slate-700">{item.category}</td>
                                <td className="px-4 py-3 text-right text-slate-600">₩{item.bookAmount.toLocaleString()}</td>
                                <td className="px-4 py-3 text-right text-slate-600">₩{item.taxAmount.toLocaleString()}</td>
                                <td className={`px-4 py-3 text-right font-bold ${item.difference > 0 ? 'text-rose-500' : 'text-blue-500'}`}>
                                    {item.difference > 0 ? '+' : ''}₩{item.difference.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`px-2 py-1 rounded-md text-xs font-bold border ${item.difference > 0
                                        ? 'bg-rose-50 text-rose-600 border-rose-100'
                                        : 'bg-blue-50 text-blue-600 border-blue-100'
                                        }`}>
                                        {item.adjustmentType}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-slate-600 font-medium flex items-center gap-2">
                                    {item.disposal}
                                    {(item.disposal.includes('Bonus') || item.disposal.includes('상여') || item.category.includes('Penalty')) && (
                                        <div className="group relative">
                                            <AlertTriangle size={16} className="text-orange-500 cursor-help" />
                                            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 w-48 p-2 bg-slate-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
                                                Audit Warning: High Tax Risk
                                                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
};
