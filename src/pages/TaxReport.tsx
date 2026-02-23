import React, { useState, useMemo } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import {
    ShieldCheck,
    AlertTriangle,
    FileText,
    CheckCircle,
    Receipt,
    AlertOctagon,
    Siren,
    Copy,
    CalendarX,
    TrendingUp,
    Search
} from 'lucide-react';
import { JournalEntry } from '../types';

export const TaxReport: React.FC = () => {
    const { ledger, systemNow } = useAccounting();
    const [activeTab, setActiveTab] = useState<'tax' | 'analysis'>('tax');
    const [quarter, setQuarter] = useState<'1Q' | '2Q' | '3Q' | '4Q'>('1Q');
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [showAll, setShowAll] = useState(false);

    // --- Common Filter Logic ---
    const filteredLedger = useMemo(() => {
        return ledger.filter(entry => {
            const entryYear = entry.date.split('-')[0];
            const month = parseInt(entry.date.split('-')[1]);
            const statusOk = entry.status === 'Approved';

            if (systemNow && entry.date > systemNow) return false;
            if (entryYear !== year) return false;

            // For Tax Tab, we filter by Quarter
            if (activeTab === 'tax') {
                let qCheck = false;
                if (quarter === '1Q') qCheck = month >= 1 && month <= 3;
                else if (quarter === '2Q') qCheck = month >= 4 && month <= 6;
                else if (quarter === '3Q') qCheck = month >= 7 && month <= 9;
                else if (quarter === '4Q') qCheck = month >= 10 && month <= 12;
                return qCheck && statusOk;
            }
            // For Analysis, we look at the whole year to find patterns
            else {
                return statusOk;
            }
        });
    }, [ledger, quarter, year, activeTab, systemNow]);

    // ==========================================
    // Tab 1: Tax & Evidence Logic
    // ==========================================
    const taxData = useMemo(() => {
        // Run logic only on Quarter filtered data
        const targetData = ledger.filter(entry => {
            const entryYear = entry.date.split('-')[0];
            const month = parseInt(entry.date.split('-')[1]);
            if (systemNow && entry.date > systemNow) return false;
            if (entryYear !== year || entry.status !== 'Approved') return false;
            if (quarter === '1Q') return month >= 1 && month <= 3;
            if (quarter === '2Q') return month >= 4 && month <= 6;
            if (quarter === '3Q') return month >= 7 && month <= 9;
            if (quarter === '4Q') return month >= 10 && month <= 12;
            return false;
        });

        let outputTax = 0;
        let inputTax = 0;
        let salesSupply = 0;
        let purchaseSupply = 0;
        let totalWithheld = 0;

        targetData.forEach(e => {
            if (e.type === 'Revenue' && e.vat > 0) {
                outputTax += e.vat;
                salesSupply += e.amount;
            } else if ((e.type === 'Expense' || e.type === 'Asset') && e.vat > 0) {
                inputTax += e.vat;
                purchaseSupply += e.amount;
            }

            if (e.type === 'Payroll' && e.vat > 0) {
                totalWithheld += e.vat;
            } else if (e.creditAccount.includes('예수금')) {
                totalWithheld += e.amount;
            }
        });

        // Evidence Status Check
        const allExpenses = targetData
            .filter(e => e.type === 'Expense')
            .map(e => {
                const isRequired = e.amount > 30000;
                const hasEvidence = e.vat > 0 || ['TAX_INVOICE', 'CARD_RECEIPT', 'CASH_RECEIPT'].includes(e.documentType || '');
                let status: 'OK' | 'MISSING' | 'OPTIONAL' = 'OK';
                if (isRequired && !hasEvidence) status = 'MISSING';
                if (!isRequired) status = 'OPTIONAL';
                return { ...e, evidenceStatus: status };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        const evidenceRisks = allExpenses.filter(e => e.evidenceStatus === 'MISSING');

        return {
            outputTax, inputTax, salesSupply, purchaseSupply,
            payable: outputTax - inputTax,
            totalWithheld,
            evidenceRisks,
            allExpenses
        };
    }, [ledger, quarter, year, systemNow]);


    // ==========================================
    // Tab 2: Spending Analysis Logic (Anomaly Detection)
    // ==========================================
    const analysisResults = useMemo(() => {
        const risks: { id: string, type: 'Duplicate' | 'Weekend' | 'Spike', severity: 'High' | 'Medium' | 'Low', description: string, entry: JournalEntry }[] = [];
        const expenses = ledger.filter(e => (!systemNow || e.date <= systemNow) && e.type === 'Expense' && e.status === 'Approved' && e.date.startsWith(year));

        // 1. Duplicate Payments Detection (중복 결제 의심)
        // Group by Date + Vendor + Amount
        const signatures = new Map<string, JournalEntry[]>();
        expenses.forEach(e => {
            const signature = `${e.date}-${e.vendor}-${e.amount}`;
            if (!signatures.has(signature)) signatures.set(signature, []);
            signatures.get(signature)?.push(e);
        });

        signatures.forEach((entries, sig) => {
            if (entries.length > 1) {
                entries.forEach(e => {
                    risks.push({
                        id: `dup-${e.id}`,
                        type: 'Duplicate',
                        severity: 'High',
                        description: `중복 결제 의심: 동일 날짜, 동일 거래처(${e.vendor}), 동일 금액(₩${e.amount.toLocaleString()})이 ${entries.length}회 발생했습니다.`,
                        entry: e
                    });
                });
            }
        });

        // 2. Weekend/Holiday Usage (주말/휴일 지출)
        expenses.forEach(e => {
            const date = new Date(e.date);
            const day = date.getDay(); // 0=Sun, 6=Sat
            if (day === 0 || day === 6) {
                // Determine severity based on account type
                let severity: 'High' | 'Medium' | 'Low' = 'Medium';
                if (e.debitAccount.includes('접대비') || e.debitAccount.includes('식대')) severity = 'Low'; // Common
                else severity = 'Medium';

                risks.push({
                    id: `wknd-${e.id}`,
                    type: 'Weekend',
                    severity: severity,
                    description: `휴일 지출 알림: ${e.debitAccount} 항목이 주말(토/일)에 결제되었습니다.`,
                    entry: e
                });
            }
        });

        // 3. Spending Spikes (추세 대비 급증)
        const accountMonthly = new Map<string, number[]>(); // Account -> [JanTotal, FebTotal, ...]

        expenses.forEach(e => {
            const month = parseInt(e.date.split('-')[1]) - 1; // 0-11
            if (!accountMonthly.has(e.debitAccount)) accountMonthly.set(e.debitAccount, new Array(12).fill(0));
            accountMonthly.get(e.debitAccount)![month] += e.amount;
        });

        accountMonthly.forEach((totals, account) => {
            let rollingSum = 0;
            let count = 0;

            totals.forEach((amt, idx) => {
                if (count > 0 && amt > 100000) { // Minimum threshold 100k
                    const avg = rollingSum / count;
                    if (amt > avg * 2.0) { // 200% Spike
                        const representativeEntry = expenses.find(e =>
                            e.debitAccount === account &&
                            parseInt(e.date.split('-')[1]) === idx + 1
                        );

                        if (representativeEntry) {
                            risks.push({
                                id: `spike-${account}-${idx}`,
                                type: 'Spike',
                                severity: 'Medium',
                                description: `지출 급증 알림: '${account}'의 ${idx + 1}월 지출(₩${amt.toLocaleString()})이 이전 평균(₩${Math.round(avg).toLocaleString()}) 대비 2배 이상 높습니다.`,
                                entry: representativeEntry
                            });
                        }
                    }
                }
                if (amt > 0) {
                    rollingSum += amt;
                    count++;
                }
            });
        });

        return risks.sort((a, b) => b.severity === 'High' ? -1 : 1);
    }, [ledger, year, systemNow]);

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
                        <ShieldCheck className="text-indigo-500" size={32} />
                        부가세 및 자금 리스크 (VAT & Risk)
                    </h1>
                    <p className="text-slate-400 text-lg mt-2">부가가치세 신고 준비 및 자금 흐름 모니터링</p>
                </div>

                <div className="flex gap-4">
                    <select
                        value={year}
                        onChange={(e) => setYear(e.target.value)}
                        className="bg-[#151D2E] text-white font-bold px-4 py-2 rounded-xl border border-white/10 outline-none"
                    >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(y => (
                            <option key={y} value={y}>{y}년</option>
                        ))}
                    </select>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-4 border-b border-white/10">
                <button
                    onClick={() => setActiveTab('tax')}
                    className={`pb-4 px-2 font-black text-sm transition-all relative ${activeTab === 'tax' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    부가세 및 증빙 관리
                    {activeTab === 'tax' && <div className="absolute bottom-0 left-0 w-full h-1 bg-indigo-500 rounded-t-full"></div>}
                </button>
                <button
                    onClick={() => setActiveTab('analysis')}
                    className={`pb-4 px-2 font-black text-sm transition-all relative flex items-center gap-2 ${activeTab === 'analysis' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    AI 지출 패턴 분석
                    <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{analysisResults.length}</span>
                    {activeTab === 'analysis' && <div className="absolute bottom-0 left-0 w-full h-1 bg-rose-500 rounded-t-full"></div>}
                </button>
            </div>

            {/* TAB CONTENT: TAX & EVIDENCE */}
            {activeTab === 'tax' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    <div className="flex justify-end">
                        <div className="flex bg-[#151D2E] rounded-xl p-1 border border-white/10">
                            {['1Q', '2Q', '3Q', '4Q'].map((q) => (
                                <button
                                    key={q}
                                    onClick={() => setQuarter(q as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${quarter === q ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                                >
                                    {q}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Summary Cards */}
                        <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><FileText size={100} className="text-indigo-500" /></div>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">매출 세액 (Output)</p>
                            <h3 className="text-3xl font-black text-indigo-400">₩{taxData.outputTax.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-2 font-bold">공급가액: ₩{taxData.salesSupply.toLocaleString()}</p>
                        </div>
                        <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><Receipt size={100} className="text-emerald-500" /></div>
                            <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">매입 세액 (Input)</p>
                            <h3 className="text-3xl font-black text-emerald-400">₩{taxData.inputTax.toLocaleString()}</h3>
                            <p className="text-xs text-slate-500 mt-2 font-bold">공급가액: ₩{taxData.purchaseSupply.toLocaleString()}</p>
                        </div>
                        <div className={`p-8 rounded-[2rem] border relative overflow-hidden ${taxData.payable >= 0 ? 'bg-gradient-to-br from-indigo-900/40 to-[#151D2E] border-indigo-500/30' : 'bg-gradient-to-br from-emerald-900/40 to-[#151D2E] border-emerald-500/30'}`}>
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-2">
                                {taxData.payable >= 0 ? '부가세 납부세액' : '부가세 환급세액'}
                            </p>
                            <h3 className="text-3xl font-black text-white">₩{Math.abs(taxData.payable).toLocaleString()}</h3>
                            <div className="mt-4 flex gap-2">
                                <span className="px-3 py-1 bg-white/10 rounded-full text-[10px] font-black text-white backdrop-blur-sm">
                                    신고: {quarter === '1Q' ? '04.25' : quarter === '2Q' ? '07.25' : quarter === '3Q' ? '10.25' : '01.25'}까지
                                </span>
                            </div>
                        </div>
                        <div className="bg-[#151D2E] p-8 rounded-[2rem] border border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheck size={100} className="text-sky-500" /></div>
                            <div>
                                <p className="text-slate-500 text-xs font-black uppercase tracking-widest mb-2">원천세 예수금 (Withheld)</p>
                                <h3 className="text-3xl font-black text-sky-400">₩{taxData.totalWithheld.toLocaleString()}</h3>
                            </div>
                            <div className="mt-4">
                                <span className="px-3 py-1 bg-sky-500/10 text-sky-400 rounded-lg text-xs font-black border border-sky-500/20 block w-fit">
                                    납부: 다음 달 10일
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Evidence List Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <h3 className="text-xl font-black text-white flex items-center gap-2">
                                    {showAll ? <FileText className="text-indigo-400" /> : <AlertOctagon className="text-rose-500" />}
                                    {showAll ? '지출 증빙 전체 내역' : '증빙 누락 (Evidence Missing)'}
                                    <span className="text-sm text-slate-500 bg-white/5 px-2 py-0.5 rounded-full ml-2">
                                        {showAll ? taxData.allExpenses.length : taxData.evidenceRisks.length}
                                    </span>
                                </h3>
                                <div className="flex bg-[#0B1221] p-1 rounded-lg border border-white/5">
                                    <button
                                        onClick={() => setShowAll(false)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-black transition-colors ${!showAll ? 'bg-rose-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        누락 건만 보기
                                    </button>
                                    <button
                                        onClick={() => setShowAll(true)}
                                        className={`px-3 py-1.5 rounded-md text-xs font-black transition-colors ${showAll ? 'bg-indigo-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                    >
                                        전체 보기
                                    </button>
                                </div>
                            </div>
                            <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                                {(showAll ? taxData.allExpenses : taxData.evidenceRisks).length === 0 ? (
                                    <div className="p-12 text-center">
                                        <CheckCircle size={48} className="text-emerald-500 mx-auto mb-4" />
                                        <h4 className="text-white font-bold text-lg">완벽합니다!</h4>
                                        <p className="text-slate-500 mt-2 text-sm">적격 증빙 누락 건이 발견되지 않았습니다.</p>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                                            <tr>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">일자</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">거래내용</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right">금액</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">증빙 상태</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center">보기</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {(showAll ? taxData.allExpenses : taxData.evidenceRisks).map(item => (
                                                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                                                    <td className="px-6 py-4 text-slate-400 font-bold text-xs">{item.date}</td>
                                                    <td className="px-6 py-4 text-white font-bold text-sm">
                                                        {item.description}
                                                        <div className="text-[10px] text-slate-500 mt-1">{item.debitAccount}</div>
                                                    </td>
                                                    <td className={`px-6 py-4 text-right font-mono font-bold ${item.evidenceStatus === 'MISSING' ? 'text-rose-400' : 'text-white'}`}>
                                                        ₩{item.amount.toLocaleString()}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {item.evidenceStatus === 'MISSING' && (
                                                            <span className="px-2 py-1 bg-rose-500/20 text-rose-400 rounded text-[10px] font-black inline-flex items-center gap-1">
                                                                <AlertOctagon size={10} /> 증빙불비
                                                            </span>
                                                        )}
                                                        {item.evidenceStatus === 'OK' && (
                                                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-[10px] font-black inline-flex items-center gap-1">
                                                                <CheckCircle size={10} /> 적격증빙
                                                            </span>
                                                        )}
                                                        {item.evidenceStatus === 'OPTIONAL' && (
                                                            <span className="px-2 py-1 bg-slate-500/20 text-slate-400 rounded text-[10px] font-black">
                                                                해당없음
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        {item.evidenceStatus === 'OK' ? (
                                                            <button
                                                                onClick={() => window.open('https://picsum.photos/600/800', '_blank', 'width=600,height=800')}
                                                                className="p-2 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white rounded-lg transition-all"
                                                                title="증빙 보기"
                                                            >
                                                                <Search size={14} />
                                                            </button>
                                                        ) : (
                                                            <button className="p-2 bg-white/5 text-slate-600 cursor-not-allowed rounded-lg">
                                                                <FileText size={14} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </div>

                        <div className="bg-gradient-to-b from-[#151D2E] to-indigo-900/20 rounded-[2.5rem] border border-white/5 p-8">
                            <h3 className="text-lg font-black text-white mb-6 flex items-center gap-2">
                                <AlertTriangle className="text-yellow-400" size={20} /> 증빙 가이드
                            </h3>
                            <ul className="space-y-6">
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">1</div>
                                    <div className="text-xs text-slate-400"><strong className="text-white">3만원 초과</strong> 지출은 반드시 적격증빙(세금계산서, 카드, 현금영수증)이 필요합니다.</div>
                                </li>
                                <li className="flex gap-4">
                                    <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold shrink-0">2</div>
                                    <div className="text-xs text-slate-400"><strong className="text-white">접대비</strong>는 금액 상관없이 법인카드를 사용해야 인정됩니다. (경조사비 20만원 한도)</div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB CONTENT: ANALYSIS */}
            {activeTab === 'analysis' && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                    {/* Anomaly Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between group hover:border-rose-500/30 transition-colors">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-rose-500/10 rounded-xl text-rose-500"><Copy size={24} /></div>
                                    <span className="text-rose-500 font-black text-3xl">{analysisResults.filter(r => r.type === 'Duplicate').length}</span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">중복 결제 의심</h3>
                                <p className="text-slate-500 text-xs">동일 날짜, 거래처, 금액의 중복 발생</p>
                            </div>
                        </div>
                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between group hover:border-orange-500/30 transition-colors">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-orange-500/10 rounded-xl text-orange-500"><CalendarX size={24} /></div>
                                    <span className="text-orange-500 font-black text-3xl">{analysisResults.filter(r => r.type === 'Weekend').length}</span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">휴일/업무외 지출</h3>
                                <p className="text-slate-500 text-xs">주말 등 업무 시간 외 결제 내역</p>
                            </div>
                        </div>
                        <div className="bg-[#151D2E] p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between group hover:border-yellow-500/30 transition-colors">
                            <div>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-yellow-500/10 rounded-xl text-yellow-500"><TrendingUp size={24} /></div>
                                    <span className="text-yellow-500 font-black text-3xl">{analysisResults.filter(r => r.type === 'Spike').length}</span>
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">지출 급증 (추세)</h3>
                                <p className="text-slate-500 text-xs">평균 대비 2배 이상 지출 급증</p>
                            </div>
                        </div>
                    </div>

                    {/* Detailed Analysis List */}
                    <div className="bg-[#151D2E] rounded-[2.5rem] border border-white/5 overflow-hidden">
                        <div className="p-8 border-b border-white/5 flex justify-between items-center">
                            <h3 className="text-xl font-black text-white flex items-center gap-2">
                                <Siren className="text-rose-500" />
                                이상 징후 분석 리포트
                            </h3>
                            <div className="flex gap-2">
                                <span className="text-xs font-bold text-slate-500 bg-white/5 px-3 py-1 rounded-full">{year}년 전체 데이터</span>
                            </div>
                        </div>

                        <div className="max-h-[600px] overflow-y-auto custom-scrollbar">
                            {analysisResults.length === 0 ? (
                                <div className="p-20 text-center">
                                    <Search size={64} className="text-indigo-500/30 mx-auto mb-6" />
                                    <h4 className="text-white font-bold text-xl">특이사항 없음</h4>
                                    <p className="text-slate-500 mt-2">AI 분석 결과, 특별한 자금 리스크가 발견되지 않았습니다.</p>
                                </div>
                            ) : (
                                <table className="w-full text-left">
                                    <thead className="bg-white/5 sticky top-0 backdrop-blur-md z-10">
                                        <tr>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center w-24">유형</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase w-32">일자</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase">분석 결과 (Analysis Result)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-right w-32">금액</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-500 uppercase text-center w-24">중요도</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {analysisResults.map(risk => (
                                            <tr key={risk.id} className="group hover:bg-white/[0.02] transition-colors">
                                                <td className="px-6 py-4 text-center">
                                                    {risk.type === 'Duplicate' && <span className="bg-rose-500/20 text-rose-400 px-2 py-1 rounded text-[10px] font-black">중복</span>}
                                                    {risk.type === 'Weekend' && <span className="bg-orange-500/20 text-orange-400 px-2 py-1 rounded text-[10px] font-black">휴일</span>}
                                                    {risk.type === 'Spike' && <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-[10px] font-black">급증</span>}
                                                </td>
                                                <td className="px-6 py-4 text-slate-400 font-bold text-xs">{risk.entry.date}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-slate-300 group-hover:text-white transition-colors">
                                                    {risk.description}
                                                    <div className="text-[10px] text-slate-500 font-normal mt-1 flex items-center gap-2">
                                                        <span className="bg-white/10 px-1.5 py-0.5 rounded text-slate-400">{risk.entry.debitAccount}</span>
                                                        <span>{risk.entry.vendor}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-right font-mono font-black text-slate-300">
                                                    ₩{risk.entry.amount.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`w-3 h-3 rounded-full inline-block ${risk.severity === 'High' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.5)]' :
                                                        risk.severity === 'Medium' ? 'bg-orange-500' : 'bg-yellow-500'
                                                        }`}></span>
                                                    <span className="sr-only">{risk.severity}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TaxReport;
