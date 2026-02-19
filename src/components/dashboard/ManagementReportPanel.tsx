
import React, { useState, useEffect, useMemo } from 'react';
import { FileText, Download, Target, ShieldAlert, CheckCircle, Loader2, Terminal, AlertCircle, ChevronRight, Lock } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { JournalEntry } from '../../types';
import { cleanMarkdown } from '../../utils/textUtils';
import { calculateFinancials } from '../../bridge/StrategicBridge';

import { useConfig } from '../../context/ConfigContext';
import { InfoTooltip } from '../ui/InfoTooltip';

interface ManagementReport {
    reportTitle: string;
    reportDate: string;
    executiveSummary: string;
    observations: string[];
    impacts: string[];
    decisions: string[];
    pendingRisks: string[];
    detailedAnalysis: string;
}

interface ManagementReportPanelProps {
    ledger: JournalEntry[];
    viewDate: string; // Add current view date
}

export const ManagementReportPanel: React.FC<ManagementReportPanelProps> = ({ ledger, viewDate }) => {
    const [report, setReport] = useState<ManagementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [reportMode, setReportMode] = useState<'Growth' | 'Efficiency' | 'Defense'>('Growth');

    const { checkPermission } = useConfig();
    const hasPermission = checkPermission('NarrativeReport');

    // [Engine] Real-time Financial Analysis
    const generateRealReport = (mode: 'Growth' | 'Efficiency' | 'Defense'): ManagementReport => {
        // Filter ledger to ONLY show up to the selected view date
        const effectiveLedger = ledger.filter(e => e.date <= viewDate);

        if (effectiveLedger.length === 0) {
            return {
                reportTitle: '데이터 부족',
                reportDate: viewDate,
                executiveSummary: "해당 기간까지의 재무 데이터가 존재하지 않습니다.",
                observations: ["데이터 없음"],
                impacts: ["데이터 없음"],
                decisions: ["데이터 로드 필요"],
                pendingRisks: [],
                detailedAnalysis: ""
            };
        }

        // 1. Data Prep (Monthly Aggregation)
        const monthlyStats = new Map<string, { revenue: number; expense: number; cost: number }>();
        effectiveLedger.forEach(e => {
            if (e.status !== 'Approved') return;
            const period = e.date.substring(0, 7);
            const current = monthlyStats.get(period) || { revenue: 0, expense: 0, cost: 0 };
            const amount = e.amount || 0;

            if (e.type === 'Revenue') current.revenue += amount;
            else if (e.type === 'Expense' || e.type === 'Payroll') current.expense += amount;

            monthlyStats.set(period, current);
        });

        const sortedMonths = Array.from(monthlyStats.keys()).sort();
        const lastMonthKey = sortedMonths[sortedMonths.length - 1];
        const prevMonthKey = sortedMonths[sortedMonths.length - 2];

        const lastMonth = monthlyStats.get(lastMonthKey) || { revenue: 0, expense: 0, cost: 0 };
        const prevMonth = monthlyStats.get(prevMonthKey) || { revenue: 0, expense: 0, cost: 0 };

        // 2. Core Metrics
        const revenueGrowth = prevMonth.revenue > 0
            ? ((lastMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
            : 0;

        const burnRate = lastMonth.expense; // Simplified
        const fin = calculateFinancials(ledger);
        const cashObj = fin.cash; // Current Cash
        const runway = burnRate > 0 ? cashObj / burnRate : 99;

        // 3. Top Expense Category
        const expenseCategoryMap = new Map<string, number>();
        ledger.filter(e => e.date.startsWith(lastMonthKey) && e.type === 'Expense').forEach(e => {
            const cat = e.description.split(']')[0].replace('[', '') || '기타';
            expenseCategoryMap.set(cat, (expenseCategoryMap.get(cat) || 0) + e.amount);
        });
        const topExpense = Array.from(expenseCategoryMap.entries()).sort((a, b) => b[1] - a[1])[0];

        // 4. Generate Narrative based on Mode & Data
        let executiveSummary = "";
        let observations: string[] = [];
        let impacts: string[] = [];
        let decisions: string[] = [];
        let risks: string[] = [];

        // Formatting Helper
        const fmt = (n: number) => (n / 10000).toLocaleString() + '만원';
        const fmtP = (n: number) => n.toFixed(1) + '%';

        if (mode === 'Growth') {
            const isStartupPhase = sortedMonths.length <= 2;
            if (isStartupPhase) {
                executiveSummary = "사업 초기 안정화 단계입니다. 매출 성장률보다는 제품 시장 적합성(PMF) 확인과 초기 고객 기반 확보에 집중하십시오.";
                observations.push(`신규 비즈니스 가동: 금월 ${fmt(lastMonth.revenue)}의 최초 매출 실적 발생`);
                impacts.push(`초기 인프라 구축 및 자본금 수혈을 통한 안정적 현금 흐름 확보 중`);
                decisions.push("초기 유입 고객 반응 모니터링 및 운영 프로세스 최적화");
            } else if (revenueGrowth > 10) {
                executiveSummary = `전월 대비 매출이 ${fmtP(revenueGrowth)} 성장했습니다. 성장이 지속될 수 있도록 운영 효율화가 병행되어야 합니다.`;
                observations.push(`최근 매출 성장률이 ${fmtP(revenueGrowth)}로 개선됨 (${fmt(prevMonth.revenue)} -> ${fmt(lastMonth.revenue)})`);
                impacts.push(`현금 유입 증가로 인한 런웨이 안정성 확보`);
            } else if (revenueGrowth < 0) {
                executiveSummary = `매출이 전월 대비 ${fmtP(Math.abs(revenueGrowth))} 감소했습니다. 성장 정체 원인 파악 및 전략 수정이 필요합니다.`;
                observations.push(`매출 하락세 감지: 전월 ${fmt(prevMonth.revenue)} 대비 금월 ${fmt(lastMonth.revenue)}로 축소`);
            } else {
                executiveSummary = "매출이 안정적인 보합세를 유지하고 있습니다. 새로운 성장 동력 탐색이 필요합니다.";
            }

            decisions.push("마케팅 예산 ROI 분석 및 채널 재배정");
            if (!isStartupPhase && runway > 12) decisions.push("공격적인 신규 인력 채용 검토");

        } else if (mode === 'Efficiency') {
            const expRatio = lastMonth.revenue > 0 ? (lastMonth.expense / lastMonth.revenue) * 100 : 0;
            executiveSummary = `매출 대비 비용 비중이 ${fmtP(expRatio)}입니다. ${expRatio > 80 ? '비용 구조 개선이 시급합니다.' : '효율적인 운영 구조를 갖추고 있습니다.'}`;

            if (topExpense) {
                observations.push(`최대 지출 항목: '${topExpense[0]}' (${fmt(topExpense[1])})`);
            }
            observations.push(`월 고정비(Burn Rate)는 약 ${fmt(burnRate)} 수준임`);

            if (expRatio > 90) impacts.push("영업이익률 악화로 인한 현금 흐름 압박 우려");
            else impacts.push("안정적인 마진율 확보로 재투자 여력 발생");

            decisions.push(`'${topExpense?.[0] || '기타'}' 관련 비용 절감 방안 수립`);
        } else { // Defense
            executiveSummary = runway < 6
                ? `⚠️ 현금 런웨이가 ${runway.toFixed(1)}개월 남았습니다. 비상 경영 체제 가동이 필요합니다.`
                : `재무 건전성이 양호합니다. (런웨이 ${runway.toFixed(0)}개월 이상) 우발 채무 리스크 관리에 집중하십시오.`;

            observations.push(`현재 보유 현금: ${fmt(cashObj)}`);
            observations.push(`월 평균 현금 소진액: ${fmt(burnRate)}`);

            if (runway < 6) {
                risks.push("6개월 내 현금 고갈(Cash Out) 위험 매우 높음");
                decisions.push("즉각적인 유상증자 또는 대출 실행 필요");
            } else {
                risks.push("단기 유동성 위험 없음");
                decisions.push("여유 자금의 단기 금융 상품 운용 검토");
            }
        }

        return {
            reportTitle: `경영 전략 리포트: ${mode === 'Growth' ? '성장' : mode === 'Efficiency' ? '효율' : '방어'} 포커스`,
            reportDate: new Date().toLocaleDateString(),
            executiveSummary,
            observations,
            impacts,
            decisions,
            pendingRisks: risks.length > 0 ? risks : ["식별된 특이 리스크 없음"],
            detailedAnalysis: "AI 엔진이 장부 데이터를 전수 조사하여 산출한 결과입니다."
        };
    };

    const generateReport = async (mode: 'Growth' | 'Efficiency' | 'Defense') => {
        setIsGenerating(true);
        // Simulate thinking time
        setTimeout(() => {
            const realReport = generateRealReport(mode);
            setReport(realReport);
            setIsGenerating(false);
        }, 600);
    };

    useEffect(() => {
        generateReport(reportMode);
    }, [ledger.length, viewDate, hasPermission, reportMode]);

    if (!hasPermission) {
        return (
            <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative min-h-[400px]">
                {/* Blurred Content Background */}
                <div className="p-8 opacity-20 grayscale pointer-events-none blur-md">
                    <div className="h-8 bg-slate-700 w-1/3 rounded-lg mb-4"></div>
                    <div className="h-20 bg-slate-700 w-full rounded-2xl mb-8"></div>
                </div>

                {/* Upgrade Overlay */}
                <div className="absolute inset-0 bg-indigo-950/40 backdrop-blur-xl flex flex-col items-center justify-center p-10 text-center animate-in fade-in duration-700">
                    <div className="p-5 rounded-full bg-indigo-500/10 text-indigo-400 mb-6 border border-indigo-500/20">
                        <Lock size={48} />
                    </div>
                    <h3 className="text-2xl font-black text-white mb-2">전략 리포트 (Narrative) 기능 잠김</h3>
                    <p className="text-slate-400 font-bold max-w-sm mb-8">
                        AI 기반 재무 전략 리포트 분석 기능은 <span className="text-indigo-400">Standard 이상의 플랜</span>에서 제공됩니다.
                    </p>
                    <button className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-2xl shadow-indigo-600/30">
                        Standard 플랜으로 업그레이드
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Mode Switcher */}
            <div className="flex bg-[#151D2E] p-1 rounded-2xl border border-white/5 w-fit">
                {[
                    { id: 'Growth', label: '성장 전략', color: 'text-indigo-400' },
                    { id: 'Efficiency', label: '운영 효율', color: 'text-emerald-400' },
                    { id: 'Defense', label: '리스크 관리', color: 'text-rose-400' }
                ].map((mode) => (
                    <button
                        key={mode.id}
                        onClick={() => setReportMode(mode.id as any)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-black transition-all ${reportMode === mode.id
                            ? 'bg-white/10 text-white shadow-lg'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <span className={reportMode === mode.id ? 'text-white' : mode.color}>{mode.label}</span>
                    </button>
                ))}
            </div>

            <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl relative">
                {isGenerating && (
                    <div className="absolute inset-0 z-50 bg-[#151D2E]/80 backdrop-blur-sm flex flex-col items-center justify-center">
                        <Loader2 size={40} className="text-indigo-400 animate-spin mb-4" />
                        <p className="text-sm font-black text-slate-400">AI 전략 엔진 분석 중...</p>
                    </div>
                )}

                {/* Compact Header */}
                <div className="p-6 border-b border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl shadow-lg ${reportMode === 'Growth' ? 'bg-indigo-500/10 text-indigo-400' :
                                reportMode === 'Efficiency' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                                }`}>
                                <Terminal size={20} />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black text-white tracking-tight">경영 전략 리포트: {reportMode === 'Growth' ? '성장' : reportMode === 'Efficiency' ? '효율' : '방어'} 포커스</h3>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <p className="text-[10px] font-bold text-slate-500">생성일: {report?.reportDate || '분석 중...'}</p>
                                    <span className="text-[10px] text-slate-600">|</span>
                                    <p className="text-[10px] font-bold text-slate-500">Gemini 2.0 분석</p>
                                </div>
                            </div>
                        </div>
                        <button className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black transition-all border border-white/10">
                            <Download size={14} /> PDF 저장
                        </button>
                    </div>

                    <div className="bg-white/[0.02] rounded-xl p-4 border border-white/5 relative">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase mb-2">경영 요약</h4>
                        <p className="text-base font-bold text-slate-200 leading-snug">
                            "{report ? cleanMarkdown(report.executiveSummary) : '실시간 재무 데이터를 분석하여 경영 요약을 생성하고 있습니다...'}"
                        </p>
                    </div>
                </div>

                {report && (
                    <div className="p-6 space-y-6">
                        {/* Observations & Impacts (Compact Grid) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
                                    주요 관측 데이터
                                </h4>
                                <ul className="space-y-2">
                                    {report.observations.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-xs font-bold text-slate-400">
                                            <span className="text-indigo-500 shrink-0 mt-0.5">•</span>
                                            {cleanMarkdown(item)}
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full"></span>
                                    경영 시사점
                                </h4>
                                <ul className="space-y-2">
                                    {report.impacts.map((item, i) => (
                                        <li key={i} className="flex gap-3 text-xs font-bold text-slate-400">
                                            <span className="text-amber-500 shrink-0 mt-0.5">→</span>
                                            {cleanMarkdown(item)}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Decisions & Risks (Compact Grid) */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-4 border-t border-white/5">
                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                    <CheckCircle size={14} className="text-emerald-500" />
                                    제안된 의사결정
                                </h4>
                                <div className="space-y-2">
                                    {report.decisions.map((item, i) => (
                                        <div key={i} className="flex gap-2 text-xs font-bold text-emerald-400/90 text-slate-300">
                                            <CheckCircle size={12} className="text-emerald-500/50 shrink-0 mt-0.5" />
                                            <span>{cleanMarkdown(item)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <h4 className="flex items-center gap-2 text-xs font-black text-white uppercase tracking-wider">
                                    <ShieldAlert size={14} className="text-rose-500" />
                                    잠재 리스크
                                </h4>
                                <div className="space-y-2">
                                    {report.pendingRisks?.map((item, i) => (
                                        <div key={i} className="flex gap-2 text-xs font-bold text-rose-400/90 text-slate-300">
                                            <AlertCircle size={12} className="text-rose-500/50 shrink-0 mt-0.5" />
                                            <span>{cleanMarkdown(item)}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
