import React, { useState } from 'react';
import { Database, Beaker, CheckCircle, AlertCircle, Lock, Calendar, Plus, Trash2, Save, Calculator } from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { generateSystemWideMockData } from '../utils/mockDataGenerator';
import { SetupWizard } from '../components/onboarding/SetupWizard';
import { EntityMetadata, TaxPolicy } from '../types';

const RateInput: React.FC<{
    label: string,
    value: number,
    tip: string,
    onChange: (val: number) => void
}> = ({ label, value, tip, onChange }) => {
    const formatForDisplay = (v: number) => {
        return parseFloat((v * 100).toFixed(4)).toString();
    };

    const [localText, setLocalText] = React.useState(formatForDisplay(value));

    React.useEffect(() => {
        const displayVal = formatForDisplay(value);
        if (parseFloat(localText) !== parseFloat(displayVal)) {
            setLocalText(displayVal);
        }
    }, [value]);

    return (
        <div className="bg-[#151D2E] p-5 rounded-2xl border border-white/5 hover:border-indigo-500/40 transition-all flex flex-col gap-3 shadow-lg">
            <div className="flex flex-col gap-1">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider truncate">{label}</label>
                <div className="flex items-center gap-1.5 opacity-60">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">STD:</span>
                    <span className="text-[9px] text-indigo-400 font-black">{tip.replace('기정 ', '').replace('업종별 차이', 'Varies')}</span>
                </div>
            </div>

            <div className="relative">
                <input
                    type="text"
                    inputMode="decimal"
                    value={localText}
                    onChange={(e) => {
                        const val = e.target.value;
                        setLocalText(val);
                        const num = parseFloat(val);
                        if (!isNaN(num)) {
                            onChange(num / 100);
                        }
                    }}
                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl h-10 px-3 text-base font-black text-white focus:ring-2 focus:ring-indigo-500/40 outline-none transition-all pr-8"
                    placeholder="0.0"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 font-black opacity-30 text-[10px]">%</span>
            </div>
        </div>
    );
};

import { ACCOUNT_NAMES, STANDARD_ACCOUNTS } from '../constants/accounts';

const Settings: React.FC = () => {
    const { ledger, loadSimulation, config, updateConfig } = useAccounting();
    const [closingDate, setClosingDate] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [showWizard, setShowWizard] = useState(false);

    // Initial Balance Local State
    const [newAccount, setNewAccount] = useState('');
    const [newAmount, setNewAmount] = useState('');

    const handleLoadTestData = () => {
        const results = generateSystemWideMockData();
        loadSimulation(results);
        alert('종합 테스트 데이터(전분야)가 생성되었습니다.');
    };

    const handleAddInitialBalance = () => {
        if (!newAccount || !newAmount) return;
        const amount = parseFloat(newAmount.replace(/,/g, ''));
        if (isNaN(amount)) return;

        // 중복 체크 및 업데이트
        const currentBalances = config.initialBalances || [];
        const existingIdx = currentBalances.findIndex(b => b.account === newAccount);

        if (existingIdx >= 0) {
            const next = [...currentBalances];
            next[existingIdx] = { ...next[existingIdx], amount };
            updateConfig({ initialBalances: next });
        } else {
            updateConfig({
                initialBalances: [...currentBalances, { account: newAccount, amount }]
            });
        }

        setNewAccount('');
        setNewAmount('');
    };

    const handleRemoveInitialBalance = (index: number) => {
        const currentBalances = config.initialBalances || [];
        const next = [...currentBalances];
        next.splice(index, 1);
        updateConfig({ initialBalances: next });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Datalist for Accounts */}
            <datalist id="standard-accounts">
                {STANDARD_ACCOUNTS.map(acc => (
                    <option key={acc.name} value={acc.name}>{acc.category}</option>
                ))}
            </datalist>


            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <Database className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">시스템 환경 제어</h2>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">설정 및 기초 제원 (Settings)</h1>
                    <p className="mt-2 text-slate-400 font-bold text-lg">기초 잔액, 요율, 보안 설정을 통합 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Initial Balance Logic Integration */}
                <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 shadow-2xl col-span-1 md:col-span-2 lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-indigo-500/10 rounded-2xl">
                                <Calculator className="w-6 h-6 text-indigo-400" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white tracking-tight">기초 잔액 설정 (Initial Balances)</h3>
                                <p className="text-sm text-slate-500 font-bold">시산표 및 재무제표의 '기초(Opening)' 데이터 원천입니다.</p>
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-indigo-500/50 bg-indigo-500/5 px-2 py-1 rounded">MOUNT TB CORE v2</span>
                    </div>

                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {(!config.initialBalances || config.initialBalances.length === 0) ? (
                            <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl">
                                <p className="text-slate-600 font-bold">등록된 기초 잔액이 없습니다.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {config.initialBalances.map((ib, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-[#0B1221] rounded-xl border border-white/5 group transition-all hover:border-indigo-500/30">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-white">{ib.account}</span>
                                            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Beginning Balance Account</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-base font-black text-indigo-400 font-mono">₩{ib.amount.toLocaleString()}</span>
                                            <button
                                                onClick={() => handleRemoveInitialBalance(idx)}
                                                className="p-2 text-slate-600 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-white/5">
                        <input
                            type="text"
                            list="standard-accounts"
                            placeholder="계정과목 선택 또는 입력"
                            value={newAccount}
                            onChange={(e) => setNewAccount(e.target.value)}
                            className="flex-1 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 outline-none"
                        />
                        <input
                            type="text"
                            placeholder="기초금액 (₩)"
                            value={newAmount}
                            onChange={(e) => setNewAmount(e.target.value)}
                            className="w-full sm:w-48 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/40 outline-none font-mono"
                        />
                        <button
                            onClick={handleAddInitialBalance}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95"
                        >
                            <Plus size={18} /> 추가
                        </button>
                    </div>
                </div>

                <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                            <Beaker className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">데이터 제어</h3>
                            <p className="text-sm text-slate-500">테스트 데이터 및 설정 마법사</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        <button onClick={() => setShowWizard(true)} className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 transition-all flex items-center justify-center gap-2">🚀 설정 마법사</button>
                        <button onClick={handleLoadTestData} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg">🛠️ 종합 Mock 데이터</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
                {/* Status and Security Info */}
                <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white">무결성 상태</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#0B1221] rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">총 전표 수</p>
                            <p className="text-2xl font-black text-white">{ledger.length}</p>
                        </div>
                        <div className="p-4 bg-[#0B1221] rounded-2xl border border-white/5">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">상태</p>
                            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span><span className="text-sm font-bold text-emerald-400">ACTIVE</span></div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#151D2E] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8 lg:col-span-2 group/section transition-all hover:border-indigo-500/20">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl">
                            <Database className="w-7 h-7 text-indigo-400" />
                        </div>
                        <h2 className="text-2xl font-black text-white tracking-tight">임금/보험 요율 실시간 반영</h2>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {[
                            { label: '국민연금 (개인)', key: 'nationalPension', tip: '4.5%' },
                            { label: '건강보험 (개인)', key: 'healthInsurance', tip: '3.545%' },
                            { label: '장기요양 (건강내)', key: 'longTermCare', tip: '12.95%' },
                        ].map((item) => (
                            <RateInput
                                key={item.key}
                                label={item.label}
                                tip={item.tip}
                                value={config.taxPolicy?.insuranceRates?.[item.key as keyof typeof config.taxPolicy.insuranceRates] || 0}
                                onChange={(newVal) => {
                                    updateConfig({
                                        taxPolicy: {
                                            ...config.taxPolicy!,
                                            insuranceRates: { ...config.taxPolicy!.insuranceRates!, [item.key]: newVal }
                                        }
                                    });
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {showWizard && <SetupWizard onComplete={() => setShowWizard(false)} />}
        </div>
    );
};

export default Settings;
