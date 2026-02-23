
import React, { useEffect } from 'react';
import { useAccounting } from '../../hooks/useAccounting';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { ConstitutionMonitor } from '../../constitution/ConstitutionMonitor';

/**
 * 🛡️ [PHASE 11] INTEGRITY GUARD (Numerical Auditor)
 * 
 * Fundamental Policy: "Architecture-Level Distrust"
 * This component runs in the background and cross-references metrics 
 * from different calculation engines (Trial balance vs Forecast vs Budget).
 * If a deviation is detected, it alerts the AI and the user.
 */
export const IntegrityGuard: React.FC = () => {
    const { financials, getForecast, systemNow, ledger } = useAccounting();
    const monitor = ConstitutionMonitor.getInstance();

    useEffect(() => {
        if (!systemNow || ledger.length === 0) return;

        // 1. Starting Balance Consistency Check
        const forecast = getForecast(systemNow);
        const startCashFromForecast = forecast.projectedBalance - forecast.netCashFlow;
        const currentCashFromDashboard = financials.cash;

        const diff = Math.abs(startCashFromForecast - currentCashFromDashboard);

        if (diff > 1) { // 1 KRW tolerance for rounding
            monitor.recordViolation(
                'NUMERICAL_DIVERGENCE',
                `Dashboard Cash (₩${currentCashFromDashboard.toLocaleString()}) differs from Forecast Start (₩${startCashFromForecast.toLocaleString()}) by ₩${diff.toLocaleString()}`
            );
        }

        // 2. Net Income Integrity (Trial Balance vs Accumulated Ledger)
        // (Optional: can add more cross-checks here)

    }, [financials, getForecast, systemNow, ledger.length]);

    const stats = monitor.getStats();
    const activeViolations = stats.violations.filter(v => v.level !== 'WARNING' || v.count > 1);

    if (activeViolations.length === 0) return null;

    return (
        <div className="fixed bottom-6 right-6 z-[9999] animate-in slide-in-from-right duration-500">
            <div className="bg-rose-950/90 border border-rose-500/50 backdrop-blur-xl p-4 rounded-2xl shadow-2xl max-w-sm">
                <div className="flex items-start gap-4">
                    <div className="p-2 bg-rose-500/20 rounded-xl">
                        <AlertCircle className="text-rose-400" size={24} />
                    </div>
                    <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-tighter">시스템 데이터 부정합 감지</h4>
                        <p className="text-[10px] text-rose-200 mt-1 font-bold leading-tight">
                            현재 대시보드와 AI 시뮬레이터 간의 수치가 일치하지 않습니다. (무결성 훼손)
                        </p>
                        <div className="mt-3 space-y-2">
                            {activeViolations.map((v, i) => (
                                <div key={i} className="text-[9px] text-rose-300 bg-white/5 p-2 rounded-lg border border-white/5">
                                    {v.detail}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 w-full py-2 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-black rounded-lg transition-colors"
                        >
                            데이터 엔진 강제 동기화 (Reload)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
