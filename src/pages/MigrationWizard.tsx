import React, { useState } from 'react';
import {
    Upload,
    ChevronRight,
    ArrowLeft,
    Database,
    FileSpreadsheet,
    AlertCircle,
    CheckCircle2,
    Settings2,
    Search,
    ShieldCheck,
    Zap
} from 'lucide-react';
import { MigrationSource } from '../types';

type Step = 'source-selection' | 'file-upload' | 'column-mapping' | 'validation' | 'complete';

export const MigrationWizard: React.FC = () => {
    const [currentStep, setCurrentStep] = useState<Step>('source-selection');
    const [selectedSource, setSelectedSource] = useState<MigrationSource['systemName'] | null>(null);
    const [mapping, setMapping] = useState<Record<string, string>>({});

    const sources: { id: MigrationSource['systemName'], name: string, icon: any, color: string }[] = [
        { id: 'Douzone', name: '더존 비즈온 (SmartA)', icon: Database, color: 'text-blue-400' },
        { id: 'E-Count', name: '이카운트 (E-Count)', icon: Zap, color: 'text-orange-400' },
        { id: 'Excel', name: '직접 생성한 엑셀/CSV', icon: FileSpreadsheet, color: 'text-emerald-400' },
        { id: 'Other', name: '기타 회계 시스템', icon: Settings2, color: 'text-slate-400' }
    ];

    const renderHeader = () => (
        <div className="flex flex-col gap-2 mb-10">
            <h1 className="text-4xl font-black text-white tracking-tighter">ERP 데이터 이관 마법사</h1>
            <p className="text-slate-500 font-bold max-w-2xl leading-relaxed">
                기존에 사용하시던 회계 시스템의 데이터를 AccountingFlow로 안전하게 옮깁니다.
                <span className="text-indigo-400 ml-1">모든 데이터 처리는 로컬 내에서 암호화되어 진행됩니다.</span>
            </p>
        </div>
    );

    const renderSourceSelection = () => (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {sources.map((src) => (
                <button
                    key={src.id}
                    onClick={() => {
                        setSelectedSource(src.id);
                        setCurrentStep('file-upload');
                    }}
                    className="group professional-card p-8 flex items-center justify-between hover:bg-white/[0.04] transition-all active:scale-[0.98]"
                >
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-[24px] bg-white/[0.03] ${src.color} group-hover:scale-110 transition-transform duration-500`}>
                            <src.icon size={32} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black text-white mb-1">{src.name}</h3>
                            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Legacy Data Connector</p>
                        </div>
                    </div>
                    <ChevronRight className="text-slate-700 group-hover:text-indigo-400 transition-colors" />
                </button>
            ))}
        </div>
    );

    const renderFileUpload = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button
                onClick={() => setCurrentStep('source-selection')}
                className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors font-bold text-sm"
            >
                <ArrowLeft size={16} /> 이전 단계로
            </button>

            <div
                className="professional-card p-16 border-2 border-dashed border-white/5 flex flex-col items-center justify-center gap-6 hover:border-indigo-500/30 transition-all group bg-white/[0.01]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                    e.preventDefault();
                    setCurrentStep('column-mapping');
                }}
            >
                <div className="p-8 rounded-full bg-indigo-500/5 text-indigo-400 group-hover:scale-110 transition-transform duration-500">
                    <Upload size={48} />
                </div>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-2">{selectedSource} 데이터 파일 업로드</h2>
                    <p className="text-slate-500 font-bold max-w-sm mx-auto">
                        CSV 또는 Excel(.xlsx) 파일을 드래그하여 올려주세요.
                        파일은 서버로 전송되지 않으며 로컬에서 즉시 파싱됩니다.
                    </p>
                </div>
                <button
                    onClick={() => setCurrentStep('column-mapping')}
                    className="mt-6 px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[24px] transition-all shadow-xl shadow-indigo-600/20"
                >
                    파일 탐색기 열기
                </button>
            </div>

            <div className="mt-10 p-6 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                <ShieldCheck className="text-indigo-400 shrink-0" size={24} />
                <div>
                    <h4 className="text-white font-black text-sm mb-1">데이터 주권 주의사항</h4>
                    <p className="text-xs text-slate-500 font-bold leading-relaxed">
                        AccountingFlow는 데이터 보안을 최우선으로 합니다. 업로드하신 회계 데이터는 사용자 PC의 보안 영역(Tauri Store) 내에서만 존재하며,
                        Control Plane(서버)에는 구독 유지를 위한 식별자와 사용량 통계만 전송됩니다.
                    </p>
                </div>
            </div>
        </div>
    );

    const renderColumnMapping = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <button
                onClick={() => setCurrentStep('file-upload')}
                className="flex items-center gap-2 text-slate-500 hover:text-white mb-8 transition-colors font-bold text-sm"
            >
                <ArrowLeft size={16} /> 이전 단계로
            </button>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="professional-card p-10">
                    <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                        <Settings2 className="text-indigo-400" />
                        컬럼 매핑 설정
                    </h3>
                    <div className="space-y-6">
                        {[
                            { id: 'date', label: '거래 일자', required: true, desc: 'YYYY-MM-DD 형식' },
                            { id: 'description', label: '적요 (항목명)', required: true, desc: '지출 항목 설명' },
                            { id: 'amount', label: '금액', required: true, desc: '공급가액 + 세액 합계' },
                            { id: 'vendor', label: '거래처', required: false, desc: '상호명 또는 사업자번호' },
                            { id: 'account', label: '계정 과목', required: false, desc: '기존 시스템의 계정명' }
                        ].map((field) => (
                            <div key={field.id} className="group">
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-black text-white">
                                        {field.label}
                                        {field.required && <span className="text-rose-500 ml-1">*</span>}
                                    </span>
                                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{field.desc}</span>
                                </label>
                                <select className="w-full bg-[#0B1221] border border-white/10 rounded-[16px] px-5 py-3 text-white font-bold text-sm focus:border-indigo-500 outline-none transition-all">
                                    <option value="">-- 원본 파일 컬럼 선택 --</option>
                                    <option value="col1">Column A (날짜)</option>
                                    <option value="col2">Column B (내용)</option>
                                    <option value="col3">Column C (금액)</option>
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="professional-card p-10 bg-indigo-500/[0.02] border-indigo-500/10">
                        <h3 className="text-xl font-black text-white mb-4">가져오기 목표 요약</h3>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-6">Import Target Insight</p>

                        <ul className="space-y-4 mb-8">
                            <li className="flex items-center gap-3 text-sm text-slate-400 font-bold">
                                <CheckCircle2 size={18} className="text-emerald-500" /> 과거 회계 데이터 N개월 분석
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-400 font-bold">
                                <CheckCircle2 size={18} className="text-emerald-500" /> 리스크 패턴 자동 감지
                            </li>
                            <li className="flex items-center gap-3 text-sm text-slate-400 font-bold opacity-50">
                                <AlertCircle size={18} className="text-slate-600" /> 원본 증빙은 수동 업로드 필요
                            </li>
                        </ul>

                        <button
                            onClick={() => setCurrentStep('validation')}
                            className="w-full py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[24px] transition-all flex items-center justify-center gap-3 group shadow-xl shadow-indigo-600/20"
                        >
                            데이터 정합성 검사 시작
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>

                    <div className="p-8 rounded-[32px] border border-white/5 bg-white/[0.01]">
                        <p className="text-xs text-slate-500 font-bold leading-relaxed italic">
                            "AccountingFlow는 기존 ERP를 대체하는 것이 아니라, <br />
                            그 위에 <span className="text-white">‘책임 구조’</span>를 덧씌웁니다."
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderValidation = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="professional-card p-10 mb-8 border-indigo-500/20">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-black text-white">Candidate Ledger 검증</h3>
                        <p className="text-sm font-bold text-slate-500">가져온 {selectedSource} 데이터를 분석 엔진인 AuditFlow가 검사 중입니다.</p>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-full font-black text-xs border border-emerald-500/20">
                        <Zap size={14} fill="currentColor" /> 2,491건 분석 완료
                    </div>
                </div>

                <div className="overflow-x-auto rounded-[24px] border border-white/5">
                    <table className="w-full text-left">
                        <thead className="bg-[#151D2E] text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Date</th>
                                <th className="px-6 py-4">Description</th>
                                <th className="px-6 py-4 text-right">Amount</th>
                                <th className="px-6 py-4">Risk Insight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {[1, 2, 3].map(i => (
                                <tr key={i} className="hover:bg-white/[0.01] transition-colors">
                                    <td className="px-6 py-4"><CheckCircle2 className="text-emerald-500" size={18} /></td>
                                    <td className="px-6 py-4 text-slate-400 font-mono">2023-12-01</td>
                                    <td className="px-6 py-4 text-white font-black italic">임대료 지불</td>
                                    <td className="px-6 py-4 text-right text-white font-black">₩5,000,000</td>
                                    <td className="px-6 py-4">
                                        <span className="px-3 py-1 bg-white/5 rounded-lg text-[10px] text-slate-500 font-bold uppercase tracking-wider">정상 거래</span>
                                    </td>
                                </tr>
                            ))}
                            <tr className="bg-rose-500/5">
                                <td className="px-6 py-4"><AlertCircle className="text-rose-500" size={18} /></td>
                                <td className="px-6 py-4 text-slate-400 font-mono">2023-12-15</td>
                                <td className="px-6 py-4 text-white font-black italic">중복 결제 의심</td>
                                <td className="px-6 py-4 text-right text-white font-black">₩35,200</td>
                                <td className="px-6 py-4">
                                    <span className="px-3 py-1 bg-rose-500/10 rounded-lg text-[10px] text-rose-400 font-bold uppercase tracking-wider border border-rose-500/20">패턴 감지: 중복 거래</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button
                    onClick={() => setCurrentStep('column-mapping')}
                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-[24px] transition-all"
                >
                    매핑 수정
                </button>
                <button
                    onClick={() => setCurrentStep('complete')}
                    className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[24px] transition-all shadow-xl shadow-indigo-600/20"
                >
                    최종 승인 및 데이터 이관
                </button>
            </div>
        </div>
    );

    const renderComplete = () => (
        <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-700">
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-emerald-500 blur-3xl opacity-20 scale-150"></div>
                <div className="relative p-10 rounded-full bg-emerald-500/10 text-emerald-400">
                    <CheckCircle2 size={84} />
                </div>
            </div>

            <h2 className="text-5xl font-black text-white mb-4 tracking-tighter text-center">이관 프로세스 완료</h2>
            <p className="text-xl font-bold text-slate-500 mb-12 text-center max-w-xl leading-relaxed">
                축하합니다! 과거 데이터가 <span className="text-emerald-400">Opening_Candidate</span>로 정식 등록되었습니다.
                이제 실시간 장부 관리와 경영 리스크 브리핑을 시작할 수 있습니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
                {[
                    { label: '이관된 전표', value: '2,491건', icon: Database },
                    { label: '발견된 잠재 리스크', value: '42건', icon: AlertCircle },
                    { label: '데이터 무결성 점수', value: '98.2%', icon: Zap }
                ].map(stat => (
                    <div className="professional-card p-6 flex flex-col items-center">
                        <stat.icon className="text-slate-600 mb-3" size={20} />
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</span>
                        <span className="text-2xl font-black text-white">{stat.value}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => window.location.href = '/'}
                className="mt-16 px-16 py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-[32px] transition-all text-xl shadow-2xl shadow-indigo-600/30 active:scale-95"
            >
                대시보드로 이동
            </button>
        </div>
    );

    return (
        <div className="min-h-screen bg-[#070C18] p-10 scroll-smooth">
            <div className="max-w-6xl mx-auto">
                {currentStep !== 'complete' && renderHeader()}

                {currentStep === 'source-selection' && renderSourceSelection()}
                {currentStep === 'file-upload' && renderFileUpload()}
                {currentStep === 'column-mapping' && renderColumnMapping()}
                {currentStep === 'validation' && renderValidation()}
                {currentStep === 'complete' && renderComplete()}
            </div>
        </div>
    );
};

export default MigrationWizard;
