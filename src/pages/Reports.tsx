import React, { useState } from 'react';
import {
    TrendingUp,
    ShieldCheck,
    AlertCircle,
    PieChart,
    ArrowRight,
    Calculator,
    CheckCircle2,
    Sparkles,
    FileText,
    Zap,
    Download,
    TrendingDown,
    Activity
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
    const isBalanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 10;

    const handleGenerateAIReport = async () => {
        setIsGenerating(true);
        if (!(window as any).__TAURI_INTERNALS__) {
            console.warn('Web environment detected. Simulating report generation...');
            await new Promise(r => setTimeout(r, 2500));
            const mockReport: ManagementReport = {
                reportTitle: "2026년 1월 AI 경영 분석 리포트 (Smart Report)",
                reportDate: new Date().toISOString().split('T')[0],
                executiveSummary: "현재 매출 성장세가 뚜렷하며, 현금 흐름이 안정적입니다. 다만, 일부 자산의 감가상각 처리가 누락되었을 가능성이 있으니 점검이 필요합니다.",
                financialOverview: {
                    totalRevenue: revenue,
                    totalExpenses: expenses,
                    netIncome: netIncome,
                    profitMargin: revenue > 0 ? (netIncome / revenue) * 100 : 0,
                    topExpenseCategories: [
                        { category: "급여", amount: expenses * 0.6, percentage: 60, trend: "Stable" },
                        { category: "임차료", amount: expenses * 0.2, percentage: 20, trend: "Stable" }
                    ]
                },
                scmInsights: {
                    inventoryCost: 156000000,
                    inventoryNrv: 148000000,
                    valuationLoss: 8000000,
                    alert: "평가 손실 발생"
                },
                taxCompliance: {
                    taxableIncome: netIncome * 1.05,
                    estimatedTax: netIncome * 0.1,
                    effectiveRate: 10,
                    majorAdjustment: "접대비 한도 초과분 손금불산입"
                },
                trendAnalysis: [],
                riskAssessment: {
                    overallRisk: "Low",
                    cashFlowRisk: "Low",
                    complianceRisk: "Medium",
                    operationalRisk: "Low",
                    mitigationStrategies: ["정기적인 증빙 대조 작업 강화"]
                },
                recommendations: [
                    "SaaS 구독료 지출 최적화 방안 검토",
                    "단기 여유 자금의 MMF 운용 제안"
                ],
                detailedAnalysis: "AI가 당월 발생한 18건의 고액 거래와 4건의 특이 거래를 집중 분석하였습니다. 전반적인 재무 건전성은 양호하나, 접대비 항목에서 세무 조정 이슈가 발견되었습니다."
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
            console.error("Report generation failed:", e);
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
                .catch(err => console.error("Failed to fetch insights", err));
        }
    }, [ledger]);

    return (
        <div className="space-y-10 pb-20 p-6 bg-[#0B1221] min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-4">
                        <FileText className="text-indigo-500" size={40} />
                        Strategic Financial Intelligence Report
                    </h1>
                    <p className="text-slate-400 font-bold mt-2 ml-1">지능형 재무 전략 보고서 — 통합 재무·SCM·세정 데이터 기반 AI 분석</p>
                </div>
                <button
                    onClick={handleGenerateAIReport}
                    disabled={isGenerating}
                    className="flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-8 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
                >
                    {isGenerating ? (
                        <Activity className="animate-spin" size={24} />
                    ) : (
                        <Sparkles size={24} />
                    )}
                    {isGenerating ? 'AI 분석 리포트 생성 중...' : 'AI 경영 리포트 생성'}
                </button>
            </header>

            {insights && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-700">
                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <TrendingUp size={80} />
                        </div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">총 현금 보유액 (Cash Balance)</p>
                        <h3 className="text-3xl font-black text-white tracking-tight">
                            ₩{(insights.cashAnalysis.totalCashBalance / 1000000).toFixed(1)}M
                        </h3>
                        <div className="mt-4 space-y-1">
                            <div className="flex justify-between items-center text-xs font-bold">
                                <span className="text-slate-400">납부 예정 부가세</span>
                                <span className="text-rose-400">- ₩{(insights.cashAnalysis.estimatedVatToPay / 1000000).toFixed(1)}M</span>
                            </div>
                            <div className="flex justify-between items-center text-xs font-bold pt-1 border-t border-white/5">
                                <span className="text-indigo-400">실질 가용 자금</span>
                                <span className="text-indigo-400">₩{(insights.cashAnalysis.realAvailableCash / 1000000).toFixed(1)}M</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <Activity size={80} />
                        </div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">Runway (생존 기간)</p>
                        <h3 className={`text-3xl font-black tracking-tight ${insights.burnMetrics.runwayMonths < 6 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {insights.burnMetrics.runwayMonths.toFixed(1)} Months
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs font-bold">
                            월 평균 Burn: ₩{(insights.burnMetrics.averageMonthlyBurn / 1000000).toFixed(1)}M
                        </div>
                    </div>

                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 shadow-2xl relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={80} />
                        </div>
                        <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">정부지원금 잔액</p>
                        <h3 className="text-3xl font-black text-indigo-400 tracking-tight">
                            ₩{(insights.governmentGrants.reduce((acc: any, curr: any) => acc + curr.remainingBalance, 0) / 1000000).toFixed(1)}M
                        </h3>
                        <div className="mt-4 flex items-center gap-2 text-slate-400 text-xs font-bold">
                            {insights.governmentGrants.length}건의 과제 수행 중
                        </div>
                    </div>
                </div>
            )}

            {!report ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 opacity-70">
                    {/* Basic Financials (P&L, B/S) - Default View */}
                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-8">
                        <h2 className="text-2xl font-black text-white flex items-center gap-3">
                            <TrendingUp className="text-indigo-400" /> 기본 재무지표 (P&L)
                        </h2>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl">
                                <span className="text-slate-400 font-bold">총 매출액</span>
                                <span className="text-2xl font-black text-white">₩{revenue.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center bg-white/5 p-6 rounded-2xl">
                                <span className="text-rose-400 font-bold">영업 비용</span>
                                <span className="text-2xl font-black text-rose-400">(₩{expenses.toLocaleString()})</span>
                            </div>
                            <div className="p-8 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 flex justify-between items-center">
                                <span className="text-indigo-400 font-black text-xl">당기순이익</span>
                                <span className="text-4xl font-black text-indigo-400">₩{netIncome.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 flex flex-col items-center justify-center text-center space-y-6">
                        <div className="w-20 h-20 bg-indigo-500/10 rounded-full flex items-center justify-center text-indigo-400">
                            <Sparkles size={40} className="animate-pulse" />
                        </div>
                        <h3 className="text-xl font-bold text-white">AI가 전체 경영 현황을 분석할 준비가 되었습니다.</h3>
                        <p className="text-slate-500 text-sm max-w-sm">
                            상단의 버튼을 클릭하면 실시간 분개, 재고 가치, 예상 세액을 종합하여<br />
                            경영진을 위한 핵심 서머리와 개선 제언을 생성합니다.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="space-y-10 animate-in fade-in duration-500">
                    {/* Executive Summary Card */}
                    <div className="bg-gradient-to-br from-indigo-700 to-violet-900 rounded-[3rem] p-10 text-white shadow-3xl relative overflow-hidden">
                        <div className="relative z-10 space-y-4 max-w-4xl">
                            <span className="bg-white/20 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">Executive Summary</span>
                            <h2 className="text-3xl font-black leading-tight">{report.reportTitle}</h2>
                            <p className="text-xl font-medium text-indigo-100 leading-relaxed italic">
                                "{report.executiveSummary}"
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* 左: Financial & SCM Insights */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Detailed Analysis Section */}
                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <Activity className="text-indigo-400" /> 상세 경영 분석 결과
                                </h3>
                                <p className="text-slate-300 leading-loose text-lg font-medium whitespace-pre-wrap">
                                    {report.detailedAnalysis}
                                </p>
                            </div>

                            {/* Inventory & Tax Compliance Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {report.scmInsights.inventoryCost > 0 && (
                                    <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-black text-slate-500 uppercase flex items-center gap-2">
                                                <Package size={16} /> SCM & Inventory
                                            </h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${report.scmInsights.valuationLoss > 0 ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                                                {report.scmInsights.alert}
                                            </span>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between">
                                                <span className="text-xs text-slate-400">재고 원가</span>
                                                <span className="text-sm font-bold text-white">₩{report.scmInsights.inventoryCost.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-xs text-slate-400">평가 손실액</span>
                                                <span className="text-sm font-bold text-rose-400">₩{report.scmInsights.valuationLoss.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className={`bg-[#151D2E] rounded-[2rem] border border-white/5 p-6 space-y-4 ${report.scmInsights.inventoryCost === 0 ? 'md:col-span-2' : ''}`}>
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-black text-slate-500 uppercase flex items-center gap-2">
                                            <Calculator size={16} /> Tax Compliance
                                        </h4>
                                        <span className="text-[10px] bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full font-black">EFF {report.taxCompliance.effectiveRate.toFixed(1)}%</span>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex justify-between">
                                            <span className="text-xs text-slate-400">예상 법인세</span>
                                            <span className="text-sm font-black text-white">₩{report.taxCompliance.estimatedTax.toLocaleString()}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-xs text-slate-400">주요 조정 항목</span>
                                            <span className="text-xs font-bold text-indigo-400 truncate ml-4">{report.taxCompliance.majorAdjustment}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 右: Recommendations & Risks */}
                        <div className="space-y-8">
                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <TrendingUp size={20} className="text-emerald-400" /> AI 권장 조치
                                </h3>
                                <div className="space-y-3">
                                    {report.recommendations.map((rec, idx) => (
                                        <div key={idx} className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-start gap-4">
                                            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0 text-xs font-black">
                                                {idx + 1}
                                            </div>
                                            <p className="text-xs font-bold text-emerald-100 leading-relaxed">{rec}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 space-y-6">
                                <h3 className="text-lg font-black text-white flex items-center gap-3">
                                    <AlertCircle size={20} className="text-rose-400" /> 리스크 점검
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/5 rounded-2xl">
                                        <div className="flex justify-between mb-1">
                                            <span className="text-[10px] font-black text-slate-500 uppercase">종합 리스크 수준</span>
                                            <span className={`text-[10px] font-black ${report.riskAssessment.overallRisk === 'High' ? 'text-rose-500' : 'text-emerald-500'}`}>{report.riskAssessment.overallRisk}</span>
                                        </div>
                                        <div className="w-full bg-white/5 h-1.5 rounded-full">
                                            <div className={`h-full rounded-full ${report.riskAssessment.overallRisk === 'High' ? 'bg-rose-500 w-3/4' : 'bg-emerald-500 w-1/4'}`}></div>
                                        </div>
                                    </div>
                                    {report.riskAssessment.mitigationStrategies.length > 0 && (
                                        <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl">
                                            <p className="text-[10px] font-black text-rose-400 uppercase mb-2">대응 전략</p>
                                            <ul className="text-xs text-rose-100 font-bold space-y-2">
                                                {report.riskAssessment.mitigationStrategies.map((s, i) => (
                                                    <li key={i}>• {s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
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

const Package = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m7.5 4.27 9 5.15" /><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" /><path d="m3.3 7 8.7 5 8.7-5" /><path d="M12 22V12" /></svg>
);
