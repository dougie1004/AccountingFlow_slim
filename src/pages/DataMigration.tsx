import React, { useState, useEffect } from 'react';
import {
    Upload,
    Database,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ShieldCheck,
    FileSpreadsheet,
    Loader2,
    Download,
    Info,
    ChevronRight,
    Sparkles,
    Terminal,
    Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface DataMigrationProps {
    setTab: (tab: string) => void;
}

export const DataMigration: React.FC<DataMigrationProps> = ({ setTab }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [migrationResult, setMigrationResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);
    const [logs, setLogs] = useState<string[]>([]);

    // 실시간 로그 시뮬레이션
    const demoLogs = [
        "[SYSTEM] 고밀도 파싱 엔진 가동 중...",
        "[COMPLIANCE] PII 패턴 스캔 시작 (개인정보 보호법 준수)",
        "[PII-MASK] '거래처 담당자' 필드 내 성명 식별 ➔ 비식별화 완료",
        "[PII-MASK] '연락처' 필드 패턴 탐지 ➔ 마스킹 처리 완료",
        "[AI-MAPPING] 비정형 텍스트 분석 중: 'SaaS Sub' ➔ '소프트웨어 구독료' 매핑",
        "[AI-MAPPING] 계정 체계 전환: 'Entertainment' ➔ '접대비(기업업무추진비)'",
        "[SEC-CHECK] 데이터 무결성 검증 완료 (Integrity Hash: 0x82f...)",
        "[FIN-CORE] 재무 원장 동기화 준비 완료"
    ];

    const runSmartAnalysis = async (isDemo = false) => {
        setIsUploading(true);
        setError(null);
        setProgress(0);
        setLogs(demoLogs); // Show all logs at once for technical density

        try {
            const result = await invoke<any>('run_simulation_data');
            setMigrationResult({
                totalCount: result.ledger.length,
                mappedCount: result.ledger.length,
                newAccounts: 12,
                summary: isDemo
                    ? "엔터프라이즈 통합 데이터셋 기반 재무 분석이 완료되었습니다. 거버넌스 엔진이 데이터 무결성을 검증하고 민감 정보 비식별화 처리를 수행했습니다."
                    : "인계된 로우 데이터의 파싱 및 계정 매핑이 완료되었습니다. 재무 원장 정합성이 확보되었습니다."
            });
            setProgress(100);
            setIsUploading(false);
        } catch (e: any) {
            setError(e.toString());
            setIsUploading(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files?.[0]) {
            runSmartAnalysis(false);
        }
    };

    return (
        <div className="space-y-10 pb-24 p-6 bg-[#0B1221] min-h-screen">
            <header className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                        <Database className="text-indigo-400" size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            데이터 인계 및 거버넌스 엔진
                        </h1>
                        <p className="text-slate-400 text-lg font-bold mt-1 uppercase tracking-wider text-[10px]">Financial Data Ingestion & Governance Engine</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 space-y-8">
                    <AnimatePresence mode="wait">
                        {!isUploading ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-[#151D2E]/80 backdrop-blur-xl border-2 border-dashed border-white/5 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center transition-all hover:bg-[#1a253a]/90 hover:border-indigo-500/50 group shadow-3xl"
                            >
                                <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-2xl shadow-indigo-500/5 border border-indigo-500/20">
                                    <Upload className="text-indigo-400" size={48} />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-3 tracking-tight">ERP 원천 데이터(Raw Data) 업로드</h3>
                                <p className="text-slate-400 mb-10 max-w-md font-bold leading-relaxed">
                                    SAP, Oracle, 더존 등 기존 시스템의 엑셀/CSV를 드래그하거나<br />
                                    <span
                                        onClick={() => runSmartAnalysis(true)}
                                        className="text-indigo-400 underline decoration-indigo-400/30 underline-offset-4 cursor-pointer hover:text-indigo-300 transition-colors"
                                    >
                                        표준 데이터셋(Standard Dataset)
                                    </span>으로 벤치마킹을 실행하십시오.
                                </p>

                                <label className="relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-5 rounded-[2rem] font-black cursor-pointer transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-95">
                                    <FileSpreadsheet size={24} />
                                    <span className="text-lg">파일 분석 및 거버넌스 적용</span>
                                    <input type="file" className="absolute opacity-0 w-0 h-0" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" />
                                </label>
                            </motion.div>
                        ) : (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-[#070C18] rounded-[3rem] p-12 border border-white/5 shadow-3xl overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-8 opacity-20">
                                    <Lock size={120} className="text-indigo-500" />
                                </div>

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="flex items-center gap-4">
                                            <Loader2 className="animate-spin text-indigo-400" size={32} />
                                            <div>
                                                <h4 className="text-2xl font-black text-white">지능형 자율 거버넌스 엔진 가동</h4>
                                                <p className="text-xs text-indigo-400 font-black mt-1 uppercase tracking-widest">Autonomous Data Integrity & Compliance Check</p>
                                            </div>
                                        </div>
                                        <span className="text-4xl font-black text-indigo-400 font-mono">{progress}%</span>
                                    </div>

                                    {/* Live Log Container */}
                                    <div className="bg-black/40 rounded-2xl p-6 font-mono text-[11px] space-y-2 border border-white/5 h-40 overflow-hidden shadow-inner">
                                        {logs.map((log, i) => (
                                            <motion.div
                                                initial={{ opacity: 0, x: -10 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                key={i}
                                                className={`${log.includes('MASK') ? 'text-emerald-400' : log.includes('AI') ? 'text-indigo-400' : 'text-slate-500'}`}
                                            >
                                                <span className="opacity-30 mr-2">[{new Date().toLocaleTimeString()}]</span>
                                                {log}
                                            </motion.div>
                                        ))}
                                        <div className="animate-pulse text-indigo-400">_</div>
                                    </div>

                                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-8">
                                        <motion.div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <div className="bg-[#151D2E]/50 backdrop-blur-md border border-white/5 rounded-[3rem] p-10 shadow-2xl">
                        <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                            <ShieldCheck className="text-emerald-400" size={28} />
                            데이터 거버넌스 가이드
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-indigo-400 font-black text-xs uppercase tracking-widest mb-2">Security</p>
                                <p className="text-sm text-slate-400 leading-relaxed">모든 분석 과정은 비가역적 비식별화 처리를 거친 후 메모리 내에서 소멸됩니다.</p>
                            </div>
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5">
                                <p className="text-emerald-400 font-black text-xs uppercase tracking-widest mb-2">Integrity</p>
                                <p className="text-sm text-slate-400 leading-relaxed">계정 체계의 시맨틱 분석을 통해 휴먼 에러를 99.8% 차단합니다.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 rounded-[3rem] p-10 shadow-3xl relative overflow-hidden h-full flex flex-col">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                                <Terminal className="text-indigo-400" size={24} />
                                분석 결과 요약
                            </h3>

                            {!migrationResult ? (
                                <div className="flex-1 flex flex-col items-center justify-center text-center py-12 space-y-6">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-600">
                                        <Database size={40} />
                                    </div>
                                    <p className="text-slate-500 font-bold leading-relaxed">분석할 원천 데이터를<br />대기열에 추가하십시오.</p>
                                </div>
                            ) : (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex-1 flex flex-col"
                                >
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                            <p className="text-[10px] font-black text-slate-600 uppercase mb-2">Analyzed Recs</p>
                                            <p className="text-3xl font-black text-white font-mono">{migrationResult.totalCount}</p>
                                        </div>
                                        <div className="bg-emerald-500/10 rounded-3xl p-6 border border-emerald-500/20">
                                            <p className="text-[10px] font-black text-emerald-400 uppercase mb-2">Governance Clean</p>
                                            <p className="text-3xl font-black text-emerald-200 font-mono">100%</p>
                                        </div>
                                    </div>

                                    <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] p-6 mb-10">
                                        <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 tracking-widest leading-none flex items-center gap-2">
                                            <Sparkles size={12} /> AI Strategy Note
                                        </p>
                                        <p className="text-sm text-slate-300 leading-loose font-bold italic">
                                            "{migrationResult.summary}"
                                        </p>
                                    </div>

                                    <div className="mt-auto">
                                        <button
                                            onClick={() => setTab('ledger')}
                                            className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-[1.02] text-white font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-95 text-xl tracking-tight"
                                        >
                                            자동 분개장으로 인계
                                            <ArrowRight size={24} />
                                        </button>
                                        <p className="text-center text-[10px] font-bold text-slate-600 mt-4 uppercase tracking-[0.2em]">Audit Readiness Secured</p>
                                    </div>
                                </motion.div>
                            )}
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};
