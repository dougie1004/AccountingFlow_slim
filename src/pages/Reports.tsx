import React, { useState } from 'react';
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
    Search
} from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { invoke } from '@tauri-apps/api/core';
import { ManagementReport } from '../types';

export const Reports: React.FC = () => {
    const context = useAccounting() as any;
    const { financials, ledger, inventory } = context;
    const [report, setReport] = useState<ManagementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const {
        revenue, expenses, netIncome, cash, ar, ap, fixedAssets, vatNet, capital, retainedEarnings
    } = financials;

    const totalAssets = cash + ar + fixedAssets + (vatNet < 0 ? -vatNet : 0);
    const totalLiabilities = ap + (vatNet > 0 ? vatNet : 0);
    const totalEquity = capital + retainedEarnings;

    const handleGenerateAIReport = async () => {
        setIsGenerating(true);
        if (!(window as any).__TAURI_INTERNALS__) {
            await new Promise(r => setTimeout(r, 2500));
            const mockReport: ManagementReport = {
                reportTitle: "2026년 1월 전략 재무 인사이트 (Executive Briefing)",
                reportDate: new Date().toISOString().split('T')[0],
                executiveSummary: "현재 그룹의 재무 구조는 견고한 매출 성장 하에 안정적인 유동성을 확보하고 있습니다. 특히 AI 거버넌스 엔진이 감지한 비용 절감 기회와 컴플라이언스 위험도가 낮은 수준으로 유지되고 있어, 공격적인 확장을 고려할 시기입니다.",
                financialOverview: {
                    totalRevenue: revenue,
                    totalExpenses: expenses,
                    netIncome: netIncome,
                    profitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
                    topExpenseCategories: [
                        { category: "인건비(H/C)", amount: expenses * 0.6, percentage: 60, trend: "Stable" },
                        { category: "솔루션 인프라", amount: expenses * 0.2, percentage: 20, trend: "Stable" }
                    ]
                },
                scmInsights: {
                    inventoryCost: 156000000,
                    inventoryNrv: 148000000,
                    valuationLoss: 8000000,
                    alert: "평가 손실 실시간 반영됨"
                },
                taxCompliance: {
                    taxableIncome: netIncome * 1.05,
                    estimatedTax: netIncome * 0.1,
                    effectiveRate: 10,
                    majorAdjustment: "접대비 한도 초과분 및 사외 지출 손금불산입 완료"
                },
                trendAnalysis: [],
                riskAssessment: {
                    overallRisk: "Low",
                    cashFlowRisk: "Low",
                    complianceRisk: "Safe",
                    operationalRisk: "Low",
                    mitigationStrategies: ["AI 기반 실시간 전표 이상 징후 상시 모니터링 가동"]
                },
                recommendations: [
                    "SaaS 플랫폼 지출 패턴 분석을 통한 운영 효율화 가이드 적용",
                    "기결산 데이터 기반의 선제적 법인세 절세 시나리오 검토"
                ],
                detailedAnalysis: "당월 분석된 18건의 고액 거래 및 주요 매입 채무에 대한 AI 검토 결과, 모든 항목이 내부 회계 관리 제도에 부합함을 확인했습니다. 특히 저가법(LCM)이 적용된 재고 자산 평가는 기말 결산을 위한 Audit-Ready 상태를 완벽히 유지하고 있습니다."
            };
            setReport(mockReport);
            setIsGenerating(false);
            return;
        }
        try {
            const result = await invoke<ManagementReport>('generate_management_report', {
                ledger,
                inventory,
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
        if (!insights && ledger.length > 0) {
            invoke('get_startup_insights', { ledger })
                .then((res) => setInsights(res))
                .catch(err => console.error(err));
        }
    }, [ledger]);

    return (
        <div className="space-y-10 pb-24 p-6 bg-[#0B1221] min-h-screen">
            {/* Header with Luxury Polish */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-indigo-500/10 rounded-lg border border-indigo-500/20">
                            <CheckCircle2 className="text-indigo-400 w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest leading-none">Automated Analysis Verified</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">
                        AI 경영 분석 리포트
                    </h1>
                    <p className="text-slate-400 font-bold mt-1 text-sm">Automated Accounting & Financial Report</p>
                </div>
                <button
                    onClick={handleGenerateAIReport}
                    disabled={isGenerating}
                    className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-5 rounded-[2rem] font-black text-lg shadow-2xl shadow-indigo-600/30 hover:scale-[1.03] active:scale-95 transition-all disabled:opacity-50"
                >
                    {isGenerating ? <Activity className="animate-spin" size={24} /> : <Sparkles size={24} />}
                    {isGenerating ? 'Intelligence Engine 가동 중...' : 'CFO 경영 리포트 생성'}
                </button>
            </header>

            {/* Strategic KPI Section */}
            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                    <div className="bg-[#151D2E]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-3xl group transition-all hover:bg-[#1a253a]">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Total Liquidity Focus</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter">
                            ₩{(insights.cashAnalysis.totalCashBalance / 1000000).toFixed(1)}M
                        </h3>
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-3">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-500">납부 예정 부가세 (Est.)</span>
                                <span className="text-rose-400 font-mono">₩{(insights.cashAnalysis.estimatedVatToPay / 1000000).toFixed(1)}M</span>
                            </div>
                            <div className="flex justify-between items-center text-sm font-black">
                                <span className="text-indigo-400">실질 가용 현금</span>
                                <span className="text-indigo-400 font-mono">₩{(insights.cashAnalysis.realAvailableCash / 1000000).toFixed(1)}M</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E]/80 backdrop-blur-xl rounded-[2.5rem] border border-white/5 p-8 shadow-3xl group transition-all hover:bg-[#1a253a]">
                        <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Runway Analysis</p>
                        <h3 className={`text-4xl font-black tracking-tighter ${insights.burnMetrics.runwayMonths < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {insights.burnMetrics.runwayMonths.toFixed(1)} Months
                        </h3>
                        <p className="mt-4 text-xs font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                            Avg. Monthly Burn: <span className="text-white">₩{(insights.burnMetrics.averageMonthlyBurn / 1000000).toFixed(1)}M</span>
                        </p>
                    </div>

                    <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 backdrop-blur-xl rounded-[2.5rem] border border-indigo-500/20 p-8 shadow-3xl">
                        <p className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Grant Management</p>
                        <h3 className="text-4xl font-black text-white tracking-tighter">
                            ₩{(insights.governmentGrants.reduce((acc: any, curr: any) => acc + curr.remainingBalance, 0) / 1000000).toFixed(1)}M
                        </h3>
                        <div className="mt-6 inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 rounded-full text-[10px] font-black text-indigo-300">
                            <CheckCircle2 size={12} /> {insights.governmentGrants.length} Active Grants
                        </div>
                    </div>
                </div>
            )}

            {!report ? (
                <div className="flex flex-col items-center justify-center py-32 text-center space-y-8 bg-[#151D2E]/30 rounded-[3rem] border border-white/5 border-dashed">
                    <div className="w-24 h-24 bg-indigo-500/5 rounded-[2rem] flex items-center justify-center border border-indigo-500/10">
                        <Search size={48} className="text-indigo-400/50" />
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-black text-white">AI 경영진 보고서 대기 중</h3>
                        <p className="text-slate-500 font-bold max-w-lg leading-loose">
                            상단의 생성 버튼을 탐색하십시오. AI가 실시간 전표 정합성, SCM 가치 평가,<br />
                            조세 컴플라이언스 데이터를 통합하여 경영진 전용 리포트를 구성합니다.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-12 animate-in fade-in duration-500">
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#070C15] rounded-[3.5rem] p-12 text-white shadow-3xl relative overflow-hidden border border-white/5">
                        <div className="relative z-10 space-y-6">
                            <div className="flex items-center justify-between">
                                <span className="bg-white/10 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] border border-white/10">CFO Executive Summary</span>
                                <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs">
                                    <Lock size={12} /> SHA-256 Verified Audit Trail
                                </div>
                            </div>
                            <h2 className="text-4xl font-black leading-tight tracking-tight max-w-3xl">{report.reportTitle}</h2>
                            <p className="text-2xl font-bold text-slate-400 leading-relaxed italic max-w-4xl">
                                "{report.executiveSummary}"
                            </p>
                        </div>
                        <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                        <div className="lg:col-span-2 space-y-10">
                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-10 shadow-2xl relative">
                                <h3 className="text-xl font-black text-white flex items-center gap-3 mb-8">
                                    <Activity className="text-indigo-400" /> Intelligence Insight Brief
                                </h3>
                                <div className="text-slate-300 leading-loose text-lg font-bold whitespace-pre-wrap p-8 bg-black/20 rounded-3xl border border-white/5 italic">
                                    {report.detailedAnalysis}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <TrendingUp size={16} /> Asset Valuation (SCM)
                                        </h4>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-black ${report.scmInsights.valuationLoss > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                            {report.scmInsights.alert}
                                        </span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400">재고 취득 원가</span>
                                            <span className="text-lg font-black text-white">₩{report.scmInsights.inventoryCost.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400">당기 평가 손실액</span>
                                            <span className="text-lg font-black text-rose-400">₩{report.scmInsights.valuationLoss.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Calculator size={16} /> Tax Governance
                                        </h4>
                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full font-black">Eff. Rate {report.taxCompliance.effectiveRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs font-bold text-slate-400">예상 법인세 산출액</span>
                                            <span className="text-lg font-black text-white">₩{report.taxCompliance.estimatedTax.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between items-start">
                                            <span className="text-xs font-bold text-slate-400 shrink-0">주요 세무 조정</span>
                                            <span className="text-xs font-black text-indigo-300 text-right ml-4">{report.taxCompliance.majorAdjustment}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="bg-gradient-to-br from-[#151D2E] to-[#0B1221] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <Zap size={20} className="text-amber-400" /> Strategic Actions
                                </h3>
                                <div className="space-y-4">
                                    {report.recommendations.map((rec, idx) => (
                                        <div key={idx} className="bg-white/5 p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition-all cursor-default">
                                            <p className="text-xs font-black text-white leading-relaxed">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-10 space-y-8 shadow-2xl">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <AlertCircle size={20} className="text-rose-400" /> Governance Risk
                                </h3>
                                <div className="space-y-6">
                                    <div className="p-5 bg-white/5 rounded-2xl">
                                        <div className="flex justify-between mb-2">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Composite Risk Level</span>
                                            <span className={`text-[10px] font-black ${report.riskAssessment.overallRisk === 'High' ? 'text-rose-500' : 'text-emerald-500'}`}>{report.riskAssessment.overallRisk}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                            <div className={`h-full rounded-full transition-all duration-1000 ${report.riskAssessment.overallRisk === 'High' ? 'bg-rose-500 w-3/4' : 'bg-emerald-500 w-1/4'}`}></div>
                                        </div>
                                    </div>
                                    <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl">
                                        <p className="text-[10px] font-black text-rose-400 uppercase mb-3 tracking-widest">Mitigation Strategy</p>
                                        <ul className="text-xs text-rose-200 font-bold space-y-3">
                                            {report.riskAssessment.mitigationStrategies.map((s, i) => (
                                                <li key={i} className="flex gap-2">
                                                    <span className="text-rose-500">•</span>
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Reports;
