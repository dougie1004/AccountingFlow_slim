import React, { useState, useEffect } from 'react';
import { Settings2, ArrowRight, CheckCircle2, AlertCircle, X, Columns, CreditCard, Loader2, Zap } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface DataMapperProps {
    fileName: string;
    headers: string[];
    initialMapping: Record<string, string>;
    onConfirm: (mapping: Record<string, string>) => void;
    onCancel: () => void;
    error: string | null;
    isProcessing: boolean;
}

const STANDARD_FIELDS = [
    { key: 'tx_date', label: '거래 날짜 (Date)', info: 'YYYY-MM-DD 형식이 권장됩니다.', required: true },
    { key: 'vendor', label: '거래처명 (Vendor)', info: '가맹점이나 상호명이 들어갑니다.', required: false },
    { key: 'description', label: '거래 내용 (Description)', info: '적요 또는 품명으로 사용됩니다.', required: false },
    { key: 'amount', label: '금액 (Amount)', info: '숫자 형식만 지원합니다.', required: true },
    { key: 'payment_type', label: '결제 수단 (Payment)', info: '카드/현금/계좌이체 등', required: false },
];

export const DataMapper: React.FC<DataMapperProps> = ({ fileName, headers: rawHeaders, initialMapping, onConfirm, onCancel, error, isProcessing }) => {
    // Apply splitting
    const headers = React.useMemo(() => {
        let processed = rawHeaders.map(h => {
            let val = h.trim();
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.substring(1, val.length - 1).trim();
            }
            return val;
        });

        if (processed.length === 1 && processed[0].includes(',')) {
            return processed[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        }
        return processed;
    }, [rawHeaders]);
    // We want a mapping of StandardField -> HeaderName
    const [fieldToHeader, setFieldToHeader] = useState<Record<string, string>>({});
    const [bankPresets, setBankPresets] = useState<any[]>([]);
    const [selectedPreset, setSelectedPreset] = useState<string>("");

    useEffect(() => {
        const fetchPresets = async () => {
            try {
                const presets = await invoke<any[]>('get_bank_presets');
                setBankPresets(presets);
            } catch (err) {
                console.error("Failed to fetch presets", err);
            }
        };
        fetchPresets();
    }, []);

    useEffect(() => {
        // Convert initialMapping (Header -> Standard) to (Standard -> Header)
        const reversed: Record<string, string> = {};
        Object.entries(initialMapping).forEach(([header, standard]) => {
            reversed[standard] = header;
        });
        setFieldToHeader(reversed);
    }, [initialMapping]);

    const applyPreset = (presetName: string) => {
        const preset = bankPresets.find(p => p.name === presetName);
        if (!preset) return;

        const reversed: Record<string, string> = {};
        Object.entries(preset.mapping as Record<string, string>).forEach(([header, standard]) => {
            // Only apply if the header exists in our current file
            if (headers.includes(header)) {
                reversed[standard] = header;
            }
        });
        setFieldToHeader(prev => ({ ...prev, ...reversed }));
        setSelectedPreset(presetName);
    };

    const isMissingRequired = STANDARD_FIELDS.filter(f => f.required).some(f => !fieldToHeader[f.key]);

    const handleConfirm = () => {
        if (isMissingRequired) {
            // This error message will be handled by the parent component if `error` prop is used.
            // For now, we'll use an alert as per the original structure.
            alert('필수 권고 항목(날짜, 금액)이 매핑되지 않았습니다. 데이터를 인식할 수 없습니다.');
            return;
        }

        // Convert back to (Header -> Standard) for backend
        const result: Record<string, string> = {};
        Object.entries(fieldToHeader).forEach(([standard, header]) => {
            if (header) result[header] = standard;
        });
        onConfirm(result);
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-[#030712]/80 backdrop-blur-xl animate-in fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            <div
                className="w-full max-w-4xl bg-[#111827] border border-white/10 rounded-[2.5rem] shadow-2xl shadow-black overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Columns className="text-white" size={24} />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">AI 컬럼 매핑 (AI Data Mapper)</h2>
                            <p className="text-slate-400 text-sm font-bold flex items-center gap-2 mt-0.5">
                                <span className="text-indigo-400">{fileName}</span> 분석을 위한 데이터 구조를 확인합니다.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onCancel();
                        }}
                        className="p-2 hover:bg-white/5 rounded-xl transition-colors text-slate-500 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    <div className="bg-indigo-500/5 border border-indigo-500/20 p-6 rounded-3xl flex flex-col gap-5">
                        <div className="flex items-start gap-3">
                            <AlertCircle className="text-indigo-400 shrink-0 mt-0.5" size={18} />
                            <p className="text-[13px] text-slate-300 font-medium leading-relaxed">
                                시스템이 파일의 헤더를 분석하여 최적의 매핑을 제안했습니다. <br />
                                <span className="text-white font-black">금융기관별 전용 프리셋을 선택하면 더 정확하게 매핑됩니다.</span>
                            </p>
                        </div>

                        <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest shrink-0">금융사 전용 프리셋 (Financial Presets)</span>
                            <div className="flex-1 grid grid-cols-3 gap-2">
                                {bankPresets.map(p => (
                                    <button
                                        key={p.name}
                                        onClick={(e) => { e.preventDefault(); applyPreset(p.name); }}
                                        className={`px-4 py-2 text-[10px] font-black rounded-xl border transition-all ${selectedPreset === p.name ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'}`}
                                    >
                                        {p.name.split(' ')[0]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {STANDARD_FIELDS.map((field) => (
                            <div key={field.key} className="group flex items-center gap-6 p-6 bg-white/[0.02] border border-white/5 rounded-3xl hover:border-indigo-500/30 transition-all hover:bg-white/[0.04]">
                                <div className="w-48 shrink-0">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h4 className="text-white font-black text-lg">
                                                {field.label}
                                                {field.required && <span className="text-rose-500 ml-1">*</span>}
                                            </h4>
                                            <p className="text-xs font-bold text-slate-500 mt-1">{field.info}</p>
                                        </div>
                                        {fieldToHeader[field.key] ? (
                                            <div className="p-1 px-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                                <CheckCircle2 size={16} />
                                            </div>
                                        ) : (
                                            field.required && <div className="p-1 px-2 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-tighter">Required</div>
                                        )}
                                    </div>
                                </div>

                                <ArrowRight className="text-slate-700" size={20} />

                                <div className="flex-1">
                                    <select
                                        value={fieldToHeader[field.key] || ""}
                                        onChange={(e) => setFieldToHeader({ ...fieldToHeader, [field.key]: e.target.value })}
                                        className="w-full px-5 py-3.5 bg-[#0B1221] border border-white/10 rounded-2xl text-sm font-bold text-white focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="">-- 컬럼 선택 --</option>
                                        {headers.map(h => (
                                            <option key={h} value={h}>{h}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-3xl flex items-start gap-3 animate-in shake duration-300">
                            <AlertCircle className="text-rose-400 shrink-0 mt-0.5" size={18} />
                            <div className="text-[13px] text-rose-300 font-medium">
                                <span className="text-white font-black block mb-1">분석 중 오류가 발생했습니다</span>
                                {error}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 bg-white/[0.01] flex items-center justify-between">
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isProcessing) onCancel();
                        }}
                        disabled={isProcessing}
                        className="px-8 py-4 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl font-black text-sm transition-all disabled:opacity-50"
                    >
                        취소하고 다시 선택
                    </button>
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            if (!isProcessing) handleConfirm();
                        }}
                        disabled={isProcessing || headers.length === 0 || isMissingRequired}
                        className="px-10 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-sm transition-all shadow-xl shadow-indigo-600/20 active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>데이터 분석 및 변환 중...</span>
                            </>
                        ) : (
                            <>
                                <Zap size={20} />
                                <span>{isMissingRequired ? '필수 항목 매핑 필요' : '매핑 적용 및 분석 시작'}</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
