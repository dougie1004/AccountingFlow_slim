import React from 'react';
import { HelpCircle } from 'lucide-react';
import { Tooltip } from '../common/Tooltip';

interface InfoTooltipProps {
    title: string;
    content: string;
    contextualTip?: string;
    children?: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({ title, content, contextualTip, children }) => {
    const tooltipContent = (
        <div className="space-y-2 min-w-[200px]">
            <h5 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest border-b border-white/10 pb-1 mb-1">{title}</h5>
            <p className="text-[11px] text-white leading-relaxed font-medium">
                {content}
            </p>
            {contextualTip && (
                <div className="mt-2 pt-2 border-t border-white/10">
                    <p className="text-[10px] text-emerald-400 font-black flex items-start gap-1">
                        <span className="text-sm leading-none">💡</span> {contextualTip}
                    </p>
                </div>
            )}
        </div>
    );

    return (
        <Tooltip content={tooltipContent} position="top">
            <div className="cursor-help p-2 -m-2 inline-flex items-center justify-center rounded-full hover:bg-white/5 transition-colors">
                {children || <HelpCircle size={14} className="text-slate-500 hover:text-indigo-400 transition-colors" />}
            </div>
        </Tooltip>
    );
};
