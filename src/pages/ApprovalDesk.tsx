import React, { useContext, useMemo, useState } from 'react';
import { AccountingContext } from '../context/AccountingContext';
import { CheckCircle, XCircle, LayoutGrid, List, Zap, Sparkles, Filter, Calculator, Save } from 'lucide-react';
import { JournalEntry } from '../types';
import { EvidenceViewer } from '../components/EvidenceViewer';
import { cleanMarkdown } from '../utils/textUtils';
import { getAccountCategory } from '../constants/accounts';
import { MappingRuleModal } from '../components/modals/MappingRuleModal';

const ApprovalDesk: React.FC = () => {
    const {
        ledger, approveEntry, deleteEntry, bulkApprove, updateEntry, addEntries,
        mappingRules, addMappingRule, applyMappingRules
    } = useContext(AccountingContext)!;
    const [viewMode, setViewMode] = useState<'card' | 'grid'>('card');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [viewingEvidence, setViewingEvidence] = useState<JournalEntry | null>(null);
    const [mappingTarget, setMappingTarget] = useState<JournalEntry | null>(null);

    const pendingTransactions = useMemo(() => {
        return ledger.filter(e => e.status === 'Unconfirmed' || e.status === 'Hold' || e.status === 'Pending Review');
    }, [ledger]);

    const handleVatSettlement = () => {
        let vatOutput = 0;
        let vatInput = 0;

        // Calculate current VAT balances from Ledger
        ledger.forEach(e => {
            if (e.status !== 'Approved') return;
            const amt = e.vat || 0;
            if (amt === 0) return;

            const catD = getAccountCategory(e.debitAccount);
            const catC = getAccountCategory(e.creditAccount);

            if (catC === 'Revenue') vatOutput += amt;
            if (['Expense', 'Asset'].includes(catD)) vatInput += amt;
        });

        if (vatOutput === 0 && vatInput === 0) {
            alert("정산할 부가세 내역이 없습니다.");
            return;
        }

        const payable = vatOutput - vatInput;
        const msg = `[부가세 정산]\n\n매출세액(예수금): ${vatOutput.toLocaleString()}원\n매입세액(대급금): ${vatInput.toLocaleString()}원\n-------------------\n납부세액: ${payable.toLocaleString()}원\n\n정산 분개를 생성하시겠습니까?`;

        if (window.confirm(msg)) {
            const today = new Date().toISOString().split('T')[0];
            const entries: JournalEntry[] = [];
            const common = Math.min(vatOutput, vatInput);

            // 1. Offset Common Amount
            if (common > 0) {
                entries.push({
                    id: crypto.randomUUID(),
                    date: today,
                    debitAccount: '부가가치세예수금',
                    creditAccount: '부가가치세대급금',
                    amount: common,
                    description: '부가세 정산 (매입매출 상계)',
                    status: 'Unconfirmed',
                    type: 'General',
                    vat: 0
                });
            }

            // 2. Settle Difference
            if (payable > 0) {
                entries.push({
                    id: crypto.randomUUID(),
                    date: today,
                    debitAccount: '부가가치세예수금',
                    creditAccount: '미지급세금',
                    amount: payable,
                    description: '부가세 정산 (납부세액 확정)',
                    status: 'Unconfirmed',
                    type: 'General',
                    vat: 0
                });
            } else if (payable < 0) {
                entries.push({
                    id: crypto.randomUUID(),
                    date: today,
                    debitAccount: '미수금',
                    creditAccount: '부가가치세대급금',
                    amount: Math.abs(payable),
                    description: '부가세 정산 (환급세액 확정)',
                    status: 'Unconfirmed',
                    type: 'General',
                    vat: 0
                });
            }
            addEntries(entries);
        }
    };

    const handleApplyAllRules = () => {
        const unconfirmed = ledger.filter(e => e.status === 'Unconfirmed' || e.status === 'Hold');
        const updated = applyMappingRules(unconfirmed);

        let count = 0;
        updated.forEach(entry => {
            const original = ledger.find(e => e.id === entry.id);
            if (original && original.debitAccount !== entry.debitAccount) {
                updateEntry(entry.id, entry);
                count++;
            }
        });

        if (count > 0) alert(`${count}건의 전표에 매핑 규칙을 적용했습니다.`);
        else alert('새로 적용할 수 있는 매핑 규칙이 없습니다.');
    };

    const toggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight mb-2">전표 승인 데스크 (Approval)</h1>
                    <p className="text-slate-400 font-bold">AI가 가공한 데이터를 최종 검토하고 승인합니다.</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={handleApplyAllRules}
                        className="flex items-center gap-2 bg-indigo-500/10 text-indigo-500 px-4 py-2 rounded-xl border border-indigo-500/20 font-bold hover:bg-indigo-500/20 transition-all text-xs"
                    >
                        <Sparkles size={16} /> 매핑 규칙 전체 적용 ({mappingRules.length})
                    </button>

                    <button
                        onClick={handleVatSettlement}
                        className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-4 py-2 rounded-xl border border-amber-500/20 font-bold hover:bg-amber-500/20 transition-all text-xs"
                    >
                        <Calculator size={16} /> VAT 정산
                    </button>

                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/5">
                        <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg ${viewMode === 'card' ? 'bg-indigo-600' : ''}`}><LayoutGrid size={18} /></button>
                        <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-indigo-600' : ''}`}><List size={18} /></button>
                    </div>

                    {selectedIds.size > 0 && (
                        <button
                            onClick={() => { bulkApprove(Array.from(selectedIds)); setSelectedIds(new Set()); }}
                            className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-xs"
                        >
                            {selectedIds.size}건 일괄 승인
                        </button>
                    )}
                </div>
            </div>

            {pendingTransactions.length === 0 ? (
                <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 p-20 text-center">
                    <h2 className="text-2xl font-black text-white mb-2">모든 전표가 승인되었습니다.</h2>
                </div>
            ) : (
                <div className="space-y-4">
                    {pendingTransactions.map((entry) => (
                        <div key={entry.id} className="bg-[#151D2E] rounded-3xl border border-white/5 p-6 flex flex-col lg:flex-row items-center gap-8 relative overflow-hidden group">
                            <div className="absolute top-4 left-4">
                                <input
                                    type="checkbox"
                                    checked={selectedIds.has(entry.id)}
                                    onChange={() => toggleSelect(entry.id)}
                                    className="w-5 h-5 rounded-lg border-white/10 bg-[#0B1221]"
                                />
                            </div>
                            <div className="flex-1 space-y-4 pl-10">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-mono text-slate-500">{entry.date}</span>
                                    {entry.auditTrail?.some(log => log.includes('[Standard Mapping]')) ? (
                                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-black px-2 py-1 rounded-lg flex items-center gap-1">
                                            <CheckCircle size={10} /> MAPPED
                                        </span>
                                    ) : (
                                        <span className="bg-indigo-500/10 text-indigo-400 text-[10px] font-black px-2 py-1 rounded-lg">AI ANALYZED</span>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-white">{entry.vendor || 'Unknown Vendor'}</h3>
                                    <p className="text-slate-400 font-bold italic">"{cleanMarkdown(entry.description)}"</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4 p-4 rounded-2xl bg-white/5 border border-white/10">
                                    <div>
                                        <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Debit</label>
                                        <div className="text-white font-black">{entry.debitAccount}</div>
                                    </div>
                                    <div className="text-right">
                                        <label className="text-[10px] font-black text-emerald-400 uppercase tracking-widest block mb-1">Credit</label>
                                        <div className="text-white font-black">{entry.creditAccount}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-8 border-t lg:border-t-0 lg:border-l border-white/5 pt-6 lg:pt-0 lg:pl-8">
                                <div className="text-right">
                                    <span className="text-[10px] font-black text-slate-500 block uppercase">Amount</span>
                                    <p className="text-3xl font-black text-white font-mono">₩{entry.amount.toLocaleString()}</p>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-3">
                                        <button onClick={() => approveEntry(entry.id)} className="bg-emerald-600 p-4 rounded-2xl text-white hover:scale-105 transition-all shadow-lg shadow-emerald-500/20"><CheckCircle size={24} /></button>
                                        <button onClick={() => deleteEntry(entry.id)} className="bg-white/5 p-4 rounded-2xl text-slate-400 hover:text-rose-400 hover:scale-105 transition-all"><XCircle size={24} /></button>
                                    </div>
                                    <button
                                        onClick={() => setMappingTarget(entry)}
                                        className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors py-1 flex items-center justify-center gap-1"
                                    >
                                        <Save size={12} /> 매핑 규칙 추가
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <EvidenceViewer
                isOpen={!!viewingEvidence}
                onClose={() => setViewingEvidence(null)}
                entry={viewingEvidence}
            />

            <MappingRuleModal
                isOpen={!!mappingTarget}
                onClose={() => setMappingTarget(null)}
                entry={mappingTarget}
                onSave={(rule) => {
                    addMappingRule(rule);
                    // Optionally apply the rule immediately to the entries matched
                    const updated = applyMappingRules([mappingTarget!])[0];
                    updateEntry(mappingTarget!.id, updated);
                }}
            />
        </div>
    );
};

export default ApprovalDesk;
