import React, { useState } from 'react';
import { Database, Beaker, CheckCircle, AlertCircle, Lock, Calendar } from 'lucide-react';
import { useAccounting } from '../hooks/useAccounting';
import { generateSystemWideMockData, simulateAIParsing } from '../utils/mockDataGenerator';
import { invoke } from '@tauri-apps/api/core';
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

const Settings: React.FC = () => {
    const { addEntry, addAsset, ledger, addScmOrder, updateInventory, loadSimulation, config, updateConfig } = useAccounting();
    const [closingDate, setClosingDate] = useState('');
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [localConfig, setLocalConfig] = useState<{ entity?: EntityMetadata, policy?: TaxPolicy }>({});

    const handleLoadTestData = () => {
        const results = generateSystemWideMockData();
        loadSimulation(results);
        alert('종합 테스트 데이터(전분야)가 생성되었습니다.');
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                            <Database className="w-5 h-5 text-indigo-400" />
                        </div>
                        <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">환경 제어 및 시스템 관리</h2>
                    </div>
                    <h1 className="text-3xl font-black text-white tracking-tight">시스템 설정 (Settings)</h1>
                    <p className="mt-2 text-slate-400 font-bold">애플리케이션 전역 환경 변수 및 보안 설정을 관리합니다.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-amber-500/10 rounded-2xl">
                            <Beaker className="w-6 h-6 text-amber-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">데이터 초기화 및 도구</h3>
                            <p className="text-sm text-slate-500">테스트 데이터 생성 및 환경설정 마법사</p>
                        </div>
                    </div>

                    <div className="p-6 bg-[#0B1221] rounded-2xl border border-white/5 flex flex-col gap-4">
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setShowWizard(true)}
                                className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-xl font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
                            >
                                🚀 설정 마법사 실행
                            </button>
                            <button
                                onClick={handleLoadTestData}
                                className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-[0.98]"
                            >
                                🛠️ 테스트 데이터(Mock) 생성
                            </button>
                        </div>
                        <p className="text-xs text-center text-slate-500 font-medium">
                            {config.entityMetadata ? `설정 완료: ${config.entityMetadata.companyName}` : '현재 시스템 설정이 완료되지 않았습니다.'}
                        </p>
                    </div>
                </div>

                <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-emerald-500/10 rounded-2xl">
                            <CheckCircle className="w-6 h-6 text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">시스템 무결성 상태</h3>
                            <p className="text-sm text-slate-500">실시간 데이터 원장 통계 및 상태</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-[#0B1221] rounded-2xl border border-white/5 shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">총 전표 기록 수</p>
                            <p className="text-3xl font-black text-white">{ledger.length}</p>
                        </div>
                        <div className="p-4 bg-[#0B1221] rounded-2xl border border-white/5 shadow-inner">
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">엔진 상태</p>
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                <p className="text-sm font-bold text-emerald-400">정상 가동 중</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SaaS Tenant Control Card */}
                <div className="bg-[#151D2E] p-8 rounded-3xl border border-white/5 shadow-2xl space-y-6 md:col-span-2 lg:col-span-1">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-rose-500/10 rounded-2xl">
                            <Lock className="w-6 h-6 text-rose-400" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-white">데이터 보호 및 마감</h3>
                            <p className="text-sm text-slate-500">SaaS 멀티테넌트 데이터 보안 제어</p>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="p-4 bg-[#0B1221] rounded-2xl border border-white/5 space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                <Calendar size={14} /> 회계 마감일 설정 (Hard Closing)
                            </label>
                            <input
                                type="date"
                                value={closingDate}
                                onChange={(e) => setClosingDate(e.target.value)}
                                className="w-full px-4 py-2 border border-white/10 rounded-xl bg-white/5 text-white focus:ring-2 focus:ring-rose-500/20 outline-none"
                            />
                            <p className="text-[10px] text-slate-500 font-bold leading-tight">마감일 이전의 모든 전표는 AI 수정 및 삭제가 영구적으로 제한됩니다.</p>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-[#0B1221] rounded-2xl border border-white/5">
                            <span className="text-sm font-bold text-slate-300">데이터 읽기 전용 모드</span>
                            <button
                                onClick={() => setIsReadOnly(!isReadOnly)}
                                className={`w-12 h-6 rounded-full transition-colors relative ${isReadOnly ? 'bg-indigo-600' : 'bg-white/10'}`}
                            >
                                <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${isReadOnly ? 'translate-x-6' : ''}`} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* [Step 1] Insurance Rate Customization Section */}
            <div className="bg-[#151D2E] p-10 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-10 group/section transition-all hover:border-indigo-500/20">
                <div className="flex items-center justify-between font-outfit">
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-indigo-500/10 rounded-2xl group-hover/section:bg-indigo-500/20 transition-colors">
                            <Database className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight">회사별 임금/보험 요율 설정</h2>
                            <p className="text-slate-400 font-bold mt-1 text-lg">전표 자동 분할 및 급여 역산에 사용되는 실제 요율을 반영합니다.</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { label: '국민연금 (개인)', key: 'nationalPension', tip: '기정 4.5%' },
                        { label: '건강보험 (개인)', key: 'healthInsurance', tip: '기정 3.545%' },
                        { label: '장기요양 (건강내)', key: 'longTermCare', tip: '기정 12.95%' },
                        { label: '고용보험 (개인)', key: 'employmentInsuranceEmployee', tip: '기정 0.9%' },
                        { label: '고용보험 (회사)', key: 'employmentInsuranceEmployer', tip: '업종별 차이' },
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
                                        insuranceRates: {
                                            ...config.taxPolicy!.insuranceRates!,
                                            [item.key]: newVal
                                        }
                                    }
                                });
                            }}
                        />
                    ))}
                </div>
            </div>
            {showWizard && (
                <SetupWizard
                    onComplete={(data) => {
                        setLocalConfig(data);
                        setShowWizard(false);
                    }}
                />
            )}
        </div>
    );
};

export default Settings;
