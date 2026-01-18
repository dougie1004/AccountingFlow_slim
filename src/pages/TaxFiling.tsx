import React, { useState } from 'react';
import { VAT_Form } from '../components/tax/VAT_Form';
import { Withholding_Form } from '../components/tax/Withholding_Form';
import { CIT_Form } from '../components/tax/CIT_Form';
import { FileText, Receipt, Users, Building2, Sparkles, ShieldCheck, Download } from 'lucide-react';

export const TaxFiling: React.FC = () => {
    const [activeForm, setActiveForm] = useState<'VAT' | 'Withholding' | 'CIT'>('VAT');

    return (
        <div className="space-y-8 animate-in fade-in duration-700 p-6 min-h-screen">
            {/* Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-gold/10 rounded-lg">
                            <Receipt className="w-5 h-5 text-gold" />
                        </div>
                        <h2 className="text-sm font-black text-gold uppercase tracking-wider">국세청(NTS) 전자신고 패키지</h2>
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">세무 서식 자동화</h1>
                    <p className="text-slate-400 font-bold mt-2">회계 데이터를 국세청 표준 신고 서식으로 즉시 변환합니다.</p>
                </div>

                <div className="flex bg-[#151D2E] p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                    <button
                        onClick={() => setActiveForm('VAT')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeForm === 'VAT' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Receipt size={18} /> 부가가치세
                    </button>
                    <button
                        onClick={() => setActiveForm('Withholding')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeForm === 'Withholding' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Users size={18} /> 원천세
                    </button>
                    <button
                        onClick={() => setActiveForm('CIT')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${activeForm === 'CIT' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                    >
                        <Building2 size={18} /> 법인세
                    </button>
                </div>
            </header>

            {/* AI Optimization Banner */}
            <div className="bg-gradient-to-r from-indigo-900/50 to-violet-900/50 p-6 rounded-3xl border border-indigo-500/20 flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                        <Sparkles size={24} className="animate-pulse" />
                    </div>
                    <div>
                        <h3 className="font-black text-white">AI 세무 최적화 스캔 완료</h3>
                        <p className="text-xs text-indigo-200 font-bold">128건의 전표가 국세청 표준 규격에 따라 자동 분류 및 검증되었습니다.</p>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <div className="text-right hidden md:block">
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Security Integrity</p>
                        <p className="text-xs font-mono text-indigo-300">SECURE_NATIVE_HASH_2026</p>
                    </div>
                    <button className="bg-white text-indigo-950 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-indigo-50 transition-all shadow-xl active:scale-95">
                        <Download size={16} /> 일괄 신고 패키지 다운로드 (.zip)
                    </button>
                </div>
            </div>

            {/* Active Form Display */}
            <main className="pb-20">
                <div className="animate-in slide-in-from-bottom-8 duration-700">
                    {activeForm === 'VAT' && <VAT_Form />}
                    {activeForm === 'Withholding' && <Withholding_Form />}
                    {activeForm === 'CIT' && <CIT_Form />}
                </div>
            </main>

            {/* Compliance Footer Mark */}
            <footer className="flex items-center justify-center gap-4 opacity-30 pb-10">
                <ShieldCheck size={20} className="text-white" />
                <span className="text-[10px] font-black text-white tracking-[0.2em] uppercase">National Tax Service Protocol Compliance</span>
            </footer>
        </div>
    );
};

export default TaxFiling;
