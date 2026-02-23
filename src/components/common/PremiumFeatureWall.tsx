import React from 'react';
import { Lock, Zap, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface PremiumFeatureWallProps {
    children: React.ReactNode;
    plan: string;
    minPlan: 'Basic' | 'Standard' | 'Professional';
    featureName: string;
}

const PLAN_LEVELS = {
    'Free': 0,
    'Basic': 1,
    'Standard': 2,
    'Professional': 3
};

export const PremiumFeatureWall: React.FC<PremiumFeatureWallProps> = ({ children, plan, minPlan, featureName }) => {
    const isUnlocked = PLAN_LEVELS[plan as keyof typeof PLAN_LEVELS] >= PLAN_LEVELS[minPlan];

    if (isUnlocked) return <>{children}</>;

    return (
        <div className="relative group">
            <div className="filter blur-xl grayscale opacity-40 pointer-events-none transition-all duration-700 bg-slate-900/50 rounded-3xl">
                {children}
            </div>

            <div className="absolute inset-0 flex items-center justify-center z-50">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="max-w-md w-full bg-[#151D2E]/90 backdrop-blur-3xl border border-indigo-500/30 p-10 rounded-[2.5rem] shadow-3xl text-center"
                >
                    <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-600/20">
                        <Lock className="text-white" size={28} />
                    </div>

                    <h3 className="text-2xl font-black text-white mb-3 tracking-tight">{featureName}</h3>
                    <p className="text-slate-400 font-bold mb-8 text-sm leading-relaxed">
                        이 기능은 <span className="text-indigo-400">{minPlan} 요금제</span> 이상에서 제공됩니다.
                        데모 버전 설정을 통해 즉시 업그레이드하여 성능을 직접 체험해 보세요.
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                // In demo mode, we just tell them how to upgrade manually in settings
                                alert('설정(Settings) 메뉴 상단에서 Professional 플랜으로 전환하시면 모든 기능을 즉시 체험하실 수 있습니다.');
                            }}
                            className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-sm transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 group/btn"
                        >
                            <Zap size={16} className="fill-white" />
                            업그레이드 체험하기
                            <ChevronRight size={16} className="group-hover/btn:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <p className="mt-6 text-[10px] text-slate-500 font-black uppercase tracking-widest italic font-mono">
                        Powered by AccountingFlow Engine
                    </p>
                </motion.div>
            </div>
        </div>
    );
};
