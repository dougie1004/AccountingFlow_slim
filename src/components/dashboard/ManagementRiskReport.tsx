import React, { useMemo, useState } from 'react';
import { useAccounting } from '../../hooks/useAccounting';
import { ShieldAlert, AlertTriangle, Eye, CheckCircle2, Siren, ArrowRight, Activity, Ban, MessageSquare, FileText, Download, X, Copy } from 'lucide-react';
import { ManagementReport, BusinessRisk, DecisionCandidate, RiskLevel } from '../../types';
import { generateManagementReport, generateNarrativeBriefing } from '../../bridge/StrategicBridge';
import ReactMarkdown from 'react-markdown';

interface ManagementRiskReportProps {
    period?: string; // If omitted, analyzes all data or prompts for period
    onClose: () => void;
}

export const ManagementRiskReport: React.FC<ManagementRiskReportProps> = ({ period = 'All Time', onClose }) => {
    const { subLedger, riskDecisions, addRiskDecision, systemNow } = useAccounting();
    const [selectedRisk, setSelectedRisk] = useState<BusinessRisk | null>(null);
    const [isPreviewOpen, setIsPreviewOpen] = useState(false);

    // 1. Generate Report on Mount/Update
    const report: ManagementReport = useMemo(() => {
        // CONSTITUTION: Use systemNow for judgment
        return generateManagementReport(subLedger, period, systemNow);
    }, [subLedger, period, systemNow]);

    const reportMarkdown = useMemo(() => {
        return generateNarrativeBriefing(report, riskDecisions, systemNow);
    }, [report, riskDecisions, systemNow]);

    const handleDownloadReport = () => {
        const blob = new Blob([reportMarkdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Consulting_Report_${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleCopyReport = () => {
        navigator.clipboard.writeText(reportMarkdown);
        alert('✅ 보고서 내용이 클립보드에 복사되었습니다.');
    };

    const getRiskColor = (level: RiskLevel) => {
        switch (level) {
            case 'Critical': return 'text-rose-500 bg-rose-500/10 border-rose-500/20';
            case 'High': return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
            case 'Medium': return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
            case 'Low': return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
        }
    };

    const getDecisionIcon = (type: DecisionCandidate['type']) => {
        switch (type) {
            case 'Restrict': return <Ban size={16} />;
            case 'Interview': return <MessageSquare size={16} />;
            case 'Monitor': return <Eye size={16} />;
            case 'Policy': return <ShieldAlert size={16} />;
            case 'Approve': return <CheckCircle2 size={16} />;
        }
    };

    const handleDecision = (risk: BusinessRisk, decision: DecisionCandidate) => {
        // Quick MVP: Use window.prompt for comment
        const comment = window.prompt(`[Decision Capture]\n\n선택한 결정: ${decision.label}\n\n이 결정을 내리는 이유나 코멘트를 입력해주세요 (선택):`);

        if (comment !== null) {
            const log = {
                id: crypto.randomUUID(),
                riskId: risk.id,
                decisionId: decision.id,
                decisionLabel: decision.label,
                decidedBy: 'CEO (System)', // MVP Default
                decidedAt: new Date().toISOString(),
                comment: comment
            };
            addRiskDecision(log);
        }
    };

    // Helper to find if current risk is decided
    const currentDecision = useMemo(() => {
        if (!selectedRisk) return null;
        return riskDecisions.find(r => r.riskId === selectedRisk.id);
    }, [selectedRisk, riskDecisions]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-[#0B1221] w-full max-w-6xl h-[90vh] rounded-[2.5rem] border border-white/10 shadow-2xl flex flex-col overflow-hidden relative">

                {/* Header */}
                <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#151D2E]">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-widest border border-rose-500/30 flex items-center gap-2">
                                <Siren size={12} className="animate-pulse" />
                                Phase 4.5.1
                            </span>
                            <span className="text-emerald-500 text-xs font-bold uppercase tracking-widest animate-pulse border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 rounded">
                                Decision Capture Active
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                            Management Risk Briefing
                        </h1>
                        <p className="text-slate-400 mt-2 font-medium">
                            단순 감사 결과가 아닌, <span className="text-white font-bold underline decoration-indigo-500 underline-offset-4">경영진의 의사결정(Decision)</span>을 위한 리스크 분석 리포트입니다.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => setIsPreviewOpen(true)}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 border border-white/10"
                        >
                            <FileText size={18} />
                            Generate Final Report (AI)
                        </button>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-bold transition-all border border-white/5"
                        >
                            Close Briefing
                        </button>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Left: Executive Summary & List */}
                    <div className="w-1/3 border-r border-white/5 flex flex-col bg-[#0f1623]">
                        {/* KPI Cards */}
                        <div className="p-6 grid grid-cols-2 gap-4">
                            <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-2xl">
                                <p className="text-rose-400 text-[10px] font-black uppercase mb-1">Immediate Action</p>
                                <h3 className="text-3xl font-black text-white">{report.actionItems.immediate}건</h3>
                                <p className="text-rose-400/60 text-xs mt-1 font-bold">즉시 판단 필요</p>
                            </div>
                            <div className="bg-amber-500/10 border border-amber-500/20 p-5 rounded-2xl">
                                <p className="text-amber-400 text-[10px] font-black uppercase mb-1">Monitoring</p>
                                <h3 className="text-3xl font-black text-white">{report.actionItems.monitoring}건</h3>
                                <p className="text-amber-400/60 text-xs mt-1 font-bold">모니터링 대상</p>
                            </div>
                        </div>

                        {/* Top Risks List */}
                        <div className="flex-1 overflow-y-auto px-6 pb-6 space-y-3">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 sticky top-0 bg-[#0f1623] py-2 z-10">Detected Risks ({report.summary.totalRisks})</h4>

                            {report.risks.map(risk => {
                                const isDecided = riskDecisions.some(r => r.riskId === risk.id);
                                return (
                                    <button
                                        key={risk.id}
                                        onClick={() => setSelectedRisk(risk)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all group relative overflow-hidden ${selectedRisk?.id === risk.id
                                            ? 'bg-indigo-600 border-indigo-500 shadow-xl shadow-indigo-900/50'
                                            : 'bg-[#151D2E] border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex gap-2">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${getRiskColor(risk.level)} border bg-opacity-20`}>
                                                    {risk.level}
                                                </span>
                                                {isDecided && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-emerald-500 text-black border border-emerald-400 flex items-center gap-1">
                                                        <CheckCircle2 size={10} /> Decided
                                                    </span>
                                                )}
                                            </div>
                                            <span className="text-slate-500 text-[10px] font-mono">{risk.type}</span>
                                        </div>
                                        <h5 className={`font-bold text-sm mb-1 ${selectedRisk?.id === risk.id ? 'text-white' : 'text-slate-300'}`}>
                                            {risk.title}
                                        </h5>
                                        <p className={`text-xs truncate ${selectedRisk?.id === risk.id ? 'text-indigo-200' : 'text-slate-500'}`}>
                                            {risk.description}
                                        </p>
                                        {selectedRisk?.id === risk.id && (
                                            <div className="absolute right-0 bottom-0 p-2 opacity-20">
                                                <ArrowRight size={40} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}

                            {report.risks.length === 0 && (
                                <div className="text-center py-20 text-slate-500 text-sm font-bold">
                                    현재 감지된 주요 경영 리스크가 없습니다.
                                    <br />
                                    <span className="text-xs font-normal opacity-70">안전한 재무 상태입니다.</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Risk Detail & Decision Context */}
                    <div className="w-2/3 bg-[#0B1221] flex flex-col">
                        {selectedRisk ? (
                            <div className="h-full flex flex-col p-8 animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Risk Identity */}
                                <div className="mb-8">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className={`px-3 py-1 rounded-lg text-xs font-black uppercase border ${getRiskColor(selectedRisk.level)}`}>
                                            {selectedRisk.level} Priority
                                        </span>
                                        <span className="text-slate-400 text-sm font-bold flex items-center gap-2">
                                            <Activity size={14} />
                                            {selectedRisk.type} Risk
                                        </span>
                                    </div>
                                    <h2 className="text-3xl font-black text-white mb-4 leading-tight">
                                        {selectedRisk.title}
                                    </h2>
                                    <div className="bg-[#151D2E] p-6 rounded-2xl border border-white/5 mb-6">
                                        <h3 className="text-xs font-black text-slate-500 uppercase mb-2">Observation (관측 사실)</h3>
                                        <p className="text-slate-300 leading-relaxed font-medium text-lg">
                                            {selectedRisk.description}
                                        </p>
                                    </div>

                                    <div className="bg-rose-500/5 p-6 rounded-2xl border border-rose-500/10">
                                        <h3 className="text-xs font-black text-rose-500 uppercase mb-2 flex items-center gap-2">
                                            <AlertTriangle size={12} />
                                            Management Impact (경영 영향)
                                        </h3>
                                        <p className="text-rose-200 leading-relaxed font-bold text-lg">
                                            "{selectedRisk.impact}"
                                        </p>
                                    </div>
                                </div>

                                {/* Decision Candidates or Completed Decision */}
                                <div className="flex-1">
                                    {currentDecision ? (
                                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-8 text-center animate-in zoom-in-95 duration-300">
                                            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4 text-black shadow-lg shadow-emerald-500/40">
                                                <CheckCircle2 size={32} />
                                            </div>
                                            <h3 className="text-2xl font-black text-white mb-2">Decision Captured</h3>
                                            <p className="text-emerald-400 font-bold text-lg mb-6">
                                                "{currentDecision.decisionLabel}"
                                            </p>
                                            <div className="inline-block text-left bg-black/30 rounded-xl p-4 min-w-[300px]">
                                                <p className="text-xs text-slate-500 uppercase font-black mb-1">CEO Comment</p>
                                                <p className="text-slate-300 italic">"{currentDecision.comment || 'No comment provided'}"</p>
                                                <div className="mt-3 pt-3 border-t border-white/10 flex justify-between text-xs text-slate-500">
                                                    <span>By {currentDecision.decidedBy}</span>
                                                    <span>{new Date(currentDecision.decidedAt).toLocaleString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center gap-2">
                                                <CheckCircle2 size={16} className="text-emerald-500" />
                                                Decision Candidates (판단 옵션)
                                                <span className="ml-auto text-[10px] bg-slate-800 px-2 py-1 rounded text-slate-400 normal-case font-medium">
                                                    Click to Select & Capture
                                                </span>
                                            </h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                {selectedRisk.decisionCandidates.map(decision => (
                                                    <button
                                                        key={decision.id}
                                                        onClick={() => handleDecision(selectedRisk, decision)}
                                                        className="group text-left p-6 bg-[#151D2E] hover:bg-indigo-600 rounded-2xl border border-white/10 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-900/50 transition-all active:scale-95"
                                                    >
                                                        <div className="flex items-center gap-2 mb-3 text-slate-400 group-hover:text-indigo-200">
                                                            {getDecisionIcon(decision.type)}
                                                            <span className="text-xs font-black uppercase">{decision.type}</span>
                                                        </div>
                                                        <h4 className="text-lg font-black text-white mb-2 group-hover:text-white">
                                                            {decision.label}
                                                        </h4>
                                                        <p className="text-sm text-slate-400 group-hover:text-indigo-100/80 leading-snug">
                                                            {decision.description}
                                                        </p>
                                                        <div className="mt-4 pt-4 border-t border-white/5 group-hover:border-white/20 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <span className="text-xs font-bold text-white">Click to Select</span>
                                                            <ArrowRight size={14} className="text-white" />
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-50">
                                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                    <ShieldAlert size={48} className="text-slate-500" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-2">Select a Risk to Inspect</h3>
                                <p className="text-slate-400 max-w-md mx-auto">
                                    좌측 리스트에서 리스크 항목을 선택하면<br />
                                    상세 내용과 <span className="text-indigo-400">경영진 판단 옵션(Decision Candidates)</span>을 확인할 수 있습니다.
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Report Preview Overlay */}
                {isPreviewOpen && (
                    <div className="absolute inset-0 z-[60] bg-[#0B1221] flex flex-col animate-in zoom-in-95 fade-in duration-300">
                        <header className="p-8 border-b border-white/5 flex justify-between items-center bg-[#151D2E]">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                                    <FileText className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white">AI Report Preview</h2>
                                    <p className="text-slate-500 text-xs font-bold">서술형 보고서 미리보기 (Phase 5)</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <button
                                    onClick={handleCopyReport}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm font-bold transition-all border border-white/10"
                                >
                                    <Copy size={18} />
                                    Copy
                                </button>
                                <button
                                    onClick={handleDownloadReport}
                                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 border border-white/10"
                                >
                                    <Download size={18} />
                                    Download
                                </button>
                                <button
                                    onClick={() => setIsPreviewOpen(false)}
                                    className="w-11 h-11 bg-white/5 hover:bg-rose-500/20 hover:text-rose-500 rounded-xl flex items-center justify-center transition-all border border-white/10"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </header>

                        <div className="flex-1 overflow-y-auto p-12 flex justify-center bg-[#0B1221]">
                            <div className="max-w-4xl w-full bg-[#151D2E] rounded-3xl p-12 border border-white/5 shadow-2xl prose prose-neutral prose-invert">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ ...props }) => <h1 className="text-4xl font-black text-white mb-8 pb-4 border-b-4 border-indigo-600/30" {...props} />,
                                        h2: ({ ...props }) => <h2 className="text-2xl font-black text-indigo-400 mt-12 mb-6 flex items-center gap-2" {...props} />,
                                        h3: ({ ...props }) => <h3 className="text-xl font-bold text-white mt-8 mb-4 border-l-4 border-indigo-500 pl-4" {...props} />,
                                        p: ({ ...props }) => <p className="text-slate-300 leading-relaxed text-lg mb-4" {...props} />,
                                        ul: ({ ...props }) => <ul className="space-y-3 mb-8" {...props} />,
                                        li: ({ ...props }) => <li className="text-slate-400 list-disc ml-6" {...props} />,
                                        blockquote: ({ node, ...props }) => (
                                            <blockquote className="bg-rose-500/10 border-l-4 border-rose-500 p-6 rounded-r-2xl my-6 italic text-rose-200" {...props} />
                                        ),
                                        strong: ({ ...props }) => <strong className="text-white font-black" {...props} />,
                                    }}
                                >
                                    {reportMarkdown}
                                </ReactMarkdown>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
