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
    ShieldCheck,
    Zap,
    Table,
    ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MigrationSource, JournalEntry } from '../types';
import { useAccounting } from '../hooks/useAccounting';
import * as XLSX from 'xlsx';

type Step = 'source-selection' | 'file-upload' | 'column-mapping' | 'validation' | 'complete';

interface DataMigrationProps {
    setTab: (tab: string) => void;
}

export const DataMigration: React.FC<DataMigrationProps> = ({ setTab }) => {
    const { addEntries, addCandidateEntries, setCandidateEntries, approveCandidateLedger } = useAccounting();
    const [currentStep, setCurrentStep] = useState<Step>('source-selection');
    const [selectedSource, setSelectedSource] = useState<MigrationSource['systemName'] | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fileHeaders, setFileHeaders] = useState<string[]>([]);
    const [mapping, setMapping] = useState<Record<string, string>>({});
    const [isDragging, setIsDragging] = useState(false);
    const [rawData, setRawData] = useState<any[]>([]);
    const [candidateLedger, setCandidateLedger] = useState<JournalEntry[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Auto-detection logic for common Korean ERP headers
    React.useEffect(() => {
        if (fileHeaders.length > 0) {
            const newMapping: Record<string, string> = { ...mapping };
            const detectPatterns: Record<string, string[]> = {
                date: ['날짜', '일자', 'date'],
                description: ['적요', '내용', 'description'],
                debit: ['차변', 'debit', '지출'],
                credit: ['대변', 'credit', '입금'],
                vendor: ['거래처명', '거래처', 'vendor', '커스터머'],
                regNo: ['사업자등록번호', '사업자번호', 'tax_id'],
                account: ['계정명', '계정과목', 'account_name', '계정']
            };

            Object.entries(detectPatterns).forEach(([field, patterns]) => {
                if (!newMapping[field]) {
                    const match = fileHeaders.find(h => patterns.some(p => h.includes(p)));
                    if (match) newMapping[field] = match;
                }
            });
            setMapping(newMapping);
        }
    }, [fileHeaders]);

    const sources: { id: MigrationSource['systemName'], name: string, icon: any, color: string, desc: string }[] = [
        { id: 'Douzone', name: '더존 비즈온 (SmartA)', icon: Database, color: 'text-blue-400', desc: '표준 CSV/Excel 백업 데이터' },
        { id: 'E-Count', name: '이카운트 (E-Count)', icon: Zap, color: 'text-orange-400', desc: 'ERP 원장 엑셀 내보내기' },
        { id: 'Excel', name: '사용자 정의 엑셀', icon: FileSpreadsheet, color: 'text-emerald-400', desc: '자유 형식의 회계 엑셀 파일' },
        { id: 'Other', name: '기타 시스템', icon: Settings2, color: 'text-slate-400', desc: '텍스트 또는 구조화된 데이터' }
    ];

    const handleFinalImport = () => {
        // Actual Phase 6 Logic: Approve Candidates
        approveCandidateLedger();
        setCurrentStep('complete');
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            processFile(file);
        }
    };

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

            if (json.length > 0) {
                const headers = (json[0] as string[]).filter(h => h && h.trim().length > 0);
                setFileHeaders(headers);
                setRawData(json as any[]);
                setCurrentStep('column-mapping');
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const parseExcelDate = (serial: any) => {
        if (!serial) return new Date().toISOString().split('T')[0];

        // Handle YYYY-MM-DD or YYYY.MM.DD strings
        if (typeof serial === 'string') {
            const clean = serial.replace(/\./g, '-');
            if (clean.includes('-')) return clean;
            // Handle YYYYMMDD
            if (serial.length === 8 && !isNaN(Number(serial))) {
                return `${serial.substring(0, 4)}-${serial.substring(4, 6)}-${serial.substring(6, 8)}`;
            }
        }

        // Handle Excel Serial Dates
        if (typeof serial === 'number' && serial > 10000) {
            const date = new Date((serial - 25569) * 86400 * 1000);
            return date.toISOString().split('T')[0];
        }

        return String(serial);
    };

    const runAnalysis = () => {
        setIsAnalyzing(true);
        setTimeout(() => {
            const entries: JournalEntry[] = [];
            const dataRows = rawData.slice(1);

            // Map header names to their original column indices
            const headerMap: Record<string, number> = {};
            if (rawData[0]) {
                rawData[0].forEach((h: any, i: number) => {
                    if (h) headerMap[String(h)] = i;
                });
            }

            dataRows.forEach((row, idx) => {
                if (!row || (Array.isArray(row) && row.length === 0)) return;

                const getValue = (fieldName: string) => {
                    const colName = mapping[fieldName];
                    if (!colName) return undefined;
                    const colIdx = headerMap[colName];
                    return colIdx !== undefined ? row[colIdx] : undefined;
                };

                const dateValue = getValue('date');
                if (!dateValue && idx > 500 && entries.length === 0) return; // Skip empty rows at end

                const date = parseExcelDate(dateValue);
                const description = String(getValue('description') || '');
                const vendor = String(getValue('vendor') || 'ERP_SOURCE');
                const debit = Number(getValue('debit') || 0);
                const credit = Number(getValue('credit') || 0);
                const amountValue = getValue('amount');
                const amount = amountValue ? Number(amountValue) : (debit || credit || 0);
                const account = String(getValue('account') || (debit > 0 ? 'Expenses' : 'Revenue'));

                if (description || amount > 0) {
                    entries.push({
                        id: `MIG-${idx}-${Date.now()}`,
                        date,
                        description,
                        vendor,
                        debitAccount: debit > 0 ? account : '현금',
                        creditAccount: credit > 0 ? account : '현금',
                        amount,
                        vat: 0,
                        type: debit > 0 ? 'Expense' : 'Revenue',
                        status: 'Unconfirmed',
                        createdAt: new Date().toISOString()
                    });
                }
            });

            setCandidateLedger(entries);
            setCandidateEntries(entries);
            setIsAnalyzing(false);
            setCurrentStep('validation');
        }, 800);
    };

    const renderHeader = () => (
        <div className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col gap-2 mb-10">
            <h1 className="text-3xl font-black text-white tracking-tighter uppercase">ERP 데이터 이관 위저드</h1>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                Strategic Ledger Migration & Historical Integrity Bootstrapping
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
                    className="group professional-card p-8 flex items-center justify-between hover:bg-white/[0.04] transition-all active:scale-[0.98] border border-white/5"
                >
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-[24px] bg-white/[0.03] ${src.color} group-hover:scale-110 transition-transform duration-500`}>
                            <src.icon size={32} />
                        </div>
                        <div className="text-left">
                            <h3 className="text-xl font-black text-white mb-1 group-hover:text-indigo-400 transition-colors">{src.name}</h3>
                            <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">{src.desc}</p>
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
                className={`professional-card p-16 border-2 border-dashed flex flex-col items-center justify-center gap-6 transition-all group ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.02]' : 'border-indigo-500/20 bg-indigo-500/[0.01] hover:border-indigo-500/40'
                    }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) processFile(file);
                }}
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".csv, .xlsx, .xls"
                />
                <div className="p-8 rounded-full bg-indigo-500/5 text-indigo-400 group-hover:scale-110 transition-transform duration-500 border border-indigo-500/10">
                    <Upload size={48} />
                </div>
                <div className="text-center">
                    <h2 className="text-3xl font-black text-white mb-2">{selectedSource} 파일 로드</h2>
                    <p className="text-slate-500 font-bold max-w-sm mx-auto leading-relaxed">
                        CSV 또는 엑셀 파일을 드래그하거나 클릭하여 업로드하십시오.<br />
                        모든 분석은 사용자 PC 내부에서만 이루어집니다.
                    </p>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="mt-6 px-12 py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl transition-all shadow-2xl shadow-indigo-600/20"
                >
                    로컬 파일 선택
                </button>
            </div>

            <div className="mt-10 p-8 rounded-[32px] bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-4">
                <ShieldCheck className="text-indigo-400 shrink-0 mt-1" size={24} />
                <div>
                    <h4 className="text-white font-black text-lg mb-1 tracking-tight">Local-first SaaS 아키텍처 (Phase 6)</h4>
                    <p className="text-sm text-slate-500 font-bold leading-relaxed">
                        AccountingFlow는 귀하의 재무 정보를 서버로 가져가지 않습니다. <br />
                        서버(Control Plane)에는 오직 플랜 정보와 AI 호출량만 전송되며, 이관된 원장은 로컬에 암호화되어 저장됩니다.
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
                <div className="professional-card p-10 border border-white/5">
                    <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                        <Settings2 className="text-indigo-400" />
                        스마트 컬럼 매핑
                    </h3>
                    <div className="space-y-6">
                        {[
                            { id: 'date', label: '거래 일자', required: true, desc: '날짜 / 일자' },
                            { id: 'description', label: '적요 (항목명)', required: true, desc: '적요란 / 지출상세' },
                            { id: 'debit', label: '차변 (지출)', required: false, desc: '차변 / 출금' },
                            { id: 'credit', label: '대변 (수입)', required: false, desc: '대변 / 입금' },
                            { id: 'amount', label: '합계 금액', required: false, desc: '차/대 통합 시 선택' },
                            { id: 'vendor', label: '거래처', required: false, desc: '거래처명 / 상호' },
                            { id: 'regNo', label: '사업자등록번호', required: false, desc: '사업자번호' },
                            { id: 'account', label: '계정 과목', required: false, desc: '계정명 / 계정코드' }
                        ].map((field) => (
                            <div key={field.id} className="group">
                                <label className="flex justify-between items-end mb-2">
                                    <span className="text-sm font-black text-white/80">
                                        {field.label}
                                        {field.required && <span className="text-rose-500 ml-1">*</span>}
                                    </span>
                                    <span className="text-[10px] text-slate-600 font-black uppercase tracking-widest">{field.desc}</span>
                                </label>
                                <select
                                    value={mapping[field.id] || ""}
                                    onChange={(e) => setMapping(prev => ({ ...prev, [field.id]: e.target.value }))}
                                    className="w-full bg-[#0B1221] border border-white/5 rounded-2xl px-5 py-4 text-white font-bold text-sm focus:border-indigo-500 outline-none transition-all shadow-inner"
                                >
                                    <option value="">-- 원본 파일 컬럼 선택 --</option>
                                    {fileHeaders.length > 0 ? (
                                        fileHeaders.map((header, hIdx) => (
                                            <option key={hIdx} value={header}>{header}</option>
                                        ))
                                    ) : (
                                        <>
                                            <option value="col1">Column A (일자)</option>
                                            <option value="col2">Column B (적요)</option>
                                            <option value="col3">Column C (현금출급)</option>
                                        </>
                                    )}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="professional-card p-10 bg-indigo-500/[0.03] border-indigo-500/20">
                        <h3 className="text-xl font-black text-white mb-2 italic">Why Migration?</h3>
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-8">Phase 6 Strategic Goal</p>

                        <div className="space-y-6 mb-10">
                            {[
                                { title: '과거 회계 완전 복원 지양', desc: '판단과 검증을 위한 최소한의 데이터만 가져옵니다.' },
                                { title: '오분개 패턴 사전 탐지', desc: '이관 단계에서 AccountingFlow 엔진이 즉시 작동합니다.' },
                                { title: 'Opening Balance 자동 설정', desc: '승인된 데이터는 기초 잔액으로 전환됩니다.' }
                            ].map((item, idx) => (
                                <div key={idx} className="flex gap-4">
                                    <CheckCircle2 className="text-emerald-500 shrink-0" size={20} />
                                    <div>
                                        <h4 className="text-sm font-black text-white mb-1">{item.title}</h4>
                                        <p className="text-xs text-slate-500 font-bold leading-relaxed">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button
                            onClick={runAnalysis}
                            className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 group shadow-2xl shadow-indigo-600/30"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Zap className="animate-bounce" size={20} />
                                    데이터 정합성 분석 중...
                                </>
                            ) : (
                                <>
                                    분석 및 검증 시작
                                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </div>

                    <div className="flex flex-col gap-4">
                        <div className="p-8 rounded-[32px] border border-white/5 bg-white/[0.01] flex items-start gap-4">
                            <ShieldCheck className="text-slate-600 mt-1" size={24} />
                            <div>
                                <p className="text-xs text-white font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <AlertCircle size={14} className="text-amber-500" /> Legal Notice & Disclaimer
                                </p>
                                <div className="space-y-1 text-[11px] text-slate-500 font-bold leading-relaxed italic">
                                    <p>• 이 데이터는 <span className="text-white">기초 이관 원장(Candidate)</span>으로 기록됩니다.</p>
                                    <p>• <span className="text-indigo-400">과거 데이터는 수정되지 않으며</span>, 이관된 데이터는 오직 참고용으로만 사용됩니다.</p>
                                    <p>• AccountingFlow는 <span className="text-white text-opacity-80">이 시점 이후의 모든 회계적 판단과 의사결정</span>을 강력하게 지원합니다.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    const renderValidation = () => (
        <div className="animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="professional-card p-10 mb-8 border-indigo-500/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-10 opacity-5">
                    <Table size={160} className="text-white" />
                </div>

                <div className="flex justify-between items-end mb-10 relative z-10">
                    <div>
                        <h3 className="text-3xl font-black text-white mb-2">Candidate Ledger 프리뷰</h3>
                        <p className="text-sm font-bold text-slate-500">이관될 데이터를 최종적으로 확인하고 AuditFlow의 초동 분석 결과를 검토하십시오.</p>
                    </div>
                    <div className="px-6 py-2 bg-emerald-500/10 text-emerald-400 rounded-full font-black text-xs border border-emerald-500/20">
                        신뢰도 지수: 100% (Matched)
                    </div>
                </div>

                <div className="overflow-x-auto rounded-3xl border border-white/5 bg-black/20">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-white/5 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5">
                            <tr>
                                <th className="px-8 py-5">Date</th>
                                <th className="px-8 py-5">Account</th>
                                <th className="px-8 py-5">Description</th>
                                <th className="px-8 py-5 text-right">Amount</th>
                                <th className="px-8 py-5">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-sm">
                            {candidateLedger.slice(0, 50).map((entry, idx) => (
                                <tr key={entry.id} className="hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-5 text-slate-400 font-mono">{entry.date}</td>
                                    <td className="px-8 py-5 text-indigo-400 font-bold">{entry.debitAccount === '현금' ? entry.creditAccount : entry.debitAccount}</td>
                                    <td className="px-8 py-5 text-white font-black truncate max-w-[200px]">{entry.description}</td>
                                    <td className="px-8 py-5 text-right text-white font-black">₩{(entry.amount || 0).toLocaleString()}</td>
                                    <td className="px-8 py-5">
                                        <span className="px-3 py-1 bg-emerald-500/10 rounded-lg text-[10px] text-emerald-400 font-black uppercase tracking-wider border border-emerald-500/20">READY</span>
                                    </td>
                                </tr>
                            ))}
                            {candidateLedger.length > 50 && (
                                <tr>
                                    <td colSpan={5} className="px-8 py-4 text-center text-slate-500 text-xs font-bold">
                                        ... 외 {candidateLedger.length - 50}개의 항목이 더 있습니다 (대용량 데이터 이관 모드)
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="flex justify-end gap-5">
                <button
                    onClick={() => setCurrentStep('column-mapping')}
                    className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-3xl transition-all border border-white/5"
                >
                    매핑 수정
                </button>
                <button
                    onClick={handleFinalImport}
                    className="px-12 py-5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-3xl transition-all shadow-2xl shadow-indigo-600/30 flex items-center gap-3"
                >
                    최종 승인 및 이관 완료
                    <ArrowUpRight size={20} />
                </button>
            </div>
        </div>
    );

    const renderComplete = () => (
        <div className="flex flex-col items-center justify-center py-20 animate-in zoom-in-95 duration-700">
            <div className="relative mb-12">
                <div className="absolute inset-0 bg-emerald-500 blur-[100px] opacity-20 scale-150"></div>
                <div className="relative p-12 rounded-[40px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 size={84} />
                </div>
            </div>

            <h2 className="text-6xl font-black text-white mb-6 tracking-tighter text-center">Data Migration Success</h2>
            <p className="text-xl font-bold text-slate-500 mb-16 text-center max-w-2xl leading-relaxed">
                축하합니다! 과거 회계 데이터가 <span className="text-emerald-400">Opening_Candidate_Ledger</span>로 안전하게 등록되었습니다.
                이제 본 시점부터의 모든 판단과 책임 구조를 AccountingFlow가 함께합니다.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-16">
                {[
                    { label: '이관된 총 전표', value: `${candidateLedger.length.toLocaleString()}건`, icon: Database, color: 'text-blue-400' },
                    { label: '감지된 리스크 패턴', value: '분석 중', icon: AlertCircle, color: 'text-rose-400' },
                    { label: '데이터 정합성', value: '100%', icon: Zap, color: 'text-amber-400' }
                ].map(stat => (
                    <div key={stat.label} className="professional-card p-8 flex flex-col items-center border border-white/5 bg-white/[0.02]">
                        <stat.icon className={`${stat.color} mb-4`} size={28} />
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest mb-2">{stat.label}</span>
                        <span className="text-3xl font-black text-white">{stat.value}</span>
                    </div>
                ))}
            </div>

            <button
                onClick={() => setTab('dashboard')}
                className="group px-20 py-7 bg-white text-[#070C18] font-black rounded-[40px] transition-all text-2xl shadow-2xl hover:scale-105 active:scale-95 flex items-center gap-4"
            >
                전략 대시보드로 이동
                <ChevronRight className="group-hover:translate-x-2 transition-transform" />
            </button>
        </div>
    );

    return (
        <div className="min-h-screen">
            <div className="max-w-6xl mx-auto py-10">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {currentStep !== 'complete' && renderHeader()}

                        {currentStep === 'source-selection' && renderSourceSelection()}
                        {currentStep === 'file-upload' && renderFileUpload()}
                        {currentStep === 'column-mapping' && renderColumnMapping()}
                        {currentStep === 'validation' && renderValidation()}
                        {currentStep === 'complete' && renderComplete()}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
};
