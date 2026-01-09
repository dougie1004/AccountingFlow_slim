import React, { useState } from 'react';
import { Building2, Save, ArrowRight, ShieldCheck, FileSpreadsheet } from 'lucide-react';
import { EntityMetadata, TaxPolicy } from '../../types';

interface SetupWizardProps {
    onComplete: (data: { entity: EntityMetadata, policy: TaxPolicy }) => void;
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ onComplete }) => {
    const [step, setStep] = useState(1);
    const [entity, setEntity] = useState<EntityMetadata>({
        companyName: '',
        regId: '',
        repName: '',
        corpType: 'SME',
        fiscalYearEnd: '12-31'
    });
    const [policy, setPolicy] = useState<TaxPolicy>({
        depreciationMethod: 'StraightLine',
        entertainmentLimitBase: 12000000,
        vatFilingCycle: 'Quarterly'
    });

    const handleNext = () => {
        if (step === 3) {
            onComplete({ entity, policy });
        } else {
            setStep(step + 1);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                    <div className="relative z-10 flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black tracking-tight mb-2">AccountingFlow Setup</h2>
                            <p className="text-slate-400 font-medium">Step {step} of 3: {step === 1 ? 'Entity Info' : step === 2 ? 'Opening Balances' : 'Tax Policy'}</p>
                        </div>
                        <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                            {step === 1 && <Building2 />}
                            {step === 2 && <FileSpreadsheet />}
                            {step === 3 && <ShieldCheck />}
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-6">
                    {step === 1 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <h3 className="text-lg font-bold text-slate-800">법인 기본 정보 입력</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">회사명 (Company Name)</label>
                                    <input
                                        type="text"
                                        value={entity.companyName}
                                        onChange={e => setEntity({ ...entity, companyName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        placeholder="(주)앤티그래비티"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">사업자등록번호 (Reg ID)</label>
                                    <input
                                        type="text"
                                        value={entity.regId}
                                        onChange={e => setEntity({ ...entity, regId: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                        placeholder="000-00-00000"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">대표자명 (Rep Name)</label>
                                    <input
                                        type="text"
                                        value={entity.repName}
                                        onChange={e => setEntity({ ...entity, repName: e.target.value })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-500 uppercase">기업 규모 (Type)</label>
                                    <select
                                        value={entity.corpType}
                                        onChange={e => setEntity({ ...entity, corpType: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                                    >
                                        <option value="SME">중소기업 (SME)</option>
                                        <option value="Startup">벤처기업 (Startup)</option>
                                        <option value="Large">대기업 (Large)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <h3 className="text-lg font-bold text-slate-800">기초 잔액 이월 (Opening Balance)</h3>
                            <div className="p-8 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer group">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-white group-hover:shadow-md transition-all">
                                    <FileSpreadsheet className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
                                </div>
                                <p className="font-bold text-slate-700 mb-1">Upload Closing Trial Balance (Excel/CSV)</p>
                                <p className="text-sm text-slate-400">Drag and drop your file here to auto-populate opening balances.</p>
                            </div>
                            <div className="flex justify-end">
                                <button className="text-sm font-bold text-slate-400 hover:text-slate-600">Skip for now</button>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4 animate-in slide-in-from-right-8 duration-300">
                            <h3 className="text-lg font-bold text-slate-800">세무 정책 설정 (Tax Policy)</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-700">감가상각 방법 (Depreciation)</p>
                                        <p className="text-xs text-slate-400">유형자산 감가상각 시 적용할 방법을 선택하세요.</p>
                                    </div>
                                    <select
                                        value={policy.depreciationMethod}
                                        onChange={e => setPolicy({ ...policy, depreciationMethod: e.target.value as any })}
                                        className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold"
                                    >
                                        <option value="StraightLine">정액법 (Straight-Line)</option>
                                        <option value="DecliningBalance">정률법 (Declining)</option>
                                    </select>
                                </div>
                                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-xl">
                                    <div>
                                        <p className="font-bold text-slate-700">접대비 기본 한도</p>
                                        <p className="text-xs text-slate-400">중소기업 기본 한도: 3,600만원 (일반 1,200만원)</p>
                                    </div>
                                    <input
                                        type="number"
                                        value={policy.entertainmentLimitBase}
                                        onChange={e => setPolicy({ ...policy, entertainmentLimitBase: parseInt(e.target.value) })}
                                        className="w-32 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-bold text-right"
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                    <button
                        onClick={handleNext}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-200 active:scale-95"
                    >
                        {step === 3 ? 'Complete Setup' : 'Next Step'} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        </div>
    );
};
