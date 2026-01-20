import React, { useState, useMemo, useEffect } from 'react';
import {
    Cpu,
    Coins,
    Globe,
    Layers,
    ChevronRight,
    TrendingUp,
    ShieldCheck,
    Zap,
    ArrowRight,
    BarChart3,
    CheckCircle2,
    AlertCircle,
    Settings2,
    Lock,
    Search,
    FileArchive,
    Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';
import { useAccounting } from '../hooks/useAccounting';
import { JournalEntry } from '../types';

interface AdvancedLedgerOutput {
    status: string;
    summary: string;
    content: any;
    suggestedEntries: SuggestedEntry[];
}

interface SuggestedEntry {
    accountCode: string;
    accountName: string;
    debit: number;
    credit: number;
    description: string;
}

export const AdvancedLedger: React.FC = () => {
    const { ledger, addEntries, config } = useAccounting();
    const [activeModule, setActiveModule] = useState<'rnd' | 'stock' | 'fx' | 'tax' | 'dd' | 'ir'>('rnd');
    const [simulationResult, setSimulationResult] = useState<AdvancedLedgerOutput | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [showApplySuccess, setShowApplySuccess] = useState(false);

    // Form States
    const [capRatio, setCapRatio] = useState(0.5);
    const [irResult, setIrResult] = useState<any>(null);
    const [stockInputs, setStockInputs] = useState({
        stockPrice: 12000,
        exercisePrice: 8000,
        vestingYears: 2,
        riskFreeRate: 0.035,
        volatility: 0.45,
        quantity: 5000
    });
    const [fxInputs, setFxInputs] = useState({
        balance: 5000, // USD
        currentRate: 1345,
        bookRate: 1310
    });

    const runSimulation = async (moduleId: string, payload: any) => {
        setIsProcessing(true);
        try {
            if (moduleId === 'ir_summary') {
                const result = await invoke<any>('get_ir_financial_summary', { ledger });
                setIrResult(result);
                setSimulationResult(null);
            } else {
                const result = await invoke<AdvancedLedgerOutput>('process_advanced_ledger', {
                    input: { moduleId, payload },
                    ledger
                });
                setSimulationResult(result);
                setIrResult(null);
            }
        } catch (e) {
            console.error(e);
            alert('분석 중 오류가 발생했습니다.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDDExport = async () => {
        setIsProcessing(true);
        try {
            const message = await invoke<string>('generate_bridge_package', {
                ledger,
                tenantId: config.tenantId
            });
            alert(message);
        } catch (e) {
            console.error(e);
            alert('실사 패키지 생성 실패: ' + e);
        } finally {
            setIsProcessing(false);
        }
    };

    const applySuggestedEntries = () => {
        if (!simulationResult) return;

        const today = new Date().toISOString().split('T')[0];
        const newEntries: JournalEntry[] = simulationResult.suggestedEntries.map((se, idx) => ({
            id: `ADV-${Date.now()}-${idx}`,
            date: today,
            description: se.description,
            debitAccount: se.debit > 0 ? se.accountName : "대체계정",
            creditAccount: se.credit > 0 ? se.accountName : "대체계정",
            amount: Math.max(se.debit, se.credit),
            vat: 0,
            type: 'Asset', // Simplified for simulation
            status: 'Approved',
            version: 1,
        }));

        addEntries(newEntries);
        setShowApplySuccess(true);
        setTimeout(() => setShowApplySuccess(false), 3000);
    };

    const modules = [
        { id: 'rnd', title: 'R&D 자산화', icon: Cpu, color: 'text-blue-400' },
        { id: 'tax', title: '세액공제 탐지', icon: Search, color: 'text-amber-400' },
        { id: 'stock', title: '스톡옵션 계산', icon: Coins, color: 'text-purple-400' },
        { id: 'fx', title: '외환 평가', icon: Globe, color: 'text-emerald-400' },
        { id: 'ir', title: 'IR 재무 요약', icon: BarChart3, color: 'text-indigo-400' },
        { id: 'dd', title: '투자 실사 준비', icon: FileArchive, color: 'text-rose-400' },
    ];

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
                    <Zap className="text-indigo-400" />
                    Advanced Ledger <span className="text-slate-500 font-normal text-lg ml-2">전략적 CFO 모듈</span>
                </h1>
                <p className="text-slate-400 max-w-2xl text-lg">
                    전문 회계 지식을 AI에 이식하여 기업 가치(Valuation)를 높이고 세금을 절감합니다.
                </p>
            </div>

            <div className="flex flex-wrap gap-4 p-1 bg-slate-900/50 rounded-2xl w-fit border border-white/5">
                {modules.map(mod => (
                    <button
                        key={mod.id}
                        onClick={() => {
                            setActiveModule(mod.id as any);
                            setSimulationResult(null);
                            setIrResult(null);
                        }}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeModule === mod.id
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        <mod.icon size={18} />
                        {mod.title}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    <div className="bg-[#151D2E]/80 border border-indigo-500/30 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden group">
                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={`p-3 rounded-2xl ${activeModule === 'rnd' ? 'bg-blue-500/20 text-blue-400' :
                                        activeModule === 'tax' ? 'bg-amber-500/20 text-amber-400' :
                                            activeModule === 'stock' ? 'bg-purple-500/20 text-purple-400' :
                                                activeModule === 'ir' ? 'bg-indigo-500/20 text-indigo-400' :
                                                    activeModule === 'fx' ? 'bg-emerald-500/20 text-emerald-400' :
                                                        'bg-rose-500/20 text-rose-400'
                                        }`}>
                                        {activeModule === 'rnd' ? <Cpu size={24} /> :
                                            activeModule === 'tax' ? <Search size={24} /> :
                                                activeModule === 'stock' ? <Coins size={24} /> :
                                                    activeModule === 'ir' ? <BarChart3 size={24} /> :
                                                        activeModule === 'fx' ? <Globe size={24} /> :
                                                            <FileArchive size={24} />}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-white">
                                            {activeModule === 'rnd' ? 'R&D 인건비 자산화 시뮬레이터' :
                                                activeModule === 'tax' ? '지능형 세액공제 탐지기 (Tax Credit Finder)' :
                                                    activeModule === 'stock' ? '스톡옵션 주식보상비용 계산기 (Black-Scholes)' :
                                                        activeModule === 'ir' ? 'VC 투자 유치용 IR 재무 데이터 요약' :
                                                            activeModule === 'fx' ? '실시간 외환 예금/채무 평가' :
                                                                'AI 투자 유치 실사 패키징 (Due Diligence Ready)'}
                                        </h2>
                                        <p className="text-slate-400 text-sm">로컬 환경에서 안전하게 계산하며 전문 리포트를 생성합니다.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 bg-slate-950/50 px-3 py-1.5 rounded-full uppercase tracking-widest border border-white/5">
                                    <Lock size={10} /> Local Execution
                                </div>
                            </div>

                            <div className="space-y-6 bg-slate-900/40 p-8 rounded-3xl border border-white/5">
                                {activeModule === 'rnd' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-between items-end mb-2">
                                            <label className="text-sm font-bold text-slate-300 uppercase tracking-widest flex items-center gap-2">
                                                <Settings2 size={14} /> 자산화 비율 설정 (Capitalization Ratio)
                                            </label>
                                            <span className="text-3xl font-black text-indigo-400">{(capRatio * 100).toFixed(0)}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0" max="1" step="0.05"
                                            value={capRatio}
                                            onChange={(e) => setCapRatio(parseFloat(e.target.value))}
                                            className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                    </div>
                                )}

                                {activeModule === 'tax' && (
                                    <div className="space-y-4">
                                        <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                            <p className="text-sm text-amber-200 leading-relaxed">
                                                <span className="font-bold">⚠️ Notice:</span> 현재 장부에 기록된 인건비와 태그를 분석하여 '연구인력개발비' 및 '청년고용' 세액공제 가능액을 추정합니다.
                                            </p>
                                        </div>
                                        <p className="text-slate-400 text-sm">별도의 입력값 없이 현재 확정된 전표(Approved)를 전수 조사합니다.</p>
                                    </div>
                                )}

                                {activeModule === 'dd' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                '1년치 전회계 전표 암호화 패키징',
                                                '디지털 증빙(영수증) 무결성 검증 포함',
                                                '테넌트 전용 AES-256 키 보안 적용',
                                                '실사 대응용 .af_audit 파일 생성'
                                            ].map((t, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-950/30 p-3 rounded-xl">
                                                    <CheckCircle2 size={14} className="text-emerald-400" />
                                                    {t}
                                                </div>
                                            ))}
                                        </div>
                                        <p className="text-slate-500 text-xs text-center italic">투자자나 회계법인에게 전송할 수 있는 보안 패키지를 1초 만에 생성합니다.</p>
                                    </div>
                                )}

                                {activeModule === 'ir' && (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {[
                                                'Capital Efficiency 지표 산출',
                                                'R&D 자산화 기반 Valuation 조정',
                                                'Tax-Adjusted Runway (세액공제 반영)',
                                                'IR 리포트용 VC 맞춤형 언어 브리핑'
                                            ].map((t, i) => (
                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-300 bg-slate-950/30 p-3 rounded-xl">
                                                    <CheckCircle2 size={14} className="text-indigo-400" />
                                                    {t}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {activeModule === 'stock' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">공정 가치 (현재 주가)</label>
                                            <input
                                                type="number"
                                                value={stockInputs.stockPrice}
                                                onChange={e => setStockInputs({ ...stockInputs, stockPrice: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">행사가격 (Strike Price)</label>
                                            <input
                                                type="number"
                                                value={stockInputs.exercisePrice}
                                                onChange={e => setStockInputs({ ...stockInputs, exercisePrice: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}

                                {activeModule === 'fx' && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-slate-500 uppercase">외화 잔액 (USD)</label>
                                            <input
                                                type="number"
                                                value={fxInputs.balance}
                                                onChange={e => setFxInputs({ ...fxInputs, balance: parseInt(e.target.value) })}
                                                className="w-full bg-slate-950/50 border border-white/5 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 transition-colors"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {activeModule !== 'dd' ? (
                                <button
                                    onClick={() => {
                                        if (activeModule === 'rnd') runSimulation('rnd_capitalization', { capitalizationRatio: capRatio });
                                        if (activeModule === 'stock') runSimulation('stock_compensation', stockInputs);
                                        if (activeModule === 'fx') runSimulation('currency_revaluation', fxInputs);
                                        if (activeModule === 'tax') runSimulation('tax_credit_finder', {});
                                        if (activeModule === 'ir') runSimulation('ir_summary', {});
                                    }}
                                    disabled={isProcessing}
                                    className={`w-full py-5 font-black rounded-2xl transition-all shadow-xl active:scale-95 flex items-center justify-center gap-3 text-lg ${activeModule === 'rnd' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-600/20' :
                                        activeModule === 'tax' ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/20' :
                                            activeModule === 'stock' ? 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/20' :
                                                activeModule === 'ir' ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20' :
                                                    'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                                        }`}
                                >
                                    {isProcessing ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <TrendingUp size={20} />
                                            전략 엔진 분석 가동
                                        </>
                                    )}
                                </button>
                            ) : (
                                <button
                                    onClick={handleDDExport}
                                    disabled={isProcessing}
                                    className="w-full py-5 bg-rose-600 hover:bg-rose-500 shadow-xl shadow-rose-600/20 text-white font-black rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 text-lg"
                                >
                                    {isProcessing ? (
                                        <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <Download size={20} />
                                            보안 실사 패키지(.af_audit) 생성
                                        </>
                                    )}
                                </button>
                            )}
                        </div>
                    </div>

                    <AnimatePresence>
                        {irResult && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="xl:col-span-3 bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-indigo-500/30 p-10 rounded-[3rem] shadow-2xl space-y-10"
                            >
                                <div className="flex justify-between items-start border-b border-white/10 pb-8">
                                    <div>
                                        <span className="text-indigo-400 font-black text-xs uppercase tracking-[0.3em]">Confidential IR Summary</span>
                                        <h3 className="text-4xl font-black text-white mt-2">Investment Readiness Report</h3>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-slate-500 text-xs font-bold font-mono">GEN-ID: AF-IR-{Date.now().toString().slice(-6)}</p>
                                        <p className="text-slate-400 text-sm font-bold mt-1">{new Date().toLocaleDateString()}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Capital Efficiency</p>
                                        <div className="flex items-end gap-2 text-white">
                                            <span className="text-3xl font-black text-indigo-400">{(irResult.capitalEfficiencyRatio * 100).toFixed(1)}%</span>
                                            <span className="text-[10px] mb-2 font-bold text-slate-400">R&D/Burn</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Adjusted Runway</p>
                                        <div className="flex items-end gap-2 text-white">
                                            <span className="text-3xl font-black text-emerald-400">{(irResult.taxAdjustedRunway).toFixed(1)}</span>
                                            <span className="text-[10px] mb-2 font-bold text-slate-400">Months</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">Compliance Score</p>
                                        <div className="flex items-end gap-2 text-white">
                                            <span className="text-3xl font-black">{(irResult.complianceScore).toFixed(1)}%</span>
                                        </div>
                                    </div>
                                    <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5">
                                        <p className="text-[10px] font-black text-slate-500 uppercase mb-2">FX Risk Level</p>
                                        <div className={`text-xl font-black mt-1 ${irResult.fxExposureIndex === 'Safe' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                            {irResult.fxExposureIndex}
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 relative overflow-hidden group">
                                    <div className="absolute right-0 top-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                                        <ShieldCheck size={120} />
                                    </div>
                                    <h4 className="text-indigo-400 font-black text-sm uppercase mb-4 flex items-center gap-2">
                                        <Zap size={16} /> AI CFO STRATEGIC BRIEFING
                                    </h4>
                                    <p className="text-xl text-white font-bold leading-relaxed relative z-10">
                                        "{irResult.investorMessage}"
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-6">
                                    <div className="space-y-4">
                                        <h5 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Layers size={14} /> Financial Uplift Assets
                                        </h5>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-xs font-bold">R&D Intangible Asset</span>
                                                    <span className="text-white text-xs opacity-50">인건비 자산화 처리액</span>
                                                </div>
                                                <span className="text-white font-black text-xl">₩{irResult.rAndDCapitalizationValue.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center p-5 bg-white/5 rounded-3xl border border-white/5 hover:bg-white/10 transition-colors">
                                                <div className="flex flex-col">
                                                    <span className="text-slate-400 text-xs font-bold">Identified Tax Benefit</span>
                                                    <span className="text-amber-400/50 text-xs font-bold italic">잠재적 절세 혜택</span>
                                                </div>
                                                <span className="text-amber-400 font-black text-xl">₩{irResult.estimatedTaxBenefits.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center justify-center p-8 bg-indigo-600/10 border border-indigo-500/30 rounded-[3rem] relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="text-center relative z-10">
                                            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2 tracking-widest">Estimated Valuation Uplift</p>
                                            <h4 className="text-7xl font-black text-white tracking-tighter drop-shadow-[0_0_20px_rgba(99,102,241,0.4)]">
                                                x{irResult.valuationUpliftMultiplier}
                                            </h4>
                                            <p className="text-slate-500 text-[10px] mt-4 font-black uppercase tracking-widest">R&D Efficiency Premium Applied</p>
                                        </div>
                                        <div className="absolute bottom-4 right-4 text-indigo-500/20">
                                            <TrendingUp size={40} />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-center pt-6">
                                    <button className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-600/30 transition-all flex items-center gap-3 active:scale-95">
                                        <Download size={20} />
                                        IR Financial Report (PDF) 다운로드
                                    </button>
                                </div>
                            </motion.div>
                        )}
                        {simulationResult && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="grid grid-cols-1 md:grid-cols-2 gap-6"
                            >
                                <div className="bg-[#151D2E]/40 border border-white/5 p-6 rounded-3xl space-y-4">
                                    <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <BarChart3 size={16} /> Analysis Result
                                    </h4>
                                    <div className="space-y-4">
                                        {Object.entries(simulationResult.content).map(([key, val]: [string, any]) => (
                                            <div key={key} className="flex justify-between items-center p-4 bg-slate-900/60 rounded-2xl border border-white/5">
                                                <span className="text-slate-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                                                <div className={`font-bold ${typeof val === 'number' && key.toLowerCase().includes('credit') ? 'text-amber-400' : 'text-white'}`}>
                                                    {typeof val === 'number' ? `₩${val.toLocaleString()}` : val}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[#151D2E]/40 border border-white/5 p-6 rounded-3xl flex flex-col justify-between">
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-bold text-indigo-400 uppercase tracking-widest">CFO Insights</h4>
                                        <p className="text-white text-sm leading-relaxed font-bold">
                                            {simulationResult.summary}
                                        </p>
                                        {activeModule === 'tax' && (
                                            <div className="mt-4 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-xs text-indigo-300">
                                                * 청년고용 세액공제는 수도권 중소기업 기준으로 1명당 1,550만원을 단순 적용한 수치입니다. 실제 세무 신고 시에는 고용 유지 의무 기간 등을 고려해야 합니다.
                                            </div>
                                        )}
                                    </div>
                                    {simulationResult.suggestedEntries.length > 0 && (
                                        <button
                                            onClick={applySuggestedEntries}
                                            className="mt-6 w-full py-4 bg-white/5 hover:bg-indigo-600/20 hover:text-indigo-400 border border-white/10 hover:border-indigo-500/40 text-slate-300 font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 size={18} />
                                            권장 분개 전표 생성
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] border border-white/10 shadow-xl group">
                        <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                            <ShieldCheck className="text-emerald-400" size={18} /> Exit Strategy Ready
                        </h4>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6">
                            "투자 유치나 M&A를 준비 중이신가요?
                            실사 모듈을 사용하면 외부 감사인이 요구하는 규격의 데이터를 즉시 패키징 할 수 있습니다."
                        </p>
                        <div className="flex items-center justify-between text-[10px] font-black text-slate-500 tracking-widest">
                            <span>VDR READY</span>
                            <span>SECURED</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
