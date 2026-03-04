import React, { useState, useContext } from 'react';
import { Loader2, Database, CheckCircle2, AlertTriangle, Zap, Trash2, X, ExternalLink, ShieldCheck, User, Clock, ChevronDown, Shield, ChevronUp, History as HistoryIcon, Plus, Sparkles, Paperclip, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { JournalEntry, Partner, ParsedTransaction, AccountNature } from '../../types';
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

interface JournalLine {
    account: string;
    amount: number;
    type: 'Debit' | 'Credit';
}

export const StagingTable: React.FC<StagingTableProps> = ({ data, partners, onConfirm }) => {
    const context = useContext(AccountingContext)!;
    const { parseTransaction, isParsing } = useAI();
    const [stagedData, setStagedData] = useState<ParsedTransaction[]>(data);
    const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
    const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [zoom, setZoom] = useState(1);
    const [suggestions, setSuggestions] = useState<any[]>([]);

    // Multi-line editor state for the selected row
    const [editLines, setEditLines] = useState<JournalLine[]>([]);

    React.useEffect(() => {
        if (selectedRow !== null) {
            const row = stagedData[selectedRow];
            const vendor = row?.vendor;
            if (vendor) {
                const source = row.sourceType || 'Universal';
                const flow = row.amountOrigin === 'DepositColumn' ? 'IN' : 'OUT';
                const amount = row.amount || 0;
                const date = row.date || new Date().toISOString().split('T')[0];

                context.getAccountSuggestions(source, flow, vendor, amount, date).then(setSuggestions);
            } else {
                setSuggestions([]);
            }

            // Initialize edit lines from the row data
            const amount = row.amount || 0;
            const vat = row.vat || 0;

            const initialLines: JournalLine[] = [];
            const displayAccount = (row.accountName === '계정확인필요' || !row.accountName) ? '' : row.accountName;

            if (vat > 0) {
                initialLines.push({ account: displayAccount, amount: amount - vat, type: 'Debit' });
                initialLines.push({ account: '부가가치세대급금', amount: vat, type: 'Debit' });
            } else {
                initialLines.push({ account: displayAccount, amount: amount, type: 'Debit' });
            }

            initialLines.push({ account: row.creditAccount || '미지급금', amount: amount, type: 'Credit' });

            setEditLines(initialLines);
        } else {
            setSuggestions([]);
            setEditLines([]);
        }
    }, [selectedRow, stagedData, context]);

    const addLine = (type: 'Debit' | 'Credit') => {
        setEditLines([...editLines, { account: '', amount: 0, type }]);
    };

    const removeLine = (idx: number) => {
        setEditLines(editLines.filter((_, i) => i !== idx));
    };

    const updateLine = (idx: number, updates: Partial<JournalLine>) => {
        setEditLines(editLines.map((l, i) => i === idx ? { ...l, ...updates } : l));
    };

    const debitTotal = editLines.filter(l => l.type === 'Debit').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const creditTotal = editLines.filter(l => l.type === 'Credit').reduce((sum, l) => sum + (Number(l.amount) || 0), 0);
    const isBalanced = Math.abs(debitTotal - creditTotal) < 0.01 && debitTotal > 0;

    const handleSaveDetail = () => {
        if (!isBalanced || selectedRow === null) return;

        const newData = [...stagedData];
        const primaryDebit = editLines.find(l => l.type === 'Debit' && l.account !== '부가가치세대급금');
        const primaryCredit = editLines.find(l => l.type === 'Credit');
        const vatLine = editLines.find(l => l.account === '부가가치세대급금');

        newData[selectedRow] = {
            ...newData[selectedRow],
            accountName: primaryDebit?.account || newData[selectedRow].accountName,
            debitAccount: primaryDebit?.account || newData[selectedRow].debitAccount,
            creditAccount: primaryCredit?.account || newData[selectedRow].creditAccount,
            debitLegs: editLines.filter(l => l.type === 'Debit').map(l => ({ account: l.account, amount: l.amount })),
            creditLegs: editLines.filter(l => l.type === 'Credit').map(l => ({ account: l.account, amount: l.amount })),
            amount: debitTotal,
            vat: vatLine?.amount || 0,
            reasoning: `[User Refined] ${editLines.length} lines journal entry. Balance OK.`
        };
        setStagedData(newData);
        setSelectedRow(null);
    };

    const toggleSelect = (idx: number) => {
        const next = new Set(selectedIndices);
        if (next.has(idx)) next.delete(idx);
        else next.add(idx);
        setSelectedIndices(next);
    };

    const toggleAll = () => {
        if (selectedIndices.size === stagedData.length) {
            setSelectedIndices(new Set());
        } else {
            const next = new Set<number>();
            stagedData.forEach((_, i) => next.add(i));
            setSelectedIndices(next);
        }
    };

    const runSingleAIAnalysis = async (index: number) => {
        if (analyzingIndex !== null) return;
        setAnalyzingIndex(index);
        const row = stagedData[index];
        const input = `Date: ${row.date}, Desc: ${row.description}, Amount: ${row.amount}, Vendor: ${row.vendor}`;
        try {
            const result = await parseTransaction(input, context.corporateRules || "General", partners, "default-tenant", "Solo");
            if (result?.transaction) {
                const updatedRow = {
                    ...result.transaction,
                    date: result.transaction.date || row.date,
                    // If AI gave us a debitAccount, use it as accountName for the UI
                    accountName: result.transaction.accountName || result.transaction.debitAccount || row.accountName
                };
                const newData = [...stagedData];
                newData[index] = updatedRow;
                setStagedData(newData);
            }
        } finally {
            setAnalyzingIndex(null);
        }
    };

    // Keyboard Navigation
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (selectedRow === null) return;

            // Don't trigger if typing in an input
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (selectedRow > 0) setSelectedRow(selectedRow - 1);
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (selectedRow < stagedData.length - 1) setSelectedRow(selectedRow + 1);
            } else if (e.key === 'Escape') {
                setSelectedRow(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedRow, stagedData]);

    const runAIAnalysis = async () => {
        const newData = [...stagedData];
        const concurrency = 5;
        setAnalyzingIndex(-1); // Use -1 to indicate batch progress

        for (let i = 0; i < newData.length; i += concurrency) {
            const chunk = newData.slice(i, i + concurrency);
            await Promise.all(chunk.map(async (row, chunkIdx) => {
                const idx = i + chunkIdx;
                const input = `Date: ${row.date}, Desc: ${row.description}, Amount: ${row.amount}, Vendor: ${row.vendor}`;
                const result = await parseTransaction(input, context.corporateRules || "General", partners, "default-tenant", "Solo");
                if (result?.transaction) {
                    newData[idx] = {
                        ...result.transaction,
                        date: result.transaction.date || row.date,
                        accountName: result.transaction.accountName || result.transaction.debitAccount || row.accountName
                    };
                }
            }));
            setStagedData([...newData]);
        }
        setAnalyzingIndex(null);
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Image Preview Modal */}
            {previewUrl && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-10 bg-[#070C18]/90 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="relative w-full max-w-5xl h-[85vh] bg-[#151D2E] rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-white/5 flex justify-between items-center bg-slate-900/50">
                            <h3 className="text-white font-black flex items-center gap-2">
                                <ExternalLink size={18} className="text-indigo-400" />
                                디지털 증빙 원본 확인
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setZoom(prev => Math.max(0.5, prev - 0.25))} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all"><ZoomOut size={20} /></button>
                                <span className="text-[10px] font-mono text-slate-500 w-12 text-center">{Math.round(zoom * 100)}%</span>
                                <button onClick={() => setZoom(prev => Math.min(3, prev + 0.25))} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all"><ZoomIn size={20} /></button>
                                <button onClick={() => setZoom(1)} className="p-2 hover:bg-white/5 rounded-xl text-slate-400 transition-all mr-4"><Maximize2 size={18} /></button>
                                <button
                                    onClick={() => { setPreviewUrl(null); setZoom(1); }}
                                    className="p-3 hover:bg-rose-500/10 rounded-2xl text-slate-400 hover:text-rose-400 transition-all"
                                >
                                    <X size={24} />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-auto flex items-start justify-center bg-black/40 p-10 pattern-bg">
                            <div
                                className="transition-transform duration-200 origin-top"
                                style={{ transform: `scale(${zoom})` }}
                            >
                                <img
                                    src={previewUrl}
                                    alt="Evidence Preview"
                                    className="max-w-full h-auto shadow-2xl rounded-sm"
                                />
                            </div>
                        </div>
                        <div className="px-8 py-6 border-t border-white/10 bg-white/[0.02] flex justify-end gap-3">
                            <p className="text-[10px] text-slate-500 mr-auto self-center font-bold italic tracking-widest">REALITY ENGINE v3.1: HIGH-RESOLUTION AUDIT VIEW</p>
                            <button
                                onClick={() => { setPreviewUrl(null); setZoom(1); }}
                                className="px-10 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-sm transition-all border border-white/10"
                            >
                                창 닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                    <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] text-indigo-400 shadow-2xl shadow-indigo-500/10 ring-1 ring-indigo-500/20">
                        <Database size={28} />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-white tracking-tight">회계 가공 대기 목록 ({stagedData.length}건)</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">
                            Slim Batch Reality Processor <span className="text-amber-500 mx-2">|</span>
                            <span className="text-amber-500">AI 분석 전: {stagedData.filter(d => !d.accountName || d.accountName === '계정확인필요' || d.accountName === 'AI 미분석').length}건</span>
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={runAIAnalysis}
                        disabled={isParsing || analyzingIndex !== null}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-500 disabled:bg-white/5 disabled:text-slate-500 font-black text-xs transition-all active:scale-95 group shadow-xl shadow-indigo-600/20 bubble-hover"
                    >
                        {analyzingIndex === -1 ? <Loader2 className="animate-spin" size={16} /> : <Zap size={16} />}
                        AI 스마트 일괄 분석 (Speed Pack)
                    </button>
                    <button
                        onClick={() => {
                            try {
                                const dataToConfirm = selectedIndices.size > 0
                                    ? stagedData.filter((_, i) => selectedIndices.has(i))
                                    : stagedData.filter(d => !d.isIntent);

                                if (dataToConfirm.length === 0) return;

                                const entries: Partial<JournalEntry>[] = dataToConfirm.map(d => ({
                                    date: d.date || new Date().toISOString().split('T')[0],
                                    transactionDate: d.date || new Date().toISOString().split('T')[0],
                                    recognitionDate: d.date || new Date().toISOString().split('T')[0],
                                    description: d.description || '이름 없는 거래',
                                    vendor: d.vendor || '거래처 미상',
                                    debitAccount: d.accountName || d.debitAccount || '미확정비용',
                                    creditAccount: d.creditAccount || '미지급금',
                                    debitLegs: d.debitLegs || [],
                                    creditLegs: d.creditLegs || [],
                                    amount: d.amount - (d.vat || 0), // supply amount
                                    vat: d.vat || 0,
                                    type: d.entryType as JournalEntry['type'] || 'Expense',
                                    status: 'Unconfirmed',
                                    createdAt: new Date().toISOString(),
                                    confidence: d.confidence === 'High' ? 0.95 : 0.7,
                                    classificationStatus: 'AUTO_CLASSIFIED',
                                    attachments: d.attachmentUrl ? [{
                                        id: Math.random().toString(36).substr(2, 9),
                                        fileName: 'evidence.jpg',
                                        fileUrl: d.attachmentUrl,
                                        uploadedAt: new Date().toISOString()
                                    }] : []
                                }));
                                onConfirm(entries as JournalEntry[]);

                                if (selectedIndices.size > 0 && selectedIndices.size <= stagedData.length) {
                                    setStagedData(prev => prev.filter((_, i) => !selectedIndices.has(i)));
                                    setSelectedIndices(new Set());
                                    setSelectedRow(null);
                                } else {
                                    setStagedData([]);
                                    setSelectedIndices(new Set());
                                    setSelectedRow(null);
                                }
                            } catch (err) {
                                console.error('[StagingTable] Confirmation error:', err);
                                alert('장부 반영 중 오류가 발생했습니다.');
                            }
                        }}
                        className={`${selectedIndices.size > 0 ? 'bg-indigo-600' : 'bg-emerald-600'} text-white px-8 py-3.5 rounded-xl hover:opacity-90 active:scale-95 font-black text-sm transition-all shadow-lg shadow-indigo-600/10`}
                    >
                        {selectedIndices.size > 0 ? `${selectedIndices.size}건 선택 장부 반영` : `전체 장부 승인 (${stagedData.length}건)`}
                    </button>
                </div>
            </div>

            <div className={`grid grid-cols-1 ${selectedRow !== null ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
                <div className={`${selectedRow !== null ? 'lg:col-span-1' : 'lg:col-span-1'} professional-card p-0 overflow-hidden shadow-2xl border-white/10 ring-1 ring-white/5`}>
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="bg-[#151D2E] text-slate-500 font-bold uppercase text-[10px] tracking-[0.15em] border-b border-white/5">
                                <tr>
                                    <th className="px-6 py-4 w-12">
                                        <input
                                            type="checkbox"
                                            checked={selectedIndices.size === stagedData.length && stagedData.length > 0}
                                            onChange={toggleAll}
                                            className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-500 cursor-pointer"
                                        />
                                    </th>
                                    <th className="px-6 py-4">일자</th>
                                    <th className="px-6 py-4">상세 내역</th>
                                    <th className="px-6 py-4 text-right">금액</th>
                                    <th className="px-6 py-4">계정</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stagedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setSelectedRow(idx)}
                                        className={`transition-all cursor-pointer group 
                                            ${selectedRow === idx ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'} 
                                            ${!row.accountName ? 'opacity-80' : ''}`}
                                    >
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                checked={selectedIndices.has(idx)}
                                                onChange={() => toggleSelect(idx)}
                                                className="w-4 h-4 rounded border-white/10 bg-slate-950 accent-indigo-500 cursor-pointer"
                                            />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-white font-mono text-xs font-black tracking-tight">{row.date?.split('-').slice(1).join('.')}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-0.5">
                                                <div className="flex items-center gap-1.5">
                                                    <div className="text-white text-xs font-black truncate max-w-[150px]">{cleanMarkdown(row.description)}</div>
                                                    {row.attachmentUrl && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPreviewUrl(row.attachmentUrl || null);
                                                                setZoom(1);
                                                            }}
                                                            className="p-1 text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-all animate-pulse"
                                                            title="디지털 증빙 확인"
                                                        >
                                                            <Paperclip size={12} strokeWidth={3} />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="text-[9px] font-bold text-slate-500">{row.vendor || '-'}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="text-sm font-black text-white tracking-tight tabular-nums">₩{row.amount.toLocaleString()}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <span className={`px-2 py-1 rounded-md font-bold text-[9px] transition-all border ${row.accountName && row.accountName !== '계정확인필요' && row.accountName !== '분류 필요' && row.accountName !== 'AI 미분석' && row.accountName !== '미지정' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-400/20' : 'bg-amber-500/10 border-amber-500/20 text-amber-500/80'}`}>
                                                    {(!row.accountName || row.accountName === '미지정' || row.accountName === '계정확인필요') ? '분류 대기 중' : row.accountName}
                                                </span>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        runSingleAIAnalysis(idx);
                                                    }}
                                                    disabled={analyzingIndex === idx || analyzingIndex === -1}
                                                    className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 opacity-100 group-hover:scale-110 transition-all hover:bg-indigo-500 hover:text-white border border-indigo-500/20 disabled:opacity-30"
                                                    title="이 거래만 AI 추천 받기"
                                                >
                                                    {analyzingIndex === idx ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="space-y-6">
                    {selectedRow !== null && stagedData[selectedRow] && (
                        <div className="professional-card p-8 space-y-8 animate-in slide-in-from-right-4 duration-300 sticky top-10 shadow-2xl border-white/10 bg-[#0B1221]/90 backdrop-blur-xl ring-2 ring-indigo-500/20">
                            <div className="flex items-center justify-between border-b border-white/10 pb-6">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                            <ShieldCheck size={16} /> Active Journal Editor
                                        </h4>
                                        <div className="flex items-center bg-black/40 rounded-lg p-0.5 border border-white/5 ml-2">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (selectedRow! > 0) setSelectedRow(selectedRow! - 1); }}
                                                disabled={selectedRow === 0}
                                                className="p-1 hover:bg-white/10 text-slate-500 hover:text-white disabled:opacity-20 transition-all"
                                                title="이전 거래 (ArrowUp)"
                                            >
                                                <ChevronUp size={14} />
                                            </button>
                                            <div className="w-px h-3 bg-white/10 mx-0.5" />
                                            <button
                                                onClick={(e) => { e.stopPropagation(); if (selectedRow! < stagedData.length - 1) setSelectedRow(selectedRow! + 1); }}
                                                disabled={selectedRow === stagedData.length - 1}
                                                className="p-1 hover:bg-white/10 text-slate-500 hover:text-white disabled:opacity-20 transition-all"
                                                title="다음 거래 (ArrowDown)"
                                            >
                                                <ChevronDown size={14} />
                                            </button>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">{stagedData[selectedRow].description}</p>
                                </div>
                                <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isBalanced ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                    {isBalanced ? <CheckCircle2 size={12} /> : <Shield size={12} />}
                                    {isBalanced ? 'Balance Verified' : 'Unbalanced'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8 relative">
                                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-white/5 -translate-x-1/2" />

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Debit (차변)</span>
                                        <button onClick={() => addLine('Debit')} className="p-1 hover:bg-white/5 rounded-md text-indigo-400"><Plus size={14} /></button>
                                    </div>
                                    <div className="space-y-3">
                                        {editLines.filter(l => l.type === 'Debit').map((line, idx) => {
                                            const originalIdx = editLines.findIndex(el => el === line);
                                            return (
                                                <div key={idx} className={`flex flex-col gap-2 p-3 rounded-xl border transition-all group relative ${!line.account ? 'bg-amber-500/5 border-amber-500/20 ring-1 ring-amber-500/10' : 'bg-white/[0.02] border-white/5'}`}>
                                                    <div className="flex items-center justify-between">
                                                        <input
                                                            list="acc-list-debit"
                                                            value={line.account}
                                                            onFocus={() => {
                                                                const el = document.getElementById('strategic-memory-section');
                                                                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                                            }}
                                                            onChange={(e) => updateLine(originalIdx, { account: e.target.value })}
                                                            className="bg-transparent border-none text-white font-black text-xs p-0 outline-none w-full"
                                                            placeholder="과목 선택 (AI 추천 확인)"
                                                        />
                                                        {line.account === '부가가치세대급금' && (
                                                            <span className="text-[7px] font-black bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded uppercase tracking-tighter">VAT</span>
                                                        )}
                                                        {!line.account && (
                                                            <Sparkles size={10} className="text-amber-500 animate-pulse" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                                                        <span className="text-[9px] text-slate-600 font-bold">₩</span>
                                                        <input
                                                            type="number"
                                                            value={line.amount}
                                                            onChange={(e) => updateLine(originalIdx, { amount: Number(e.target.value) })}
                                                            className="bg-transparent border-none text-white font-mono text-sm p-0 outline-none w-full tabular-nums"
                                                        />
                                                        {line.account !== '부가가치세대급금' && line.account !== '' && (
                                                            <span className="text-[7px] text-slate-500 font-bold truncate">NET</span>
                                                        )}
                                                    </div>
                                                    <button onClick={() => removeLine(originalIdx)} className="absolute -right-2 -top-2 p-1 bg-slate-900 border border-white/10 rounded-full text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Credit (대변)</span>
                                        <button onClick={() => addLine('Credit')} className="p-1 hover:bg-white/5 rounded-md text-amber-400"><Plus size={14} /></button>
                                    </div>
                                    <div className="space-y-3">
                                        {editLines.filter(l => l.type === 'Credit').map((line, idx) => {
                                            const originalIdx = editLines.findIndex(el => el === line);
                                            return (
                                                <div key={idx} className="flex flex-col gap-2 p-3 bg-white/[0.02] rounded-xl border border-white/5 group relative">
                                                    <input
                                                        list="acc-list-credit"
                                                        value={line.account}
                                                        onChange={(e) => updateLine(originalIdx, { account: e.target.value })}
                                                        className="bg-transparent border-none text-white font-black text-xs p-0 outline-none w-full"
                                                        placeholder="Account Name"
                                                    />
                                                    <div className="flex items-center gap-2 border-t border-white/5 pt-2">
                                                        <span className="text-[9px] text-slate-600 font-bold">₩</span>
                                                        <input
                                                            type="number"
                                                            value={line.amount}
                                                            onChange={(e) => updateLine(originalIdx, { amount: Number(e.target.value) })}
                                                            className="bg-transparent border-none text-white font-mono text-sm p-0 outline-none w-full tabular-nums"
                                                        />
                                                    </div>
                                                    <button onClick={() => removeLine(originalIdx)} className="absolute -right-2 -top-2 p-1 bg-slate-900 border border-white/10 rounded-full text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all"><X size={10} /></button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-black/20 p-6 rounded-2xl space-y-4">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">Total Debit</span>
                                    <span className="text-white">₩{debitTotal.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                                    <span className="text-slate-500">Total Credit</span>
                                    <span className="text-white">₩{creditTotal.toLocaleString()}</span>
                                </div>
                                <div className={`h-px w-full ${isBalanced ? 'bg-emerald-500/50' : 'bg-rose-500/50'}`} />
                                <div className="flex justify-between text-xs font-black uppercase tracking-[0.2em]">
                                    <span className={isBalanced ? 'text-emerald-400' : 'text-rose-400'}>Differential</span>
                                    <span className={isBalanced ? 'text-emerald-400' : 'text-rose-400'}>₩{(debitTotal - creditTotal).toLocaleString()}</span>
                                </div>
                            </div>

                            {(suggestions?.length || 0) > 0 ? (
                                <div id="strategic-memory-section" className="space-y-3 scroll-mt-20">
                                    <h5 className="text-[8px] font-black text-indigo-400 uppercase tracking-widest flex items-center gap-1">
                                        <Sparkles size={10} /> Strategic Business Memory (AI 추천)
                                    </h5>
                                    <div className="flex flex-wrap gap-2">
                                        {suggestions.map((s, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    if (s.debitLegs && s.creditLegs) {
                                                        const newLines: JournalLine[] = [
                                                            ...s.debitLegs.map((l: any) => ({ account: l.account, amount: l.amount, type: 'Debit' as const })),
                                                            ...s.creditLegs.map((l: any) => ({ account: l.account, amount: l.amount, type: 'Credit' as const }))
                                                        ];
                                                        setEditLines(newLines);
                                                    } else {
                                                        const amount = stagedData[selectedRow!].amount;
                                                        setEditLines([
                                                            { account: s.account_name || s.account_id, amount, type: 'Debit' },
                                                            { account: '보통예금', amount, type: 'Credit' }
                                                        ]);
                                                    }
                                                }}
                                                className="px-3 py-2 bg-white/5 hover:bg-indigo-500/20 rounded-xl text-[10px] font-black text-slate-300 hover:text-white border border-white/5 transition-all text-left"
                                            >
                                                {s.debitLegs ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-1">
                                                            <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                                                            <span>{s.debitLegs.map((l: any) => l.account).join(', ')}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 opacity-50">
                                                            <div className="w-1 h-1 bg-rose-400 rounded-full" />
                                                            <span>{s.creditLegs.map((l: any) => l.account).join(', ')}</span>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    s.account_name
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-4 bg-indigo-500/5 rounded-2xl border border-indigo-500/10 border-dashed flex flex-col items-center gap-3 text-center">
                                    <div className="bg-indigo-500/10 p-2.5 rounded-xl text-indigo-400">
                                        <Sparkles size={16} />
                                    </div>
                                    <div>
                                        <h5 className="text-[9px] font-black text-white uppercase tracking-widest mb-1">AI 지휘소 활성화 가능</h5>
                                        <p className="text-[8px] text-slate-500 font-bold leading-relaxed">
                                            이 거래처에 대한 과거 패턴이 없습니다.<br />
                                            AI에게 계정과목 분석을 요청해 보세요.
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => runSingleAIAnalysis(selectedRow!)}
                                        disabled={analyzingIndex === selectedRow || analyzingIndex === -1}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-400 hover:text-white border border-indigo-500/20 px-4 py-2.5 rounded-xl text-[10px] font-black transition-all disabled:opacity-30"
                                    >
                                        {analyzingIndex === selectedRow ? <Loader2 size={12} className="animate-spin" /> : <Zap size={12} />}
                                        AI 스마트 추천 받기
                                    </button>
                                </div>
                            )}

                            <div className="flex gap-4 pt-4">
                                <button
                                    onClick={() => setSelectedRow(null)}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 text-slate-400 font-black text-xs uppercase tracking-widest rounded-2xl border border-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveDetail}
                                    disabled={!isBalanced}
                                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-xl shadow-indigo-600/20 disabled:opacity-30 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle2 size={16} /> Apply Template
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <datalist id="acc-list-debit">
                {ALL_ACCOUNTS.map((acc, idx) => <option key={idx} value={acc.name} />)}
            </datalist>
            <datalist id="acc-list-credit">
                {ALL_ACCOUNTS.map((acc, idx) => <option key={idx} value={acc.name} />)}
            </datalist>
        </div >
    );
};
