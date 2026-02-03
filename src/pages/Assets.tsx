import React, { useContext, useState } from 'react';
import { Landmark, Plus, RefreshCw, X } from 'lucide-react';
import { Asset, JournalEntry } from '../types';
import { AccountingContext } from '../context/AccountingContext';

// Standard Declining Balance Rates (Korean Tax Law ref for key years)
const DEPRECIATION_RATES: Record<number, number> = {
    3: 0.638,
    4: 0.528,
    5: 0.451,
    8: 0.313,
    10: 0.259,
    20: 0.140, // Approx
    40: 0.073  // Approx
};

export const Assets: React.FC = () => {
    const { assets, addAsset, updateAsset, addEntries, runAutoDepreciation } = useContext(AccountingContext)!;
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newAsset, setNewAsset] = useState<Partial<Asset>>({
        name: '',
        acquisitionDate: new Date().toISOString().split('T')[0],
        depreciationMethod: 'StraightLine',
        cost: 0,
        usefulLife: 5,
        residualValue: 0
    });

    const totalCost = assets.filter(a => a.status === 'ACTIVE').reduce((acc, curr) => acc + curr.cost, 0);
    const totalCurrent = assets.filter(a => a.status === 'ACTIVE').reduce((acc, curr) => acc + (curr.cost - curr.accumulatedDepreciation), 0);

    const handleAddAsset = () => {
        if (!newAsset.name || !newAsset.cost) return;

        const asset: Asset = {
            id: crypto.randomUUID(),
            name: newAsset.name!,
            depreciationMethod: newAsset.depreciationMethod as 'StraightLine' | 'DecliningBalance',
            acquisitionDate: newAsset.acquisitionDate!,
            cost: Number(newAsset.cost),
            usefulLife: Number(newAsset.usefulLife),
            residualValue: Number(newAsset.residualValue),
            accumulatedDepreciation: 0,
            status: 'ACTIVE'
        };

        addAsset(asset);
        setNewAsset({
            name: '', acquisitionDate: new Date().toISOString().split('T')[0],
            depreciationMethod: 'StraightLine',
            cost: 0, usefulLife: 5, residualValue: 0
        });
        setIsModalOpen(false);
    };

    const handleRunDepreciation = () => {
        const today = new Date();
        const period = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
        runAutoDepreciation(period);
    };

    const handleDispose = (asset: Asset) => {
        const value = window.prompt(`자산 [${asset.name}]을 처분하시겠습니까? 처분 가액을 입력하세요.`, '0');
        if (value === null) return;

        const disposalValue = Number(value);
        const bookValue = asset.cost - asset.accumulatedDepreciation;
        const gainLoss = disposalValue - bookValue;
        const today = new Date().toISOString().split('T')[0];

        const entries: JournalEntry[] = [
            {
                id: crypto.randomUUID(),
                date: today,
                debitAccount: '보통예금 (Bank)',
                creditAccount: '비품 (Equipment)', // Simplified: should ideally offset Gross + AccumDep
                amount: disposalValue,
                description: `[처분] ${asset.name} 자산 처분 (처분가 ₩${disposalValue.toLocaleString()})`,
                status: 'Approved',
                type: 'AUTO_DISPOSAL',
                vat: 0
            }
        ];

        // Recognition of Gain/Loss on Disposal
        if (gainLoss > 0) {
            entries.push({
                id: crypto.randomUUID(),
                date: today,
                debitAccount: '비품 (Equipment)',
                creditAccount: '유형자산처분이익',
                amount: gainLoss,
                description: `[처분손익] ${asset.name} 처분이익 인식`,
                status: 'Approved',
                type: 'AUTO_DISPOSAL',
                vat: 0
            });
        } else if (gainLoss < 0) {
            entries.push({
                id: crypto.randomUUID(),
                date: today,
                debitAccount: '유형자산처분손실',
                creditAccount: '비품 (Equipment)',
                amount: Math.abs(gainLoss),
                description: `[처분손익] ${asset.name} 처분손실 인식`,
                status: 'Approved',
                type: 'AUTO_DISPOSAL',
                vat: 0
            });
        }

        addEntries(entries);
        updateAsset(asset.id, {
            status: 'DISPOSED',
            disposedAt: today,
            disposalValue
        });
        alert('자산 처분 전표가 생성되었습니다.');
    };

    return (
        <div className="space-y-8 pb-20 bg-[#0B1221] min-h-screen p-6 animate-in fade-in">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <Landmark className="text-indigo-500" size={32} />
                        고정자산 관리 (Assets)
                    </h1>
                    <p className="text-slate-400 text-lg mt-2">유형/무형 자산 대장 및 감가상각 관리</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleRunDepreciation}
                        className="flex items-center gap-2 px-6 py-3 bg-[#151D2E] text-slate-300 rounded-2xl font-black border border-white/10 hover:bg-indigo-500/10 hover:text-indigo-400 transition-all"
                    >
                        <RefreshCw size={18} /> 월 결산 (상각 실행)
                    </button>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                    >
                        <Plus size={18} /> 신규 자산 등록
                    </button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">총 취득 원가 (Total Cost)</p>
                    <h3 className="text-3xl font-black text-white">₩{totalCost.toLocaleString()}</h3>
                </div>
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">현재 장부 가액 (Book Value)</p>
                    <h3 className="text-3xl font-black text-emerald-400">₩{totalCurrent.toLocaleString()}</h3>
                </div>
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5">
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">총 상각 누계 (Accum. Dep)</p>
                    <h3 className="text-3xl font-black text-rose-400">₩{(totalCost - totalCurrent).toLocaleString()}</h3>
                </div>
            </div>

            <div className="bg-[#151D2E]/50 border border-white/5 rounded-[2.5rem] overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="border-b border-white/5 bg-[#151D2E]">
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">자산 정보</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest">상각 방법</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">내용연수/잔존</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">취득 원가</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">상각 누계액</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-right">장부 가액</th>
                            <th className="px-8 py-6 text-xs font-black text-slate-500 uppercase tracking-widest text-center">상태 / 관리</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                        {assets.map((asset) => (
                            <tr key={asset.id} className={`hover:bg-white/[0.02] transition-all group ${asset.status === 'DISPOSED' ? 'opacity-60 bg-rose-950/5' : ''}`}>
                                <td className="px-8 py-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${asset.status === 'DISPOSED' ? 'bg-rose-500/10 text-rose-500' : 'bg-[#0B1221] text-indigo-400'}`}>
                                            <Landmark size={20} />
                                        </div>
                                        <div>
                                            <p className={`font-bold ${asset.status === 'DISPOSED' ? 'text-slate-400 line-through' : 'text-white'}`}>{asset.name}</p>
                                            <p className="text-slate-500 text-[10px] uppercase font-black">{asset.acquisitionDate} 취득</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <span className={`px-2 py-1 rounded-lg text-xs font-black border ${asset.depreciationMethod === 'DecliningBalance' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-slate-700/20 text-slate-400 border-white/5'}`}>
                                        {asset.depreciationMethod === 'DecliningBalance' ? '정률법' : '정액법'}
                                    </span>
                                </td>
                                <td className="px-8 py-6 text-right text-slate-400 font-mono text-sm">
                                    {asset.usefulLife}년
                                    <span className="text-slate-600 ml-1">/ {asset.residualValue.toLocaleString()}</span>
                                </td>
                                <td className="px-8 py-6 text-right text-slate-400 font-bold font-mono">₩{asset.cost.toLocaleString()}</td>
                                <td className="px-8 py-6 text-right text-rose-500/70 font-bold font-mono">₩{asset.accumulatedDepreciation.toLocaleString()}</td>
                                <td className="px-8 py-6 text-right text-emerald-400 font-black font-mono">
                                    {asset.status === 'ACTIVE'
                                        ? `₩${(asset.cost - asset.accumulatedDepreciation).toLocaleString()}`
                                        : <span className="text-slate-500 italic">Disposed</span>
                                    }
                                </td>
                                <td className="px-8 py-6 text-center">
                                    {asset.status === 'ACTIVE' ? (
                                        <button
                                            onClick={() => handleDispose(asset)}
                                            className="px-3 py-1.5 bg-rose-500/10 text-rose-400 text-[10px] font-black uppercase rounded-lg hover:bg-rose-500 hover:text-white transition-all border border-rose-500/20"
                                        >
                                            처분 (Dispose)
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] font-black text-rose-500 uppercase px-2 py-0.5 bg-rose-500/10 rounded border border-rose-500/20">Disposed</span>
                                            {asset.disposedAt && <span className="text-[9px] text-slate-600 mt-0.5">{asset.disposedAt}</span>}
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {assets.length === 0 && (
                            <tr>
                                <td colSpan={7} className="py-20 text-center text-slate-500">등록된 자산이 없습니다.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-[#151D2E] w-full max-w-lg rounded-3xl border border-white/10 p-8 shadow-2xl relative">
                        <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-slate-400 hover:text-white"><X size={24} /></button>

                        <h2 className="text-2xl font-black text-white mb-6">신규 자산 등록</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">자산명</label>
                                <input className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500" autoFocus
                                    value={newAsset.name} onChange={e => setNewAsset({ ...newAsset, name: e.target.value })} placeholder="예: Macbook Pro M3 16inch" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">상각 방법</label>
                                    <select className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                                        value={newAsset.depreciationMethod} onChange={e => setNewAsset({ ...newAsset, depreciationMethod: e.target.value as any })}>
                                        <option value="StraightLine">정액법 (Straight-Line)</option>
                                        <option value="DecliningBalance">정률법 (Declining Balance)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">취득일</label>
                                    <input type="date" className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                                        value={newAsset.acquisitionDate} onChange={e => setNewAsset({ ...newAsset, acquisitionDate: e.target.value })} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">내용연수 (년)</label>
                                    <select className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                                        value={newAsset.usefulLife} onChange={e => setNewAsset({ ...newAsset, usefulLife: Number(e.target.value) })}>
                                        <option value={3}>3년 (IT장비, 공구)</option>
                                        <option value={5}>5년 (차량, 비품)</option>
                                        <option value={10}>10년 (기계장치)</option>
                                        <option value={20}>20년 (건물)</option>
                                        <option value={40}>40년 (구조물)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-slate-500 uppercase mb-1">취득원가</label>
                                    <input type="number" className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                                        value={newAsset.cost || ''} onChange={e => setNewAsset({ ...newAsset, cost: Number(e.target.value) })} placeholder="0" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-slate-500 uppercase mb-1">잔존가치 (비망가액)</label>
                                <input type="number" className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-bold outline-none focus:border-indigo-500"
                                    value={newAsset.residualValue || ''} onChange={e => setNewAsset({ ...newAsset, residualValue: Number(e.target.value) })} placeholder="통상 1000원 또는 0" />
                            </div>
                        </div>

                        <div className="mt-8 flex gap-3">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-400 hover:bg-white/5 transition-colors">취소</button>
                            <button onClick={handleAddAsset} className="flex-1 py-4 bg-indigo-600 rounded-xl font-black text-white hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-500/20">등록하기</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
