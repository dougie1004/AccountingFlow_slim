import React, { useMemo } from 'react';
import { JournalEntry } from '../../types';
import { ChevronLeft, ChevronRight, Calculator } from 'lucide-react';

interface CalendarViewProps {
    entries: JournalEntry[];
    currentMonth: Date;
    onMonthChange: (date: Date) => void;
    onDateSelect: (date: string) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ entries, currentMonth, onMonthChange, onDateSelect }) => {
    const daysInMonth = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const days = [];
        // Padding for the start of the week (Sunday based)
        for (let i = 0; i < firstDay.getDay(); i++) {
            days.push(null);
        }

        for (let i = 1; i <= lastDay.getDate(); i++) {
            days.push(new Date(year, month, i));
        }

        return days;
    }, [currentMonth]);

    const entryMap = useMemo(() => {
        const map: Record<string, { count: number, total: number }> = {};
        entries.forEach(e => {
            if (!map[e.date]) map[e.date] = { count: 0, total: 0 };
            map[e.date].count++;
            map[e.date].total += e.amount;
        });
        return map;
    }, [entries]);

    return (
        <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8 px-4">
                <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-white tracking-tight italic">
                        {currentMonth.getFullYear()}년 {currentMonth.getMonth() + 1}월
                    </h2>
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                        <button
                            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        <button
                            onClick={() => onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
                            className="p-1.5 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-bold text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-xl border border-white/5">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-indigo-500 rounded-full"></div>
                        <span>전표 {entries.length}건</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700"></div>
                    <div className="flex items-center gap-2">
                        <Calculator size={14} />
                        <span>총액 ₩{entries.reduce((a, b) => a + b.amount, 0).toLocaleString()}</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-2">
                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(day => (
                    <div key={day} className="text-center text-[10px] font-black text-slate-600 py-3 uppercase tracking-[0.2em]">{day}</div>
                ))}

                {daysInMonth.map((date, idx) => {
                    if (!date) return <div key={`pad-${idx}`} className="aspect-square"></div>;

                    const dateStr = date.toISOString().split('T')[0];
                    const data = entryMap[dateStr];
                    const isToday = new Date().toISOString().split('T')[0] === dateStr;

                    return (
                        <button
                            key={dateStr}
                            onClick={() => onDateSelect(dateStr)}
                            className={`group relative aspect-square rounded-2xl border transition-all duration-300 p-2 text-left flex flex-col justify-between overflow-hidden ${data
                                    ? 'bg-indigo-600/10 border-indigo-500/30 hover:border-indigo-400 hover:bg-indigo-600/20 shadow-lg'
                                    : 'bg-transparent border-white/5 hover:border-white/10'
                                } ${isToday ? 'ring-2 ring-indigo-500/40 ring-offset-2 ring-offset-[#151D2E]' : ''}`}
                        >
                            <span className={`text-sm font-black ${data ? 'text-indigo-400' : 'text-slate-500'} group-hover:scale-110 transition-transform`}>
                                {date.getDate()}
                            </span>

                            {data && (
                                <div className="space-y-0.5 animate-in slide-in-from-bottom-2">
                                    <div className="text-[10px] font-black text-white truncate drop-shadow-md">
                                        {data.count}건
                                    </div>
                                    <div className="text-[8px] font-black text-indigo-300/80 truncate font-mono">
                                        ₩{(data.total / 10000).toFixed(0)}만
                                    </div>
                                </div>
                            )}

                            {/* Decorative background element for dates with data */}
                            {data && (
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-indigo-500/10 blur-xl group-hover:bg-indigo-500/20 transition-all rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default CalendarView;
