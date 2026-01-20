import React from 'react';
import { Upload, ShieldCheck, CheckCircle, ArrowRight, Zap, Info } from 'lucide-react';
import { motion } from 'framer-motion';

export const OnboardingGuide: React.FC = () => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[#151D2E] border border-indigo-500/30 rounded-[3rem] p-12 text-center shadow-2xl relative overflow-hidden"
        >
            <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                <ShieldCheck size={200} />
            </div>

            <div className="max-w-2xl mx-auto space-y-8 relative z-10">
                <div className="flex flex-col items-center gap-4">
                    <div className="p-4 bg-indigo-600 rounded-[2rem] shadow-xl shadow-indigo-600/30">
                        <Zap size={40} className="text-white" />
                    </div>
                    <h2 className="text-4xl font-black text-white tracking-tight">
                        반갑습니다 대표님, <br />함께 비즈니스를 지켜나가게 되어 영광입니다.
                    </h2>
                    <p className="text-slate-400 font-bold text-lg">
                        이제 대표님의 실제 데이터를 연결하여 <span className="text-indigo-400">진짜 비즈니스 엔진</span>을 가공해 볼까요?
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
                    <div className="p-8 bg-white/5 border border-white/5 rounded-3xl text-left space-y-4 hover:border-indigo-500/30 transition-all group">
                        <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                            <Upload size={24} />
                        </div>
                        <h4 className="text-white font-black text-xl">STEP 1. 금융 데이터 업로드</h4>
                        <p className="text-slate-500 text-sm font-bold leading-relaxed">
                            은행 거래내역이나 카드 매출 CSV 파일을 업로드해 주세요.
                        </p>
                    </div>

                    <div className="p-8 bg-white/5 border border-white/5 rounded-3xl text-left space-y-4 hover:border-emerald-500/30 transition-all group">
                        <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                            <ShieldCheck size={24} />
                        </div>
                        <h4 className="text-white font-black text-xl">STEP 2. 100% 로컬 분석</h4>
                        <p className="text-slate-500 text-sm font-bold leading-relaxed">
                            모든 데이터는 대표님의 PC 밖으로 절대 나가지 않습니다. AI가 내부에서 즉시 분석을 시작합니다.
                        </p>
                    </div>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 p-6 rounded-2xl flex items-center gap-4 text-left">
                    <Info className="text-indigo-400 shrink-0" size={24} />
                    <p className="text-sm text-slate-300 font-bold">
                        <span className="text-indigo-400">대표님만의 팁:</span> 우측 상단의 <span className="text-white underline decoration-indigo-400">'IR 데모 모드'</span>를 켜시면 실제 데이터 연결 전에 완벽한 재무 상태를 미리 시뮬레이션해 보실 수 있습니다.
                    </p>
                </div>

                <button className="px-10 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl shadow-2xl shadow-indigo-600/40 transition-all flex items-center gap-3 mx-auto active:scale-95 group">
                    첫 번째 장부 데이터 업로드하기 <ArrowRight className="group-hover:translate-x-1 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
};
