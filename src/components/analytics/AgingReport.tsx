import React, { useMemo } from 'react';
import { JournalEntry } from '../../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface AgingReportProps {
    entries: JournalEntry[];
    type: 'AR' | 'AP' | 'SUS';
}

import { isArAccount, isApAccount, isSuspenseAccount } from '../../constants/accounts';

export const AgingReport: React.FC<AgingReportProps> = ({ entries, type }) => {
    const data = useMemo(() => {
        const today = new Date();
        const buckets = [
            { name: '0-30일', range: [0, 30], value: 0 },
            { name: '31-60일', range: [31, 60], value: 0 },
            { name: '61-90일', range: [61, 90], value: 0 },
            { name: '90일 이상', range: [91, 9999], value: 0 },
        ];

        entries.filter(e => {
            if (e.isSettled || e.status !== 'Approved') return false;
            const isAr = isArAccount(e.debitAccount);
            const isAp = isApAccount(e.creditAccount);
            const isSus = isSuspenseAccount(e.debitAccount) || isSuspenseAccount(e.creditAccount);

            if (type === 'AR') return isAr;
            if (type === 'AP') return isAp;
            return isSus;
        }).forEach(e => {
            const dueDateStr = e.dueDate || e.date; // Use entry date if due date is missing
            const dueDate = new Date(dueDateStr);
            const diffTime = today.getTime() - dueDate.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Only count if overdue (diffDays > 0)
            if (diffDays <= 0) {
                buckets[0].value += (e.amount + (e.vat || 0));
                return;
            }

            const bucket = buckets.find(b => diffDays >= b.range[0] && diffDays <= b.range[1]);
            if (bucket) bucket.value += (e.amount + (e.vat || 0));
            else buckets[3].value += (e.amount + (e.vat || 0));
        });

        return buckets;
    }, [entries, type]);

    const colors = type === 'AR'
        ? ['#10b981', '#fbbf24', '#f59e0b', '#ef4444']
        : type === 'AP'
            ? ['#3b82f6', '#818cf8', '#6366f1', '#4f46e5']
            : ['#f59e0b', '#d97706', '#b45309', '#92400e']; // Amber colors for Suspense

    return (
        <div className="h-[300px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: '#64748b', fontWeight: 'bold' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 10, fill: '#64748b' }}
                        tickFormatter={(v) => `${(v / 10000).toLocaleString()}만`}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ backgroundColor: '#111827', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '1rem' }}
                        formatter={(v: any) => [`${v.toLocaleString()}원`, '금액']}
                    />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]} barSize={40}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={colors[index]} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
