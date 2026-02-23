import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

interface PremiumMonthPickerProps {
    value: string; // YYYY-MM
    onChange: (date: string) => void;
}

type ViewMode = 'month' | 'year';

export const PremiumMonthPicker: React.FC<PremiumMonthPickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    // Parse initial value, fallback to current month
    const initialDate = value ? new Date(`${value}-01T00:00:00`) : new Date();
    const [viewDate, setViewDate] = useState(initialDate);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            setViewDate(new Date(`${value}-01T00:00:00`));
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const formatMonth = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    };

    const generateMonths = () => {
        const months = [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ];
        return months.map((m, idx) => {
            const isSelected = value === `${viewDate.getFullYear()}-${String(idx + 1).padStart(2, '0')}`;
            return (
                <button
                    key={m}
                    onClick={() => {
                        const newDate = new Date(viewDate);
                        newDate.setDate(1);
                        newDate.setMonth(idx);
                        setViewDate(newDate);
                        onChange(formatMonth(newDate));
                        setIsOpen(false);
                    }}
                    className={`p-3 rounded-xl border border-white/5 bg-[#151D2E] text-xs font-bold transition-all
                        ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {viewDate.getFullYear()}년 {m}
                </button>
            );
        });
    };

    const generateYears = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = currentYear - 5;
        const years = [];
        for (let i = 0; i < 12; i++) {
            const y = startYear + i;
            const isSelected = value.startsWith(`${y}-`);
            years.push(
                <button
                    key={y}
                    onClick={() => {
                        const newDate = new Date(viewDate);
                        newDate.setFullYear(y);
                        setViewDate(newDate);
                        setViewMode('month');
                    }}
                    className={`p-3 rounded-xl border border-white/5 bg-[#151D2E] text-sm font-black transition-all
                        ${isSelected ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg scale-105' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {y}
                </button>
            );
        }
        return years;
    };

    const parsedYear = value ? value.split('-')[0] : String(new Date().getFullYear());
    const parsedMonth = value ? value.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 bg-[#151D2E] p-1.5 px-4 rounded-2xl border border-white/5 shadow-inner cursor-pointer hover:border-indigo-500/30 transition-colors group"
            >
                <span className="text-white font-black text-sm min-w-[80px]">
                    {parsedYear}년 {parsedMonth}월
                </span>
                <CalendarIcon size={16} className="text-slate-400 group-hover:text-white transition-colors" />
            </div>

            {/* Premium Popover */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-3 bg-[#0B1221] border border-white/10 rounded-[1.5rem] shadow-2xl p-4 z-50 w-[300px] animate-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => {
                                const d = new Date(viewDate);
                                if (viewMode === 'month') d.setFullYear(d.getFullYear() - 1);
                                else if (viewMode === 'year') d.setFullYear(d.getFullYear() - 12);
                                setViewDate(d);
                            }}
                            className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setViewMode(viewMode === 'year' ? 'month' : 'year')}
                                className={`px-4 py-1.5 rounded-lg text-sm font-black transition-colors bg-white/5 hover:bg-white/10 text-white`}
                            >
                                {viewMode === 'month' ? viewDate.getFullYear() : `${viewDate.getFullYear() - 5} - ${viewDate.getFullYear() + 6}`}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const d = new Date(viewDate);
                                if (viewMode === 'month') d.setFullYear(d.getFullYear() + 1);
                                else if (viewMode === 'year') d.setFullYear(d.getFullYear() + 12);
                                setViewDate(d);
                            }}
                            className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Content Grid */}
                    {viewMode === 'month' && (
                        <div className="grid grid-cols-3 gap-2">
                            {generateMonths()}
                        </div>
                    )}

                    {viewMode === 'year' && (
                        <div className="grid grid-cols-3 gap-2">
                            {generateYears()}
                        </div>
                    )}

                    {/* Shortcuts */}
                    <div className="mt-4 pt-3 border-t border-white/5 flex justify-between">
                        <button
                            onClick={() => {
                                const today = new Date();
                                setViewDate(today);
                                onChange(formatMonth(today));
                                setIsOpen(false);
                            }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-300"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};
