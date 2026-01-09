import React, { useState } from 'react';
import {
    Upload,
    Database,
    CheckCircle2,
    AlertCircle,
    ArrowRight,
    ShieldCheck,
    FileSpreadsheet,
    Loader2,
    Download,
    Info,
    ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { invoke } from '@tauri-apps/api/core';

interface DataMigrationProps {
    setTab: (tab: string) => void;
}

export const DataMigration: React.FC<DataMigrationProps> = ({ setTab }) => {
    const [isUploading, setIsUploading] = useState(false);
    const [migrationResult, setMigrationResult] = useState<any | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState(0);

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);
        setProgress(10);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            setProgress(30);

            // 이관 엔진 호출 (전용 Migration Engine)
            const result = await invoke<any>('run_erp_migration', {
                fileBytes: Array.from(bytes),
                fileName: file.name
            });

            setProgress(80);

            setMigrationResult({
                totalCount: result.totalRecords,
                mappedCount: result.mappedRecords,
                newAccounts: result.suggestedAccounts.length,
                summary: `성공적 분석: ${result.erpType}에서 생성된 데이터를 확인했습니다. 계정 맵핑률 ${Math.round((result.mappedRecords / result.totalRecords) * 100)}% 입니다.`
            });

            setProgress(100);
        } catch (err: any) {
            setError(err.toString());
        } finally {
            setIsUploading(false);
        }
    };

    const downloadSample = (type: string) => {
        let headers = "";
        let rows = "";
        let fileName = "";

        if (type === 'douzone') {
            fileName = "ERP_더존_백업_전표원장_샘플.csv";
            headers = "일자,부서,사원,코드,계정명,적요,차변,대변,거래처명,사업자번호";
            rows = "2025-01-02,영업부,김철수,0146,상품,반도체칩 매입,15000000,0,글로벌반도체,123-45-67890\n2025-01-02,영업부,김철수,0251,외상매입금,반도체칩 매입 외상,0,15000000,글로벌반도체,123-45-67890";
        } else if (type === 'sap') {
            fileName = "SAP_GeneralLedger_Export_Sample.csv";
            headers = "PostingDate,DocType,GL_Account,AccountDescription,Text,Amount,Currency,VendorName,Assignment";
            rows = "2025-01-05,SA,100100,Inventory,Purchasing Raw Materials,25000.00,USD,GlobalSupply,PO-99102\n2025-01-05,SA,200100,Accounts Payable,Purchasing Raw Materials,-25000.00,USD,GlobalSupply,PO-99102";
        } else if (type === 'tax') {
            fileName = "세무사랑_합계잔액시산표_기초이관.csv";
            headers = "과목코드,과목명,차변잔액,대변잔액,기초이월액,직전결산액";
            rows = "101,현금,15000000,0,12000000,10000000\n108,외상매출금,55000000,0,45000000,40000000\n251,외상매입금,0,30000000,25000000,20000000";
        }

        try {
            const blob = new Blob([`\uFEFF${headers}\n${rows}`], { type: 'text/csv;charset=utf-8' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = fileName;

            // Append to DOM to ensure browser recognizes the click gesture context
            document.body.appendChild(link);
            link.click();

            // Cleanup with a slight delay to ensure download starts
            setTimeout(() => {
                document.body.removeChild(link);
                window.URL.revokeObjectURL(url);
            }, 100);
        } catch (e) {
            console.error("Download failed:", e);
            alert("다운로드 중 오류가 발생했습니다. 브라우저 설정을 확인해주세요.");
        }
    };

    return (
        <div className="space-y-10 pb-24 p-6 bg-[#0B1221] min-h-screen">
            {/* Header Area with Glassmorphism */}
            <header className="flex flex-col gap-4 relative z-10">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20 shadow-2xl shadow-indigo-500/10">
                        <Database className="text-indigo-400" size={40} />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tight">
                            ERP 스마트 마이그레이션
                        </h1>
                        <p className="text-slate-400 text-lg font-medium mt-1">기존 ERP 데이터의 AI 기반 자율 인계 엔진</p>
                    </div>
                </div>

                {/* Clarification Box */}
                <div className="mt-4 p-5 bg-indigo-500/5 border border-indigo-500/10 rounded-2xl flex items-start gap-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg shrink-0">
                        <Info className="text-indigo-400" size={20} />
                    </div>
                    <div className="text-sm">
                        <p className="text-indigo-200 font-black mb-1">💡 기능 안내</p>
                        <p className="text-slate-400 leading-relaxed font-medium">
                            <strong className="text-indigo-400">스마트 마이그레이션</strong>은 과거 수년치 전표의 일괄 이관 및 계정 체계 전환을 위해 설계되었습니다.
                            단순 일일 대량 전표 업로드는 <span className="text-indigo-400 underline cursor-pointer" onClick={() => setTab('ledger')}>AI 자동 분개장</span>의 엑셀 업로드 기능을 이용하시는 것이 더 빠릅니다.
                        </p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 relative z-10">
                {/* File Drop Zone */}
                <div className="lg:col-span-2 space-y-8">
                    <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="bg-[#151D2E]/80 backdrop-blur-xl border-2 border-dashed border-white/5 rounded-[3rem] p-16 flex flex-col items-center justify-center text-center transition-all hover:bg-[#1a253a]/90 hover:border-indigo-500/50 group shadow-3xl"
                    >
                        <div className="w-24 h-24 rounded-[2rem] bg-indigo-500/10 flex items-center justify-center mb-8 group-hover:scale-110 transition-transform shadow-2xl shadow-indigo-500/5 border border-indigo-500/20">
                            <Upload className="text-indigo-400" size={48} />
                        </div>
                        <h3 className="text-2xl font-black text-white mb-3 tracking-tight">ERP 백업 파일 업로드</h3>
                        <p className="text-slate-400 mb-10 max-w-md font-medium leading-loose">
                            더존, SAP, 세무사랑 등에서 내보낸 엑셀 또는 CSV 파일을 선택하세요.<br />
                            AI가 헤더 구조를 분석하여 맵핑 안을 제안합니다.
                        </p>

                        <div className="flex items-center gap-4">
                            <label className="relative overflow-hidden inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white px-10 py-5 rounded-[2rem] font-black cursor-pointer transition-all shadow-2xl shadow-indigo-600/30 hover:shadow-indigo-600/50 active:scale-95">
                                <FileSpreadsheet size={24} />
                                <span className="text-lg">파일 분석 시작하기</span>
                                <input type="file" className="absolute opacity-0 w-0 h-0" onChange={handleFileUpload} accept=".csv,.xlsx,.xls" />
                            </label>
                        </div>
                    </motion.div>

                    {/* Progress Bar Rendering */}
                    <AnimatePresence>
                        {isUploading && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-[#151D2E] rounded-[2.5rem] p-10 border border-white/10 shadow-3xl"
                            >
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <Loader2 className="animate-spin text-indigo-400" size={28} />
                                        <div>
                                            <span className="font-black text-white text-lg">AI 지능형 자율 분석 중...</span>
                                            <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Structural Schema Mapping In-Progress</p>
                                        </div>
                                    </div>
                                    <span className="text-2xl font-black text-indigo-400 font-mono">{progress}%</span>
                                </div>
                                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-white/5">
                                    <motion.div
                                        className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${progress}%` }}
                                        transition={{ type: "spring", stiffness: 50, damping: 20 }}
                                    />
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Sample Data Access section */}
                    <div className="bg-[#151D2E]/50 backdrop-blur-md border border-white/5 rounded-[3rem] p-10 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl font-black text-white flex items-center gap-3">
                                    <Download className="text-amber-400" size={28} />
                                    마이그레이션 샘플 데이터
                                </h3>
                                <p className="text-slate-500 font-bold mt-1">이관 시나리오 테스트를 위한 표준 규격 데이터입니다.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { id: 'douzone', label: '더존(iU/Smart A)', sub: 'Standard Type A', desc: '분개장 백업 샘플', color: 'indigo' },
                                { id: 'sap', label: 'SAP (FICO)', sub: 'Global Enterprise', desc: 'G/L Export (.csv)', color: 'emerald' },
                                { id: 'tax', label: '세무사랑/K-Leap', sub: 'Tax Reporting', desc: '합계잔액시산표 가공안', color: 'rose' }
                            ].map((item) => (
                                <motion.button
                                    key={item.id}
                                    whileHover={{ y: -5, backgroundColor: 'rgba(255,255,255,0.08)' }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => downloadSample(item.id)}
                                    className="flex flex-col items-start p-6 bg-white/5 rounded-[2rem] border border-white/5 hover:border-indigo-500/30 transition-all text-left shadow-lg group"
                                >
                                    <span className={`text-[10px] font-black text-${item.color}-400 uppercase tracking-widest mb-2`}>{item.sub}</span>
                                    <span className="text-white font-black text-lg group-hover:text-indigo-300 transition-colors uppercase tracking-tight">{item.label}</span>
                                    <span className="text-xs text-slate-500 mt-2 font-bold leading-relaxed">{item.desc}</span>
                                    <div className="mt-6 flex items-center text-[10px] font-black text-slate-400 group-hover:text-white tracking-[0.2em] transition-colors">
                                        DOWNLOAD <ChevronRight size={14} className="ml-1" />
                                    </div>
                                </motion.button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Status & Dashboard */}
                <div className="space-y-8">
                    <div className="bg-gradient-to-br from-[#1E293B] to-[#0F172A] border border-white/10 rounded-[3rem] p-10 shadow-3xl relative overflow-hidden">
                        <div className="relative z-10 flex flex-col h-full">
                            <h3 className="text-xl font-black text-white mb-8 flex items-center gap-3">
                                <CheckCircle2 className="text-indigo-400" size={24} />
                                Migration Status
                            </h3>

                            <div className="flex-1 space-y-8">
                                {!migrationResult ? (
                                    <div className="text-center py-12 space-y-6">
                                        <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-slate-600">
                                            <Database size={40} />
                                        </div>
                                        <p className="text-slate-500 font-bold leading-relaxed">준비된 파일을 업로드하면<br />분석 지표가 이곳에 표시됩니다.</p>

                                        <div className="p-6 bg-white/5 rounded-[2rem] text-left border border-white/5 space-y-4">
                                            <div className="flex items-center gap-2 mb-2 text-indigo-400 font-black text-[10px] uppercase tracking-widest">
                                                <Info size={16} />
                                                <span>AI 이관 규격</span>
                                            </div>
                                            <ul className="space-y-3 text-[11px] text-slate-400 font-bold">
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                                    <span>.csv, .xlsx 형식 일괄 이관 지원</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                                    <span>AI 시맨틱 필드 자동 맵핑 (Smart Match)</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1 shrink-0" />
                                                    <span>통화 및 계정 체계 커스텀 변환</span>
                                                </li>
                                            </ul>
                                        </div>
                                    </div>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="space-y-8"
                                    >
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-white/5 rounded-3xl p-6 border border-white/5">
                                                <p className="text-[10px] font-black text-slate-600 uppercase mb-2">Total Recs</p>
                                                <p className="text-3xl font-black text-white font-mono">{migrationResult.totalCount}</p>
                                            </div>
                                            <div className="bg-indigo-500/10 rounded-3xl p-6 border border-indigo-500/20">
                                                <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Mapped AI</p>
                                                <p className="text-3xl font-black text-indigo-200 font-mono">{migrationResult.mappedCount}</p>
                                            </div>
                                        </div>

                                        <div className="bg-white/5 border border-white/5 rounded-[2rem] p-6">
                                            <p className="text-[10px] font-black text-slate-500 uppercase mb-3">AI Analysis Engine Note</p>
                                            <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                                {migrationResult.summary}
                                            </p>
                                        </div>

                                        <button className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:scale-[1.02] text-white font-black py-5 rounded-[2rem] transition-all flex items-center justify-center gap-3 shadow-2xl shadow-indigo-600/30 active:scale-95 text-xl tracking-tight">
                                            이관 데이터 확정
                                            <ArrowRight size={24} />
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    </div>

                    <div className="bg-[#151D2E]/80 backdrop-blur-md border border-white/5 rounded-[3rem] p-10 shadow-2xl space-y-6">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-500/10 rounded-xl">
                                <ShieldCheck className="text-emerald-400" size={24} />
                            </div>
                            <h3 className="text-xl font-black text-white">데이터 거버넌스</h3>
                        </div>
                        <p className="text-sm text-slate-400 font-medium leading-loose italic">
                            업로드된 모든 ERP 데이터는 <strong className="text-white">로컬 전용 샌드박스</strong>에서 처리되며, AI 분석 후 즉시 데이터 무결성 검증을 거쳐 안전하게 기록됩니다.
                        </p>
                    </div>
                </div>
            </div>

            {error && (
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-8 rounded-[2.5rem] flex items-center gap-6 shadow-2xl shadow-rose-500/10"
                >
                    <div className="p-3 bg-rose-500/20 rounded-2xl">
                        <AlertCircle size={32} />
                    </div>
                    <div>
                        <p className="text-xs font-black uppercase mb-1">Engine Error Detected</p>
                        <span className="font-bold text-lg">{error}</span>
                    </div>
                </motion.div>
            )}
        </div>
    );
};
