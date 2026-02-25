import { useState, useEffect, useMemo } from "react";
import { safeInvoke, safeListen } from "../lib/tauri-bridge";
import {
    ArrowRight, ShieldAlert, Cpu, Database,
    Server, Monitor, AlertCircle,
    Share2, GitBranch, Terminal, Activity,
    Zap, Flame, Lock, Eye, BarChart3
} from "lucide-react";
import { useApp } from "../App";
import { ConstitutionMonitor } from "../constitution/ConstitutionMonitor";
import { useAccounting } from "../hooks/useAccounting";
import { analyzeStrategicDeviation } from "../bridge/StrategicBridge";

interface Violation {
    id: string;
    description: string;
    severity: "High" | "Medium" | "Low";
    timestamp: string;
    affected_nodes: string[];
}

interface MiningResult {
    total_nodes: number;
    total_edges: number;
    violation_count: number;
    throughput_avg: string;
    violations: Violation[];
}

interface MockFile {
    name: string;
    type: string;
    size: string;
    path: string;
}

export default function ProcessMonitoring() {
    const { activeProject } = useApp();
    const { injectStressData, ledger, systemNow } = useAccounting();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [result, setResult] = useState<MiningResult | null>(null);
    const [progress, setProgress] = useState(0);
    const [mockFiles, setMockFiles] = useState<MockFile[]>([]);
    const [selectedMock, setSelectedMock] = useState<MockFile | null>(null);

    // [Phase 3] Silent Observation Logic
    const deviations = useMemo(() => {
        try {
            const currentLedger = ledger.filter(e => !systemNow || e.date <= systemNow);
            return analyzeStrategicDeviation(currentLedger);
        } catch (e) {
            console.error("Strategic Observation Error:", e);
            return null; // Return null to signal error state
        }
    }, [ledger, systemNow]);

    useEffect(() => {
        // [Immunity System] Process mining is always a REAL_WORLD observation tool
        ConstitutionMonitor.getInstance().setContext('REAL_WORLD');

        let unlistenFn: (() => void) | undefined;

        const setupListener = async () => {
            const unlisten = await safeListen("process-mining-progress", (e: any) => {
                setProgress(e.payload as number);
            });
            unlistenFn = unlisten;
        };

        setupListener();
        return () => { if (unlistenFn) unlistenFn(); };
    }, []);

    const runAnalysis = async () => {
        setIsAnalyzing(true);
        setResult(null);
        try {
            const res: MiningResult = await safeInvoke("analyze_process_mining", { projectType: activeProject || "Default" });
            setResult(res);
        } catch (err) {
            alert(err);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const generateMock = async () => {
        try {
            const res: MockFile[] = await safeInvoke("generate_mining_mock_data");
            setMockFiles(res);
            if (res.length > 0) setSelectedMock(res[0]);
        } catch (err) {
            alert(err);
        }
    };

    return (
        <div className="p-8 md:p-12 space-y-10 bg-[#0B1221] min-h-screen text-slate-300">
            {/* [Phase 3: Observation Console] */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-4">
                <div className="lg:col-span-3 bg-[#0F172A] border border-indigo-500/20 rounded-[2.5rem] p-8 overflow-hidden relative">
                    <div className="absolute top-0 right-0 p-8 text-indigo-500/5 pointer-events-none"><Eye size={200} /></div>
                    <div className="relative z-10 space-y-8">
                        <header className="flex justify-between items-end border-b border-indigo-500/20 pb-6">
                            <div className="space-y-2">
                                <div className="flex items-center gap-3 text-indigo-400">
                                    <Monitor size={24} className="animate-pulse" />
                                    <h2 className="text-xl font-black uppercase tracking-[0.2em]">Strategic Observation Console</h2>
                                </div>
                                <p className="text-sm font-bold text-slate-500 max-w-2xl">
                                    실시간 재무 데이터와 시나리오 기준값(Baseline) 사이의 편차를 감시합니다.
                                    현재 단계에서는 AI의 주관적 개입 없이, <span className="text-indigo-400">객관적 수치 괴리(Hard Violation)</span>만 리포팅합니다.
                                </p>
                            </div>
                            <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/20">
                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Monitoring</span>
                            </div>
                        </header>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {!deviations ? (
                                <div className="col-span-full bg-rose-500/10 border border-rose-500/30 p-8 rounded-[2rem] flex flex-col items-center justify-center gap-4 text-center">
                                    <ShieldAlert className="text-rose-500 w-12 h-12 animate-bounce" />
                                    <div>
                                        <h3 className="text-lg font-black text-rose-400 uppercase tracking-widest mb-1">Observation Suspended</h3>
                                        <p className="text-sm font-bold text-rose-500/70">Data Integrity Violation Detected</p>
                                    </div>
                                </div>
                            ) : (
                                deviations.map(d => {
                                    const isCritical = d.severity === 'CRITICAL';
                                    const isWatch = d.severity === 'WATCH';
                                    const colorClass = isCritical ? 'text-rose-500' : isWatch ? 'text-amber-400' : 'text-emerald-500';
                                    const bgClass = isCritical ? 'bg-rose-500/5 border-rose-500/20' : isWatch ? 'bg-amber-500/5 border-amber-500/20' : 'bg-emerald-500/5 border-emerald-500/20';

                                    return (
                                        <div key={d.id} className={`${bgClass} border rounded-[2rem] p-6 hover:scale-[1.02] transition-transform duration-300 group`}>
                                            {(() => {
                                                const isRatio = d.metric === 'SalesConcentration' || d.metric === 'InfraEfficiency';
                                                return (
                                                    <>
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div className="space-y-1">
                                                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border ${isCritical ? 'bg-rose-500/20 border-rose-500/30 text-rose-400' : isWatch ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'}`}>
                                                                    {d.severity}
                                                                </span>
                                                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">{d.category}</div>
                                                            </div>
                                                            <div className={`p-2 rounded-xl bg-black/20 ${colorClass}`}>
                                                                <Activity size={16} />
                                                            </div>
                                                        </div>

                                                        <div className="mb-4">
                                                            <h4 className="text-sm font-black text-slate-300 uppercase tracking-tight mb-1">{d.metric}</h4>
                                                            <div className="flex items-baseline gap-2">
                                                                <span className={`text-3xl font-black ${colorClass} tracking-tighter`}>
                                                                    {d.variancePercent > 0 ? '+' : ''}{d.variancePercent}%
                                                                </span>
                                                            </div>
                                                            <div className="flex flex-col gap-1 mt-3 bg-black/20 p-3 rounded-xl border border-white/5">
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-slate-500 uppercase">Actual</span>
                                                                    <span className="font-mono font-black text-slate-300">
                                                                        {isRatio ? `${d.actual.toFixed(1)}%` : `${d.actual.toLocaleString()} ₩`}
                                                                    </span>
                                                                </div>
                                                                <div className="flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-indigo-500/60 uppercase">Base</span>
                                                                    <span className="font-mono font-black text-indigo-400/60">
                                                                        {isRatio ? `${d.baseline.toFixed(1)}%` : `${d.baseline.toLocaleString()} ₩`}
                                                                    </span>
                                                                </div>
                                                                <div className="pt-1 mt-1 border-t border-white/5 flex justify-between items-center text-[10px]">
                                                                    <span className="font-bold text-slate-500 uppercase tracking-tighter">Variance (Δ)</span>
                                                                    <span className={`font-mono font-black ${d.delta >= 0 ? 'text-emerald-500/70' : 'text-rose-500/70'}`}>
                                                                        {d.delta > 0 ? '+' : ''}{d.delta.toLocaleString()}{isRatio ? '%' : ''}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="pt-4 border-t border-white/5">
                                                            <p className="text-xs font-bold text-slate-400 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all">
                                                                {d.insight}
                                                            </p>
                                                        </div>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* [Stress Control Center] - Step A & B Checkpoint */}
            <div className="bg-rose-500/5 border-2 border-rose-500/20 rounded-[40px] p-8 md:p-10 mb-8 overflow-hidden relative group">
                <div className="absolute top-0 right-0 p-8 text-rose-500/10 group-hover:text-rose-500/20 transition-colors"><Flame size={120} /></div>
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 text-rose-500">
                            <ShieldAlert size={28} className="animate-pulse" />
                            <h2 className="text-2xl font-black uppercase tracking-tighter">Stress Control Center</h2>
                        </div>
                        <p className="text-slate-400 font-bold max-w-xl">
                            <span className="text-rose-400/80 uppercase text-[11px] block mb-1">Article 5: Fail-Fast Policy (Step A/B)</span>
                            고의적으로 오염된 유전자를 주입하여 시스템의 <strong>방어 능력(Constitution)</strong>을 검증합니다.
                            주입 시 즉시 Fail-Fast가 작동해야 합니다.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        <button
                            onClick={() => injectStressData('unbalanced')}
                            className="px-6 py-4 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 group/btn"
                        >
                            <Zap size={16} className="group-hover:scale-125 transition-transform" /> 1원 차대 오차 주입
                        </button>
                        <button
                            onClick={() => injectStressData('negative_asset')}
                            className="px-6 py-4 bg-orange-500/10 hover:bg-orange-500/20 border border-orange-500/30 text-orange-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 group/btn"
                        >
                            <Flame size={16} className="group-hover:scale-125 transition-transform" /> 음수 잔액 폭탄 주입
                        </button>
                        <button
                            onClick={() => injectStressData('date_error')}
                            className="px-6 py-4 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 group/btn"
                        >
                            <Lock size={16} className="group-hover:scale-125 transition-transform" /> 미래 날짜 오류 주입
                        </button>
                    </div>
                </div>
            </div>

            <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <GitBranch className="text-blue-500 w-5 h-5" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Advanced Process Mining Eng.</span>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tighter">AI 프로세스 마이닝 & 이상 탐지</h1>
                    <p className="text-slate-500 font-medium">ERP/SCM 로그를 분석하여 프로세스 우회, 승인 절차 위반 등 부정한 거래 패턴을 디지털 트레이싱 합니다.</p>
                </div>
                <div className="flex gap-4">
                    <button
                        onClick={generateMock}
                        className="bg-white/5 border border-white/10 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 transition-all active:scale-95"
                    >
                        SAMPLE DATA GENERATE
                    </button>
                    <button
                        onClick={runAnalysis}
                        disabled={isAnalyzing}
                        className="bg-blue-600 text-white px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-500 transition-all shadow-xl shadow-blue-900/40 disabled:opacity-50 active:scale-95 flex items-center gap-2"
                    >
                        {isAnalyzing ? <Cpu className="animate-spin w-4 h-4" /> : <Activity className="w-4 h-4" />}
                        {isAnalyzing ? "ANALYZING LOGS..." : "START PROCESS MINING"}
                    </button>
                </div>
            </header>

            {isAnalyzing && (
                <div className="bg-white/5 border border-blue-500/30 p-12 rounded-[40px] animate-in fade-in duration-500 flex flex-col items-center gap-8">
                    <div className="relative">
                        <Cpu size={64} className="text-blue-500 animate-pulse" />
                        <div className="absolute inset-0 bg-blue-500/20 blur-3xl animate-ping rounded-full" />
                    </div>
                    <div className="w-full max-w-xl space-y-4">
                        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-blue-400">
                            <span>Tracing Event Chains...</span>
                            <span>{progress}%</span>
                        </div>
                        <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                    </div>
                </div>
            )}

            {result && !isAnalyzing && (
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Metrics */}
                    <div className="lg:col-span-1 space-y-6">
                        {[
                            { label: "Detected Violations", value: result.violation_count, color: "text-rose-500", icon: <ShieldAlert /> },
                            { label: "Total Event Nodes", value: result.total_nodes, color: "text-white", icon: <GitBranch /> },
                            { label: "Connected Flows", value: result.total_edges, color: "text-blue-400", icon: <Share2 /> },
                            { label: "Avg Throughput", value: result.throughput_avg, color: "text-emerald-400", icon: <Monitor /> }
                        ].map((m, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-3xl">
                                <div className="flex justify-between items-start mb-4">
                                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{m.label}</span>
                                    <span className={`${m.color} opacity-20`}>{m.icon}</span>
                                </div>
                                <p className={`text-3xl font-black ${m.color}`}>{m.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Detailed Violations List */}
                    <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-[32px] overflow-hidden flex flex-col">
                        <div className="p-8 border-b border-white/10 flex justify-between items-center bg-white/5">
                            <h3 className="text-xl font-black text-white flex items-center gap-3">
                                <AlertCircle className="text-rose-500" /> 이상 관리 지점 분석 결과
                            </h3>
                            <button className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-white transition-colors">
                                <Terminal size={14} /> View Raw Trace
                            </button>
                        </div>
                        <div className="p-8 space-y-4 overflow-y-auto max-h-[600px] custom-scrollbar">
                            {result.violations.map((v) => (
                                <div key={v.id} className="bg-white/5 border border-white/5 rounded-2xl p-6 hover:border-rose-500/30 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className={`w-2 h-2 rounded-full ${v.severity === 'High' ? 'bg-rose-500 animate-pulse' : 'bg-amber-500'}`} />
                                            <span className="text-xs font-black text-white uppercase tracking-tighter">{v.id}</span>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-500 font-mono">{v.timestamp}</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-200 leading-relaxed mb-6">{v.description}</p>
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest mr-2">Trace Chain:</span>
                                        {v.affected_nodes.map((node, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <span className="bg-slate-900 border border-white/10 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 group-hover:text-blue-400 transition-colors">
                                                    {node}
                                                </span>
                                                {idx < v.affected_nodes.length - 1 && <ArrowRight size={12} className="text-slate-700" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {!result && !isAnalyzing && mockFiles.length === 0 && (
                <div className="py-32 flex flex-col items-center justify-center gap-8 border-4 border-dashed border-white/5 rounded-[60px] bg-white/[0.01]">
                    <div className="p-10 bg-white/5 rounded-full text-slate-700">
                        <Monitor size={80} />
                    </div>
                    <div className="text-center space-y-2">
                        <h3 className="text-2xl font-black text-white">동작 대기 중...</h3>
                        <p className="text-slate-500 font-medium">실시간 ERP 데이터를 분석하거나 샘플 데이터를 생성하여 시작하세요.</p>
                    </div>
                </div>
            )}

            {mockFiles.length > 0 && !result && !isAnalyzing && (
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 space-y-6">
                    <h3 className="text-xl font-black text-white flex items-center gap-3">
                        <Database className="text-blue-500" /> 준비된 로그 데이터 ({mockFiles.length}건)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {mockFiles.map((file, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:bg-white/10 transition-all cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-blue-600 transition-colors border border-white/5">
                                        <Server size={20} className="text-slate-400 group-hover:text-white" />
                                    </div>
                                    <span className="text-[9px] font-bold text-slate-500">{file.size}</span>
                                </div>
                                <h4 className="font-bold text-slate-200 mb-1">{file.name}</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{file.type}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}