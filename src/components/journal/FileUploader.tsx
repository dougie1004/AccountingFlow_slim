import React, { useRef, useState } from 'react';
import { Upload, FileUp, Loader2, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { ParsedTransaction } from '../../types';
import { useAI } from '../../hooks/useAI';
import * as XLSX from 'xlsx';
import { DataMapper } from './DataMapper';

interface FileUploaderProps {
    onTransactionsLoaded: (transactions: ParsedTransaction[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onTransactionsLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { batchParseTransactions } = useAI();

    // Mapping State
    const [mapperOpen, setMapperOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ bytes: number[], name: string, headers: string[], initialMapping: Record<string, string> } | null>(null);
    const [isMappingProgress, setIsMappingProgress] = useState(false);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        try {
            let allParsed: ParsedTransaction[] = [];

            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);

                // Check if running in Tauri environment (Desktop App)
                if (!(window as any).__TAURI_INTERNALS__) {
                    console.warn(`Web environment: Parsing ${file.name} and calling real AI analysis...`);

                    // Parse Excel/CSV using xlsx
                    const workbook = XLSX.read(bytes, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

                    // Convert rows to strings for AI analysis (take first 50 rows to avoid context limits)
                    const rowsToAnalyze = rawData.slice(0, 50).map(row => row.join(' ')).filter(r => r.trim().length > 0);

                    if (rowsToAnalyze.length === 0) {
                        console.warn(`File ${file.name} is empty or unparseable`);
                        continue;
                    }

                    const results = await batchParseTransactions(rowsToAnalyze, "Standard SME Policy");

                    const parsedTransactions = results
                        .map(r => r.transaction)
                        .filter((tx): tx is ParsedTransaction => !!tx);

                    allParsed = [...allParsed, ...parsedTransactions];
                } else {
                    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                    const isStructured = ['.csv', '.xlsx', '.xls', '.tsv'].includes(ext);

                    if (isStructured) {
                        try {
                            const headers = await invoke<string[]>('get_file_headers', {
                                fileBytes: Array.from(bytes),
                                fileName: file.name
                            });
                            const initialMapping = await invoke<Record<string, string>>('suggest_file_mapping', { headers });

                            // Stop multi-file loop for now if we need manual mapping
                            // (In production, you'd queue them)
                            setPendingFile({ bytes: Array.from(bytes), name: file.name, headers, initialMapping });
                            setMapperOpen(true);
                            setIsUploading(false);
                            return; // Wait for user interaction
                        } catch (err) {
                            console.warn("Structured parsing failed, falling back to AI:", err);
                        }
                    }

                    // Universal Ingestion via AI (Fallthrough for unstructured or failed structured)
                    const results = await invoke<ParsedTransaction[]>('process_universal_file', {
                        fileBytes: Array.from(bytes),
                        fileName: file.name
                    });

                    if (results && results.length > 0) {
                        allParsed = [...allParsed, ...results];
                    }
                }
            }

            if (allParsed.length === 0) {
                throw new Error('데이터 분석에 실패했습니다. 파일 형식을 확인하거나 데이터가 포함되어 있는지 확인해 주세요.');
            }

            onTransactionsLoaded(allParsed);
        } catch (err: any) {
            console.error('Upload Error:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleMappingConfirm = async (mapping: Record<string, string>) => {
        if (!pendingFile) return;
        setIsMappingProgress(true);
        try {
            const results = await invoke<ParsedTransaction[]>('process_file_with_mapping', {
                fileBytes: pendingFile.bytes,
                fileName: pendingFile.name,
                mapping
            });

            if (results.length === 0) {
                throw new Error("변환된 데이터가 없습니다. 날짜와 금액 컬럼이 올바르게 매핑되었는지, 또는 데이터 포맷이 맞는지 확인해주세요.");
            }

            onTransactionsLoaded(results);
            setMapperOpen(false);
            setPendingFile(null);
        } catch (err: any) {
            console.error("Mapping Error:", err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsMappingProgress(false);
        }
    };

    return (
        <div className="relative">
            {mapperOpen && pendingFile && (
                <DataMapper
                    fileName={pendingFile.name}
                    headers={pendingFile.headers}
                    initialMapping={pendingFile.initialMapping}
                    onConfirm={handleMappingConfirm}
                    onCancel={() => { setMapperOpen(false); setPendingFile(null); }}
                    error={error}
                    isProcessing={isMappingProgress}
                />
            )}

            <div
                className={`professional-card p-12 flex flex-col items-center justify-center text-center gap-4 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : 'hover:border-indigo-500/50 cursor-pointer'}`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx, .xls, .csv, .pdf, .jpg, .jpeg, .png, .docx, .pptx, .hwp"
                    multiple
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
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-500 border border-white/5 uppercase tracking-widest">G/L Integration</span>
                        <span className="px-3 py-1 bg-white/5 rounded-full text-[10px] font-black text-slate-500 border border-white/5 uppercase tracking-widest">Image/PDF Parsing</span>
                    </div>
                )}
            </div>
        </div>
    );
};
