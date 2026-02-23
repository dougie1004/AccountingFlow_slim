
import React, { useState, useRef } from 'react';
import {
    ShieldCheck,
    FileSearch,
    AlertTriangle,
    CheckCircle2,
    History,
    Lock,
    ArrowRight,
    Hash,
    Fingerprint,
    Search,
    ChevronDown,
    Activity
} from 'lucide-react';
import { ReimportVerifier } from '../utils/reimportVerifier';
import { VerificationReport } from '../utils/integrity';
import { formatCurrency } from '../utils/formatUtils';

export const IntegrityCenter: React.FC = () => {
    const [report, setReport] = useState<VerificationReport | null>(null);
    const [importedData, setImportedData] = useState<any[]>([]);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        setIsVerifying(true);
        try {
            const buffer = await file.arrayBuffer();
            const result = await ReimportVerifier.verifyExcelIntegrity(buffer);
            setReport(result);
            setImportedData(result.importedData);
        } catch (err: any) {
            console.error(err);
            alert(`Integrity Check Failed: ${err.message}`);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Sticky Page Header */}
            <header className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-white flex items-center gap-4 tracking-tighter uppercase">
                        <Lock className="text-indigo-500" size={32} />
                        무결성 검증 센터 (Integrity Center)
                    </h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                        Deterministic Financial Verification & Anti-Tamper Engine
                    </p>
                </div>
                <div className="flex flex-col items-end gap-2">
                    <div className="flex items-center gap-3 bg-indigo-500/10 px-5 py-2.5 rounded-2xl border border-indigo-500/20 text-[10px] font-black uppercase tracking-widest text-indigo-400 shadow-lg shadow-indigo-500/5">
                        <Activity size={14} className="animate-pulse" />
                        Protocol L4 Active
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-indigo-600/5 border border-indigo-500/20 p-6 rounded-3xl col-span-1 md:col-span-3">
                    <h3 className="text-indigo-400 text-sm font-black mb-3 flex items-center gap-2">
                        <ShieldCheck size={18} />
                        운영 목적 (Operational Purpose)
                    </h3>
                    <p className="text-slate-400 text-sm font-bold leading-relaxed">
                        본 센터는 **CFO 및 외부 검토자 전용** "재무 데이터 진본 확인실"입니다. 시스템에서 수출된 엑셀 보고서에는 육안으로 보이지 않는 고유의 **SHA-256 디지털 지문**이 봉인되어 있습니다.
                        파일이 외부로 유출된 후 단 **1원이라도** 수정되거나, 행의 순서가 바뀌거나, 수식이 변경되었다면 이 검증 과정을 통과할 수 없습니다. 이는 보고서의 위변조를 원천 차단하여 기업의 투명성을 증명하는 용도로 사용됩니다.
                    </p>
                </div>
            </div>

            {!report ? (
                <div
                    className={`h-[400px] rounded-[3rem] border-4 border-dashed transition-all flex flex-col items-center justify-center gap-6 group cursor-pointer ${isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]' : 'border-white/5 bg-white/[0.02] hover:border-indigo-500/30'
                        }`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files[0];
                        if (file) handleFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} accept=".xlsx" />
                    <div className="p-10 rounded-full bg-indigo-500/5 text-indigo-400 border border-indigo-500/10 group-hover:scale-110 transition-transform duration-500">
                        <FileSearch size={64} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-2xl font-black text-white mb-2">검증할 엑셀 파일을 드롭하세요</h3>
                        <p className="text-slate-500 font-bold">SHA-256 해시를 대조하여 위변조 여부를 1원 단위로 식별합니다.</p>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in zoom-in-95 duration-300">
                    {/* Status Column */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className={`p-10 rounded-[2.5rem] border ${report.isValid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-rose-500/5 border-rose-500/20 shadow-2xl shadow-rose-500/10'}`}>
                            <div className="flex justify-between items-start mb-8">
                                <div className={`p-5 rounded-[2rem] ${report.isValid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {report.isValid ? <ShieldCheck size={48} /> : <AlertTriangle size={48} />}
                                </div>
                                <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${report.isValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {report.isValid ? 'Authenticated' : 'Integrity Error'}
                                </span>
                            </div>
                            <h3 className="text-3xl font-black text-white mb-2 leading-tight">
                                {report.isValid ? '진본성 확인 완료' : '위변조 위협 감지'}
                            </h3>
                            <p className="text-slate-500 font-bold leading-relaxed">
                                {report.isValid
                                    ? "이 문서는 AccountingFlow 엔진에 의해 생성된 시점과 동일한 재무적 실체를 유지하고 있습니다."
                                    : "문서의 내용이 생성 시점의 암호화 해시와 일치하지 않습니다. 데이터 조작의 가능성이 있습니다."
                                }
                            </p>

                            <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-slate-500 font-bold">Verification Hash</span>
                                    <span className="text-indigo-400 font-mono truncate ml-4 max-w-[150px]">{report.timestamp}</span>
                                </div>
                                <button
                                    onClick={() => { setReport(null); setImportedData([]); }}
                                    className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl transition-all border border-white/5"
                                >
                                    다른 파일 검증하기
                                </button>
                            </div>
                        </div>

                        <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5">
                            <h4 className="text-sm font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                <Fingerprint size={16} /> Digital Fingerprint
                            </h4>
                            <div className="space-y-4">
                                <div className="bg-black/20 p-4 rounded-2xl border border-white/5">
                                    <p className="text-[10px] text-slate-500 font-black uppercase mb-1">SHA-256 Engine Hash</p>
                                    <p className="text-[10px] text-white font-mono break-all leading-relaxed">
                                        {report.diffs.length > 0 && report.diffs[0].field === 'Hash'
                                            ? report.diffs[0].current
                                            : "Verified Consistency ✅"
                                        }
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Data Comparison Column */}
                    <div className="lg:col-span-8 space-y-8">
                        <section className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-3">
                                    <Search className="text-indigo-400" size={20} />
                                    Imported Financial Snapshot
                                </h3>
                                <div className="text-[10px] font-black text-slate-500 bg-white/5 px-4 py-2 rounded-xl">
                                    RECORD COUNT: {importedData.length}
                                </div>
                            </div>
                            <div className="overflow-x-auto max-h-[500px]">
                                <table className="w-full text-left">
                                    <thead className="bg-[#0B1221] text-[10px] font-black text-slate-500 uppercase tracking-widest sticky top-0">
                                        <tr>
                                            <th className="px-8 py-5">Account</th>
                                            <th className="px-8 py-5">Category</th>
                                            <th className="px-8 py-5 text-right">Balance/Value</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {importedData.map((row, idx) => (
                                            <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                                                <td className="px-8 py-5 font-black text-white">{row.Account || row.accountName}</td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[10px] font-black text-slate-500 bg-white/5 px-2 py-1 rounded-md">
                                                        {row.Category || row.category}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right font-mono text-emerald-400 font-bold">
                                                    {formatCurrency(row.Balance || row.Closing || row.PeriodMovement || 0)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {!report.isValid && (
                            <div className="bg-rose-500/10 p-8 rounded-[2.5rem] border border-rose-500/20">
                                <h3 className="text-xl font-black text-rose-400 mb-4 flex items-center gap-3">
                                    <AlertTriangle size={24} />
                                    위변조 식별 리포트 (Diff Analysis)
                                </h3>
                                <div className="space-y-4">
                                    {report.diffs.map((diff, i) => (
                                        <div key={i} className="flex items-center justify-between p-4 bg-black/20 rounded-2xl border border-rose-500/10">
                                            <span className="text-sm font-black text-white">{diff.field}</span>
                                            <div className="flex items-center gap-4">
                                                <span className="text-xs text-slate-500 line-through">{diff.original}</span>
                                                <ArrowRight size={14} className="text-rose-500" />
                                                <span className="text-sm font-black text-rose-400">{diff.current}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
