import React, { useState, useContext } from 'react';
import { Loader2, Database, CheckCircle2, AlertTriangle, Zap, Trash2, X, ExternalLink, ShieldCheck, User, Clock } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { JournalEntry, Partner, ParsedTransaction } from '../../types';
import { AccountingContext } from '../../context/AccountingContext';
import { ALL_ACCOUNTS } from '../../constants/accounts';
import { cleanMarkdown } from '../../utils/textUtils';
import { getResponsibilityRoute } from '../../bridge/StrategicBridge';

interface StagingTableProps {
    data: ParsedTransaction[];
    partners: Partner[];
    onConfirm: (entries: JournalEntry[]) => void;
    onCancel?: () => void;
}

export const StagingTable: React.FC<StagingTableProps> = ({ data, partners, onConfirm }) => {
    const context = useContext(AccountingContext)!;
    const { parseTransaction, isParsing } = useAI();
    const [stagedData, setStagedData] = useState<ParsedTransaction[]>(data);
    const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const runAIAnalysis = async () => {
        const newData = [...stagedData];
        for (let i = 0; i < newData.length; i++) {
            setAnalyzingIndex(i);
            const row = newData[i];
            const input = `Date: ${row.date}, Desc: ${row.description}, Amount: ${row.amount}, Vendor: ${row.vendor}`;
            const result = await parseTransaction(input, "General", partners, "default-tenant", "Solo");
            if (result?.transaction) {
                newData[i] = { ...result.transaction, date: result.transaction.date || row.date };
                setStagedData([...newData]);
            }
            await new Promise(r => setTimeout(r, 100));
        }
        setAnalyzingIndex(null);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Image Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10 bg-[#070C18]/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-5xl max-h-full bg-[#151D2E] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-white font-black flex items-center gap-2">
                                <ExternalLink size={18} className="text-indigo-400" />
                                디지털 증빙 원본 확인
                            </h3>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="p-3 hover:bg-white/5 rounded-2xl text-slate-400 hover:text-white transition-all"
                            >
                                <X size={24} />
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto flex items-start justify-center bg-black/40 cursor-zoom-in">
                            <img
                                src={previewUrl}
                                alt="Evidence Preview"
                                className="w-full h-auto shadow-2xl transition-transform hover:scale-105 duration-500"
                            />
                        </div>
                        <div className="px-8 py-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                            <p className="text-[10px] text-slate-500 mr-auto self-center font-bold">마우스 휠이나 터치패드로 확대/축소가 가능합니다.</p>
                            <button
                                onClick={() => setPreviewUrl(null)}
                                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">가공 대기 목록 ({stagedData.length}건)</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Slim Batch Processor</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={runAIAnalysis}
                        disabled={isParsing || analyzingIndex !== null}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 disabled:bg-white/5 disabled:text-slate-500 font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                        {analyzingIndex !== null ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                        AI 일괄 분석 실행
                    </button>
                    <button
                        onClick={() => {
                            const entries: JournalEntry[] = stagedData.map(d => ({
                                id: d.id || Math.random().toString(36).substr(2, 9),
                                journalNumber: 'PENDING',
                                sequenceNumber: 0,
                                date: d.date || new Date().toISOString().split('T')[0],
                                description: d.description || '',
                                vendor: d.vendor,
                                debitAccount: d.debitAccount || d.accountName || '미확정비용',
                                creditAccount: d.creditAccount || '미지급금',
                                amount: d.amount,
                                vat: d.vat,
                                type: d.entryType || 'Expense',
                                status: 'Unconfirmed',
                                createdAt: new Date().toISOString(),
                                confidence: d.confidence === 'High' ? 0.95 : d.confidence === 'Medium' ? 0.7 : 0.5,
                                classificationStatus: 'AUTO_CLASSIFIED',
                                attachments: d.attachmentUrl ? [{
                                    id: Math.random().toString(36).substr(2, 9),
                                    fileName: 'evidence.jpg',
                                    fileUrl: d.attachmentUrl,
                                    uploadedAt: new Date().toISOString()
                                }] : []
                            }));
                            onConfirm(entries);
                        }}
                        className="bg-emerald-600 text-white px-8 py-4 rounded-2xl hover:bg-emerald-700 font-black text-sm"
                    >
                        장부 반영 ({stagedData.length}건)
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 professional-card p-0 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[#151D2E] text-slate-500 font-black uppercase text-[10px] tracking-widest border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-5">DATE</th>
                                    <th className="px-6 py-5">DESCRIPTION</th>
                                    <th className="px-6 py-5 text-right">AMOUNT</th>
                                    <th className="px-6 py-5">ACCOUNT</th>
                                    <th className="px-6 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stagedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setSelectedRow(idx)}
                                        className={`transition-all cursor-pointer ${selectedRow === idx ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'} ${!row.accountName ? 'opacity-60 saturate-50' : ''}`}
                                    >
                                        <td className="px-6 py-4 font-mono text-xs">{row.date}</td>
                                        <td className="px-6 py-4">
                                            <div className="text-white font-black truncate max-w-[200px]">{cleanMarkdown(row.description)}</div>
                                            <div className="text-[10px] font-bold text-slate-500">{row.vendor || '거래처 미상'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right font-black text-white">₩{row.amount.toLocaleString()}</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`px-3 py-1 rounded-lg font-black text-[10px] uppercase text-center ${row.accountName ? 'bg-indigo-500/10 text-indigo-400' : 'bg-[#1E293B] border border-white/10 text-slate-400'}`}>
                                                    {row.accountName || 'Unclassified (권한)'}
                                                </span>
                                                {!row.accountName && (
                                                    <div className="flex flex-col gap-1">
                                                        <span className={`flex items-center justify-center gap-1.5 px-2 py-0.5 rounded-md border text-[8px] font-black uppercase tracking-tighter ${row.amount >= 10000000 ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-500/5 text-indigo-400/80 border-indigo-500/10'}`}>
                                                            <User size={8} /> Next: {getResponsibilityRoute(row).currentOwner}
                                                        </span>
                                                        {getResponsibilityRoute(row).nextEscalation && (
                                                            <span className="text-[7px] font-bold text-amber-500/60 text-center italic tracking-tighter">
                                                                * 3일 후 {getResponsibilityRoute(row).nextEscalation} 자동 이관
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setStagedData(prev => prev.filter((_, i) => i !== idx));
                                                    if (selectedRow === idx) setSelectedRow(null);
                                                    else if (selectedRow !== null && idx < selectedRow) setSelectedRow(selectedRow - 1);
                                                }}
                                                className="text-slate-500 hover:text-rose-500"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {selectedRow !== null && stagedData[selectedRow] && (
                        <div className="professional-card p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                            <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Detail View</h4>

                            {stagedData[selectedRow]?.attachmentUrl && (
                                <div className="rounded-xl overflow-hidden border border-white/10 relative group">
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/50 backdrop-blur-md rounded text-[10px] text-white font-bold">
                                        원본 증빙
                                    </div>
                                    <img
                                        src={stagedData[selectedRow]?.attachmentUrl}
                                        alt="Evidence"
                                        className="w-full h-auto object-contain max-h-[300px] bg-white/5"
                                    />
                                    <button
                                        onClick={() => setPreviewUrl(stagedData[selectedRow]?.attachmentUrl || null)}
                                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white font-bold transition-opacity"
                                    >
                                        크게 보기
                                    </button>
                                </div>
                            )}

                            <div className="text-xl font-black text-white">{stagedData[selectedRow].description}</div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">계정과목</label>
                                    <input
                                        list="staging-account-list"
                                        value={stagedData[selectedRow].accountName || ""}
                                        onChange={(e) => {
                                            const newData = [...stagedData];
                                            newData[selectedRow].accountName = e.target.value;
                                            setStagedData(newData);
                                        }}
                                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm outline-none focus:border-indigo-500 transition-colors"
                                    />
                                    <datalist id="staging-account-list">
                                        {ALL_ACCOUNTS.map(acc => <option key={acc.code} value={acc.name} />)}
                                    </datalist>
                                </div>
                                <div>
                                    <div className="flex items-center justify-between mb-1">
                                        <label className="text-[10px] font-black text-slate-500 uppercase block">AI 판단 근거 및 정책 준수</label>
                                        <div className="flex items-center gap-1 px-1.5 py-0.5 bg-indigo-500/10 rounded border border-indigo-500/20">
                                            <ShieldCheck size={8} className="text-indigo-400" />
                                            <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter">Verified by Rule #7</span>
                                        </div>
                                    </div>
                                    <div className="relative group">
                                        <p className={`text-sm leading-relaxed p-4 rounded-xl border ${stagedData[selectedRow].accountName ? 'text-slate-400 bg-white/5 border-white/5' : 'text-[#94A3B8] bg-[#1E293B]/50 border-white/10'}`}>
                                            {stagedData[selectedRow].accountName ? (
                                                stagedData[selectedRow].reasoning
                                            ) : (
                                                <div className="flex flex-col gap-3">
                                                    <div className="flex items-center gap-2 text-white/60 uppercase tracking-widest text-[10px] font-black">
                                                        <ShieldCheck size={12} />
                                                        <span>Trust Surface: Grey Zone</span>
                                                    </div>
                                                    <div>
                                                        <span className="block text-lg font-black text-white mb-1">AI가 판단하지 않은 영역입니다.</span>
                                                        <span className="block text-sm text-slate-400 font-medium">이 판단은 당신의 권한입니다.</span>
                                                    </div>
                                                    <div className="h-px bg-white/10 w-full my-1" />
                                                    <span className="text-xs text-slate-500 italic">
                                                        * 시스템 회계 헌법 제7조에 의거, 불확실한 판단을 내리는 대신 침묵(Silence)을 선택했습니다.
                                                    </span>
                                                </div>
                                            )}
                                        </p>
                                        {/* Responsibility Routing Badge in Detail */}
                                        {!stagedData[selectedRow].accountName && (
                                            <div className="mt-3 flex flex-col gap-2">
                                                <div className="flex items-center justify-between px-3 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                                    <div className="flex items-center gap-2">
                                                        <Database size={12} className="text-rose-400" />
                                                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">Responsibility Path</span>
                                                    </div>
                                                    <span className="text-[10px] font-black text-white bg-rose-600 px-2 py-0.5 rounded shadow-lg uppercase">Next: {getResponsibilityRoute(stagedData[selectedRow]).currentOwner}</span>
                                                </div>
                                                <div className="px-3 py-2 bg-white/5 rounded-lg border border-white/5">
                                                    <p className="text-[10px] text-slate-400 font-bold leading-tight">
                                                        {getResponsibilityRoute(stagedData[selectedRow]).description}
                                                    </p>
                                                </div>
                                                {getResponsibilityRoute(stagedData[selectedRow]).nextEscalation && (
                                                    <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/5 rounded-lg border border-amber-500/10">
                                                        <Clock size={10} className="text-amber-500" />
                                                        <span className="text-[9px] font-bold text-amber-500/80">
                                                            {getResponsibilityRoute(stagedData[selectedRow]).escalationAfterDays}일 후 {getResponsibilityRoute(stagedData[selectedRow]).nextEscalation} 검토로 자동 이관됩니다.
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {/* CBT Observer Tooltip */}
                                        <div className="absolute -top-10 left-0 w-max px-3 py-1.5 bg-indigo-600 text-white text-[10px] font-black rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl border border-white/10 z-10">
                                            [CBT_OBSERVER] STARTUP_V1 규격: 1인~소규모 조직을 위한 지연 방지 라우팅이 적용되었습니다.
                                        </div>
                                    </div>
                                    {/* Footer Disclaimer Removed (Integrated above) */}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
