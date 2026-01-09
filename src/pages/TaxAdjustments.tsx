import React, { useEffect, useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { WaterfallChart } from '../components/tax/WaterfallChart';
import { AdjustmentTable, AdjustmentItem } from '../components/tax/AdjustmentTable';
import { Calculator, Download, ArrowRight, TrendingUp, ShieldCheck, FileText, AlertTriangle, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ValidationResult } from '../types';

export const TaxAdjustments: React.FC = () => {
    const { ledger, financials, processBulkTax, loadSimulation } = useAccounting();
    const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);

    useEffect(() => {
        const fetchAdjustments = async () => {
            setIsLoading(true);
            try {
                // Adjustments are now fetched via a dedicated command that returns the correct type
                const result = await invoke<AdjustmentItem[]>('get_tax_adjustments', { ledger });
                setAdjustments(result);
            } catch (error) {
                console.error("Failed to fetch tax adjustments:", error);
            } finally {
                setIsLoading(false);
            }
        };

        if (ledger.length > 0) {
            fetchAdjustments();
        }
    }, [ledger]);

    const waterfallData = useMemo(() => {
        const totalAdj = adjustments.reduce((acc, cur) => acc + cur.difference, 0);
        const taxableIncome = financials.netIncome + totalAdj;

        const data = [
            { name: 'Net Income', value: financials.netIncome, type: 'start' as const },
            ...adjustments.map(adj => ({
                name: adj.category,
                value: adj.difference,
                type: adj.difference >= 0 ? 'plus' as const : 'minus' as const
            })),
            { name: 'Taxable Income', value: taxableIncome, type: 'end' as const }
        ];

        return data;
    }, [financials.netIncome, adjustments]);

    const handleExportAudit = async () => {
        try {
            const snapshot = await invoke('create_snapshot', { ledger, adjustments });
            const fileName = `audit_package_${new Date().toISOString().split('T')[0]}.json`;

            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            alert(`Audit Package Exported!\nHash: ${(snapshot as any).integrityHash}`);
        } catch (e) {
            console.error(e);
            alert('Export failed');
        }
    };

    const handleGenerateFiling = async () => {
        try {
            const snapshot = await invoke('create_snapshot', { ledger, adjustments });
            const mockConfig = {
                tenantId: 'demo-tenant',
                isReadOnly: false,
                entityMetadata: {
                    companyName: '(주)앤티그래비티',
                    regId: '123-45-67890',
                    repName: '김철수',
                    corpType: 'SME',
                    fiscalYearEnd: '12-31',
                    isStartupTaxBenefit: false
                }
            };

            const xmlContent = await invoke('generate_filing', { snapshot, config: mockConfig });

            const fileName = `tax_filing_${new Date().toISOString().split('T')[0]}.xml`;
            const blob = new Blob([xmlContent as string], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            alert('Tax Filing File (XML) Generated Successfully!');
        } catch (e) {
            console.error(e);
            alert('Filing Generation Failed: ' + e);
        }
    };

    const handleRunValidation = async () => {
        try {
            const snapshot = await invoke('create_snapshot', { ledger, adjustments });
            // Mock config until we have global context
            const mockConfig = {
                tenantId: 'demo', isReadOnly: false,
                entityMetadata: {
                    companyName: 'Demo Corp',
                    regId: '123-456-7890',
                    repName: 'CEO',
                    corpType: 'SME',
                    fiscalYearEnd: '12-31',
                    isStartupTaxBenefit: true
                }
            };
            const results = await invoke<ValidationResult[]>('run_validation_checks', { snapshot, config: mockConfig });
            setValidationResults(results);

            if (results.some(r => r.status === 'Critical')) {
                alert('Critical Validation Errors Found! Please fix before filing.');
            } else {
                alert('Validation Passed or only Warnings found.');
            }
        } catch (e) {
            console.error(e);
            alert('Validation Failed: ' + e);
        }
    };

    const hasCriticalErrors = validationResults.some(r => r.status === 'Critical');

    return (
        <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-rose-500/10 rounded-lg">
                            <Calculator className="w-4 h-4 md:w-5 md:h-5 text-rose-400" />
                        </div>
                        <h2 className="text-[10px] md:text-sm font-black text-rose-400 uppercase tracking-wider">법인세 산출 및 세무 조정 엔진</h2>
                    </div>
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        AI 세무 조정 (Tax Bridge)
                    </h2>
                    <p className="text-xs md:text-sm text-slate-400 font-bold mt-2 ml-1">
                        기업회계기준(GAAP) 이익을 세무회계상 과세소득으로 자동 전환합니다.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2 md:gap-3">
                    <button
                        className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-[#151D2E] border border-white/10 rounded-xl text-xs md:text-sm font-bold transition-all shadow-lg active:scale-95 ${hasCriticalErrors ? 'opacity-50 cursor-not-allowed text-slate-500' : 'text-white hover:border-indigo-500 hover:text-indigo-400'}`}
                        disabled={hasCriticalErrors}
                        onClick={handleGenerateFiling}
                    >
                        <FileText size={16} />
                        전자신고
                    </button>
                    <button
                        onClick={handleRunValidation}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-xs md:text-sm font-bold text-indigo-400 hover:bg-indigo-500/20 transition-all shadow-lg active:scale-95"
                    >
                        <ShieldCheck size={16} />
                        적정성 검토
                    </button>
                    <button
                        onClick={processBulkTax}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs md:text-sm font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95 border border-rose-500/50"
                    >
                        <Sparkles size={16} />
                        AI 부가세 최적화
                    </button>
                    <button
                        onClick={handleExportAudit}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-slate-900 rounded-xl text-xs md:text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-xl active:scale-95 border border-white/5"
                    >
                        <ShieldCheck size={16} className="text-emerald-400" />
                        감사 패키지
                    </button>
                    {ledger.length === 0 && (
                        <button
                            onClick={async () => {
                                const simData = await invoke<any>('run_simulation_data');
                                loadSimulation(simData);
                            }}
                            className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-6 py-2.5 rounded-xl text-xs font-black hover:shadow-lg hover:shadow-indigo-500/30 transition-all active:scale-95 flex items-center gap-2 border border-white/10"
                        >
                            <Sparkles size={14} className="animate-pulse" />
                            시뮬레이션 데이터 로드
                        </button>
                    )}
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-3">
                    {validationResults.length > 0 && (
                        <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5 mb-6 animate-in slide-in-from-top-4">
                            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                <ShieldCheck size={20} className={hasCriticalErrors ? "text-rose-400" : "text-emerald-400"} />
                                전자신고 전 유효성 검사 리포트
                            </h3>
                            <div className="space-y-3">
                                {validationResults.map((res, idx) => (
                                    <div key={idx} className={`p-4 rounded-xl flex items-start gap-3 border ${res.status === 'Critical' ? 'bg-rose-500/10 border-rose-500/20 text-rose-300' :
                                        res.status === 'Warning' ? 'bg-amber-500/10 border-amber-500/20 text-amber-300' :
                                            'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                                        }`}>
                                        <div className="mt-0.5">
                                            {res.status === 'Critical' ? <XCircle size={18} /> :
                                                res.status === 'Warning' ? <AlertTriangle size={18} /> :
                                                    <CheckCircle size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-xs uppercase tracking-wide opacity-80">{res.status === 'Critical' ? '치명적 오류' : res.status === 'Warning' ? '주의' : '정상'}</p>
                                            <p className="font-bold">{res.message}</p>
                                            {res.field && <p className="text-xs mt-1 opacity-70">대상 항목: {res.field}</p>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Left: Waterfall Chart */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <TrendingUp size={20} className="text-slate-500" />
                            과세소득 산출 경로 분석
                        </h3>
                        <WaterfallChart data={waterfallData} />
                    </div>

                    <div className="bg-[#151D2E] p-6 rounded-[2rem] shadow-2xl border border-white/5">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white">세부 조정 내역 리스트</h3>
                            <span className="text-xs font-bold bg-white/5 text-slate-400 px-3 py-1 rounded-full border border-white/5">AI 자동 분석</span>
                        </div>
                        <div className="text-slate-300">
                            <AdjustmentTable items={adjustments} />
                        </div>
                    </div>
                </div>

                {/* Right: Summary Card & AI Insight */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-[#151D2E] to-[#070C18] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
                        <div className="relative z-10 space-y-8">
                            <div>
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">회계상 당기순이익 (GAAP)</p>
                                <p className="text-3xl font-black">₩{financials.netIncome.toLocaleString()}</p>
                            </div>

                            <div className="flex items-center gap-4 text-rose-300">
                                <div className="p-2 bg-white/10 rounded-full">
                                    <ArrowRight size={20} />
                                </div>
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-wider opacity-80">총 세무 조정액</p>
                                    <p className="text-xl font-bold">
                                        {adjustments.length > 0 ? (
                                            adjustments.reduce((acc, c) => acc + c.difference, 0) > 0 ? '+' : ''
                                        ) : ''}
                                        ₩{adjustments.reduce((acc, c) => acc + c.difference, 0).toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10">
                                <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-1">최종 과세 대상 소득</p>
                                <p className="text-4xl font-black text-white">₩{(financials.netIncome + adjustments.reduce((acc, c) => acc + c.difference, 0)).toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
                        <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none"></div>
                    </div>

                    {/* AI Tax Insight Section */}
                    <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 shadow-2xl space-y-4">
                        <div className="flex items-center gap-2">
                            <Sparkles size={18} className="text-amber-400" />
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">AI Tax Insight</h4>
                        </div>
                        <div className="space-y-3">
                            <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20">
                                <p className="text-xs font-bold text-amber-400 mb-1">💡 절세 팁</p>
                                <p className="text-xs text-amber-100 font-bold leading-relaxed">기업부설연구소 설립을 통해 연구인력개발비 세액공제를 검토해 보세요. 현재 비용 구조상 약 ₩2,500,000 절세가 가능합니다.</p>
                            </div>
                            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                                <p className="text-xs font-bold text-indigo-400 mb-1">📊 위험 지수</p>
                                <div className="flex items-center justify-between text-xs font-black text-white px-1">
                                    <span>낮음 (Safe)</span>
                                    <span className="text-indigo-400">12%</span>
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full mt-2 overflow-hidden">
                                    <div className="bg-indigo-500 h-full w-[12%] rounded-full"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
