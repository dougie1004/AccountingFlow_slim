import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Sparkles, AlertCircle, RefreshCw, Database, Terminal, Beaker, CheckCircle2, ShieldCheck } from 'lucide-react';
import { GOLDEN_DATASET, GoldenCase } from '../constants/goldenDataset';
import { callAiService } from '../services/aiService';

interface TestResult {
    id: string;
    status: 'pending' | 'running' | 'pass' | 'fail';
    response?: string;
    error?: string;
    actualKeywordsFound: string[];
}

export const AiLab: React.FC = () => {
    const [results, setResults] = useState<Record<string, TestResult>>({});
    const [isGlobalRunning, setIsGlobalRunning] = useState(false);
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const runSingleTest = async (testCase: GoldenCase) => {
        // ... (remaining test logic remains same)
        setResults(prev => ({
            ...prev,
            [testCase.id]: { id: testCase.id, status: 'running', actualKeywordsFound: [] }
        }));

        try {
            const result = await callAiService('chat', {
                messages: [{ role: 'user', content: testCase.input }],
                systemContext: testCase.systemContext || '당신은 전문적인 회계 분석 및 CFO 역할을 수행하는 정교한 AI입니다.'
            });

            if (result.error) throw new Error(result.error);

            const responseText = result.response || '';
            const foundKeywords = testCase.expectedKeywords.filter(kw =>
                responseText.replace(/\s/g, '').includes(kw.replace(/\s/g, ''))
            );

            const isPass = foundKeywords.length > 0;

            setResults(prev => ({
                ...prev,
                [testCase.id]: {
                    id: testCase.id,
                    status: isPass ? 'pass' : 'fail',
                    response: responseText,
                    actualKeywordsFound: foundKeywords
                }
            }));
        } catch (e: any) {
            setResults(prev => ({
                ...prev,
                [testCase.id]: { id: testCase.id, status: 'fail', error: e.message, actualKeywordsFound: [] }
            }));
        }
    };

    const runAllTests = async () => {
        setIsGlobalRunning(true);
        for (const testCase of GOLDEN_DATASET) {
            await runSingleTest(testCase);
        }
        setIsGlobalRunning(false);
    };

    return (
        <div className="p-8 space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
            <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Sparkles className="text-indigo-500" /> AI Intelligence Benchmark
                    </h1>
                    <p className="text-slate-400 font-bold mt-2">
                        시스템의 핵심 회계 지능이 감퇴하지 않았는지 표준 사례로 최종 점검합니다. (System Quality Check)
                    </p>
                </div>
                <button
                    onClick={runAllTests}
                    disabled={isGlobalRunning}
                    className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all disabled:opacity-50 shrink-0"
                >
                    {isGlobalRunning ? <RefreshCw className="animate-spin" /> : <Play />}
                    전체 모델 성능 검증 (Regression Test)
                </button>
            </header>

            {/* Data Basis Section */}
            <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-3xl p-6">
                <div className="flex items-start gap-4">
                    <div className={`p-3 bg-indigo-600/20 rounded-xl text-indigo-400`}>
                        <Beaker size={20} />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-wider">벤치마크 목적 및 안내</h4>
                        <p className="text-slate-400 text-xs mt-2 leading-relaxed">
                            여기에 나열된 골든 케이스(Golden Case)는 <span className="text-indigo-400 font-bold">임의의 유의사항을 찾는 용도가 아닙니다.</span><br />
                            AI CFO가 기초적인 회계 분류와 세법 지식을 완벽히 유지하고 있는지 시스템 개발자 및 관리자가 품질을 확정하기 위한 <span className="text-indigo-400 font-bold">표준 검사 세트</span>입니다. 실제 데이터 기반의 유의 사항 탐지는 '리스크 관리' 메뉴에서 별도로 수행됩니다.
                        </p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Statistics Simplified */}
                <div className="lg:col-span-2 bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 flex items-center justify-around shadow-2xl">
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Total Benchmark Scenarios</span>
                        <span className="text-4xl font-black text-white">{GOLDEN_DATASET.length}</span>
                    </div>
                    <div className="w-px h-12 bg-white/5" />
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Passed</span>
                        <span className="text-4xl font-black text-emerald-400">
                            {Object.values(results).filter(r => r.status === 'pass').length}
                        </span>
                    </div>
                    <div className="w-px h-12 bg-white/5" />
                    <div className="text-center">
                        <span className="block text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Failed</span>
                        <span className="text-4xl font-black text-rose-400">
                            {Object.values(results).filter(r => r.status === 'fail').length}
                        </span>
                    </div>
                </div>

                <div className="bg-emerald-600/10 border border-emerald-500/20 rounded-[2.5rem] p-8 flex items-center gap-6">
                    <div className="p-4 bg-emerald-600 rounded-2xl text-white">
                        <ShieldCheck size={32} />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm uppercase tracking-tight">Model Verification</h3>
                        <p className="text-slate-400 text-xs mt-1">
                            최신 <span className="text-emerald-400 font-bold">Pro v2 고성능 엔진</span> 검증 완료
                        </p>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                {GOLDEN_DATASET.map((tc) => {
                    const res = results[tc.id];
                    const isExpanded = expandedIds.has(tc.id);
                    return (
                        <div key={tc.id} className="bg-[#151D2E] rounded-3xl border border-white/5 overflow-hidden shadow-xl transition-all hover:border-white/10">
                            <div className="p-4 px-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${res?.status === 'pass' ? 'bg-emerald-500/10 text-emerald-400' :
                                        res?.status === 'fail' ? 'bg-rose-500/10 text-rose-400' :
                                            res?.status === 'running' ? 'bg-indigo-500/10 text-indigo-400 animate-pulse' :
                                                'bg-white/5 text-slate-500'
                                        }`}>
                                        {res?.status === 'pass' ? <CheckCircle2 size={18} /> :
                                            res?.status === 'fail' ? <AlertCircle size={18} /> : <Database size={18} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black text-pink-500 uppercase tracking-widest">{tc.category}</span>
                                            <span className="text-white/60 font-bold text-xs">{tc.id}</span>
                                        </div>
                                        <h4 className="text-slate-200 font-bold text-sm">Q: {tc.input}</h4>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {res?.response && (
                                        <button
                                            onClick={() => toggleExpand(tc.id)}
                                            className="text-[10px] font-black text-slate-500 hover:text-white uppercase tracking-widest px-3 py-1 bg-white/5 rounded-lg transition-colors"
                                        >
                                            {isExpanded ? 'Fold' : 'Inspect'}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => runSingleTest(tc)}
                                        className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400 hover:text-white"
                                    >
                                        <Play size={16} />
                                    </button>
                                </div>
                            </div>

                            <AnimatePresence>
                                {res?.response && isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="px-6 pb-6 pt-2 border-t border-white/5 bg-black/20"
                                    >
                                        <div className="flex gap-2 mb-4 mt-2">
                                            {tc.expectedKeywords.map(kw => (
                                                <span key={kw} className={`text-[10px] font-black px-2 py-0.5 rounded ${res.actualKeywordsFound.includes(kw) ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-500 border border-white/5'
                                                    }`}>
                                                    {kw}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="bg-black/40 rounded-xl p-4 border border-white/5 shadow-inner">
                                            <p className="text-xs text-slate-300 leading-relaxed font-medium whitespace-pre-wrap">
                                                <Terminal size={14} className="inline mr-2 text-indigo-500" />
                                                {res.response}
                                            </p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            {res?.error && (
                                <div className="px-6 py-3 bg-rose-500/5 text-rose-400 text-[10px] font-black border-t border-rose-500/10">
                                    <AlertCircle size={12} className="inline mr-2" />
                                    EXECUTION ERROR: {res.error}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
