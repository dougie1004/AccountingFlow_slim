import React, { useState } from 'react';
import { Database, Calculator, Plus, Trash2, Lock, List, Tag } from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { STANDARD_ACCOUNTS } from '../constants/accounts';
import { AccountNature } from '../types';

const Settings: React.FC = () => {
    const { ledger, config, updateConfig, clearAllData, loadDemoData, customAccounts, addCustomAccount, removeCustomAccount } = useAccounting();
    const [newAccount, setNewAccount] = useState('');
    const [newAmount, setNewAmount] = useState('');
    const [newCustomAccount, setNewCustomAccount] = useState('');
    const [newAccountNature, setNewAccountNature] = useState<AccountNature>(AccountNature.SG_AND_A);

    const handleAddInitialBalance = () => {
        if (!newAccount || !newAmount) return;
        const amount = parseFloat(newAmount.replace(/,/g, ''));
        if (isNaN(amount)) return;

        const currentBalances = config.initialBalances || [];
        updateConfig({
            initialBalances: [...currentBalances.filter(b => b.account !== newAccount), { account: newAccount, amount }]
        });

        setNewAccount('');
        setNewAmount('');
    };

    const handleRemoveInitialBalance = (index: number) => {
        const next = [...(config.initialBalances || [])];
        next.splice(index, 1);
        updateConfig({ initialBalances: next });
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            <datalist id="standard-accounts">
                {STANDARD_ACCOUNTS.map(acc => <option key={acc.name} value={acc.name}>{acc.category}</option>)}
            </datalist>

            <div>
                <h1 className="text-3xl font-black text-white tracking-tight">설정 (Settings)</h1>
                <p className="mt-2 text-slate-400 font-bold text-lg">시스템 데이터 및 기초 설정을 관리합니다.</p>
            </div>

            {/* 1. Data Control Center */}
            <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl"><Database className="w-6 h-6 text-indigo-400" /></div>
                    <h3 className="text-xl font-black text-white">데이터 제어 센터 (Data Control)</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                        onClick={() => {
                            if (window.confirm('기존 데이터를 모두 삭제하고 데모 데이터(부서별 급여, 비용 등)를 로드하시겠습니까?')) {
                                loadDemoData();
                            }
                        }}
                        className="p-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 hover:bg-emerald-500/20 transition-all text-left group"
                    >
                        <div className="text-emerald-400 font-black text-lg mb-2 group-hover:translate-x-1 transition-transform">🚀 데모 데이터 로드 (Load Demo)</div>
                        <p className="text-slate-400 text-xs">전표, 부서, 기초 잔액을 포함한 풀 세트 테스트 데이터를 생성합니다. (기존 데이터 삭제됨)</p>
                    </button>

                    <button
                        onClick={() => {
                            if (window.confirm('정말로 모든 데이터를 영구 삭제하고 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
                                clearAllData();
                            }
                        }}
                        className="p-6 rounded-2xl border border-rose-500/20 bg-rose-500/10 hover:bg-rose-500/20 transition-all text-left group"
                    >
                        <div className="text-rose-400 font-black text-lg mb-2 group-hover:translate-x-1 transition-transform">🗑️ 전체 데이터 삭제 (Delete All Data)</div>
                        <p className="text-slate-400 text-xs">모든 전표와 설정을 삭제하고 빈 상태로 만듭니다.</p>
                    </button>
                </div>
            </div>

            {/* 1.2 Custom Chart of Accounts */}
            <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-fuchsia-500/10 rounded-2xl"><List className="w-6 h-6 text-fuchsia-400" /></div>
                    <h3 className="text-xl font-black text-white">계정과목 관리 (Chart of Accounts)</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <p className="text-slate-400 text-xs text-justify">
                            표준 계정과목 외에 우리 회사만의 커스텀 계정과목을 추가할 수 있습니다.
                            <br />예: '접대비(영업1팀)', 'AWS 서버비', '네이버 광고비' 등
                        </p>
                        <div className="flex gap-2">
                            <input
                                placeholder="새 계정과목명 입력..."
                                value={newCustomAccount}
                                onChange={(e) => setNewCustomAccount(e.target.value)}
                                className="flex-1 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white text-sm"
                            />
                            <select
                                value={newAccountNature}
                                onChange={(e) => setNewAccountNature(e.target.value as AccountNature)}
                                className="w-32 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white text-xs font-bold"
                            >
                                {Object.values(AccountNature).map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                            <button
                                onClick={() => {
                                    if (newCustomAccount.trim()) {
                                        addCustomAccount(newCustomAccount.trim(), newAccountNature);
                                        setNewCustomAccount('');
                                    }
                                }}
                                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 rounded-xl font-bold text-sm"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="bg-[#0B1221] rounded-xl border border-white/5 p-4 h-[200px] overflow-y-auto">
                        <h4 className="text-xs font-black text-slate-500 uppercase mb-3 sticky top-0 bg-[#0B1221] pb-2 border-b border-white/5">
                            Custom Accounts ({customAccounts.length})
                        </h4>
                        {customAccounts.length === 0 ? (
                            <p className="text-slate-600 text-xs italic text-center py-10">등록된 커스텀 계정이 없습니다.</p>
                        ) : (
                            <div className="space-y-2">
                                {customAccounts.map(acc => (
                                    <div key={acc.id} className="flex items-center justify-between group bg-white/5 p-3 rounded-xl border border-white/5">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-fuchsia-300">📌 {acc.name}</span>
                                            <span className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1 mt-1">
                                                <Tag size={10} /> {acc.nature}
                                            </span>
                                        </div>
                                        <button onClick={() => removeCustomAccount(acc.name)} className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-2">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 1.5. Accounting Period Closing */}
            <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 rounded-2xl"><Lock className="w-6 h-6 text-amber-400" /></div>
                    <h3 className="text-xl font-black text-white">마감 관리 (Accounting Period Closing)</h3>
                </div>

                <div className="flex flex-col md:flex-row gap-6 items-center bg-[#0B1221] p-6 rounded-2xl border border-white/5">
                    <div className="flex-1">
                        <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">Current Status</p>
                        {config.closingDate ? (
                            <div className="space-y-1">
                                <p className="text-amber-400 font-black text-xl flex items-center gap-2">
                                    <Lock size={20} /> Locked up to {config.closingDate}
                                </p>
                                <p className="text-slate-500 text-xs">해당 날짜 포함 이전 데이터 수정 불가</p>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <div className="text-emerald-400 font-black text-xl flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div> Open (No Restrictions)
                                </div>
                                <p className="text-slate-500 text-xs">모든 기간의 데이터 수정 가능</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <input
                            type="date"
                            className="bg-[#151D2E] text-white px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-indigo-500 font-bold cursor-pointer hover:border-white/20 transition-colors"
                            onChange={(e) => {
                                if (e.target.value && window.confirm(`${e.target.value} 까지 장부를 마감하시겠습니까?`)) {
                                    updateConfig({ closingDate: e.target.value });
                                }
                            }}
                            value={config.closingDate || ''}
                        />
                        {config.closingDate && (
                            <button
                                onClick={() => {
                                    if (window.confirm('장부 마감을 해제하시겠습니까?')) {
                                        updateConfig({ closingDate: undefined });
                                    }
                                }}
                                className="px-6 py-3 bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl font-bold transition-colors whitespace-nowrap"
                            >
                                마감 해제
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* 2. Initial Balances */}
            <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 shadow-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-slate-700/50 rounded-2xl"><Calculator className="w-6 h-6 text-slate-400" /></div>
                    <h3 className="text-xl font-black text-white">기초 잔액 수동 설정 (Manual Opening Balance)</h3>
                </div>
                <p className="text-slate-500 text-xs font-bold">⚠️ 주의: 데모 데이터 로드 시 자동으로 설정되며, 수동 변경 시 데이터 불일치가 발생할 수 있습니다.</p>

                <div className="space-y-4 max-h-[300px] overflow-y-auto">
                    {(!config.initialBalances || config.initialBalances.length === 0) ? (
                        <div className="py-10 text-center border-2 border-dashed border-white/5 rounded-2xl text-slate-600">등록된 기초 잔액이 없습니다.</div>
                    ) : (
                        config.initialBalances.map((ib, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 bg-[#0B1221] rounded-xl border border-white/5">
                                <span className="text-sm font-black text-white">{ib.account}</span>
                                <div className="flex items-center gap-4">
                                    <span className="text-base font-black text-indigo-400 font-mono">₩{ib.amount.toLocaleString()}</span>
                                    <button onClick={() => handleRemoveInitialBalance(idx)} className="text-slate-600 hover:text-rose-500"><Trash2 size={16} /></button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="flex gap-3 pt-4 border-t border-white/5">
                    <input list="standard-accounts" placeholder="계정과목" value={newAccount} onChange={(e) => setNewAccount(e.target.value)} className="flex-1 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white" />
                    <input placeholder="금액" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} className="w-48 bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white font-mono" />
                    <button onClick={handleAddInitialBalance} className="bg-slate-700 text-white px-6 py-3 rounded-xl font-bold">추가</button>
                </div>
            </div>

            {/* 3. System Info */}
            <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4">시스템 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-[#0B1221] rounded-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase">전표 수</p>
                        <p className="text-2xl font-black text-white">{ledger.length}</p>
                    </div>
                    <div className="p-4 bg-[#0B1221] rounded-2xl">
                        <p className="text-[10px] font-black text-slate-500 uppercase">보안 상태</p>
                        <p className="text-sm font-bold text-emerald-400">AES-256 SECURED</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;
