import React, { useState, useMemo, useContext } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { JournalEntry, ParsedTransaction } from '../types';
import JournalTable from '../components/journal/JournalTable';
import { TransactionFeed } from '../components/dashboard/TransactionFeed';
import { FileUploader } from '../components/journal/FileUploader';
import { StagingTable } from '../components/journal/StagingTable';
import { FileText, Download, Filter, Calendar, User, Database, LayoutGrid, List, Plus } from 'lucide-react';
import CalendarView from '../components/journal/CalendarView';
import { ManualEntryModal } from '../components/journal/ManualEntryModal';

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

    // Extract unique vendors for dropdown
    const vendors = useMemo(() => {
        const uniqueVendors = new Set(ledger.map(e => e.vendor).filter(Boolean));
        return Array.from(uniqueVendors).sort();
    }, [ledger]);

    // Derived filtered data
    const filteredLedger = useMemo(() => {
        return ledger.filter((entry) => {
            const dateMatch = (!startDate || entry.date >= startDate) && (!endDate || entry.date <= endDate);
            const vendorMatch = !selectedVendor || entry.vendor === selectedVendor;
            return dateMatch && vendorMatch;
        });
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
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Unified Input Section */}
            <div className="space-y-6">
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="w-1.5 h-6 bg-emerald-500 rounded-sm"></span>
                        <h2 className="text-2xl font-bold text-white">통합 데이터 입력 (Universal Ingestion)</h2>
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
                                        auditTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 리스 거래 패턴 식별`]
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
                                        auditTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 급여 항목 식별`]
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
                                        auditTrail: [`[${new Date().toLocaleTimeString()}] AI 감지: 고액 자산 취득 식별`]
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
                    <FileUploader onTransactionsLoaded={setStagingTransactions} />
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
                        <p className="mt-2 text-slate-400 font-bold">Audit-Ready: 확정(Authorized)된 전표만 재무제표 및 공시 지표에 반영됩니다.</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 bg-[#151D2E] rounded-2xl border border-white/5 shadow-2xl">
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <Calendar size={14} />
                                조회 기간 설정
                            </label>
                            <div className="flex items-center gap-2">
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-[#0B1221] border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                />
                                <span className="text-slate-600">~</span>
                                <input
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-[#0B1221] border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">
                                <User size={14} />
                                거래처 선별
                            </label>
                            <select
                                value={selectedVendor}
                                onChange={(e) => setSelectedVendor(e.target.value)}
                                className="w-full px-4 py-2 bg-[#0B1221] border border-white/10 rounded-xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 outline-none transition-all appearance-none cursor-pointer"
                            >
                                <option value="">전체 거래처 리스트</option>
                                {vendors.map(v => (
                                    <option key={v} value={v!}>{v}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-end">
                            <button
                                onClick={() => { setStartDate(''); setEndDate(''); setSelectedVendor(''); }}
                                className="w-full h-10 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-slate-400 hover:bg-white/10 hover:text-white transition-all uppercase tracking-widest"
                            >
                                검색 조건 초기화
                            </button>
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

            {/* Manual Entry Modal */}
            <ManualEntryModal
                isOpen={isManualModalOpen}
                onClose={() => setIsManualModalOpen(false)}
                onSave={addEntry}
            />
        </div>
    );
};

export default Journal;
