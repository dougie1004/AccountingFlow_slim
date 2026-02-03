import { useAccounting } from '../../hooks/useAccounting';
import { Lock, ShieldCheck } from 'lucide-react';

const BrandHeader: React.FC = () => {
    const { periods } = useAccounting();

    const lastClosed = periods
        .filter(p => p.status === 'CLOSED')
        .sort((a, b) => b.period.localeCompare(a.period))[0];

    return (
        <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 bg-[#0B1221] border-b border-[#151D2E] shrink-0">
            {/* Left: AccountingFlow Logo & Text */}
            <div className="flex items-center gap-2 md:gap-3 flex-1">
                <div className="h-10 md:h-16 overflow-hidden">
                    <img
                        src="/assets/accountingflow-logo.png"
                        alt="AccountingFlow Logo"
                        className="h-full w-auto max-w-[150px] md:max-w-[240px] object-contain"
                    />
                </div>
            </div>

            {/* Center: Global Viewing Context */}
            <div className="hidden lg:flex items-center justify-center flex-1">
                <div className="bg-[#151D2E] px-4 py-2 rounded-2xl border border-white/5 flex items-center gap-3 shadow-2xl animate-in fade-in zoom-in duration-1000">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-lg border border-emerald-500/20">
                        <ShieldCheck size={12} />
                        <span className="text-[10px] font-black uppercase tracking-tight">System Live</span>
                    </div>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Context:</span>
                        <div className="flex items-center gap-1.5 text-indigo-400 font-black text-xs">
                            {lastClosed ? (
                                <>
                                    <span>{lastClosed.period}</span>
                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 rounded text-[9px] uppercase">
                                        <Lock size={10} />
                                        Closed
                                    </span>
                                </>
                            ) : (
                                <span className="text-slate-600 italic">No Periods Closed</span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Right: Insightrix Branding */}
            <div className="flex items-center gap-2 md:gap-3 flex-1 justify-end">
                <div className="hidden sm:flex flex-col items-end mr-1 md:mr-3">
                    <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-400 font-bold leading-none">Powered by</span>
                </div>
                <div className="h-6 md:h-10 overflow-hidden">
                    <img
                        src="/assets/insightrix-logo.png"
                        alt="Insightrix Logo"
                        className="h-full w-auto max-w-[80px] md:max-w-[120px] object-contain opacity-80 grayscale hover:grayscale-0 transition-all"
                    />
                </div>
            </div>
        </header>
    );
};

export default BrandHeader;
