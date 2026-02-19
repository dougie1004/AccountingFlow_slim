import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, ShieldAlert, Lock } from 'lucide-react';

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
                <div className="fixed inset-0 z-[9999] bg-rose-950 flex items-center justify-center p-6 overflow-hidden">
                    <div className="max-w-2xl w-full bg-black/40 border-2 border-rose-500 rounded-[3rem] p-12 text-center shadow-[0_0_100px_rgba(244,63,94,0.3)] backdrop-blur-3xl animate-in zoom-in-95 duration-500">
                        <div className="w-24 h-24 bg-rose-500 rounded-full flex items-center justify-center mx-auto mb-8 animate-pulse shadow-[0_0_40px_rgba(244,63,94,0.5)]">
                            {isViolation ? <Lock size={48} className="text-white" /> : <AlertTriangle size={48} className="text-white" />}
                        </div>

                        <h1 className="text-4xl font-black text-white mb-4 tracking-tighter uppercase">
                            {isViolation ? 'Accounting Constitution Violation' : 'System Error'}
                        </h1>

                        <div className="h-px w-32 bg-rose-500/50 mx-auto mb-8" />

                        <p className="text-rose-200 text-xl font-bold leading-relaxed mb-6">
                            {isViolation
                                ? '회계 정합성 오류가 감지되었습니다. 데이터 무결성을 위해 일시적으로 출력이 차단되었습니다.'
                                : '시스템에 예상치 못한 문제가 발생했습니다.'}
                        </p>

                        <div className="bg-rose-900/40 rounded-2xl p-6 border border-rose-500/30 mb-8 overflow-x-auto text-left">
                            <p className="text-rose-400 text-xs uppercase font-bold mb-2">Technical Insight:</p>
                            <code className="text-rose-300 font-mono text-sm break-all">
                                {this.state.error?.message}
                            </code>
                        </div>

                        <div className="flex flex-col gap-4 max-w-xs mx-auto">
                            <button
                                onClick={() => {
                                    localStorage.removeItem('accounting_ledger');
                                    window.location.reload();
                                }}
                                className="px-8 py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3"
                            >
                                <ShieldAlert size={20} />
                                데이터 초기화 후 점검
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="text-rose-400 hover:text-rose-200 text-sm font-medium transition-colors"
                            >
                                단순 새로고침 시도
                            </button>
                        </div>

                        <p className="mt-8 text-rose-500/50 text-[10px] uppercase font-black tracking-widest">
                            Security Protocol Level 5 Active • Article 5: Fail-Fast Policy
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
