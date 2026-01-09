import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from 'recharts';

interface WaterfallChartProps {
    data: { name: string; value: number; type: 'start' | 'plus' | 'minus' | 'end' }[];
}

export const WaterfallChart: React.FC<WaterfallChartProps> = ({ data }) => {
    // Transform data for waterfall
    let currentTotal = 0;
    const chartData = data.map(item => {
        const prevTotal = currentTotal;
        if (item.type === 'start' || item.type === 'end') {
            currentTotal = item.value;
            return {
                name: item.name,
                value: item.value,
                share: 0,
                color: item.type === 'start' ? '#6366f1' : '#22d3ee', // Indigo or Cyan
                originalVal: item.value
            };
        } else {
            currentTotal += item.value;
            const isPositive = item.value >= 0;
            return {
                name: item.name,
                value: Math.abs(item.value),
                share: isPositive ? prevTotal : prevTotal + item.value,
                color: isPositive ? '#f43f5e' : '#10b981', // Rose (Inclusion) or Emerald (Exclusion)
                originalVal: item.value
            };
        }
    });

    return (
        <div className="w-full h-[350px] bg-[#0B1221]/50 p-4 rounded-3xl border border-white/5 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff10" />
                    <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fontWeight: 900, fill: '#64748b' }}
                        dy={10}
                    />
                    <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }}
                        tickFormatter={(value) => `₩${(value / 10000).toLocaleString()}만`}
                    />
                    <Tooltip
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ backgroundColor: '#151D2E', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                        formatter={(value: any, name: any, props: any) => [`₩${props.payload.originalVal.toLocaleString()}`, '금액']}
                    />
                    <ReferenceLine y={0} stroke="#ffffff20" />
                    <Bar dataKey="share" stackId="a" fill="transparent" />
                    <Bar dataKey="value" stackId="a" radius={[4, 4, 4, 4]}>
                        {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};
