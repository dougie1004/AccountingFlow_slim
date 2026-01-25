import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    ArrowRight,
    Calculator,
    CheckCircle2,
    Sparkles,
    FileText,
    Zap,
    Download,
    TrendingDown,
    Activity,
    Lock,
    Search,
    HelpCircle
} from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { invoke } from '@tauri-apps/api/core';
import { ManagementReport } from '../types';
import { Tooltip } from '../components/common/Tooltip';
import { formatCLevel } from '../utils/formatUtils';

export const Reports: React.FC = () => {
    const context = useAccounting() as any;
    const { financials, ledger, inventory, assets } = context;
    const [report, setReport] = useState<ManagementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showNewAssetScenario, setShowNewAssetScenario] = useState(false);

    const {
        revenue, expenses, netIncome, cash, ar, ap, fixedAssets, vatNet, capital, retainedEarnings
    } = financials;

    const totalAssets = cash + ar + fixedAssets + (vatNet < 0 ? -vatNet : 0);
    const totalLiabilities = ap + (vatNet > 0 ? vatNet : 0);
    const totalEquity = capital + retainedEarnings;

    const handleGenerateAIReport = async () => {
        setIsGenerating(true);
        if (!(window as any).__TAURI_INTERNALS__) {
            const rndExpense = ledger
                .filter((e: any) => e.description.includes('R&D') || e.description.includes('연구'))
                .reduce((sum: number, e: any) => sum + e.amount, 0);
            const estTaxCredit = rndExpense * 0.25;

            await new Promise(r => setTimeout(r, 2500));
            const mockReport: ManagementReport = {
                reportTitle: "2026년 1월 전략 재무 인사이트 (Executive Briefing)",
                reportDate: new Date().toISOString().split('T')[0],
                executiveSummary: `현재 그룹의 재무 구조는 ₩${(revenue / 1000000).toFixed(1)}M 규모의 매출 성장 하에 안정적인 유동성을 확보하고 있습니다. 특히 AI 거버넌스 엔진이 감지한 비용 절감 기회와 법인세 ${((estTaxCredit / 10000)).toLocaleString()}만원 규모의 R&D 세액공제 최적화가 가능할 것으로 분석됩니다.`,
                financialOverview: {
                    totalRevenue: revenue,
                    totalExpenses: expenses,
                    netIncome: netIncome,
                    profitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
                    topExpenseCategories: [
                        { category: "인건비(H/C)", amount: expenses * 0.5, percentage: 50, trend: "Stable" },
                        { category: "R&D 투자", amount: rndExpense, percentage: (rndExpense / expenses) * 100, trend: "Increasing" }
                    ]
                },
                scmInsights: {
                    inventoryCost: inventory.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0),
                    inventoryNrv: inventory.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0) * 0.95,
                    valuationLoss: inventory.reduce((sum: number, item: any) => sum + (item.cost * item.quantity), 0) * 0.05,
                    alert: "재고 자산 평가 모델 적용됨"
                },
                taxCompliance: {
                    taxableIncome: netIncome * 1.05,
                    estimatedTax: (netIncome * 0.1) - estTaxCredit,
                    effectiveRate: netIncome > 0 ? (((netIncome * 0.1) - estTaxCredit) / netIncome) * 100 : 0,
                    majorAdjustment: `연구인력개발비 세액공제(25%) ₩${(estTaxCredit / 10000).toLocaleString()}만원 반영 완료`
                },
                trendAnalysis: [],
                riskAssessment: {
                    overallRisk: "Low",
                    cashFlowRisk: "Low",
                    complianceRisk: "Safe",
                    operationalRisk: "Low",
                    mitigationStrategies: ["AI 기반 실시간 전표 이상 징후 상시 모니터링 가동", "연구소 요건 상시 점검 프로세스 가동"]
                },
                recommendations: [
                    "R&D 자산화 전략을 통한 BPS(주당순자산) 가치 극대화 추진",
                    "기업부설연구소 사후 관리 및 기술 기록물(Research Log) 아카이빙 강화",
                    "전담 세무사와의 협업을 통한 기말 세무 조정 최적화"
                ],
                detailedAnalysis: `당월 분석된 전표 및 연구 활동 기록을 검토한 결과, 총 ₩${(rndExpense / 1000000).toFixed(1)}M 규모의 R&D 투자가 확인되었습니다. 중소기업 특별세액감면 및 연구인력개발비 세액공제 요건을 충족하고 있어 상당한 절세 효과가 기대됩니다. 특히 저가법(LCM)이 적용된 재고 자산 평가는 Audit-Ready 상태를 완벽히 유지하고 있습니다.`,
                disclaimer: "본 리포트에서 산출된 R&D 세액공제 추정치는 당사가 '기업부설연구소' 또는 '연구개발전담부서' 인가를 득하고 관련 요건을 모두 충족하고 있다는 전제하에 산정된 수치입니다. 실제 세액공제 적용 가능 여부 및 정확한 법인세 산출은 반드시 전담 세무사 또는 전문 회계사와 상담하시기 바랍니다.",
                checklist: ["연구인력개발비 비치여부 확인", "연구소 전용공간 분리 및 현판 부착", "연구개발계획서 및 보고서 작성"],
                bpsInsight: "R&D 자산화 전략 적용 시 BPS 가치가 약 15% 상승하는 효과가 기대됩니다.",
                assetInsights: {
                    totalFixedAssets: fixedAssets,
                    annualDepreciation: fixedAssets / 5,
                    next5YearForecast: [fixedAssets / 5, fixedAssets / 6, fixedAssets / 8, fixedAssets / 10, fixedAssets / 12]
                }
            };
            setReport(mockReport);
            setIsGenerating(false);
            return;
        }
        try {
            const result = await invoke<ManagementReport>('generate_management_report', {
                ledger,
                inventory,
                assets,
                periodStart: '2026-01-01',
                periodEnd: '2026-01-31'
            });
            setReport(result);
        } catch (e) {
            console.error(e);
            alert("리포트 생성 중 오류가 발생했습니다.");
        } finally {
            setIsGenerating(false);
        }
    };

    const [insights, setInsights] = useState<any>(null);

    React.useEffect(() => {
        if (!report && !isGenerating && ledger.length > 0) {
            handleGenerateAIReport();
        }
    }, [ledger.length, report]);

    React.useEffect(() => {
        if (!insights && ledger.length > 0) {
            invoke('get_startup_insights', { ledger })
                .then((res) => setInsights(res))
                .catch(err => console.error(err));
        }
    }, [ledger]);

    return (
        <div className="space-y-10 pb-24 p-6 bg-[#0B1221] min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <CheckCircle2 className="text-indigo-400 w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Automated Analysis Verified</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">AI 경영 분석 리포트</h1>
                    <p className="text-slate-400 font-bold text-sm">Automated Accounting & Financial Report</p>
                </div>
                <button
                    onClick={handleGenerateAIReport}
                    disabled={isGenerating}
                    className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl hover:scale-[1.03] transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Activity className="animate-spin" size={24} /> : <Sparkles size={24} />}
                    {isGenerating ? 'Analyzing...' : 'CFO 경영 리포트 생성'}
                </button>
            </header>

            {/* Strategic KPI Section */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 shadow-3xl">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mb-4">Total Liquidity Focus</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter">
                            {formatCLevel(insights.cashAnalysis.totalCashBalance)}
                        </h3>
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-500">납부 예정 부가세</span>
                                <span className="text-rose-400">{formatCLevel(insights.cashAnalysis.estimatedVatToPay)}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black">
                                <span className="text-indigo-400">실질 가용 현금</span>
                                <span className="text-indigo-400">{formatCLevel(insights.cashAnalysis.realAvailableCash)}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5">
                        <h4 className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-4">Total Assets</h4>
                        <p className="text-3xl font-black text-white italic">{formatCLevel(totalAssets)}</p>
                    </div>

                    <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5">
                        <h4 className="text-slate-500 text-[10px] uppercase font-black tracking-widest mb-4">Runway</h4>
                        <p className={`text-3xl font-black ${insights.burnMetrics.runwayMonths < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {insights.burnMetrics.runwayMonths.toFixed(1)} Months
                        </p>
                    </div>
                </div>
            )}

            {!report ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 bg-[#151D2E]/30 rounded-[3rem] border border-dashed border-white/10">
                    <Search size={48} className="text-indigo-400/30" />
                    <h3 className="text-2xl font-black text-white">AI 경영진 보고서 대기 중</h3>
                </div>
            ) : (
                <div className="space-y-12 animate-in fade-in duration-500">
                    {/* Executive Summary Card */}
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#070C15] rounded-[3.5rem] p-12 text-white shadow-3xl relative overflow-hidden border border-white/5">
                        <div className="relative z-10 space-y-6">
                            <span className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em]">CFO Executive Summary</span>
                            <h2 className="text-4xl font-black tracking-tight">{report.reportTitle}</h2>
                            <p className="text-2xl font-bold text-slate-400 italic leading-relaxed">"{report.executiveSummary}"</p>
                        </div>
                    </div>

                    {/* Main Content Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        {/* Left Content */}
                        <div className="lg:col-span-2 space-y-10">
                            {/* Detailed Analysis */}
                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 mb-8">
                                    <Activity className="text-indigo-400" /> Intelligence Insight Brief
                                </h3>
                                <div className="text-slate-300 leading-loose text-lg font-bold italic bg-black/20 p-8 rounded-3xl border border-white/5">
                                    {report.detailedAnalysis}
                                </div>
                            </div>

                            {/* Triple-Column Grid for SCM/Tax/Assets */}
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingUp size={16} /> Asset Valuation (SCM)
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-medium text-slate-400">재고 취득 원가</span>
                                            <span className="text-lg font-black text-white">{formatCLevel(report.scmInsights.inventoryCost)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs font-medium text-slate-400">당기 평가 손실액</span>
                                            <span className="text-lg font-black text-rose-400">{formatCLevel(report.scmInsights.valuationLoss)}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Calculator size={16} /> Tax Governance
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-medium text-slate-400">예상 법인세 산출액</span>
                                            <span className="text-lg font-black text-white">{formatCLevel(report.taxCompliance.estimatedTax)}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-medium text-slate-400">주요 세무 조정</span>
                                            <span className="text-[10px] font-black text-indigo-300 text-right">{report.taxCompliance.majorAdjustment}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <TrendingDown size={16} /> Asset Depreciation
                                    </h4>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-xs font-medium text-slate-400">총 고정 자산 (Net)</span>
                                            <span className="text-lg font-black text-white">{formatCLevel(report.assetInsights.totalFixedAssets)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs font-medium text-slate-400">연간 예상 상각비</span>
                                            <span className="text-lg font-black text-indigo-400">{formatCLevel(report.assetInsights.annualDepreciation)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Depreciation Forecast Chart */}
                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl">
                                <div className="flex items-center justify-between mb-8">
                                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                                        <Activity className="text-emerald-400" /> 5-Year Depreciation Forecast
                                    </h3>
                                    <button
                                        onClick={() => setShowNewAssetScenario(!showNewAssetScenario)}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${showNewAssetScenario ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10'}`}
                                    >
                                        + 신규 서버 도입 (2억) 시나리오 {showNewAssetScenario ? 'ON' : 'OFF'}
                                    </button>
                                </div>
                                <div className="h-64 flex items-end gap-6 px-10">
                                    {report.assetInsights.next5YearForecast.map((value, i) => {
                                        // Scenario: Acquire 200M KRW Server (Useful Life 5 years, DB method approx 0.451 for simplicity or SL)
                                        // Let's assume SL (40M/year) for simpler visual impact in this demo
                                        const scenarioValue = showNewAssetScenario ? value + 40000000 : value;
                                        const maxValue = Math.max(...report.assetInsights.next5YearForecast) + (showNewAssetScenario ? 40000000 : 0);

                                        return (
                                            <div key={i} className="flex-1 flex flex-col items-center gap-4 group h-full">
                                                <div className="relative w-full flex-1 flex flex-col justify-end">
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: `${(scenarioValue / Math.max(maxValue, 1)) * 100}%` }}
                                                        className={`w-full rounded-t-2xl transition-all shadow-xl ${showNewAssetScenario ? 'bg-gradient-to-t from-emerald-600 to-teal-500 shadow-emerald-500/20' : 'bg-gradient-to-t from-indigo-600 to-violet-500 shadow-indigo-500/20'} group-hover:brightness-110`}
                                                    />
                                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-white text-[#0B1221] text-[10px] font-black px-3 py-1.5 rounded-lg shadow-2xl whitespace-nowrap z-20">
                                                        {formatCLevel(scenarioValue)}
                                                        {showNewAssetScenario && <span className="block text-[9px] text-slate-400 text-center">(+40M)</span>}
                                                    </div>
                                                </div>
                                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{2026 + i}년</span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-8">
                            {/* BPS Insight */}
                            {report.bpsInsight && (
                                <div className="bg-gradient-to-br from-indigo-600/20 to-violet-600/20 rounded-[2.5rem] border border-indigo-500/30 p-8 shadow-2xl animate-in zoom-in duration-500">
                                    <h3 className="text-sm font-black text-indigo-400 flex items-center gap-2 mb-4 uppercase tracking-[0.2em]">
                                        <Sparkles size={18} /> Optimization Tip
                                    </h3>
                                    <p className="text-white font-bold leading-relaxed">{report.bpsInsight}</p>
                                </div>
                            )}

                            {/* Compliance Checklist */}
                            {report.checklist && (
                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-10 space-y-6 shadow-2xl">
                                    <h3 className="text-lg font-black text-white flex items-center gap-3">
                                        <ShieldCheck size={20} className="text-emerald-400" /> Compliance Checklist
                                    </h3>
                                    <div className="space-y-4">
                                        {report.checklist.map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 bg-white/5 p-4 rounded-xl border border-white/5">
                                                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                                                <span className="text-xs font-bold text-slate-300">{item}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recommendations */}
                            <div className="bg-gradient-to-br from-[#151D2E] to-[#0B1221] rounded-[2.5rem] border border-white/5 p-10 space-y-6 shadow-2xl">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <Zap size={20} className="text-amber-400" /> Strategic Actions
                                </h3>
                                <div className="space-y-4">
                                    {report.recommendations.map((rec, i) => (
                                        <div key={i} className="bg-white/5 p-5 rounded-2xl border border-white/5">
                                            <p className="text-xs font-bold text-white leading-relaxed">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Disclaimer Section */}
                    {report.disclaimer && (
                        <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-[2.5rem] p-10 mt-10">
                            <div className="flex items-start gap-4">
                                <ShieldCheck className="text-indigo-400 shrink-0 mt-1" size={24} />
                                <div className="space-y-4">
                                    <h4 className="text-white font-black text-lg">Legal Disclaimer & Assumptions</h4>
                                    <p className="text-slate-400 text-sm leading-loose font-medium">{report.disclaimer}</p>
                                    <div className="pt-4 border-t border-white/5 grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">R&D Credit Requirements</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-bold">
                                                • 조세특례제한법 제10조 근거<br />
                                                • 기업부설연구소/연구전담부서 인가 필수<br />
                                                • 연구소 전용 공간 확보 및 연구원 상주 필수
                                            </p>
                                        </div>
                                        <div className="bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-1">Professional Advisory</p>
                                            <p className="text-[11px] text-slate-500 leading-relaxed font-bold italic">
                                                세무 리스크 방지를 위해 기말 세무 조정 전 반드시 전담 세무 전문가의 최종 검토를 받으시기 바랍니다.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default Reports;
