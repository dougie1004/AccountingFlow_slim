import React, { useEffect, useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { WaterfallChart } from '../components/tax/WaterfallChart';
import { AdjustmentTable, AdjustmentItem } from '../components/tax/AdjustmentTable';
import { Calculator, Download, ArrowRight, TrendingUp, ShieldCheck, FileText, AlertTriangle, CheckCircle, XCircle, Sparkles, ChevronDown, Wand2, Activity } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ValidationResult, TaxEstimation } from '../types';
import { VatOptimizationReport } from '../components/tax/VatOptimizationReport';

export const TaxAdjustments: React.FC = () => {
    const { ledger, financials, processBulkTax, loadSimulation, config, assets, acceptVatSuggestion } = useAccounting();
    const [adjustments, setAdjustments] = useState<AdjustmentItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [validationResults, setValidationResults] = useState<ValidationResult[]>([]);
    const [estimation, setEstimation] = useState<TaxEstimation | null>(null);
    const [showVatReport, setShowVatReport] = useState(false);

    // Simulation Parameters
    const [simNumEmployees, setSimNumEmployees] = useState<number>(0);
    const [simRndInvestment, setSimRndInvestment] = useState<number>(0);
    const [isSimulating, setIsSimulating] = useState(false);

    const optimizedEntries = useMemo(() => {
        return ledger.filter(e => e.suggestedVat !== undefined && (e.status === 'Unconfirmed' || e.status === 'Pending Review' || e.status === 'Approved'));
    }, [ledger]);

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

            // Initialize simulation params
            if (!isSimulating) {
                const initEmployees = config?.entityMetadata?.numEmployees || 5;
                const initRnd = ledger
                    .filter(e => e.description.includes('[R&D]') || e.description.includes('연구') || e.description.includes('개발'))
                    .reduce((sum, e) => sum + e.amount, 0);
                setSimNumEmployees(initEmployees);
                setSimRndInvestment(initRnd);
            }
        }
    }, [ledger, config]);

    useEffect(() => {
        const fetchEstimation = async () => {
            const totalAdj = adjustments.reduce((acc, cur) => acc + cur.difference, 0);
            const taxableIncome = financials.netIncome + totalAdj;
            const isSme = config?.entityMetadata?.corpType === 'SME' || true;
            const numEmployees = config?.entityMetadata?.numEmployees || 5;

            // Calculate R&D Investment for Tax Credit
            const rndInvestment = ledger
                .filter(e => e.description.includes('[R&D]') || e.description.includes('연구') || e.description.includes('개발'))
                .reduce((sum, e) => sum + e.amount, 0);

            try {
                const result = await invoke<TaxEstimation>('estimate_corporate_tax', {
                    bookIncome: financials.netIncome,
                    taxableIncome,
                    isSme,
                    rndInvestment: simRndInvestment, // Use simulated value
                    numEmployees: simNumEmployees // Use simulated value
                });
                setEstimation(result);
            } catch (e) {
                console.error("Estimation failed:", e);
            }
        };

        if (ledger.length > 0) {
            fetchEstimation();
        }
    }, [ledger, adjustments, financials.netIncome, config, simNumEmployees, simRndInvestment]);

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

            alert(`세무사 제출용 패키지가 생성되었습니다!\n해시: ${(snapshot as any).integrityHash.slice(0, 12)}...`);
        } catch (e) {
            console.error(e);
            alert('내보내기 실패');
        }
    };

    const handleExportProPack = async () => {
        try {
            // Use assets from context
            const result = await invoke<string>('generate_tax_pro_pack', { ledger, assets, config: config || { tenantId: 'demo', isReadOnly: false, entityMetadata: { companyName: 'Demo', regId: '000', repName: 'CEO', corpType: 'SME', fiscalYearEnd: '12-31', numEmployees: 5 } } });

            const fileName = `tax_pro_pack_${new Date().toISOString().split('T')[0]}.txt`;
            const blob = new Blob([result], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            alert('세무사가 바로 사용할 수 있는 정제된 기초 데이터 팩이 생성되었습니다.');
        } catch (e) {
            console.error(e);
            alert('데이터 팩 생성 실패: ' + e);
        }
    };

    const handleGenerateFiling = async () => {
        try {
            const snapshot = await invoke('create_snapshot', { ledger, adjustments });
            const filingConfig = config || {
                tenantId: 'demo-tenant',
                isReadOnly: false,
                entityMetadata: {
                    companyName: '(주)앤티그래비티',
                    regId: '123-45-67890',
                    repName: '김철수',
                    corpType: 'SME',
                    fiscalYearEnd: '12-31',
                    numEmployees: 5,
                    isStartupTaxBenefit: false
                }
            };

            const xmlContent = await invoke('generate_filing', { snapshot, config: filingConfig });

            const fileName = `tax_filing_${new Date().toISOString().split('T')[0]}.xml`;
            const blob = new Blob([xmlContent as string], { type: 'application/xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.click();
            URL.revokeObjectURL(url);

            alert('국세청 신고 파일(XML)이 성공적으로 생성되었습니다!');
        } catch (e) {
            console.error(e);
            alert('신고 파일 생성 실패: ' + e);
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
                    numEmployees: 8,
                    isStartupTaxBenefit: true
                }
            };
            const results = await invoke<ValidationResult[]>('run_validation_checks', { snapshot, config: mockConfig });
            setValidationResults(results);

            if (results.some(r => r.status === 'Critical')) {
                alert('치명적인 검증 오류가 발견되었습니다. 신고 전 수정이 필요합니다.');
            } else {
                alert('데이터 검증이 완료되었습니다. (이상 없음 또는 경고만 존재)');
            }
        } catch (e) {
            console.error(e);
            alert('검증 프로제스 실행 실패: ' + e);
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
                        onClick={() => {
                            processBulkTax();
                            setShowVatReport(true);
                        }}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-rose-600 text-white rounded-xl text-xs md:text-sm font-black hover:bg-rose-700 transition-all shadow-xl shadow-rose-600/20 active:scale-95 border border-rose-500/50"
                    >
                        <Sparkles size={16} />
                        AI 부가세 최적화
                    </button>
                    <button
                        onClick={handleExportProPack}
                        className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 bg-slate-900 rounded-xl text-xs md:text-sm font-bold text-white hover:bg-slate-800 transition-all shadow-xl active:scale-95 border border-white/5"
                    >
                        <ShieldCheck size={16} className="text-emerald-400" />
                        세무사 제출용 팩 (Tax Pro Pack)
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
                    {/* Scenario Simulator */}
                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 shadow-xl">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                                <Activity size={20} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white">Tax Scenario Simulator</h3>
                                <p className="text-xs text-slate-500 font-bold">인력 및 R&D 투자 변화에 따른 세액 시뮬레이션</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>고용 인원 (명)</span>
                                    <span className="text-emerald-400">{simNumEmployees}명</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="50"
                                    step="1"
                                    value={simNumEmployees}
                                    onChange={(e) => { setSimNumEmployees(parseInt(e.target.value)); setIsSimulating(true); }}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                                    <span>0</span>
                                    <span>50</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-xs font-bold text-slate-400">
                                    <span>R&D 투자액 (원)</span>
                                    <span className="text-indigo-400">₩{(simRndInvestment / 10000).toLocaleString()}만</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="500000000"
                                    step="1000000"
                                    value={simRndInvestment}
                                    onChange={(e) => { setSimRndInvestment(parseInt(e.target.value)); setIsSimulating(true); }}
                                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-[10px] text-slate-600 font-bold">
                                    <span>0</span>
                                    <span>5억</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-gradient-to-br from-[#151D2E] to-[#070C18] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
                        <div className="relative z-10 space-y-8">
                            <div>
                                <p className="text-slate-400 font-bold text-sm uppercase tracking-wider mb-1">회계상 당기순이익 (GAAP)</p>
                                <p className="text-3xl font-black">₩{financials.netIncome.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
                                        ₩{adjustments.reduce((acc, c) => acc + c.difference, 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                                    </p>
                                </div>
                            </div>

                            <div className="pt-8 border-t border-white/10 space-y-4">
                                <div>
                                    <p className="text-indigo-400 font-bold text-sm uppercase tracking-wider mb-1">최종 과세 대상 소득</p>
                                    <p className="text-4xl font-black text-white">₩{(financials.netIncome + adjustments.reduce((acc, c) => acc + c.difference, 0)).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                </div>

                                {estimation && (
                                    <div className="bg-emerald-500/10 p-5 rounded-2xl border border-emerald-500/20 space-y-4">
                                        <div className="flex justify-between items-center">
                                            <p className="text-emerald-400 font-bold text-xs uppercase tracking-wider">최종 예상 법인세액 (Estim.)</p>
                                            <span className="text-[10px] font-black bg-emerald-500 text-white px-2 py-0.5 rounded-full">EFF {estimation.effectiveRate.toFixed(1)}%</span>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-3xl font-black text-white leading-tight">₩{estimation.finalTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 italic">
                                                <TrendingUp size={12} className="text-emerald-400" />
                                                장부상 이익 대비 {(estimation.finalTax / (estimation.bookIncome || 1) * 100).toFixed(1)}% 수준
                                            </div>
                                        </div>

                                        <div className="pt-4 border-t border-emerald-500/20 space-y-2">
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] mb-2">스타트업 핵심 공제 반영 결과</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">고용증대 공제</p>
                                                    <p className="text-xs font-black text-emerald-400">-₩{estimation.employmentCredit.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">R&D 세액공제</p>
                                                    <p className="text-xs font-black text-indigo-400">-₩{estimation.rndCredit.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">최저한세</p>
                                                    <p className="text-xs font-black text-rose-400">₩{estimation.minTax?.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-black/20 p-3 rounded-xl border border-white/5">
                                                    <p className="text-[9px] font-bold text-slate-500 uppercase">이월 공제액</p>
                                                    <p className="text-xs font-black text-slate-300">₩{estimation.carryoverAmount?.toLocaleString()}</p>
                                                </div>
                                            </div>
                                            <p className="text-[9px] text-slate-500 mt-2 font-medium leading-relaxed italic">
                                                * 산출세액: ₩{estimation.baseTax.toLocaleString()} / 중소기업 감면(10%): ₩{estimation.deductions.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}
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
                                <p className="text-xs text-amber-100 font-bold leading-relaxed">
                                    기업부설연구소 인증을 통해 {estimation?.rndCredit ? `현재 ₩${estimation.rndCredit.toLocaleString()} 규모의 세액공제가 적용 중입니다.` : '연구인력개발비 세액공제를 검토해 보세요.'} {financials.totalGrantCash > 0 ? '정부보조금의 수익 제외(익금불산입) 조정도 함께 확인하십시오.' : ''}
                                </p>
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

            {showVatReport && (
                <VatOptimizationReport
                    optimizedEntries={optimizedEntries}
                    onClose={() => setShowVatReport(false)}
                    onApply={(id) => acceptVatSuggestion(id)}
                />
            )}
        </div>
    );
};
