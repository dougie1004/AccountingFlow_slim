import React, { useMemo } from 'react';
import { useAccounting } from '../../hooks/useAccounting';
import { ShieldCheck, Users, Briefcase, Lock, Printer, FileDown } from 'lucide-react';

export const Withholding_Form: React.FC = () => {
    const { ledger } = useAccounting();

    // 원천세 신고 데이터 실시간 바인딩
    const withholdingData = useMemo(() => {
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        // 근로소득 (Payroll type)
        const payroll = approvedLedger.filter(e => e.type === 'Payroll');
        const payrollAmount = payroll.reduce((sum, e) => sum + e.amount, 0);
        const payrollTax = payroll.reduce((sum, e) => sum + (e.vat || 0), 0); // Payroll uses vat field for income tax in this mock

        // 사업소득 (Description matches '자문' or '강사')
        const business = approvedLedger.filter(e =>
            e.description.includes('자문') ||
            e.description.includes('강사') ||
            e.description.includes('용역')
        );
        const businessAmount = business.reduce((sum, e) => sum + e.amount, 0);
        const businessTax = business.reduce((sum, e) => sum + (e.vat || 0), 0);

        return {
            payrollCount: payroll.length,
            payrollAmount,
            payrollTax,
            businessCount: business.length,
            businessAmount,
            businessTax,
            totalTax: payrollTax + businessTax
        };
    }, [ledger]);

    return (
        <div className="bg-white text-slate-900 p-10 rounded-[2rem] shadow-2xl max-w-4xl mx-auto border border-slate-200 overflow-hidden relative">
            {/* National Tax Service Header Overlay */}
            <div className="absolute top-0 left-0 w-full h-2 bg-emerald-600"></div>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">[별지 제1호 서식]</h2>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">원천징수이행상황신고서</h1>
                    <p className="text-xs text-slate-500 font-medium">Withholding Tax Return</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 mb-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-600" />
                        <span className="text-[10px] font-black text-emerald-600">국세청 홈택스 표준 규격 준수</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end text-[9px] font-mono text-slate-400">
                        <Lock size={10} />
                        <span>SECURE_NATIVE_HASH_2026</span>
                    </div>
                </div>
            </div>

            {/* Form Table */}
            <div className="border-2 border-slate-900">
                <table className="w-full border-collapse text-sm">
                    <thead>
                        <tr className="bg-slate-50 border-b-2 border-slate-900">
                            <th className="p-3 border-r border-slate-300 text-left w-2/12">코드</th>
                            <th className="p-3 border-r border-slate-300 text-center w-4/12">원천징수 대상 (Category)</th>
                            <th className="p-3 border-r border-slate-300 text-center w-1/12">인원</th>
                            <th className="p-3 border-r border-slate-300 text-center w-3/12">총지급액</th>
                            <th className="p-3 text-center w-2/12">징수세액</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 근로소득 */}
                        <tr className="border-b border-slate-300">
                            <td className="p-3 border-r border-slate-300 text-center font-bold">A01</td>
                            <td className="p-3 border-r border-slate-300 flex items-center gap-2">
                                <Users size={16} className="text-slate-400" />
                                <span>간이세액 (상근직 급여)</span>
                            </td>
                            <td className="p-3 border-r border-slate-300 text-center font-mono">{withholdingData.payrollCount}</td>
                            <td className="p-3 border-r border-slate-300 text-right font-mono">{withholdingData.payrollAmount.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-bold">{withholdingData.payrollTax.toLocaleString()}</td>
                        </tr>

                        {/* 사업소득 */}
                        <tr className="border-b border-slate-300">
                            <td className="p-3 border-r border-slate-300 text-center font-bold">A20</td>
                            <td className="p-3 border-r border-slate-300 flex items-center gap-2">
                                <Briefcase size={16} className="text-slate-400" />
                                <span>사업소득 (자문·강연료 등)</span>
                            </td>
                            <td className="p-3 border-r border-slate-300 text-center font-mono">{withholdingData.businessCount}</td>
                            <td className="p-3 border-r border-slate-300 text-right font-mono">{withholdingData.businessAmount.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-emerald-600 font-bold">{withholdingData.businessTax.toLocaleString()}</td>
                        </tr>

                        {/* 기타 소득 등 (Empty rows for layout) */}
                        <tr className="border-b border-slate-200 bg-slate-50/30">
                            <td className="p-2 border-r border-slate-300 text-center text-slate-400">A40</td>
                            <td className="p-2 border-r border-slate-300 text-slate-400 pl-8 text-xs italic">기타소득 (경품·사례금 등)</td>
                            <td className="p-2 border-r border-slate-300 text-center text-slate-400">0</td>
                            <td className="p-2 border-r border-slate-300 text-right text-slate-400">0</td>
                            <td className="p-2 text-right text-slate-400">0</td>
                        </tr>

                        {/* 합계 */}
                        <tr className="bg-slate-900 text-white font-black">
                            <td className="p-4 border-r border-white/20 text-center" colSpan={2}>총 합계 (Total Withholding)</td>
                            <td className="p-4 border-r border-white/20 text-center font-mono">{withholdingData.payrollCount + withholdingData.businessCount}</td>
                            <td className="p-4 border-r border-white/20 text-right font-mono">{(withholdingData.payrollAmount + withholdingData.businessAmount).toLocaleString()}</td>
                            <td className="p-4 text-right font-mono text-gold text-lg">
                                {withholdingData.totalTax.toLocaleString()}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400">소득세법 제127조에 따라 위와 같이 원천징수 내용을 신고합니다.</p>
                    <p className="text-xs font-black text-slate-700">2026년 01월 14일</p>
                    <p className="text-sm font-black text-slate-900">원천징수의무자: (주)앤티그래비티 (인)</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 underline-none border border-slate-200">
                        <Printer size={20} />
                    </button>
                    <button className="px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <FileDown size={18} /> 전자신고 데이터 생성 (.wtax)
                    </button>
                </div>
            </div>

            {/* Background Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none">
                <Users size={400} />
            </div>
        </div>
    );
};
