import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, Lock, X, History } from 'lucide-react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ConstitutionErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('[CONSTITUTION VIOLATION DETECTED]', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            const isViolation = this.state.error?.message.includes('[CONSTITUTION VIOLATION]');

            return (
                <div className="fixed inset-0 z-[9999] bg-[#070C11] flex items-center justify-center p-6 sm:p-12 overflow-hidden font-sans">
                    {/* Abstract background elements */}
                    <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />

                    <div className="max-w-xl w-full bg-[#151D2E]/40 border border-white/10 rounded-[3.5rem] p-10 sm:p-16 text-center shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-700 relative overflow-hidden">
                        {/* Status Glow */}
                        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent ${isViolation ? 'via-rose-500' : 'via-indigo-500'} to-transparent opacity-50`} />

                        <div className={`w-20 h-20 ${isViolation ? 'bg-rose-500/20 text-rose-400' : 'bg-indigo-500/20 text-indigo-400'} rounded-3xl flex items-center justify-center mx-auto mb-10 border border-current transition-all duration-500`}>
                            {isViolation ? <ShieldAlert size={40} /> : <AlertTriangle size={40} />}
                        </div>

                        <h1 className="text-3xl font-black text-white mb-4 tracking-tight">
                            {isViolation ? '검증 알림 (Validation)' : '잠시 문제가 발생했습니다'}
                        </h1>

                        <p className="text-slate-400 text-lg font-medium leading-relaxed mb-10 px-4">
                            {isViolation
                                ? '데이터 입력 중 품질 규칙 위반이 감지되었습니다. 원활한 처리를 위해 잠시 시스템이 보호 모드로 전환되었습니다.'
                                : '페이지를 처리하는 중에 예상치 못한 기술적 이슈가 발생했습니다. 걱정 마세요, 데이터는 안전합니다.'}
                        </p>

                        <div className="bg-black/20 rounded-[2rem] p-6 border border-white/5 mb-11 text-left">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                <span className="text-slate-500 text-[10px] uppercase font-black tracking-widest">System Log</span>
                            </div>
                            <code className="text-slate-300 font-mono text-xs break-all leading-relaxed whitespace-pre-wrap">
                                {this.state.error?.message || 'Unknown internal error'}
                            </code>
                        </div>

                        <div className="flex flex-col gap-4 max-w-[280px] mx-auto">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2"
                            >
                                <X size={18} />
                                다시 시도하기
                            </button>

                            <button
                                onClick={() => {
                                    const keys = [
                                        'accounting_ledger', 'accounting_partners', 'accounting_assets',
                                        'accounting_leases', 'accounting_config', 'accounting_custom_accounts',
                                        'accounting_mapping_rules', 'accounting_periods', 'accounting_closing_records',
                                        'accounting_budgets', 'accounting_risk_decisions', 'accounting_liabilities',
                                        'accounting_simulation_mode', 'accounting_active_scenario', 'accounting_candidate_ledger',
                                        'dash_view_date'
                                    ];
                                    if (window.confirm('정말로 모든 데이터를 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
                                        keys.forEach(k => localStorage.removeItem(k));
                                        window.location.reload();
                                    }
                                }}
                                className="w-full py-3 text-slate-500 hover:text-rose-400 text-xs font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                            >
                                <History size={14} />
                                데이터 완전 초기화
                            </button>
                        </div>

                        <div className="mt-14 flex items-center justify-center gap-4 opacity-30">
                            <div className="h-px w-8 bg-slate-500" />
                            <span className="text-[9px] text-slate-500 font-black tracking-[0.2em] uppercase">Security Level 3 • Article 5</span>
                            <div className="h-px w-8 bg-slate-500" />
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
