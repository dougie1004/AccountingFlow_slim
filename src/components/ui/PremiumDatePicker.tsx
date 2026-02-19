import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from 'lucide-react';

interface PremiumDatePickerProps {
    value: string;
    onChange: (date: string) => void;
}

type ViewMode = 'day' | 'month' | 'year';

export const PremiumDatePicker: React.FC<PremiumDatePickerProps> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewMode, setViewMode] = useState<ViewMode>('day'); // day, month, year
    const [viewDate, setViewDate] = useState(() => new Date(value || new Date()));
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (value) {
            setViewDate(new Date(value));
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

    const formatDate = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const generateDays = () => {
        const year = viewDate.getFullYear();
        const month = viewDate.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const days = [];

        // Padding for first week
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(<div key={`pad-${i}`} className="h-8" />);
        }

        // Days
        for (let i = 1; i <= lastDay.getDate(); i++) {
            const currentDate = new Date(year, month, i);
            const dateStr = formatDate(currentDate);
            const isSelected = dateStr === value;
            const isToday = dateStr === formatDate(new Date());

            days.push(
                <button
                    key={i}
                    onClick={() => {
                        onChange(dateStr);
                        setIsOpen(false);
                    }}
                    className={`h-8 w-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all
                        ${isSelected
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/40 scale-110'
                            : isToday
                                ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                : 'text-slate-300 hover:bg-white/10 hover:text-white'
                        }`}
                >
                    {i}
                </button>
            );
        }
        return days;
    };

    const generateMonths = () => {
        const months = [
            '1월', '2월', '3월', '4월', '5월', '6월',
            '7월', '8월', '9월', '10월', '11월', '12월'
        ];
        return months.map((m, idx) => (
            <button
                key={m}
                onClick={() => {
                    const newDate = new Date(viewDate);
                    // CRITICAL: Set day to 1st first to avoid overflow (e.g. May 31 -> Feb 31 jumps to March)
                    newDate.setDate(1);
                    newDate.setMonth(idx);
                    setViewDate(newDate);
                    setViewMode('day'); // Back to day view
                }}
                className={`p-3 rounded-xl border border-white/5 bg-[#151D2E] text-xs font-bold transition-all
                    ${viewDate.getMonth() === idx ? 'bg-indigo-600 text-white border-indigo-500' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                `}
            >
                {m}
            </button>
        ));
    };

    const generateYears = () => {
        const currentYear = viewDate.getFullYear();
        const startYear = currentYear - 5;
        const years = [];
        for (let i = 0; i < 12; i++) {
            const y = startYear + i;
            years.push(
                <button
                    key={y}
                    onClick={() => {
                        const newDate = new Date(viewDate);
                        newDate.setFullYear(y);
                        setViewDate(newDate);
                        setViewMode('month'); // Then selection month
                    }}
                    className={`p-3 rounded-xl border border-white/5 bg-[#151D2E] text-sm font-black transition-all
                        ${viewDate.getFullYear() === y ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'}
                    `}
                >
                    {y}
                </button>
            );
        }
        return years;
    };

    return (
        <div className="relative" ref={containerRef}>
            {/* Trigger Button */}
            <div
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-[#151D2E] p-1 px-3 rounded-2xl border border-white/5 shadow-xl cursor-pointer hover:border-indigo-500/30 transition-colors group"
            >
                <span className="text-[10px] font-bold text-slate-500 uppercase group-hover:text-indigo-400 transition-colors">기준일:</span>
                <span className="text-xs font-black text-white min-w-[80px]">
                    {value ? value : 'Select Date'}
                </span>
                <CalendarIcon size={12} className="text-slate-500 group-hover:text-white transition-colors" />
            </div>

            {/* Premium Popover */}
            {isOpen && (
                <div className="absolute top-full left-0 mt-3 bg-[#0B1221] border border-white/10 rounded-[1.5rem] shadow-2xl p-4 z-50 w-[300px] animate-in slide-in-from-top-2 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <button
                            onClick={() => {
                                const d = new Date(viewDate);
                                if (viewMode === 'day') d.setMonth(d.getMonth() - 1);
                                else if (viewMode === 'year') d.setFullYear(d.getFullYear() - 12);
                                setViewDate(d);
                            }}
                            className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => setViewMode('year')}
                                className={`px-2 py-1 rounded-lg text-sm font-black transition-colors ${viewMode === 'year' ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                                {viewDate.getFullYear()}
                            </button>
                            <span className="text-slate-600">.</span>
                            <button
                                onClick={() => setViewMode('month')}
                                className={`px-2 py-1 rounded-lg text-sm font-black transition-colors ${viewMode === 'month' ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5'}`}
                            >
                                {viewDate.getMonth() + 1}
                            </button>
                        </div>

                        <button
                            onClick={() => {
                                const d = new Date(viewDate);
                                if (viewMode === 'day') d.setMonth(d.getMonth() + 1);
                                else if (viewMode === 'year') d.setFullYear(d.getFullYear() + 12);
                                setViewDate(d);
                            }}
                            className="p-1 hover:bg-white/5 rounded-full text-slate-400 hover:text-white"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* Content Grid */}
                    {viewMode === 'day' && (
                        <>
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                                    <div key={d} className="text-center text-[10px] font-bold text-slate-600">
                                        {d}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7 gap-1">
                                {generateDays()}
                            </div>
                        </>
                    )}

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
                            onClick={() => { onChange(formatDate(new Date())); setIsOpen(false); }}
                            className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300"
                        >
                            Today
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
