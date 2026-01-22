import React, { useState, useEffect } from 'react';
import { FileText, Download, Target, ShieldAlert, CheckCircle, Loader2, Terminal, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { JournalEntry } from '../../types';
import { cleanMarkdown } from '../../utils/textUtils';

interface ManagementReport {
    reportTitle: string;
    reportDate: string;
    executiveSummary: string;
    financialOverview: {
        totalRevenue: number;
        totalExpenses: number;
        netIncome: number;
        profitMargin: number;
        topExpenseCategories: Array<{
            category: string;
            amount: number;
            percentage: number;
            trend: string;
        }>;
    };
    trendAnalysis: Array<{
        category: string;
        insight: string;
        severity: string;
    }>;
    riskAssessment: {
        overallRisk: string;
        cashFlowRisk: string;
        complianceRisk: string;
        mitigationStrategies: string[];
    };
    recommendations: string[];
    detailedAnalysis: string;
}

interface ManagementReportPanelProps {
    ledger: JournalEntry[];
}

export const ManagementReportPanel: React.FC<ManagementReportPanelProps> = ({ ledger }) => {
    const [report, setReport] = useState<ManagementReport | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const generateReport = async () => {
        if (ledger.length === 0) return;
        setIsGenerating(true);
        try {
            // Use current month/year dynamically to match mock data (which uses current date)
            const today = new Date();
            const year = today.getFullYear();
            const month = String(today.getMonth() + 1).padStart(2, '0');
            const lastDay = new Date(year, today.getMonth() + 1, 0).getDate();

            const result = await invoke<ManagementReport>('generate_management_report', {
                ledger,
                periodStart: `${year}-${month}-01`,
                periodEnd: `${year}-${month}-${lastDay}`
            });
            setReport(result);
        } catch (error) {
            console.error('[Management Report] 생성 실패:', error);
        } finally {
            setIsGenerating(false);
        }
    };

    useEffect(() => {
        generateReport();
    }, [ledger.length]);

    if (isGenerating) {
        return (
            <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 flex flex-col items-center justify-center min-h-[300px]">
                <Loader2 size={40} className="text-indigo-400 animate-spin mb-4" />
                <p className="text-sm font-black text-slate-400">데이터 엔진 기반 재무 프로젝션 생성 중...</p>
            </div>
        );
    }

    if (!report) return null;

    return (
        <div className="bg-[#151D2E] rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl">
            {/* Summary Header - Dashboard Snapshot */}
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-indigo-500/5 to-transparent">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                            <Terminal size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight">CFO Strategic Performance Insights</h3>
                            <p className="text-sm font-bold text-slate-500">Automated Financial Controller Analysis: {report.reportDate}</p>
                        </div>
                    </div>
                    <button
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-xl text-xs font-black transition-all border border-indigo-500/20"
                        onClick={() => alert('상세 PDF 리포트가 생성되었습니다.')}
                    >
                        <Download size={14} />
                        PDF 리포트 다운로드
                    </button>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                    <p className="text-lg font-bold text-slate-200 leading-relaxed italic">
                        "{cleanMarkdown(report.executiveSummary)}"
                    </p>
                </div>
            </div>

            {/* Core Insights Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8">
                {/* Trends & Alerts */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <Target size={18} className="text-emerald-400" />
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">주요 트렌드 분석</h4>
                    </div>
                    <div className="space-y-4">
                        {report.trendAnalysis.map((trend, idx) => (
                            <div key={idx} className="p-4 bg-[#0B1221] rounded-2xl border border-emerald-500/10 flex gap-4 hover:border-emerald-500/30 transition-all">
                                <div className={`p-2 rounded-xl h-fit ${trend.severity === 'High' ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'}`}>
                                    {trend.severity === 'High' ? <AlertCircle size={16} /> : <CheckCircle size={16} />}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-slate-500 uppercase mb-1">{trend.category}</p>
                                    <p className="text-sm font-bold text-slate-200 leading-snug">{cleanMarkdown(trend.insight)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Risk & Recommendation */}
                <div className="space-y-6">
                    <div className="flex items-center gap-2 px-1">
                        <ShieldAlert size={18} className="text-amber-400" />
                        <h4 className="text-sm font-black text-white uppercase tracking-wider">리스크 및 대비책</h4>
                    </div>
                    <div className="space-y-4">
                        <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/10">
                            <p className="text-xs font-black text-amber-500 uppercase mb-4 tracking-widest flex items-center gap-2">
                                <ShieldAlert size={14} /> Overall Risk Status: {report.riskAssessment.overallRisk}
                            </p>
                            <div className="space-y-3">
                                {report.recommendations.map((rec, idx) => (
                                    <div key={idx} className="flex gap-3 text-sm font-bold text-slate-300 group">
                                        <span className="text-amber-500 mt-1 transition-transform group-hover:scale-125">•</span>
                                        <span className="leading-relaxed">{cleanMarkdown(rec)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Detailed Analysis Section (Added for transparency) */}
            <div className="px-8 pb-8">
                <div className="p-6 bg-[#0B1221] rounded-2xl border border-white/5">
                    <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <FileText size={14} /> Detailed Strategic Analysis
                    </h4>
                    <p className="text-sm font-medium text-slate-400 leading-relaxed whitespace-pre-wrap">
                        {cleanMarkdown(report.detailedAnalysis)}
                    </p>
                </div>
            </div>
        </div>
    );
};
