import React from 'react';

const BrandHeader: React.FC = () => {
    return (
        <header className="flex items-center justify-between px-4 md:px-8 py-3 md:py-5 bg-[#0B1221] border-b border-[#151D2E] shrink-0">
            {/* Left: AccountingFlow Logo & Text */}
            <div className="flex items-center gap-2 md:gap-3">
                <div className="h-10 md:h-16 overflow-hidden">
                    <img
                        src="/assets/accountingflow-logo.png"
                        alt="AccountingFlow Logo"
                        className="h-full w-auto max-w-[150px] md:max-w-[240px] object-contain"
                    />
                </div>
            </div>

            {/* Right: Insightrix Branding */}
            <div className="flex items-center gap-2 md:gap-3">
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
