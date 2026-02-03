import React, { useState, useMemo, useContext } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { JournalEntry, ParsedTransaction } from '../types';
import JournalTable from '../components/journal/JournalTable';
import { TransactionFeed } from '../components/dashboard/TransactionFeed';
import { FileUploader } from '../components/journal/FileUploader';
import { StagingTable } from '../components/journal/StagingTable';
import { FileText, Download, Filter, Calendar, User, Database, LayoutGrid, List, Plus, Sparkles, X } from 'lucide-react';
import CalendarView from '../components/journal/CalendarView';
import { ManualEntryModal } from '../components/journal/ManualEntryModal';
import { SmartExcelUploader } from '../components/SmartExcelUploader';
import { AccountingContext } from '../context/AccountingContext';
import { VatOptimizationReport } from '../components/tax/VatOptimizationReport';
import { toLocalIsoDate } from '../utils/formatUtils';

const Journal: React.FC = () => {
    const { ledger, addEntry, partners, stagingTransactions, setStagingTransactions } = useAccounting();

    // Filtering state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedVendor, setSelectedVendor] = useState('');

    // View & Tab state
    const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isVatReportOpen, setIsVatReportOpen] = useState(false);
    const [showSmartUpload, setShowSmartUpload] = useState(false);
    const [externalFile, setExternalFile] = useState<File | null>(null);

    const { addEntries } = useContext(AccountingContext)!;

    // Extract unique vendors for dropdown
    const vendors = useMemo(() => {
        const uniqueVendors = new Set(ledger.map(e => e.vendor).filter(Boolean));
        return Array.from(uniqueVendors).sort();
    }, [ledger]);

    // Derived filtered data
    const filteredLedger = useMemo(() => {
        const result = ledger.filter((entry) => {
            const dateMatch = (!startDate || entry.date >= startDate) && (!endDate || entry.date <= endDate);
            const vendorMatch = !selectedVendor || entry.vendor === selectedVendor;
            return dateMatch && vendorMatch;
        });
        return result.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }, [ledger, startDate, endDate, selectedVendor]);

    const handleExportCSV = () => {
        if (filteredLedger.length === 0) return;

        const headers = ['Date', 'Vendor', 'Description', 'Debit Account', 'Credit Account', 'Amount', 'Status'];
        const rows = filteredLedger.map(e => [
            e.date,
            e.vendor || 'N/A',
            e.description || '',
            e.debitAccount,
            e.creditAccount,
            e.amount,
            e.status
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.map(val => `"${val}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `ledger_export_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 p-8">
            {/* Unified Input Section */}
            <div className="space-y-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-indigo-500 rounded-sm"></span>
                        <h2 className="text-2xl font-bold text-white">디지털 증빙 및 전표 관리 (Digital Ledger)</h2>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => {
                                const testData: ParsedTransaction[] = [
                                    {
                                        id: 'TEST-LEASE-001',
                                        date: new Date().toISOString().split('T')[0],
                                        description: '제네시스 G80 신차 리스료 (1/60)',
                                        amount: 1450000,
                                        vat: 0,
                                        accountName: '임차료',
                                        entryType: 'Expense',
                                        vendor: '(주)현대캐피탈',
                                        reasoning: '[K-IFRS 1116] 매달 반복되는 리스료 지출이 감지되었습니다. 원금/이자 분리를 위한 리스 자산화 기능을 사용해 보세요.',
                                        confidence: 'High',
                                        controlTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 리스 거래 패턴 식별`]
                                    },
                                    {
                                        id: 'TEST-PAYROLL-001',
                                        date: new Date().toISOString().split('T')[0],
                                        description: '2024년 1월 정기 급여 정산 (홍길동)',
                                        amount: 5200000,
                                        vat: 0,
                                        accountName: '급여',
                                        entryType: 'Payroll',
                                        vendor: '홍길동',
                                        reasoning: '임직원 급여 지출입니다. 4대보험 및 소득세 원천징수 분할 전표 생성이 가능합니다.',
                                        confidence: 'High',
                                        controlTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 급여 항목 식별`]
                                    },
                                    {
                                        id: 'TEST-ASSET-001',
                                        date: new Date().toISOString().split('T')[0],
                                        description: '워크스테이션 및 AI 서버 장비 도입',
                                        amount: 15800000,
                                        vat: 1580000,
                                        accountName: '비품',
                                        entryType: 'Asset',
                                        vendor: '델 테크놀로지스',
                                        reasoning: '1천만원 이상의 고액 자산 구매입니다. 세무상 유리한 감가상각 처리를 위해 자산 대장에 즉시 등록하는 것을 권장합니다.',
                                        confidence: 'High',
                                        controlTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 고액 자산 취득 식별`]
                                    }
                                ];
                                setStagingTransactions(testData);
                            }}
                            className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[10px] font-black rounded-lg border border-indigo-600/30 transition-all flex items-center gap-2"
                        >
                            <Database size={12} />
                            테스트 데이터 로드
                        </button>
                        <div className="flex items-center gap-2 px-4 py-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                            <span className="text-xs font-black text-indigo-400 uppercase tracking-wider">AI-Powered</span>
                        </div>
                    </div>
                </header>

                {stagingTransactions.length === 0 ? (
                    <FileUploader
                        onTransactionsLoaded={setStagingTransactions}
                        onExcelDetected={(file) => {
                            setExternalFile(file);
                            setShowSmartUpload(true);
                        }}
                    />
                ) : (
                    <StagingTable
                        data={stagingTransactions}
                        partners={partners}
                        onConfirm={(newEntries) => {
                            newEntries.forEach(addEntry);
                            setStagingTransactions([]);
                        }}
                        onCancel={() => setStagingTransactions([])}
                    />
                )}
            </div>

            {/* Alternative: Text-based AI Input (Collapsible) */}
            <details className="group">
                <summary className="cursor-pointer list-none">
                    <div className="flex items-center justify-between p-6 bg-[#151D2E] rounded-2xl border border-white/5 hover:border-indigo-500/30 transition-all">
                        <div className="flex items-center gap-3">
                            <span className="w-1.5 h-6 bg-indigo-600 rounded-sm"></span>
                            <h3 className="text-lg font-bold text-white">AI 대화형 전표 입력 (선택사항)</h3>
                        </div>
                        <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
                    </div>
                </summary>
                <div className="mt-4 bg-[#151D2E] rounded-3xl border border-white/5 shadow-2xl overflow-hidden">
                    <TransactionFeed onConfirm={addEntry} />
                </div>
            </details>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between pt-8 border-t border-white/5 gap-6">
                <div>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <div className="p-1.5 bg-indigo-500/10 rounded-lg">
                                <FileText className="w-5 h-5 text-indigo-400" />
                            </div>
                            <h2 className="text-sm font-bold text-indigo-400 uppercase tracking-wider">Unified Digital Ledger</h2>
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-tight">AI 통합 분개장 및 원장 관리</h1>
                        <p className="mt-2 text-slate-400 font-bold">Compliance-Ready: 확정(Authorized)된 전표만 재무제표 및 경영 분석 지표에 반영됩니다.</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/10">
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
                        onClick={() => setIsManualModalOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 rounded-xl text-sm font-bold text-white hover:bg-emerald-700 transition-all shadow-lg active:scale-95"
                    >
                        <Plus size={16} />
                        수동 전표 입력
                    </button>

                    <button
                        onClick={() => setIsVatReportOpen(true)}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-xl text-sm font-bold border border-indigo-500/30 hover:bg-indigo-500/20 transition-all shadow-lg active:scale-95"
                    >
                        <Sparkles size={16} />
                        VAT 최적화 리포트
                    </button>

                    <button
                        onClick={handleExportCSV}
                        disabled={filteredLedger.length === 0}
                        className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 rounded-xl text-sm font-bold text-white hover:bg-indigo-700 transition-all shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Download size={16} />
                        엑셀(CSV) 저장
                    </button>
                </div>
            </div>

            {viewMode === 'calendar' ? (
                <div className="animate-in zoom-in-95 duration-500">
                    <CalendarView
                        entries={filteredLedger}
                        currentMonth={currentMonth}
                        onMonthChange={setCurrentMonth}
                        onDateSelect={(date) => {
                            setStartDate(date);
                            setEndDate(date);
                            setViewMode('table');
                        }}
                    />
                </div>
            ) : (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                    {/* Filter Toolbar */}
                    <div className="flex flex-col gap-6 p-8 bg-[#151D2E] rounded-[2rem] border border-white/5 shadow-2xl">
                        <div className="flex flex-wrap items-center justify-between gap-6">
                            <div className="flex flex-wrap items-center gap-3">
                                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2">기간 조회</span>

                                {/* Hierarchical Period Selector */}
                                <div className="flex items-center gap-2 bg-[#0B1221] p-1.5 rounded-2xl border border-white/10 shadow-inner">
                                    <Calendar size={14} className="text-indigo-500 ml-2" />
                                    <select
                                        value={startDate ? new Date(startDate).getFullYear() : 2026}
                                        onChange={(e) => {
                                            const year = parseInt(e.target.value);
                                            setStartDate(`${year}-01-01`);
                                            setEndDate(`${year}-12-31`);
                                        }}
                                        className="bg-transparent text-white text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2 border-r border-white/5"
                                    >
                                        {[2023, 2024, 2025, 2026].map(y => <option key={y} value={y} className="bg-[#0B1221]">{y}년</option>)}
                                    </select>

                                    <select
                                        onChange={(e) => {
                                            const q = parseInt(e.target.value);
                                            if (q === 0) return;
                                            const year = startDate ? new Date(startDate).getFullYear() : 2026;
                                            const startMonth = (q - 1) * 3;
                                            setStartDate(toLocalIsoDate(new Date(year, startMonth, 1)));
                                            setEndDate(toLocalIsoDate(new Date(year, startMonth + 3, 0)));
                                            setEndDate(toLocalIsoDate(new Date(year, startMonth + 3, 0)));
                                        }}
                                        className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2 border-r border-white/5"
                                    >
                                        <option value="0" className="bg-[#0B1221]">전체 분기</option>
                                        <option value="1" className="bg-[#0B1221]">1분기 (Q1)</option>
                                        <option value="2" className="bg-[#0B1221]">2분기 (Q2)</option>
                                        <option value="3" className="bg-[#0B1221]">3분기 (Q3)</option>
                                        <option value="4" className="bg-[#0B1221]">4분기 (Q4)</option>
                                    </select>

                                    <select
                                        onChange={(e) => {
                                            const m = parseInt(e.target.value);
                                            if (m === 0) return;
                                            const year = startDate ? new Date(startDate).getFullYear() : 2026;
                                            setStartDate(toLocalIsoDate(new Date(year, m - 1, 1)));
                                            setEndDate(toLocalIsoDate(new Date(year, m, 0)));
                                        }}
                                        className="bg-transparent text-slate-400 text-[11px] font-black outline-none cursor-pointer hover:text-indigo-400 transition-colors px-2"
                                    >
                                        <option value="0" className="bg-[#0B1221]">전체 월</option>
                                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                            <option key={m} value={m} className="bg-[#0B1221]">{m}월</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex items-center gap-1 bg-[#0B1221] px-1 py-1 rounded-2xl border border-white/10 shadow-inner">
                                    <div className="flex items-center gap-2 px-3 border-x border-white/5">
                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="bg-transparent text-white text-[11px] font-bold outline-none font-mono cursor-pointer"
                                        />
                                        <span className="text-slate-600 text-[10px] font-black">~</span>
                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="bg-transparent text-white text-[11px] font-bold outline-none font-mono cursor-pointer"
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); setSelectedVendor(''); }}
                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-slate-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                            >
                                검색 조건 초기화
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-white/5">
                            <div className="space-y-3">
                                <label className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                                    <User size={12} className="text-indigo-500" />
                                    거래처 상세 선별
                                </label>
                                <select
                                    value={selectedVendor}
                                    onChange={(e) => setSelectedVendor(e.target.value)}
                                    className="w-full px-4 py-2.5 bg-[#0B1221] border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">전체 거래처 리스트</option>
                                    {vendors.map(v => (
                                        <option key={v} value={v!}>{v}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#151D2E] p-1 rounded-[2rem] border border-white/5 overflow-hidden shadow-2xl text-slate-300">
                        <JournalTable entries={filteredLedger} />
                    </div>

                    <div className="flex justify-between items-center text-sm text-slate-500 font-bold px-4">
                        <span>총 {ledger.length}건 중 {filteredLedger.length}개 항목 필터링됨</span>
                        <span className="text-white text-lg">
                            선택 합계: <span className="font-black text-indigo-400">₩{filteredLedger.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</span>
                        </span>
                    </div>
                </div>
            )}

            {/* Modals outside the view-conditional section but inside the root div */}
            <ManualEntryModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={addEntry}
            />

            {isVatReportOpen && (
                <VatOptimizationReport
                    onClose={() => setIsVatReportOpen(false)}
                    optimizedEntries={ledger.filter(e => e.suggestedDescription || (e.suggestedVat !== undefined && e.suggestedVat !== e.vat))}
                    onApply={(id) => {
                        alert(`전표 ID: ${id}에 대한 최적화가 반영되었습니다.`);
                        setIsVatReportOpen(false);
                    }}
                />
            )}

            {showSmartUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-[#070C11]/95 backdrop-blur-md cursor-default"></div>
                    <div className="relative w-full max-w-5xl">
                        <div className="absolute -top-12 right-0">
                            <button
                                onClick={() => setShowSmartUpload(false)}
                                className="text-slate-400 hover:text-white flex items-center gap-2 font-bold transition-colors"
                            >
                                <X size={20} /> 닫기 (ESC)
                            </button>
                        </div>
                        <SmartExcelUploader
                            externalFile={externalFile}
                            onUpload={(entries) => {
                                addEntries(entries);
                                setShowSmartUpload(false);
                                setExternalFile(null);
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default Journal;
