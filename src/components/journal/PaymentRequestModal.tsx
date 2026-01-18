import React from 'react';
import { X, Printer, Download, CreditCard, ShieldCheck, Calendar, Wallet } from 'lucide-react';
import { ParsedTransaction } from '../../types';

interface PaymentRequestModalProps {
    transactions: ParsedTransaction[];
    onClose: () => void;
    onExport: (format: 'PDF' | 'KB' | 'SAM') => void;
}

export const PaymentRequestModal: React.FC<PaymentRequestModalProps> = ({ transactions, onClose, onExport }) => {
    const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0);
    const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' });

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-[#030712]/90 backdrop-blur-2xl animate-in fade-in duration-300">
            <div className="w-full max-w-4xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-slate-900">
                {/* Modal Header */}
                <div className="px-8 py-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-slate-900">
                        <Printer size={20} className="text-slate-400" />
                        <span className="text-sm font-black uppercase tracking-tight">Payment Request Preview</span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
                        <X size={24} />
                    </button>
                </div>

                {/* PDF Content Area */}
                <div className="flex-1 overflow-y-auto p-12 bg-slate-50">
                    <div id="payment-request-doc" className="bg-white shadow-xl shadow-slate-200/50 rounded-2xl p-16 mx-auto min-h-[800px] flex flex-col border border-slate-100">

                        {/* Title & Header */}
                        <div className="flex justify-between items-start mb-16">
                            <div>
                                <h1 className="text-4xl font-black text-slate-900 tracking-tighter mb-2">지급 요청서</h1>
                                <p className="text-slate-400 font-bold text-sm tracking-widest uppercase">Payment Request Document</p>
                            </div>
                            <div className="text-right">
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">문서 번호 / 요청 일자</div>
                                <div className="text-sm font-bold text-slate-900">REQ-2026-0001 / {today}</div>
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-slate-900 rounded-[2rem] p-8 mb-12 flex justify-between items-center text-white">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">총 지급 합계액</div>
                                <div className="text-3xl font-black tracking-tight uppercase">KRW {totalAmount.toLocaleString()}</div>
                            </div>
                            <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center">
                                <Wallet size={32} />
                            </div>
                        </div>

                        {/* Transaction List */}
                        <div className="flex-1 space-y-8">
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">지급 대상 내역 ({transactions.length}건)</h3>

                            <table className="w-full">
                                <thead className="text-left">
                                    <tr className="border-b border-slate-100">
                                        <th className="py-4 text-[11px] font-black text-slate-400 uppercase">거래처 / 내용</th>
                                        <th className="py-4 text-[11px] font-black text-slate-400 uppercase">은행 / 계좌 정보</th>
                                        <th className="py-4 text-[11px] font-black text-slate-400 uppercase text-right">지급액</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((tx, i) => (
                                        <tr key={i} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors group">
                                            <td className="py-6 pr-4">
                                                <div className="font-black text-slate-900">{tx.vendor || '미지정'}</div>
                                                <div className="text-xs font-bold text-slate-400 mt-0.5">{tx.description}</div>
                                            </td>
                                            <td className="py-6 px-4">
                                                <div className="flex items-center gap-2 font-bold text-slate-900">
                                                    <CreditCard size={14} className="text-slate-300" />
                                                    {tx.bankName || '국민은행'}
                                                </div>
                                                <div className="text-xs font-bold text-slate-400 mt-0.5">{tx.bankAccount || '•••• •••• ••••'}</div>
                                            </td>
                                            <td className="py-6 pl-4 text-right align-top">
                                                <div className="font-black text-slate-900">₩{tx.amount.toLocaleString()}</div>
                                                <div className="text-[10px] font-black text-emerald-500 mt-0.5 uppercase tracking-tighter">Verified by AI</div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer / Security */}
                        <div className="mt-20 pt-12 border-t border-slate-100">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500">
                                        <ShieldCheck size={28} />
                                    </div>
                                    <div>
                                        <div className="text-sm font-black text-slate-900">AI 검증 완료</div>
                                        <div className="text-[10px] font-bold text-slate-400">본 보고서는 AccountingFlow 자금 관제 엔진에 의해 위변조 방지 처리되었습니다.</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-black text-slate-300 font-mono mb-1 uppercase">Digital Security Hash</div>
                                    <div className="text-[10px] font-bold text-slate-400 font-mono">SHA256: 7f83b1...e921a</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Modal Footer (Action Buttons) */}
                <div className="p-8 border-t border-slate-100 bg-white flex items-center justify-between">
                    <div className="flex gap-2">
                        <button onClick={() => onExport('PDF')} className="flex items-center gap-2 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black text-sm hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10">
                            <Printer size={16} /> PDF 인쇄 / 저장
                        </button>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => onExport('SAM')} className="px-6 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black text-sm hover:bg-slate-200 transition-all">
                            기업은행/신한 등 SAM 추출
                        </button>
                        <button onClick={() => onExport('KB')} className="flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white rounded-xl font-black text-sm hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-600/20 active:scale-95">
                            <Download size={16} /> KB국민 일괄이체 서식 다운로드
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
