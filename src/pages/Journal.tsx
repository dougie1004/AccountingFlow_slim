import React, { useContext, useMemo, useState } from 'react';
import { AccountingContext } from '../context/AccountingContext';
import {
    Calendar as CalendarIcon,
    List,
    Download,
    TrendingUp,
    AlertCircle,
    CheckCircle2,
    Filter,
    ArrowRight,
    Zap,
    Plus,
    Sparkles,
    Calculator,
    Shield,
    History,
    FileText,
    LayoutGrid,
    Search,
    User,
    ChevronDown,
    X,
    Trash2
} from 'lucide-react';
import JournalTable from '../components/journal/JournalTable';
import { StagingTable } from '../components/journal/StagingTable';
import { ManualEntryModal } from '../components/journal/ManualEntryModal';
import { FileUploader } from '../components/journal/FileUploader';
import { VatOptimizationReport } from '../components/tax/VatOptimizationReport';

const Journal: React.FC = () => {
    const {
        ledger,
        addEntry,
        addEntries,
        bulkApprove,
        bulkDelete,
        updateEntry,
        systemNow,
        partners,
        config
    } = useContext(AccountingContext)!;

    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [decisionMode, setDecisionMode] = useState<'IDLE' | 'STAGING'>('IDLE');
    const [stagingTransactions, setStagingTransactions] = useState<any[]>([]);
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isVatReportOpen, setIsVatReportOpen] = useState(false);

    // UI Refs
    const uploaderRef = React.useRef<any>(null);

    // Filters
    const [startDate, setStartDate] = useState(() => {
        const d = new Date(systemNow);
        d.setMonth(d.getMonth() - 1);
        return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(systemNow.split('T')[0]);
    const [selectedVendor, setSelectedVendor] = useState<string>('');
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const vendors = useMemo(() => {
        const v = new Set(ledger.map(e => e.vendor).filter(Boolean));
        return Array.from(v).sort();
    }, [ledger]);

    const filteredLedger = useMemo(() => {
        let result = ledger.filter(e => {
            const dateMatch = (!startDate || e.date >= startDate) && (!endDate || e.date <= endDate);
            const vendorMatch = !selectedVendor || e.vendor === selectedVendor;
            return dateMatch && vendorMatch;
        });
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [ledger, startDate, endDate, selectedVendor]);

    const handleToggleSelect = (id: string) => {
        const next = new Set(selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedIds(next);
    };

    const handleToggleAll = () => {
        if (selectedIds.size === filteredLedger.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredLedger.map(e => e.id)));
        }
    };

    const unconfirmedFiltered = useMemo(() => {
        return filteredLedger.filter(e => e.status !== 'Approved');
    }, [filteredLedger]);

    const idsToApprove = useMemo(() => {
        return selectedIds.size > 0
            ? Array.from(selectedIds).filter(id => {
                const entry = ledger.find(e => e.id === id);
                return entry && entry.status !== 'Approved';
            })
            : unconfirmedFiltered.map(e => e.id);
    }, [selectedIds, unconfirmedFiltered, ledger]);

    const handleBulkApprove = () => {
        if (idsToApprove.length === 0) return;
        if (window.confirm(`${idsToApprove.length}건의 전표를 확정하시겠습니까?`)) {
            bulkApprove(idsToApprove);
            setSelectedIds(new Set());
        }
    };

    const handleBulkDelete = () => {
        if (selectedIds.size === 0) return;
        if (window.confirm(`선택한 ${selectedIds.size}건의 전표를 완전히 삭제하시겠습니까?`)) {
            bulkDelete(Array.from(selectedIds));
            setSelectedIds(new Set());
        }
    };

    const optimizedEntries = useMemo(() => {
        return filteredLedger.map(e => {
            // Logic for VAT optimization suggestions
            if (e.description.includes('식대') && e.vat === 0) {
                return {
                    ...e,
                    suggestedVat: Math.floor(e.amount / 11),
                    suggestedDescription: '[절세 포인트] 복리후생 성격의 식대는 매입세액 공제가 가능합니다.'
                };
            }
            if (e.vendor?.includes('Starbucks') && e.vat > 0) {
                return {
                    ...e,
                    suggestedVat: 0,
                    suggestedDescription: '[세무 리스크] 커피 전문점 지출은 접대비 성격이 강하여 불공제 처리가 안전합니다.'
                };
            }
            return null;
        }).filter(Boolean) as any[];
    }, [filteredLedger]);

    const handleApplyOptimization = (id: string) => {
        const suggestion = optimizedEntries.find(e => e.id === id);
        if (suggestion) {
            updateEntry(id, {
                vat: suggestion.suggestedVat,
                notes: (suggestion.notes || '') + `\n[AI VAT Optimized: ${suggestion.suggestedDescription}]`
            });
        }
    };

    const handleExportCSV = () => {
        if (filteredLedger.length === 0) return;
        const headers = ["Date", "Description", "Vendor", "Debit", "Credit", "Amount", "VAT", "Status"];
        const rows = filteredLedger.map(e => [
            e.date,
            e.description.replace(/,/g, ' '),
            (e.vendor || '').replace(/,/g, ' '),
            e.debitAccount,
            e.creditAccount,
            (e.amount || 0) + (e.vat || 0),
            e.vat || 0,
            e.status
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(r => r.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `journal_export_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
            {/* Header Section */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h1 className="text-4xl font-black text-white tracking-tighter mb-2 flex items-center gap-3">
                        분개장 및 총계정원장
                        <span className="px-3 py-1 bg-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">General Ledger</span>
                    </h1>
                    <p className="text-slate-400 font-bold flex items-center gap-2">
                        <Shield size={16} className="text-emerald-500" />
                        AI 기반 실시간 전표 처리 및 검증 시스템
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/5 shadow-inner">
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'table' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            <List size={14} /> TABLE
                        </button>
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={`p-2 rounded-lg flex items-center gap-2 text-[10px] font-black uppercase transition-all ${viewMode === 'calendar' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                        >
                            <LayoutGrid size={14} /> CALENDAR
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            if (!isUploadOpen && ledger.length > 0) {
                                setIsUploadOpen(true);
                            } else {
                                // If already open or ledger is empty (effectively open), trigger file picker
                                uploaderRef.current?.triggerUpload();
                            }
                        }}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95 border ${(isUploadOpen || ledger.length === 0) ? 'bg-indigo-600 text-white border-white/10' : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-500/20'}`}
                    >
                        <Zap size={16} /> 스마트 전표 입력 (AI)
                    </button>

                    <button
                        onClick={() => setIsManualModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 rounded-xl text-xs font-black text-white hover:bg-emerald-700 transition-all shadow-lg active:scale-95 border border-white/10"
                    >
                        <Plus size={16} /> 수기 전표 추가
                    </button>

                    <button
                        onClick={() => setIsVatReportOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl text-xs font-black hover:bg-indigo-500/20 transition-all group relative"
                    >
                        <Zap size={16} className="animate-pulse" /> VAT 최적화 리포트
                        {optimizedEntries.length > 0 && (
                            <span className="absolute -top-2 -right-2 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-indigo-500 text-[8px] items-center justify-center text-white">{optimizedEntries.length}</span>
                            </span>
                        )}
                    </button>

                    {idsToApprove.length > 0 && (
                        <button
                            onClick={handleBulkApprove}
                            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-xs font-black text-white hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-600/20 animate-in zoom-in-90"
                        >
                            <CheckCircle2 size={16} /> {idsToApprove.length}건 확정
                        </button>
                    )}

                    {selectedIds.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-black hover:bg-rose-500/20 transition-all animate-in slide-in-from-right-4"
                        >
                            <Trash2 size={16} /> 일괄 삭제 ({selectedIds.size})
                        </button>
                    )}

                    <button
                        onClick={handleExportCSV}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 text-slate-400 rounded-xl text-xs font-black hover:bg-white/10 hover:text-white transition-all underline decoration-white/0 decoration-2 underline-offset-4 hover:decoration-white/20"
                    >
                        <Download size={16} /> CSV 추출
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-[#151D2E]/40 border border-white/5 p-6 rounded-[2rem] backdrop-blur-3xl shadow-2xl">
                <div className="flex flex-wrap items-end gap-6">
                    <div className="flex-1 min-w-[200px]">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                            <CalendarIcon size={12} className="text-indigo-400" /> 조회 기간 설정
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-[#0B1221] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                            />
                            <div className="w-4 h-px bg-slate-700" />
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-[#0B1221] border border-white/10 rounded-xl px-4 py-2.5 text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 outline-none w-full"
                            />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-2">
                            <Search size={12} className="text-indigo-400" /> 거래처 필터링
                        </label>
                        <select
                            value={selectedVendor}
                            onChange={(e) => setSelectedVendor(e.target.value)}
                            className="w-full px-4 py-2.5 bg-[#0B1221] border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
                        >
                            <option value="">전체 거래처 리스트</option>
                            {vendors.map(v => (
                                <option key={v} value={v}>{v}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center gap-3 h-[45px]">
                        <button
                            onClick={() => {
                                setStartDate('');
                                setEndDate('');
                                setSelectedVendor('');
                            }}
                            className="px-4 py-2.5 text-xs font-black text-slate-500 hover:text-white transition-colors uppercase tracking-widest"
                        >
                            검색 조건 초기화
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content Area */}
            {decisionMode === 'STAGING' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between bg-white/[0.02] p-8 rounded-[2rem] border border-white/5 shadow-xl backdrop-blur-2xl">
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 bg-indigo-500/10 rounded-[1.5rem] flex items-center justify-center text-indigo-400 border border-indigo-500/20">
                                <Sparkles size={32} />
                            </div>
                            <div>
                                <h2 className="text-3xl font-black text-white tracking-tight">데이터 업로드</h2>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em] mt-1 opacity-60">
                                    AI-Powered Batch Processor • {stagingTransactions.length} Pending Records
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                setDecisionMode('IDLE');
                                setIsUploadOpen(false);
                            }}
                            className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-black uppercase tracking-widest rounded-[1.25rem] border border-white/10 transition-all active:scale-95"
                        >
                            ← 분개장으로 복귀
                        </button>
                    </div>

                    <StagingTable
                        data={stagingTransactions}
                        partners={partners}
                        onConfirm={(entries) => {
                            addEntries(entries);
                            setDecisionMode('IDLE');
                            setIsUploadOpen(false);
                        }}
                        onCancel={() => {
                            setDecisionMode('IDLE');
                        }}
                    />
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in duration-500">
                    {(isUploadOpen || ledger.length === 0) && (
                        <div className="animate-in slide-in-from-top-4 duration-500">
                            <FileUploader
                                ref={uploaderRef}
                                onTransactionsLoaded={(txs) => {
                                    setStagingTransactions(txs);
                                    setDecisionMode('STAGING');
                                }}
                            />
                        </div>
                    )}

                    <JournalTable
                        entries={filteredLedger}
                        selectedIds={selectedIds}
                        onToggleSelect={handleToggleSelect}
                        onToggleAll={handleToggleAll}
                    />
                </div>
            )}

            {isManualModalOpen && (
                <ManualEntryModal
                    isOpen={isManualModalOpen}
                    onClose={() => setIsManualModalOpen(false)}
                    onSave={(entry) => {
                        addEntry(entry);
                        setIsManualModalOpen(false);
                    }}
                />
            )}

            {isVatReportOpen && (
                <VatOptimizationReport
                    onClose={() => setIsVatReportOpen(false)}
                    optimizedEntries={optimizedEntries}
                    onApply={handleApplyOptimization}
                />
            )}
        </div>
    );
};

export default Journal;
