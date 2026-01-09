import React, { useContext, useState } from 'react';
import { Landmark, Plus, RefreshCw, TrendingDown } from 'lucide-react';
import { Asset } from '../types';
import { invoke } from '@tauri-apps/api/core';
import { AccountingContext } from '../context/AccountingContext';

export const Assets: React.FC = () => {
    const { assets: contextAssets, addAsset } = useContext(AccountingContext)!;
    const [displayAssets, setDisplayAssets] = useState<Asset[]>([]);

    // Sync with context on load if needed or just use contextAssets
    // For this demo, let's use contextAssets combined with some initial ones if empty
    const assets = contextAssets.length > 0 ? contextAssets : [
        {
            id: '1',
            name: 'MacBook Pro (M3)',
            acquisitionDate: '2025-01-15',
            cost: 3500000,
            depreciationMethod: 'STRAIGHT_LINE',
            usefulLife: 5,
            residualValue: 1000,
            accumulatedDepreciation: 0,
            currentValue: 3500000
        },
        {
            id: '2',
            name: 'Office Furniture Set',
            acquisitionDate: '2025-02-01',
            cost: 5000000,
            depreciationMethod: 'STRAIGHT_LINE',
            usefulLife: 5,
            residualValue: 1000,
            accumulatedDepreciation: 0,
            currentValue: 5000000
        }
    ];

    const handleRunDepreciation = async () => {
        try {
            // Mocking 'run_depreciation' call with current assets
            // In real app, we'd fetch latest state from DB first
            const journalEntries = await invoke('run_depreciation', { assets, date: new Date().toISOString().split('T')[0] });
            alert(`Depreciation Run Successful!\n${(journalEntries as any[]).length} Journal Entries Generated.`);

            // Mock Update Local State for Demo
            // Mock Update Local State for Demo (In real app, we'd update context/DB)
            alert('Depreciation updated in view (Demo only).');
        } catch (e) {
            console.error(e);
            alert('Depreciation Failed: ' + e);
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-indigo-50 rounded-lg">
                            <Landmark className="w-5 h-5 text-indigo-600" />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-600 uppercase tracking-wider">Fixed Asset Management</h2>
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">고정자산 (Assets)</h1>
                    <p className="mt-2 text-slate-500 font-medium">유형자산 등록 및 감가상각 자동화</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRunDepreciation}
                        className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-slate-200 text-slate-700 rounded-xl font-bold hover:border-indigo-500 hover:text-indigo-600 transition-all shadow-sm"
                    >
                        <RefreshCw size={18} />
                        Run Depreciation (Auto)
                    </button>
                    <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200">
                        <Plus size={18} />
                        Register Asset
                    </button>
                </div>
            </header>

            <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">Asset Name</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase">Acquired</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase text-right">Cost</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase text-right">Book Value</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase text-center">Method</th>
                            <th className="px-8 py-5 text-xs font-bold text-slate-500 uppercase text-center">Life (Y)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {assets.map((asset) => (
                            <tr key={asset.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="px-8 py-5 font-bold text-slate-800">{asset.name}</td>
                                <td className="px-8 py-5 text-sm font-bold text-slate-500">{asset.acquisitionDate}</td>
                                <td className="px-8 py-5 text-right font-bold text-slate-600">₩{asset.cost.toLocaleString()}</td>
                                <td className="px-8 py-5 text-right font-black text-indigo-600">₩{Math.round(asset.currentValue).toLocaleString()}</td>
                                <td className="px-8 py-5 text-center text-xs font-bold">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded">{asset.depreciationMethod}</span>
                                </td>
                                <td className="px-8 py-5 text-center font-bold text-slate-600">{asset.usefulLife}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
