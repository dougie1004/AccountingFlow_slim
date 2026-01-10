import React, { useRef, useState } from 'react';
import { Upload, FileUp, Loader2, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ParsedTransaction } from '../../types';

interface FileUploaderProps {
    onTransactionsLoaded: (transactions: ParsedTransaction[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onTransactionsLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setError(null);

        try {
            const arrayBuffer = await file.arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);

            // Check if running in Tauri environment (Desktop App)
            if (!(window as any).__TAURI_INTERNALS__) {
                console.warn('Web environment detected. Simulating bulk upload for preview...');
                await new Promise(r => setTimeout(r, 1500));

                const { generateMockBatch, simulateAIParsing } = await import('../../utils/mockDataGenerator');
                const raw = generateMockBatch().slice(0, 5);
                const mockResults = raw.map(r => {
                    const parsed = simulateAIParsing(r);
                    return {
                        ...parsed,
                        entryType: parsed.type,
                        reasoning: 'Web Preview: Universal Ingestion Simulation'
                    };
                });
                onTransactionsLoaded(mockResults as any);
                return;
            }

            // Universal Ingestion via Rust Backend (Desktop Only)
            const results = await invoke<ParsedTransaction[]>('process_universal_file', {
                fileBytes: Array.from(bytes),
                fileName: file.name
            });

            onTransactionsLoaded(results);
        } catch (err) {
            console.error('Upload Error:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div
            className={`professional-card p-12 flex flex-col items-center justify-center text-center gap-4 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-500/50 cursor-pointer'}`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
        >
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv, .pdf, .jpg, .jpeg, .png, .docx, .pptx"
                onChange={handleFileUpload}
            />

            {isUploading ? (
                <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400 animate-pulse">
                    <Loader2 size={40} className="animate-spin" />
                </div>
            ) : (
                <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400">
                    <FileUp size={40} />
                </div>
            )}

            <div>
                <h3 className="text-xl font-black text-white tracking-tight">대량 데이터 통합 엔진 (Bulk Data Ingestion)</h3>
                <p className="text-slate-400 font-bold mt-1">Excel, CSV 등 대량의 거래 내역 파일을 전표로 일괄 변환합니다.</p>
            </div>

            {error && (
                <div className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-400/10 px-4 py-2 rounded-xl text-xs font-bold border border-rose-400/20">
                    <AlertCircle size={14} />
                    {error}
                </div>
            )}

            {!isUploading && (
                <div className="mt-4 flex gap-2">
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-500 border border-white/5">STRUCTURED DAATA</span>
                    <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-500 border border-white/5">AI OCR VISION</span>
                </div>
            )}
        </div>
    );
};
