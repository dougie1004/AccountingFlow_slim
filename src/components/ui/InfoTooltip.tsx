import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface InfoTooltipProps {
    title: string;
    content: string;
    contextualTip?: string;
    children?: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content, contextualTip, children }) => {
    const [isVisible, setIsVisible] = useState(false);

    return (
        <div className="relative inline-block group">
            <div
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
                className="cursor-help"
            >
                {children || <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 transition-colors" />}
            </div>

            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute z-[100] bottom-full left-1/2 -translate-x-1/2 mb-3 w-64 p-4 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl"
                    >
                        <div className="space-y-2">
                            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/5 pb-1">{title}</h5>
                            <p className="text-xs text-slate-200 leading-relaxed font-bold">
                                {content}
                            </p>
                            {contextualTip && (
                                <div className="mt-2 pt-2 border-t border-white/5">
                                    <p className="text-[10px] text-emerald-400 font-black flex items-start gap-1">
                                        <span className="text-base leading-none">💡</span> {contextualTip}
                                    </p>
                                </div>
                            )}
                        </div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-8 border-transparent border-t-slate-900" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
