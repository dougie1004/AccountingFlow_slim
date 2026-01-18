import React, { useMemo } from 'react';
import { useAccounting } from '../../hooks/useAccounting';
import { ShieldCheck, Printer, Download, Lock } from 'lucide-react';

export const VAT_Form: React.FC = () => {
    const { ledger } = useAccounting();

    // 부가세 신고 데이터 실시간 바인딩
    const vatData = useMemo(() => {
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        // 매출 (Output VAT)
        const sales = approvedLedger.filter(e => e.type === 'Revenue');
        const salesAmount = sales.reduce((sum, e) => sum + e.amount, 0);
        const salesVat = sales.reduce((sum, e) => sum + (e.vat || 0), 0);

        // 매입 (Input VAT)
        const purchases = approvedLedger.filter(e => e.type === 'Expense' || e.type === 'Asset');
        const purchaseAmount = purchases.reduce((sum, e) => sum + e.amount, 0);
        const purchaseVat = purchases.reduce((sum, e) => sum + (e.vat || 0), 0);

        return {
            salesCount: sales.length,
            salesAmount,
            salesVat,
            purchaseCount: purchases.length,
            purchaseAmount,
            purchaseVat,
            netVat: salesVat - purchaseVat
        };
    }, [ledger]);

    return (
        <div className="bg-white text-slate-900 p-10 rounded-[2rem] shadow-2xl max-w-4xl mx-auto border border-slate-200 overflow-hidden relative">
            {/* National Tax Service Header Overlay */}
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>

            <div className="flex justify-between items-start mb-8">
                <div>
                    <h2 className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">[별지 제21호 서식]</h2>
                    <h1 className="text-2xl font-black tracking-tight text-slate-800">부가가치세 신고서 (일반과세자용)</h1>
                    <p className="text-xs text-slate-500 font-medium">VAT Return Form (Standard Taxpayer)</p>
                </div>
                <div className="text-right">
                    <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 mb-2">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span className="text-[10px] font-black text-indigo-600">국세청 홈택스 표준 규격 준수</span>
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
                            <th className="p-3 border-r border-slate-300 text-left w-1/12">구분</th>
                            <th className="p-3 border-r border-slate-300 text-center w-5/12">내용 (Category)</th>
                            <th className="p-3 border-r border-slate-300 text-center w-3/12">금액 (Amount)</th>
                            <th className="p-3 text-center w-3/12">세액 (Tax)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {/* 과세표준 및 매출세액 */}
                        <tr className="bg-slate-100/50 font-bold border-b border-slate-900">
                            <td className="p-3 border-r border-slate-300 text-center">매출</td>
                            <td className="p-3 border-r border-slate-300">과세표준 및 매출세액합계 ({vatData.salesCount}건)</td>
                            <td className="p-3 border-r border-slate-300 text-right font-mono">{vatData.salesAmount.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-indigo-600">{vatData.salesVat.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <td className="p-2 border-r border-slate-300 text-center text-xs opacity-50">1</td>
                            <td className="p-2 border-r border-slate-300 text-xs text-slate-600 pl-6">과세 세금계산서 발급분</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono text-xs">{vatData.salesAmount.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-xs">{(vatData.salesVat).toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <td className="p-2 border-r border-slate-300 text-center text-xs opacity-50">2</td>
                            <td className="p-2 border-r border-slate-300 text-xs text-slate-600 pl-6">매입자발행 세금계산서 / 기타</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono text-xs">0</td>
                            <td className="p-2 text-right font-mono text-xs">0</td>
                        </tr>

                        {/* 매입세액 */}
                        <tr className="bg-slate-100/50 font-bold border-b border-slate-900">
                            <td className="p-3 border-r border-slate-300 text-center">매입</td>
                            <td className="p-3 border-r border-slate-300">매입세액 합계 ({vatData.purchaseCount}건)</td>
                            <td className="p-3 border-r border-slate-300 text-right font-mono text-slate-500">{vatData.purchaseAmount.toLocaleString()}</td>
                            <td className="p-3 text-right font-mono text-rose-600">{vatData.purchaseVat.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                            <td className="p-2 border-r border-slate-300 text-center text-xs opacity-50">10</td>
                            <td className="p-2 border-r border-slate-300 text-xs text-slate-600 pl-6">세금계산서 수취분 (일반매입)</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono text-xs">{vatData.purchaseAmount.toLocaleString()}</td>
                            <td className="p-2 text-right font-mono text-xs">{vatData.purchaseVat.toLocaleString()}</td>
                        </tr>
                        <tr className="border-b border-slate-200 text-slate-400 italic">
                            <td className="p-2 border-r border-slate-300 text-center text-[10px] opacity-50">14</td>
                            <td className="p-2 border-r border-slate-300 text-[10px] pl-6">그 밖의 공제매입세액</td>
                            <td className="p-2 border-r border-slate-300 text-right font-mono text-xs">0</td>
                            <td className="p-2 text-right font-mono text-xs">0</td>
                        </tr>

                        {/* 최종 납부세액 */}
                        <tr className="bg-slate-900 text-white font-black">
                            <td className="p-4 border-r border-white/20 text-center">결과</td>
                            <td className="p-4 border-r border-white/20">차감납부할 세액 (Payment / Refund)</td>
                            <td className="p-4 border-r border-white/20 text-right font-mono">---</td>
                            <td className="p-4 text-right font-mono text-gold text-lg">
                                {vatData.netVat > 0 ? `납부: ${vatData.netVat.toLocaleString()}` : `환급: ${Math.abs(vatData.netVat).toLocaleString()}`}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-8 flex justify-between items-end">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400">국세기본법 제21조에 따라 위와 같이 신고합니다.</p>
                    <p className="text-xs font-black text-slate-700">2026년 01월 14일</p>
                    <p className="text-sm font-black text-slate-900">신고인: (주)앤티그래비티 (인)</p>
                </div>
                <div className="flex gap-2">
                    <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200">
                        <Download size={20} />
                    </button>
                    <button className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200">
                        <Printer size={20} />
                    </button>
                    <button className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-lg active:scale-95 flex items-center gap-2">
                        <Download size={18} /> 국세청 신고 파일 생성 (.vtax)
                    </button>
                </div>
            </div>

            {/* Background Watermark */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.03] pointer-events-none rotate-[-30deg]">
                <ShieldCheck size={400} />
            </div>
        </div>
    );
};
