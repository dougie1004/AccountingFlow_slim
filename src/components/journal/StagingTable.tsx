import React, { useState, useContext } from 'react';
import { Loader2, Database, CheckCircle2, AlertTriangle, MessageSquare, History, FileText, Zap, Download, Shield, Trash2, Landmark, Boxes, Plus, TrendingDown } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { useMassProcessor } from '../../hooks/useMassProcessor';
import { JournalEntry, Partner, ParsedTransaction } from '../../types';
import { AccountingContext } from '../../context/AccountingContext';
import { ALL_ACCOUNTS } from '../../constants/accounts';
import { invoke } from '@tauri-apps/api/core';

interface StagingTableProps {
    data: ParsedTransaction[];
    partners: Partner[];
    onConfirm: (entries: JournalEntry[]) => void;
}

export const StagingTable: React.FC<StagingTableProps> = ({ data, partners, onConfirm }) => {
    const { addPartner, addAsset, config } = useContext(AccountingContext)!;
    const { parseTransaction, isParsing } = useAI();
    const { processMassBatch } = useMassProcessor();
    const [stagedData, setStagedData] = useState<ParsedTransaction[]>(data);
    const [analyzingIndex, setAnalyzingIndex] = useState<number | null>(null);
    const [selectedRow, setSelectedRow] = useState<number | null>(null);
    const [isMassProcessing, setIsMassProcessing] = useState(false);
    const [processProgress, setProcessProgress] = useState<{ current: number; total: number } | null>(null);
    const [validationResult, setValidationResult] = useState<any>(null);
    const [isValidating, setIsValidating] = useState(false);

    const runAIAnalysis = async () => {
        const newData = [...stagedData];

        for (let i = 0; i < newData.length; i++) {
            // Only re-analyze if needed
            setAnalyzingIndex(i);
            const row = newData[i];
            const input = `Date: ${row.date}, Desc: ${row.description}, Amount: ${row.amount}, Vendor: ${row.vendor}, This is a batch transaction.`;

            console.log(`[개별 AI] ${i + 1}/${newData.length} 정밀 분석 중:`, input);
            const result = await parseTransaction(input, "General K-IFRS", partners, "default-tenant", "Pro");

            if (result) {
                const tx = result.transaction;
                const newTrail = [...(tx.auditTrail || []), `[${new Date().toLocaleTimeString()}] AI 정밀 재분석 완료`];

                newData[i] = {
                    ...tx,
                    auditTrail: newTrail
                };
                setStagedData([...newData]); // Update state immediately for each row
            }
            await new Promise(r => setTimeout(r, 100));
        }
        setAnalyzingIndex(null);
        alert(`정밀 분석이 완료되었습니다.`);
    };

    const runMassAIAnalysis = async () => {
        setIsMassProcessing(true);
        setProcessProgress({ current: 0, total: stagedData.length });

        try {
            console.log('[Mass AI] 시작:', stagedData.length, '건');
            const result = await processMassBatch(stagedData);
            console.log('[Mass AI] 완료:', result);

            // 결과 강제 반영
            setStagedData([...result]);
            setProcessProgress(null);

            // 성공 알림
            const enhancedCount = result.filter(r => r.accountName).length;
            alert(`AI 분석 완료! ${enhancedCount}/${result.length}건의 계정과목이 자동 분류되었습니다.`);
        } catch (error) {
            console.error('[Mass AI] 실패:', error);
            alert(`대량 처리 중 오류가 발생했습니다:\n${error instanceof Error ? error.message : String(error)}`);
        } finally {
            setIsMassProcessing(false);
            setProcessProgress(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Header / Stats */}
            <div className="flex justify-between items-center px-4">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400">
                        <Database size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-white tracking-tight">일괄 처리 대기 목록 ({stagedData.length}건)</h3>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">Batch Data Processing Workspace</p>
                        {processProgress && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 transition-all duration-300"
                                        style={{ width: `${(processProgress.current / processProgress.total) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[10px] font-black text-indigo-400">
                                    {processProgress.current}/{processProgress.total}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {stagedData.length >= 10 && (
                        <button
                            onClick={runMassAIAnalysis}
                            disabled={isMassProcessing || analyzingIndex !== null}
                            className="flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-8 py-4 rounded-2xl hover:from-purple-700 hover:to-indigo-700 disabled:from-white/5 disabled:to-white/5 disabled:text-slate-500 font-black text-sm transition-all shadow-xl shadow-purple-600/20 active:scale-95"
                        >
                            {isMassProcessing ? <Loader2 className="animate-spin" size={20} /> : <Zap size={20} />}
                            대량 AI 병렬 처리 ({stagedData.length}건)
                        </button>
                    )}
                    <button
                        onClick={runAIAnalysis}
                        disabled={isParsing || analyzingIndex !== null || isMassProcessing}
                        className="flex items-center gap-2 bg-indigo-600 text-white px-8 py-4 rounded-2xl hover:bg-indigo-700 disabled:bg-white/5 disabled:text-slate-500 font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95"
                    >
                        {analyzingIndex !== null ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={20} />}
                        개별 AI 정밀 분석
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Main Grid */}
                <div className="lg:col-span-2 professional-card overflow-hidden">
                    <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-white/10">
                        <table className="w-full text-sm text-left border-collapse">
                            <thead className="sticky top-0 bg-[#151D2E] z-10 border-b border-white/5">
                                <tr className="text-slate-500 font-black uppercase text-[10px] tracking-widest">
                                    <th className="px-6 py-5">STATUS</th>
                                    <th className="px-6 py-5">DATE</th>
                                    <th className="px-6 py-5">DESCRIPTION / VENDOR</th>
                                    <th className="px-6 py-5 text-right">AMOUNT</th>
                                    <th className="px-6 py-5">AI ACCOUNT</th>
                                    <th className="px-6 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {stagedData.map((row, idx) => (
                                    <tr
                                        key={idx}
                                        onClick={() => setSelectedRow(idx)}
                                        className={`transition-all cursor-pointer ${idx === analyzingIndex ? 'bg-indigo-500/5' : ''} ${selectedRow === idx ? 'bg-white/[0.04]' : 'hover:bg-white/[0.02]'}`}
                                    >
                                        <td className="px-6 py-4">
                                            {row.needsClarification ? (
                                                <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse" />
                                            ) : row.confidence === 'High' ? (
                                                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            ) : (
                                                <div className="w-2 h-2 rounded-full bg-amber-500" />
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">{row.date}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-white font-black leading-tight truncate max-w-[200px]">{row.description}</p>
                                            <p className="text-[10px] font-bold text-slate-500 mt-0.5">
                                                {row.vendor && row.vendor.trim() !== '' ? row.vendor : '거래처 미지정'}
                                            </p>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <span className="font-black text-white text-base">₩{row.amount.toLocaleString()}</span>
                                            {row.vat > 0 && <p className="text-[10px] text-slate-500 font-bold">VAT ₩{row.vat.toLocaleString()}</p>}
                                        </td>
                                        <td className="px-6 py-4">
                                            {analyzingIndex === idx ? (
                                                <span className="flex items-center gap-2 text-indigo-400 animate-pulse font-black text-xs">
                                                    <Loader2 size={12} className="animate-spin" /> 연산 중
                                                </span>
                                            ) : (
                                                <span className={`px-3 py-1 rounded-lg font-black text-xs ${row.accountName ? 'bg-indigo-500/10 text-indigo-400' : 'bg-white/5 text-slate-600'}`}>
                                                    {row.accountName || '대기 중'}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    const newData = stagedData.filter((_, i) => i !== idx);
                                                    setStagedData(newData);
                                                    if (selectedRow === idx) setSelectedRow(null);
                                                    else if (selectedRow !== null && selectedRow > idx) setSelectedRow(selectedRow - 1);
                                                }}
                                                className="p-1.5 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                title="Remove from batch"
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

                {/* Info / Audit Side Panel */}
                <div className="space-y-6">
                    {selectedRow !== null ? (
                        <div className="professional-card p-6 space-y-6 animate-in slide-in-from-right-4 duration-300">
                            {/* Row Header */}
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest">Selected Transaction</h4>
                                    <p className="text-xl font-black text-white mt-1">{stagedData[selectedRow].description}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${stagedData[selectedRow].confidence === 'High' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {stagedData[selectedRow].confidence} Confidence
                                </div>
                            </div>

                            {/* Compliance Callout */}
                            {/* Compliance Callout (Alert Only) */}
                            {stagedData[selectedRow].needsClarification && (
                                <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl space-y-2">
                                    <div className="flex items-center gap-2 text-rose-400">
                                        <AlertTriangle size={16} />
                                        <span className="text-xs font-black uppercase tracking-tight">Compliance Intervention</span>
                                    </div>
                                    <p className="text-sm font-bold text-slate-200 leading-relaxed">
                                        {stagedData[selectedRow].clarificationPrompt || 'AI가 해당 전표에 대해 추가 정보를 요청하고 있습니다.'}
                                    </p>
                                    <div className="flex flex-wrap gap-2 mt-3">
                                        {stagedData[selectedRow].clarificationOptions?.map(opt => (
                                            <button
                                                key={opt}
                                                onClick={() => {
                                                    const newData = [...stagedData];
                                                    newData[selectedRow].accountName = opt;
                                                    newData[selectedRow].needsClarification = false;
                                                    newData[selectedRow].confidence = "High";
                                                    setStagedData(newData);
                                                }}
                                                className="px-3 py-1.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[10px] font-black rounded-lg transition-all hover:scale-105 active:scale-95"
                                            >
                                                {opt}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Persistent Edit Section */}
                            <div className="bg-[#0B1221] rounded-2xl p-4 border border-white/5 space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Account (계정과목)</label>
                                    <input
                                        list="staging-account-list"
                                        value={stagedData[selectedRow].accountName || ""}
                                        onChange={(e) => {
                                            const newData = [...stagedData];
                                            newData[selectedRow].accountName = e.target.value;
                                            newData[selectedRow].needsClarification = false;
                                            newData[selectedRow].confidence = "High";
                                            newData[selectedRow].reasoning = "사용자 수동 입력";
                                            setStagedData(newData);
                                        }}
                                        placeholder="계정과목을 입력하거나 선택하세요..."
                                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-bold text-sm focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all"
                                    />
                                    <datalist id="staging-account-list">
                                        {ALL_ACCOUNTS.map(acc => (
                                            <option key={acc.code} value={acc.name}>{acc.code} {acc.description}</option>
                                        ))}
                                    </datalist>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Vendor (거래처)</label>
                                        <input
                                            value={stagedData[selectedRow].vendor || ""}
                                            onChange={(e) => {
                                                const newData = [...stagedData];
                                                newData[selectedRow].vendor = e.target.value;
                                                setStagedData(newData);
                                            }}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-bold text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block ml-1">Amount (금액)</label>
                                        <input
                                            type="number"
                                            value={stagedData[selectedRow].amount || 0}
                                            onChange={(e) => {
                                                const newData = [...stagedData];
                                                newData[selectedRow].amount = Number(e.target.value);
                                                setStagedData(newData);
                                            }}
                                            className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white font-mono font-bold text-xs focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Lease Strategy Assistant (NEW!) */}
                            {stagedData[selectedRow].description?.includes('리스') && (
                                <div className="p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-4 animate-in zoom-in-95 duration-300">
                                    <div className="flex items-center gap-2 text-emerald-400">
                                        <TrendingDown size={18} />
                                        <span className="text-xs font-black uppercase tracking-tight">Lease Strategy Assistant</span>
                                    </div>
                                    <p className="text-[11px] font-bold text-slate-300 leading-relaxed">
                                        리스 거래가 감지되었습니다. 회사의 리스 이용 목적에 따라 처리 방식을 선택해 주세요.
                                    </p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            onClick={() => {
                                                const newData = [...stagedData];
                                                newData[selectedRow].accountName = '임차료';
                                                newData[selectedRow].reasoning = '운용리스 방식: 리스료 전액을 당기 비용 처리';
                                                setStagedData(newData);
                                            }}
                                            className={`p-3 rounded-xl border text-[10px] font-black transition-all ${stagedData[selectedRow].accountName === '임차료' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            운용리스 (비용)
                                        </button>
                                        <button
                                            onClick={() => {
                                                const newData = [...stagedData];
                                                newData[selectedRow].accountName = '차량운반구';
                                                newData[selectedRow].reasoning = '금융리스 방식: 자산 및 부채(리스부채)로 인식';
                                                setStagedData(newData);
                                            }}
                                            className={`p-3 rounded-xl border text-[10px] font-black transition-all ${stagedData[selectedRow].accountName === '차량운반구' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                                        >
                                            금융리스 (자산)
                                        </button>
                                    </div>
                                    {stagedData[selectedRow].accountName === '차량운반구' && (
                                        <div className="px-3 py-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
                                            <p className="text-[9px] font-bold text-emerald-300">
                                                * 금융리스 선택 시 '리스부채'도 함께 생성됩니다. (세무 조정 필요)
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Asset Detection & Registration (NEW!) */}
                            {(stagedData[selectedRow].accountName?.includes('비품') ||
                                stagedData[selectedRow].accountName?.includes('차량') ||
                                stagedData[selectedRow].amount > (config.taxPolicy?.aiGovernanceThreshold || 1000000)) && (
                                    <div className="p-5 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-indigo-400">
                                                <Landmark size={18} />
                                                <span className="text-xs font-black uppercase tracking-tight">Fixed Asset Detected</span>
                                            </div>
                                            <div className="bg-indigo-500 text-white text-[9px] font-black px-2 py-0.5 rounded uppercase">High Value</div>
                                        </div>

                                        <p className="text-xs font-bold text-slate-300">
                                            이 거래는 고정자산(비품/자산)으로 등록이 권장됩니다. {stagedData[selectedRow].quantity && stagedData[selectedRow].quantity > 1 ? `수량(${stagedData[selectedRow].quantity}개)에 따라 개별 자산으로 분할 등록하시겠습니까?` : '자산 대장에 즉시 등록하시겠습니까?'}
                                        </p>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => {
                                                    const row = stagedData[selectedRow];
                                                    const qty = row.quantity || 1;
                                                    const unitCost = row.unitPrice || (row.amount / qty);

                                                    for (let i = 0; i < qty; i++) {
                                                        addAsset({
                                                            id: crypto.randomUUID(),
                                                            name: qty > 1 ? `${row.description} (${i + 1}/${qty})` : row.description,
                                                            acquisitionDate: row.date,
                                                            cost: unitCost,
                                                            depreciationMethod: config.taxPolicy?.depreciationMethod === 'StraightLine' ? 'STRAIGHT_LINE' : 'DECLINING_BALANCE',
                                                            usefulLife: 5, // Default
                                                            residualValue: 0,
                                                            accumulatedDepreciation: 0,
                                                            currentValue: unitCost
                                                        });
                                                    }
                                                    alert(`${qty}건의 자산이 고정자산 대장에 등록되었습니다.`);

                                                    // Mark as processed in audit trail
                                                    const newData = [...stagedData];
                                                    newData[selectedRow].auditTrail = [...(newData[selectedRow].auditTrail || []), `[${new Date().toLocaleTimeString()}] 고정자산 대장 ${qty}건 등록 완료`];
                                                    setStagedData(newData);
                                                }}
                                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black rounded-xl transition-all active:scale-95"
                                            >
                                                <Plus size={14} /> 자산 대장 등록
                                            </button>
                                            {stagedData[selectedRow].quantity && stagedData[selectedRow].quantity > 1 && (
                                                <button className="px-3 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all">
                                                    <Boxes size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                )}

                            {/* Audit Trail */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-indigo-400">
                                    <History size={16} />
                                    <span className="text-xs font-black uppercase tracking-tight">Digital Audit Trail</span>
                                </div>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin">
                                    {stagedData[selectedRow].auditTrail?.map((log, i) => (
                                        <div key={i} className="flex gap-3 text-[10px] font-bold text-slate-500 leading-relaxed py-2 border-b border-white/5 last:border-0">
                                            <span className="text-indigo-500/50 shrink-0">#{i + 1}</span>
                                            <span>{log}</span>
                                        </div>
                                    )) || (
                                            <p className="text-[10px] font-bold text-slate-600 italic">No logs available for this transaction.</p>
                                        )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="professional-card p-12 flex flex-col items-center justify-center text-center opacity-40">
                            <FileText size={48} className="text-slate-600 mb-4" />
                            <p className="text-sm font-black text-slate-500">전표를 선택하여<br />상세 정보와 감사 로그를 확인하세요</p>
                        </div>
                    )}

                    {/* Footer Actions */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={async () => {
                                const entries = stagedData
                                    .filter(r => r.accountName)
                                    .map(r => {
                                        let debitAccount = r.accountName || r.description;
                                        let creditAccount = '미지급금'; // 카드 결제가 기본이므로 미지급금으로
                                        switch (r.entryType) {
                                            case 'Expense':
                                            case 'Asset':
                                                debitAccount = r.accountName || r.description;
                                                // 미확정(Unconfirmed) 상태에서는 실집행 전이므로 무조건 미지급금 처리
                                                creditAccount = '미지급금';
                                                break;
                                            case 'Equity':
                                            case 'Revenue':
                                            case 'Liability':
                                                debitAccount = '미수금'; // 미확정 시 미수금 처리
                                                creditAccount = r.accountName || r.description;
                                                break;
                                            case 'Payroll':
                                                debitAccount = '급여';
                                                creditAccount = '미지급급여';
                                                break;
                                        }

                                        return {
                                            id: crypto.randomUUID(),
                                            date: r.date,
                                            description: r.description,
                                            vendor: r.vendor && r.vendor.trim() !== '' ? r.vendor : undefined,
                                            debitAccount,
                                            creditAccount,
                                            amount: r.amount,
                                            vat: r.vat,
                                            type: r.entryType as any,
                                            status: 'Unconfirmed',
                                            version: 1,
                                            complianceContext: r.auditTrail?.join(' | ')
                                        };
                                    });

                                if (entries.length === 0) {
                                    alert('전송할 전표가 없습니다. 계정과목이 지정된 항목만 전송됩니다.');
                                    return;
                                }

                                // 시산표 검증 및 이상 탐지
                                setIsValidating(true);
                                try {
                                    const result: any = await invoke('batch_export_with_validation', { entries });
                                    setValidationResult(result);

                                    // 검증 결과 표시
                                    if (!result.is_balanced) {
                                        const confirm = window.confirm(
                                            `⚠️ 시산표 불일치 감지!\n\n` +
                                            `차변: ₩${result.total_debit.toLocaleString()}\n` +
                                            `대변: ₩${result.total_credit.toLocaleString()}\n` +
                                            `차이: ₩${Math.abs(result.total_debit - result.total_credit).toLocaleString()}\n\n` +
                                            `그래도 계속하시겠습니까?`
                                        );
                                        if (!confirm) {
                                            setIsValidating(false);
                                            return;
                                        }
                                    }

                                    // 이상 징후 표시
                                    if (result.anomalies && result.anomalies.length > 0) {
                                        const anomalyMsg = result.anomalies.slice(0, 5).join('\n');
                                        const confirm = window.confirm(
                                            `⚠️ 이상 징후 탐지 (${result.anomalies.length}건):\n\n${anomalyMsg}\n\n계속하시겠습니까?`
                                        );
                                        if (!confirm) {
                                            setIsValidating(false);
                                            return;
                                        }
                                    }

                                    // 2. 신규 거래처 자동 등록 (Pending)
                                    entries.forEach(entry => {
                                        if (entry.vendor && !partners.find(p => p.name === entry.vendor)) {
                                            const newPartner: Partner = {
                                                id: crypto.randomUUID(),
                                                name: entry.vendor,
                                                partnerType: entry.type === 'Revenue' ? 'Customer' : 'Vendor',
                                                status: 'Pending',
                                                regNo: undefined // Bulk 등록 시에는 번호 미확인 상태
                                            };
                                            addPartner(newPartner);
                                        }
                                    });

                                    // 3. 전표 확정
                                    onConfirm(entries as any);
                                    alert(`✅ ${entries.length}건의 전표가 회계 장부에 등록되었습니다.`);
                                } catch (error) {
                                    console.error('[Batch Export] 검증 실패:', error);
                                    alert(`검증 중 오류 발생: ${error}\n\n그래도 전송하시겠습니까?`);
                                    onConfirm(entries as any);
                                } finally {
                                    setIsValidating(false);
                                }
                            }}
                            disabled={isValidating}
                            className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-xl shadow-emerald-600/20 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isValidating ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    검증 중...
                                </>
                            ) : (
                                <>
                                    <Shield size={18} />
                                    회계 장부에 일괄 전송 ({stagedData.filter(r => r.accountName).length}건)
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
