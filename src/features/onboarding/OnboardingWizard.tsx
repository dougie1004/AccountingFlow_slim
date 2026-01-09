import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Landmark, ShieldCheck, ArrowRight, ArrowLeft, CheckCircle2, DollarSign, Zap } from 'lucide-react';

interface OnboardingData {
    companyName: string;
    regId: string;
    isSme: boolean;
    isStartupTaxBenefit: boolean;
    initialBalances: { account: string; amount: number }[];
    governanceThreshold: number;
}

export const OnboardingWizard: React.FC<{ onComplete: (data: OnboardingData) => void }> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [data, setData] = useState<OnboardingData>({
        companyName: '',
        regId: '',
        isSme: true,
        isStartupTaxBenefit: false,
        initialBalances: [
            { account: '보통예금', amount: 0 },
            { account: '현금', amount: 0 },
            { account: '외상매입금', amount: 0 }
        ],
        governanceThreshold: 30000,
    });

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    const containerVariants: any = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
        exit: { opacity: 0, y: -20, transition: { duration: 0.4 } }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0B1221]/80 backdrop-blur-xl p-4">
            <motion.div
                initial="hidden" animate="visible" exit="exit" variants={containerVariants}
                className="w-full max-w-2xl bg-[#151D2E] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                {/* Progress Bar */}
                <div className="h-1.5 w-full bg-white/5">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                    />
                </div>

                <div className="p-10">
                    <AnimatePresence mode="wait">
                        {step === 1 && (
                            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400">
                                        <Building2 size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Step 1: 기업 기본 정보 설정</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Smart Tax Configuration</p>
                                    </div>
                                </div>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-slate-500 ml-1">회사명</label>
                                        <input
                                            value={data.companyName}
                                            onChange={e => setData({ ...data, companyName: e.target.value })}
                                            className="w-full bg-[#0B1221] border border-white/5 rounded-2xl px-6 py-4 text-white font-black focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            placeholder="주식회사 에이아이플로우"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <button
                                            onClick={() => setData({ ...data, isSme: !data.isSme })}
                                            className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${data.isSme ? 'bg-indigo-500/10 border-indigo-500 text-white' : 'bg-white/5 border-transparent text-slate-500'}`}
                                        >
                                            <Landmark size={24} />
                                            <span className="font-black text-sm">중소기업 여부</span>
                                        </button>
                                        <button
                                            onClick={() => setData({ ...data, isStartupTaxBenefit: !data.isStartupTaxBenefit })}
                                            className={`p-6 rounded-2xl border transition-all flex flex-col items-center gap-3 ${data.isStartupTaxBenefit ? 'bg-purple-500/10 border-purple-500 text-white' : 'bg-white/5 border-transparent text-slate-500'}`}
                                        >
                                            <Zap size={24} />
                                            <span className="font-black text-sm">청년창업 감면대상</span>
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-emerald-500/10 rounded-2xl text-emerald-400">
                                        <Landmark size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Step 2: 기초 잔액 설정</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Initial Data Continuity</p>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    {data.initialBalances.map((bal, idx) => (
                                        <div key={idx} className="flex items-center gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                                            <span className="flex-1 font-bold text-white ml-2">{bal.account}</span>
                                            <div className="flex items-center bg-[#0B1221] px-4 py-2 rounded-xl border border-white/10">
                                                <span className="text-slate-500 font-bold mr-2">₩</span>
                                                <input
                                                    type="number"
                                                    value={bal.amount}
                                                    onChange={e => {
                                                        const fresh = [...data.initialBalances];
                                                        fresh[idx].amount = Number(e.target.value);
                                                        setData({ ...data, initialBalances: fresh });
                                                    }}
                                                    className="bg-transparent text-right font-black text-indigo-400 outline-none w-32"
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                                <div className="flex items-center gap-4 mb-8">
                                    <div className="p-4 bg-orange-500/10 rounded-2xl text-orange-400">
                                        <ShieldCheck size={32} />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white tracking-tight">Step 3: AI 거버넌스 정책</h2>
                                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest mt-1">Compliance Policy Engine</p>
                                    </div>
                                </div>
                                <div className="bg-[#0B1221] p-8 rounded-3xl border border-white/5 space-y-6">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-bold text-white">AI 자동 증빙 요청 임계값</span>
                                            <span className="text-lg font-black text-indigo-400">₩{data.governanceThreshold.toLocaleString()}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="100000"
                                            step="5000"
                                            value={data.governanceThreshold}
                                            onChange={e => setData({ ...data, governanceThreshold: Number(e.target.value) })}
                                            className="w-full h-2 bg-indigo-500/20 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        />
                                        <p className="text-xs text-slate-500 leading-relaxed font-bold">
                                            해당 금액을 초과하는 지출에 대해 Compliance AI가 자동으로 적격증빙(영수증) 업로드를 트리거합니다.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-between items-center mt-12">
                        {step > 1 ? (
                            <button onClick={prevStep} className="flex items-center gap-2 text-slate-500 font-black hover:text-white transition-all">
                                <ArrowLeft size={20} /> 이전
                            </button>
                        ) : <div />}

                        <button
                            onClick={step === 3 ? () => onComplete(data) : nextStep}
                            className="bg-gradient-to-r from-indigo-500 to-purple-500 px-8 py-4 rounded-2xl flex items-center gap-3 text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all"
                        >
                            {step === 3 ? (
                                <><CheckCircle2 size={20} /> 설정 완료</>
                            ) : (
                                <><Zap size={20} /> 다음 단계로</>
                            )}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
