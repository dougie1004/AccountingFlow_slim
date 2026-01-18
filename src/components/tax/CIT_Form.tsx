import React, { useMemo } from 'react';
import { useAccounting } from '../../hooks/useAccounting';
import { ShieldCheck, BarChart3, Calculator, Lock, Printer, Download, Users } from 'lucide-react';

export const CIT_Form: React.FC = () => {
    const { ledger, financials } = useAccounting();

    // 법인세 조정 데이터 실시간 바인딩
    const citData = useMemo(() => {
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        // 세무조정 사항 (Tax adjustments)
        const additions = approvedLedger.filter(e =>
            e.taxCode === 'PENALTY' ||
            e.taxCode === 'ENTERTAINMENT_NO_PROOF' ||
            e.taxCode === 'NON_DEDUCTIBLE'
        ).reduce((sum, e) => sum + e.amount, 0);

        // 상각비 등 기타 조정 (Simplified)
        const deductions = approvedLedger.filter(e =>
            e.taxCode === 'DEPRECIATION'
        ).reduce((sum, e) => sum + e.amount, 0) * 0.05; // 5% mock adjustment

        const taxableIncome = financials.netIncome + additions - deductions;

        // 법인세율 적용 (Simplified: 2억 이하 9% (2024기준 특례), 2억 초과 19%)
        let estimatedTax = 0;
        if (taxableIncome <= 200000000) {
            estimatedTax = taxableIncome * 0.09;
        } else {
            estimatedTax = (200000000 * 0.09) + ((taxableIncome - 200000000) * 0.19);
        }

        return {
            netIncome: financials.netIncome,
            additions,
            deductions,
            taxableIncome: Math.max(0, taxableIncome),
            estimatedTax: Math.max(0, estimatedTax)
        };
    }, [ledger, financials]);

    return (
        <div className="bg-white text-slate-900 p-10 rounded-[2rem] shadow-2xl max-w-4xl mx-auto border border-slate-200 overflow-hidden relative">
            {/* National Tax Service Header Overlay */}
            <div className="absolute top-0 left-0 w-full h-2 bg-slate-900"></div>

            {/* Expert Consultation Overlay */}
            <div className="absolute inset-x-0 top-[20%] z-10 flex flex-col items-center justify-center">
                <div className="bg-slate-900/95 backdrop-blur-md p-10 rounded-[2.5rem] border border-white/20 shadow-2xl space-y-6 text-center max-w-lg mx-auto">
                    <div className="w-20 h-20 bg-gold/20 rounded-full flex items-center justify-center mx-auto border border-gold/30">
                        <Users size={32} className="text-gold" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">법인세 전문 회계사 검토 필요</h3>
                        <p className="text-sm text-slate-400 font-bold mt-2">
                            법인세 신고는 기업의 특수한 세무조정 사항이 많아 전문가의 정밀 검토가 필수입니다.
                            AI Tech Corp 전담 회계법인과 연동하여 안전하게 신고하세요.
                        </p>
                    </div>
                    <button className="w-full py-4 bg-gold text-slate-950 font-black rounded-2xl hover:bg-[#D4AF37] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-2">
                        <Users size={18} /> 전담 KICPA 전문가 연결하기
                    </button>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                        AccountingFlow Prime: Expert Tax Verification Bridge
                    </p>
                </div>
            </div>

            {/* Blurred Background Form Content */}
            <div className="opacity-20 blur-sm pointer-events-none select-none">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h2 className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-tighter">[별지 제1호 서식]</h2>
                        <h1 className="text-2xl font-black tracking-tight text-slate-800">법인세 과세표준 및 세액조정계산서</h1>
                        <p className="text-xs text-slate-500 font-medium">Corporate Income Tax Return</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 mb-2">
                            <ShieldCheck className="w-4 h-4 text-slate-900" />
                            <span className="text-[10px] font-black text-slate-900">국세청 홈택스 표준 규격 준수</span>
                        </div>
                    </div>
                </div>

                {/* Form Table */}
                <div className="border-2 border-slate-900">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-slate-50 border-b-2 border-slate-900 font-bold">
                                <th className="p-3 border-r border-slate-300 text-left w-1/12">번호</th>
                                <th className="p-3 border-r border-slate-300 text-center w-6/12">항목 (Item)</th>
                                <th className="p-3 text-center w-5/12">금액 (Amount)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-300">
                                <td className="p-3 border-r border-slate-300 text-center font-bold">01</td>
                                <td className="p-3 border-r border-slate-300 pl-6">결산서상 당기순이익 (Net Income)</td>
                                <td className="p-3 text-right font-mono font-bold">{citData.netIncome.toLocaleString()}</td>
                            </tr>
                            <tr className="bg-slate-900 text-white font-black">
                                <td className="p-4 border-r border-white/20 text-center">20</td>
                                <td className="p-4 border-r border-white/20 pl-6">AI 예측 산출세액</td>
                                <td className="p-4 text-right font-mono text-gold text-2xl">
                                    {citData.estimatedTax.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div className="mt-8 grid grid-cols-2 gap-8 items-end">
                    <div className="space-y-1">
                        <p className="text-[10px] font-bold text-slate-400 text-justify">
                            본 서식은 AI 엔진에 의한 가계산 결과입니다. 반드시 세무 전문가의 검토를 거쳐야 법적 효력이 발생합니다.
                        </p>
                    </div>
                </div>
            </div>

            {/* Background Decor */}
            <div className="absolute top-10 right-10 opacity-[0.05] pointer-events-none">
                <Calculator size={300} />
            </div>
        </div>
    );
};
