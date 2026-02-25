import React, { useMemo, useState } from 'react';
import { useAccounting } from '../hooks/useAccounting';
import { runPhase2IntegrationTest, runPhase3BvATest, runSystemIntegrityTest } from '../utils/testScenarios';
import { PremiumDatePicker } from '../components/ui/PremiumDatePicker';
import { ClosingInsightWidget } from '../components/dashboard/ClosingInsightWidget';
import {
    Activity,
    Terminal,
    TrendingUp,
    TrendingDown,
    Zap,
    CreditCard,
    Wallet,
    Search,
    Filter,
    Clock,
    DollarSign,
    ShieldAlert,
    Calendar,
    Lock,
    RefreshCw,
    Target,
    ChevronDown,
    Siren
} from 'lucide-react';
import { JournalEntry, BusinessScenario } from '../types';
import { isArAccount, isApAccount, isCashAccount, CashPolicy } from '../constants/accounts';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer
} from 'recharts';
import { calculateFinancials } from '../bridge/StrategicBridge';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { CFOReportCard } from '../components/dashboard/CFOReportCard';
import { CEOQuickBar } from '../components/dashboard/CEOQuickBar';
import { ManagementRiskReport } from '../components/dashboard/ManagementRiskReport';
import { RiskEvidenceModal } from '../components/dashboard/modals/RiskEvidenceModal';
import { generateYearlyPack } from '../utils/mockDataGenerator';
import { formatCLevel, toLocalIsoDate } from '../utils/formatUtils';
import { InfoTooltip } from '../components/ui/InfoTooltip';
import { AIForecastPanel } from '../components/dashboard/AIForecastPanel';
import { DAYS_IN_MONTH } from '../constants/accounting';

export const Dashboard: React.FC<{ setTab: (tab: string) => void }> = ({ setTab }) => {
    const {
        ledger, financials, addEntries, clearAllData, periods, closingRecords, initialCashBalance,
        seedThreeYearSimulation, seedScenarioSimulation, addAsset, addLease, performClosing, setBudget,
        systemNow, setSystemNow, getRunway, liabilities
    } = useAccounting();

    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'day' | 'week' | 'month' | 'year'>(() =>
        (localStorage.getItem('dash_time_range') as any) || 'day'
    );

    const [selectedScenario, setSelectedScenario] = useState<BusinessScenario>(() =>
        (localStorage.getItem('dash_scenario') as BusinessScenario) || 'STANDARD'
    );

    // Persist settings
    React.useEffect(() => {
        localStorage.setItem('dash_time_range', timeRange);
        localStorage.setItem('dash_scenario', selectedScenario);
    }, [timeRange, selectedScenario]);

    // Initialize systemNow to the latest if still empty
    React.useEffect(() => {
        if (ledger.length > 0 && !systemNow) {
            const dates = ledger.map(e => e.date).sort();
            const lastDate = dates[dates.length - 1];
            setSystemNow(lastDate);
        }
    }, [ledger, systemNow, setSystemNow]);
    const [showRiskReport, setShowRiskReport] = useState(false);
    const [selectedRiskEvidence, setSelectedRiskEvidence] = useState<'strategy' | 'cash' | 'survival' | 'control' | null>(null);

    React.useEffect(() => {
        setIsMounted(true);
    }, []);

    const analytics = useMemo(() => {
        const hasActivity = ledger.length > 0;
        const approvedLedger = ledger.filter(e => e.status === 'Approved');

        // 1. Group by Day with specialized buckets
        const dailyStats = new Map<string, { income: number; expense: number; sales: number }>();
        approvedLedger.forEach(entry => {
            const key = entry.date;
            const current = dailyStats.get(key) || { income: 0, expense: 0, sales: 0 };

            const amount = entry.amount || 0;
            const vat = entry.vat || 0;
            const total = amount + vat;

            const flowType = CashPolicy.isExternalFlow(entry.debitAccount, entry.creditAccount);

            if (flowType === 'INFLOW') current.income += total;
            else if (flowType === 'OUTFLOW') current.expense += total;

            // Accrual Sales (Business Performance Basis)
            if (entry.type === 'Revenue') current.sales += amount;

            dailyStats.set(key, current);
        });

        // 2. Continuous Data based on Range
        let rawData: any[] = [];
        if (hasActivity) {
            const sortedDates = approvedLedger.map(e => e.date).sort();
            const startLimit = new Date(sortedDates[0]);
            const latestDataDate = new Date(sortedDates[sortedDates.length - 1]);

            // Use systemNow for the end of the chart if it exists and is valid
            const selectedDate = systemNow ? new Date(systemNow) : null;
            const endLimit = (selectedDate && !isNaN(selectedDate.getTime())) ? selectedDate : latestDataDate;

            const rangeStart = new Date(endLimit);
            if (timeRange === 'week') rangeStart.setDate(endLimit.getDate() - 7);
            else if (timeRange === 'month') rangeStart.setMonth(endLimit.getMonth() - 1);
            else if (timeRange === 'year') rangeStart.setFullYear(endLimit.getFullYear() - 1);
            else rangeStart.setDate(endLimit.getDate() - 14);

            const effectiveStart = rangeStart > startLimit ? rangeStart : startLimit;

            for (let d = new Date(effectiveStart); d <= endLimit; d.setDate(d.getDate() + 1)) {
                if (isNaN(d.getTime())) continue;
                const key = d.toISOString().split('T')[0];
                const stats = dailyStats.get(key) || { income: 0, expense: 0, sales: 0 };
                rawData.push({
                    name: key,
                    income: stats.income,
                    expense: stats.expense,
                    sales: stats.sales
                });
            }
        } else {
            rawData = [{ name: new Date().toISOString().split('T')[0], income: 0, expense: 0, sales: 0 }];
        }

        // 3. Trend (30-day MA of SALES to reflect Monthly Run Rate)
        const cashFlowData = rawData.map((d, idx, arr) => {
            const window = arr.slice(Math.max(0, idx - 29), idx + 1);
            const trend = window.reduce((s, x) => s + x.sales, 0) / window.length;
            return { ...d, trend: Math.round(trend) };
        });

        // 4. Advanced Burn Rate & Runway Analysis (CFO Logic)
        // CRITICAL: Filter by systemNow to avoid including future planned expenses in current burn rate
        const outEntries = approvedLedger.filter(e =>
            (e.type === 'Expense' || e.type === 'Payroll') &&
            (systemNow ? e.date <= systemNow : true)
        );
        const totalOut = outEntries.reduce((s, e) => s + ((e.amount || 0) + (e.vat || 0)), 0);

        let avgBurnRate = 0;
        let activityDays = 0;

        if (outEntries.length > 0) {
            const sorted = outEntries.map(e => new Date(e.date).getTime()).sort((a, b) => a - b);
            const start = sorted[0];

            // CONSTITUTION v2.1: Denominator should be the duration from the FIRST expense 
            // to the CURRENT reality (systemNow) to represent the REAL burn rate of the company.
            const end = systemNow ? new Date(systemNow).getTime() : sorted[sorted.length - 1];

            activityDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

            // If it's a very short period (startup), default to 30 days to avoid inflated burn rates
            const denominator = activityDays < 7 ? 30 : activityDays;
            avgBurnRate = totalOut / denominator;
        }

        const earliestExpenseDate = outEntries.length > 0
            ? toLocalIsoDate(new Date(Math.min(...outEntries.map(e => new Date(e.date).getTime()))))
            : '2023-01-01';

        return { cashFlowData, hasActivity, avgBurnRate, activityDays, earliestExpenseDate };
    }, [ledger, timeRange, systemNow]);

    const unsettledMetrics = useMemo(() => {
        // We include both Approved and Unconfirmed for "Managerial Visibility"
        // CRITICAL: Must respect systemNow (reference date) to show snapshot at that time
        const relevant = ledger.filter(e =>
            (e.status === 'Approved' || e.status === 'Unconfirmed') &&
            !e.isSettled &&
            (systemNow ? e.date <= systemNow : true)
        );

        const ar = relevant.filter(e => isArAccount(e.debitAccount)).reduce((sum, e) => sum + ((e.amount || 0) + (e.vat || 0)), 0);
        const ap = relevant.filter(e => isApAccount(e.creditAccount)).reduce((sum, e) => sum + ((e.amount || 0) + (e.vat || 0)), 0);

        return { ar, ap };
    }, [ledger, systemNow]);

    const rangeFinancials = useMemo(() => {
        const approvedLedger = ledger.filter(e => e.status === 'Approved');
        if (approvedLedger.length === 0) return financials;

        const sortedDates = approvedLedger.map(e => e.date).sort();
        const latestAvailable = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : new Date().toISOString().split('T')[0];
        // Use user-selected systemNow if available, otherwise latest data date
        const endLimitDay = new Date(systemNow || latestAvailable);
        // Safety: If date is invalid, fallback to latestAvailable
        const finalEndDay = isNaN(endLimitDay.getTime()) ? new Date(latestAvailable) : endLimitDay;
        let rangeStart = new Date(finalEndDay);

        if (timeRange === 'week') rangeStart.setDate(finalEndDay.getDate() - 7);
        else if (timeRange === 'month') rangeStart.setMonth(finalEndDay.getMonth() - 1);
        else if (timeRange === 'year') rangeStart = new Date(finalEndDay.getFullYear(), 0, 1); // Fiscal YTD (Jan 1)
        else rangeStart.setDate(finalEndDay.getDate() - 14);

        const startStr = toLocalIsoDate(rangeStart);
        const endStr = toLocalIsoDate(finalEndDay);

        // Filter ledger for calculating range-specific metrics
        const rangeLedger = approvedLedger.filter(e => e.date >= startStr && e.date <= endStr);
        const cumulativeLedger = approvedLedger.filter(e => e.date <= endStr);

        // [SYNC] Core Calculation for the range (P/L) and cumulative (B/S)
        // initialCashBalance must be included to get the REAL world cash balance.
        const rangeStats = calculateFinancials(rangeLedger, undefined, 0, undefined, true);
        const cumulativeAtEnd = calculateFinancials(cumulativeLedger, endStr, initialCashBalance);

        // Previous year/period for comparison
        const prevEndDay = new Date(rangeStart);
        prevEndDay.setDate(prevEndDay.getDate() - 1);
        const prevEndStr = prevEndDay.toISOString().split('T')[0];
        const prevStats = calculateFinancials(approvedLedger.filter(e => e.date <= prevEndStr), prevEndStr, initialCashBalance);

        return {
            ...rangeStats,
            netIncome: rangeStats.revenue - rangeStats.expenses, // Selected period P/L
            currentCash: cumulativeAtEnd.cash, // Real ITD Balance
            cash: cumulativeAtEnd.cash, // Fallback alias for components expecting .cash
            cashInflow: rangeStats.cashInflow,
            cashOutflow: rangeStats.cashOutflow,
            prevNetIncome: prevStats.revenue - prevStats.expenses,
            prevCash: prevStats.cash,
            startDate: startStr,
            endDate: endStr
        };
    }, [ledger, timeRange, systemNow, initialCashBalance]);

    const latestPeriod = useMemo(() => {
        const viewMonth = systemNow ? systemNow.substring(0, 7) : '9999-12';
        const closed = periods
            .filter(p => p.status === 'CLOSED' && p.period <= viewMonth)
            .sort((a, b) => b.period.localeCompare(a.period));
        return closed.length > 0 ? closed[0] : null;
    }, [periods, systemNow]);

    const latestRecord = useMemo(() => {
        if (!latestPeriod) return null;
        return closingRecords.find(r => r.period === latestPeriod.period) || null;
    }, [latestPeriod, closingRecords]);

    return (
        <div className="flex-1 bg-[#0B1221] space-y-6 pb-12">
            {/* [UX] Sticky Global Dashboard Header */}
            <header className="sticky top-0 z-40 bg-[#0B1221]/80 backdrop-blur-md py-6 -mx-8 px-8 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center shadow-2xl shadow-indigo-600/40 rotate-12 transition-transform hover:rotate-0 cursor-pointer">
                        <Activity className="text-white" size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-white tracking-tighter">경영 대시보드 (Dashboard)</h1>
                        {((window as any).isDemoMode || import.meta.env.VITE_APP_MODE === 'demo') ? (
                            <p className="text-sm font-bold text-rose-400 mt-2 flex items-center gap-2">
                                <ShieldAlert size={16} /> DemoCo는 매출 성장 중이나, 현금 회수 지연으로 인해 3.4개월 내 유동성 리스크가 예상됩니다.
                            </p>
                        ) : (
                            <p className="text-[10px] font-black text-slate-500 mt-1 uppercase tracking-widest flex items-center gap-2">
                                Snapshot as of: <span className="text-indigo-400">{systemNow || 'REALTIME'}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <PremiumDatePicker value={systemNow} onChange={setSystemNow} />

                    <div className="flex bg-[#151D2E] p-1 rounded-xl border border-white/10 shadow-inner">
                        {(['week', 'day', 'month', 'year'] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => setTimeRange(r)}
                                className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${timeRange === r ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
                            >
                                {r === 'week' ? '7D' : r === 'day' ? '14D' : r === 'month' ? '1M' : '1Y'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => setTab('closing-manager')}
                        className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-emerald-600/20 active:scale-95 border border-white/10"
                    >
                        <Lock size={16} />
                        결산 실행 (Finalize)
                    </button>
                </div>
            </header>

            <div className="space-y-6">
                {import.meta.env.VITE_APP_MODE !== 'demo' && !(window as any).isDemoMode && (
                    <div className="flex flex-wrap gap-3 pb-2 border-b border-white/5">
                        <button
                            onClick={() => runPhase2IntegrationTest([], clearAllData, addAsset, addLease, addEntries, performClosing)}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(21,29,46,0.5)] text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 text-[10px] font-black uppercase rounded-lg transition-all border border-emerald-500/20"
                        >
                            <ShieldAlert size={14} />
                            VALIDATE Phase 2
                        </button>

                        <button
                            onClick={() => runSystemIntegrityTest(ledger, systemNow || new Date().toISOString().split('T')[0], addEntries as any, clearAllData, setSystemNow)}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(21,29,46,0.5)] text-indigo-400 hover:text-white hover:bg-indigo-500/10 text-[10px] font-black uppercase rounded-lg transition-all border border-indigo-500/40 shadow-lg shadow-indigo-500/10"
                        >
                            <Activity size={14} />
                            Integrity Check
                        </button>

                        <button
                            onClick={() => runPhase3BvATest(addEntries, setBudget, performClosing)}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(21,29,46,0.5)] text-rose-500 hover:text-rose-400 hover:bg-rose-500/10 text-[10px] font-black uppercase rounded-lg transition-all border border-rose-500/20"
                        >
                            <Target size={14} />
                            VALIDATE Phase 3
                        </button>

                        <button
                            onClick={() => {
                                const testEntries = [
                                    { id: crypto.randomUUID(), sequenceNumber: 9991, date: systemNow || new Date().toISOString().split('T')[0], type: 'Revenue', description: '[테스트] 대규모 허위/외상 매출 발생 (흑자부도 트리거)', amount: 500000000, vat: 50000000, debitAccount: '외상매출금', creditAccount: '제품매출', status: 'Approved', vendor: '악성거래처A' },
                                    { id: crypto.randomUUID(), sequenceNumber: 9992, date: systemNow || new Date().toISOString().split('T')[0], type: 'Expense', description: '[테스트] 대규모 영업비용 발생 (지출 지연 - 흑자부도 트리거)', amount: 450000000, vat: 45000000, debitAccount: '지급수수료', creditAccount: '미지급금', status: 'Approved', vendor: '악성거래처B' }
                                ];
                                addEntries(testEntries as any);
                                alert('흑자부도(Profitable Bankruptcy) 유발 데이터 2건이 장부에 주입되었습니다.\n우측의 [Risk Briefing] 버튼을 눌러 구조적 리스크 탐지를 확인하세요.');
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-[rgba(21,29,46,0.5)] text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 text-[10px] font-black uppercase rounded-lg transition-all border border-amber-500/20 shadow-lg shadow-amber-500/10 ml-auto"
                        >
                            <Siren size={14} />
                            Inject Bankruptcy Risk (흑자부도 테스트)
                        </button>
                    </div>
                )}

                <div className="flex flex-col gap-4">
                    <div className="flex items-center gap-3 bg-[#111827]/80 p-2 rounded-2xl border border-white/5 backdrop-blur-md w-fit">
                        <span className="text-[10px] font-bold text-slate-400 px-3 uppercase tracking-widest">Scenario Mode:</span>
                        {(['SURVIVAL', 'STANDARD', 'GROWTH'] as BusinessScenario[]).map(s => (
                            <button
                                key={s}
                                onClick={() => {
                                    const label = s === 'SURVIVAL' ? '자생적 생존(Lean)' : s === 'GROWTH' ? '공격 확장' : '표준 성장';
                                    if (window.confirm(`${label}로 전환하시겠습니까? \n\n기존 기간 데이터를 유지한 채 시나리오를 변경합니다.`)) {
                                        const currentYears = Array.from(new Set(ledger.map(e => parseInt(e.date.substring(0, 4)))));
                                        const targetYears = currentYears.length > 0 ? currentYears : [2026];
                                        setSelectedScenario(s);
                                        seedScenarioSimulation(s, targetYears);
                                        const lastYear = Math.max(...targetYears);
                                        setSystemNow(`${lastYear}-12-31`);
                                    }
                                }}
                                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${selectedScenario === s
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                                    : 'bg-white/5 text-slate-400 hover:bg-white/10'
                                    }`}
                            >
                                {s === 'SURVIVAL' ? 'SURVIVAL' : s === 'STANDARD' ? 'STANDARD' : 'GROWTH'}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => {
                                if (window.confirm('3개년 전체 사업 시뮬레이션을 실행하시겠습니까?\n(2026~2028년 전체 데이터가 생성되며 기존 데이터는 초기화됩니다)')) {
                                    seedThreeYearSimulation(selectedScenario);
                                    setSystemNow('2028-12-31');
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black uppercase rounded-2xl transition-all shadow-xl shadow-indigo-600/30 border border-white/10"
                        >
                            <Zap size={16} />
                            Full 3Y Simulation
                        </button>

                        <div className="w-px h-10 bg-white/10 mx-1" />

                        <button
                            onClick={() => {
                                if (window.confirm(`2026년 [${selectedScenario}] 시나리오를 시작하시겠습니까? (기존 데이터 초기화)\n\nSelected path: ${selectedScenario}`)) {
                                    seedScenarioSimulation(selectedScenario, [2026]);
                                    setSystemNow('2026-12-31');
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] text-white text-[10px] font-black uppercase rounded-2xl transition-all border border-indigo-500/30 hover:bg-indigo-600 shadow-lg shadow-indigo-600/10"
                        >
                            <Activity size={16} />
                            Run 2026
                        </button>

                        <button
                            onClick={() => {
                                const has2026 = ledger.some(e => e.date.startsWith('2026'));
                                if (!has2026) { alert('2026년 데이터가 먼저 필요합니다.'); return; }
                                if (window.confirm(`2027년 [${selectedScenario}] 비즈니스 시나리오를 진행하시겠습니까?`)) {
                                    seedScenarioSimulation(selectedScenario, [2026, 2027]);
                                    setSystemNow('2027-12-31');
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] text-white text-[10px] font-black uppercase rounded-2xl transition-all border border-indigo-500/30 hover:bg-indigo-600 shadow-lg shadow-indigo-600/10"
                        >
                            <TrendingUp size={16} />
                            Run 2027
                        </button>

                        <button
                            onClick={() => {
                                const has2027 = ledger.some(e => e.date.startsWith('2027'));
                                if (!has2027) { alert('2027년 데이터가 먼저 필요합니다.'); return; }
                                if (window.confirm(`2028년 [${selectedScenario}] 시장 우위 시나리오를 진행하시겠습니까?`)) {
                                    seedScenarioSimulation(selectedScenario, [2026, 2027, 2028]);
                                    setSystemNow('2028-12-31');
                                }
                            }}
                            className="flex items-center gap-2 px-6 py-3 bg-[#1E293B] text-white text-[10px] font-black uppercase rounded-2xl transition-all border border-indigo-500/30 hover:bg-indigo-600 shadow-lg shadow-indigo-600/10"
                        >
                            <Target size={16} />
                            Run 2028
                        </button>

                        <button
                            onClick={() => setShowRiskReport(true)}
                            className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black rounded-2xl transition-all shadow-xl shadow-rose-600/20 active:scale-95 border border-white/10 ml-auto"
                        >
                            <Target size={16} />
                            Risk Briefing
                        </button>
                    </div>
                </div>
            </div>

            {/* [Phase 11] Liability Management via Journal Badge System */}
            {/* LiabilityAlertBanner removed - CEO loans are normal operations, not "unplanned liabilities" */}
            {/* Liability tracking is handled through individual entry badges in Journal page */}

            {showRiskReport && <ManagementRiskReport onClose={() => setShowRiskReport(false)} />}

            {/* --- Phase 5: CFO Report Card (Section 1) --- */}
            <CFOReportCard
                ledger={ledger}
                systemNow={systemNow}
                initialCashBalance={initialCashBalance}
                onNavigate={(riskId) => setSelectedRiskEvidence(riskId as any)}
            />

            {/* --- Phase 5: Drill-down Evidence Modal --- */}
            {
                selectedRiskEvidence && (
                    <RiskEvidenceModal
                        riskId={selectedRiskEvidence}
                        ledger={ledger}
                        systemNow={systemNow}
                        onNavigate={setTab}
                        onClose={() => setSelectedRiskEvidence(null)}
                    />
                )
            }

            <CEOQuickBar
                financials={{
                    ...rangeFinancials,
                    earliestExpenseDate: analytics.earliestExpenseDate
                }}
                avgMonthlyBurn={analytics.avgBurnRate * DAYS_IN_MONTH}
                runwayMonths={getRunway().runwayMonths}
                isProfitable={rangeFinancials.netIncome > 0}
                hasActivity={analytics.hasActivity}
                onNavigate={setTab}
                timeRange={timeRange}
            />

            {/* --- Phase 13: AI Financial Forecast (Restored) --- */}
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
                <AIForecastPanel referenceDate={systemNow} />
            </div>





            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                <div className="xl:col-span-2 bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 h-[480px] relative overflow-hidden">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-xl font-black text-white">현금 흐름 및 매출 추세</h3>
                                <InfoTooltip
                                    title="Cash Flow & Sales Trend (현금 흐름 및 매출 추세)"
                                    content="선택한 기간 동안의 실제 자금 유입/유출과 장부상 매출액의 흐름을 보여줍니다."
                                    contextualTip="Area(영역)는 실제 현금 유출입을, 점선(Line)은 30일 이동평균 기반의 '월간 성적(Monthly Run-rate)'을 나타냅니다. 거래가 없는 주말에도 비즈니스의 체력을 확인할 수 있습니다."
                                />
                            </div>
                            <p className="text-xs font-bold text-slate-500 mt-1">실제 자금 유출입(Area)과 매출 추세(Line) 분석</p>
                        </div>
                        <div className="flex bg-[#0B1221] p-1 rounded-xl border border-white/5">
                            {(['day', 'week', 'month', 'year'] as const).map(range => (
                                <button
                                    key={range}
                                    onClick={() => setTimeRange(range)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${timeRange === range ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'
                                        } `}
                                >
                                    {range}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="h-full pb-20">
                        {isMounted && (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={analytics.cashFlowData}>
                                    <defs>
                                        <linearGradient id="colorInc" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff05" />
                                    <XAxis
                                        dataKey="name"
                                        tick={{ fontSize: 10, fill: '#64748b' }}
                                        minTickGap={30}
                                        tickFormatter={(str) => {
                                            const parts = str.split('-');
                                            return timeRange === 'year' ? `${parts[0].substring(2)}/${parts[1]}` : `${parts[1]}/${parts[2]}`;
                                        }}
                                    />
                                    <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${(v / 10000).toFixed(0)} 만`} />
                                    <RechartsTooltip
                                        contentStyle={{
                                            backgroundColor: '#111827',
                                            border: '1px solid rgba(255,255,255,0.1)',
                                            borderRadius: '1.25rem',
                                            padding: '16px'
                                        }}
                                        itemStyle={{ fontSize: '13px', fontWeight: '900' }}
                                        labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '8px', fontWeight: 'bold' }}
                                        formatter={(value: any, name?: string) => [`${(Number(value) || 0).toLocaleString()} 원`, name || '']}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="income"
                                        name="유입"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        fill="url(#colorInc)"
                                        fillOpacity={1}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="expense"
                                        name="유출"
                                        stroke="#ef4444"
                                        strokeWidth={3}
                                        fill="url(#colorExp)"
                                        fillOpacity={1}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="trend"
                                        name="매출 추세 (30일 평균)"
                                        stroke="#6366f1"
                                        strokeDasharray="5 5"
                                        strokeWidth={2}
                                        fill="none"
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div className="xl:col-span-1 h-[480px]">
                    <ClosingInsightWidget
                        latestRecord={latestRecord}
                        latestPeriod={latestPeriod}
                        onNavigate={setTab}
                    />
                </div>
            </div>

            <div className="h-[450px]">
                <RecentTransactions
                    transactions={ledger.filter(e => systemNow ? e.date <= systemNow : true)}
                    onNavigate={setTab}
                />
            </div>
        </div >
    );
};
