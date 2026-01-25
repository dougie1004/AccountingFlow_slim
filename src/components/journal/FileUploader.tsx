import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, FileUp, AlertTriangle } from 'lucide-react';
import { useAccounting } from '../../hooks/useAccounting';
import { invoke } from '@tauri-apps/api/core';
import { ParsedTransaction } from '../../types';
import * as XLSX from 'xlsx';
import { DataMapper } from './DataMapper';

interface FileUploaderProps {
    onTransactionsLoaded: (transactions: ParsedTransaction[]) => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onTransactionsLoaded }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mapperOpen, setMapperOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ bytes: number[], name: string, headers: string[], initialMapping: Record<string, string> } | null>(null);
    const [isMappingProgress, setIsMappingProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { config } = useAccounting();

    const processFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);
        let allParsed: ParsedTransaction[] = [];

        try {
            for (const file of files) {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                const isStructured = ['.csv', '.xlsx', '.xls', '.tsv'].includes(ext);

                if (isStructured) {
                    try {
                        const headers = await invoke<string[]>('get_file_headers', {
                            fileBytes: Array.from(bytes),
                            fileName: file.name
                        });
                        const initialMapping = await invoke<Record<string, string>>('suggest_file_mapping', { headers });

                        // For structured files, we currently only support one at a time via mapper
                        setPendingFile({ bytes: Array.from(bytes), name: file.name, headers, initialMapping });
                        setMapperOpen(true);
                        setIsUploading(false); // Stop generic spinner, wait for mapper
                        return;
                    } catch (err) {
                        console.warn("Structured parsing failed, falling back to AI:", err);
                    }
                }

                // AI Processing (Unstructured or Fallback)
                const results = await invoke<ParsedTransaction[]>('process_universal_file', {
                    fileBytes: Array.from(bytes),
                    fileName: file.name
                });

                if (results && results.length > 0) {
                    // 1. Image Preview Logic
                    const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext);
                    if (isImage) {
                        const blob = new Blob([bytes], { type: file.type });
                        const attachmentUrl = URL.createObjectURL(blob);
                        results.forEach(tx => {
                            (tx as any).attachmentUrl = attachmentUrl;
                        });
                    }

                    // 2. Validation Logic (Filter out non-transaction documents)
                    // We define a valid transaction as having an amount > 1 (to ignore garbage or tiny values)
                    // and some description.
                    const validResults = results.filter(r => Number(r.amount) > 1);
                    const invalidCount = results.length - validResults.length;

                    if (invalidCount > 0) {
                        const sampleInvalid = results.find(r => Number(r.amount) <= 1);
                        const textPreview = sampleInvalid?.description?.substring(0, 60) + (sampleInvalid?.description && sampleInvalid.description.length > 60 ? '...' : '');

                        // We use a safe notification approach
                        console.warn('Invalid transaction data detected and filtered:', sampleInvalid);

                        window.alert(
                            `[인공지능 보안 알림] 🛡️\n\n` +
                            `회계 증빙이 아닌 것으로 데이터 ${invalidCount}건이 감지되어 자동 차단되었습니다.\n\n` +
                            `내용 요약: "${textPreview || '내용 없음'}"\n\n` +
                            `사유: 금액 정보가 없거나(0원) 일반 문서/이미지일 가능성이 큽니다.\n` +
                            `부정확한 데이터가 장부에 섞이는 것을 방지하기 위해 해당 항목을 제외했습니다.`
                        );
                    }

                    if (validResults.length > 0) {
                        const resultsWithOriginal = validResults.map(r => ({
                            ...r,
                            originalAmount: r.amount // Set the ground truth for integrity checks
                        }));
                        allParsed = [...allParsed, ...resultsWithOriginal];
                    }
                }
            }

            if (allParsed.length === 0 && !mapperOpen) {
                // If mapper is open, we don't throw error yet
                if (!pendingFile) {
                    throw new Error('데이터 분석에 실패했습니다. 파일 형식을 확인하거나 데이터가 포함되어 있는지 확인해 주세요.');
                }
            } else if (allParsed.length > 0) {
                onTransactionsLoaded(allParsed);
            }

        } catch (err: any) {
            console.error('Upload Error:', err);
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            if (!pendingFile) {
                setIsUploading(false);
            }
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
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        await processFiles(files);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    };

    return (
        <div className="relative">
            {mapperOpen && pendingFile && (
                <DataMapper
                    fileName={pendingFile.name}
                    headers={pendingFile.headers}
                    initialMapping={pendingFile.initialMapping}
                    onConfirm={handleMappingConfirm}
                    onCancel={() => {
                        setMapperOpen(false);
                        setPendingFile(null);
                        setIsUploading(false);
                    }}
                    error={error}
                    isProcessing={isMappingProgress}
                />
            )}

            <div
                className={`professional-card p-12 flex flex-col items-center justify-center text-center gap-4 transition-all ${isUploading ? 'opacity-50 pointer-events-none' :
                    isDragging ? 'border-indigo-500 bg-indigo-500/10 scale-105' :
                        'hover:border-indigo-500/50 cursor-pointer'
                    }`}
                onClick={() => !isUploading && fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.docx,.pptx,.hwp"
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
                    <h3 className="text-xl font-black text-white tracking-tight">
                        {isDragging ? '파일을 여기에 놓으세요!' : '통합 데이터 입력 엔진 (Universal Ingestion)'}
                    </h3>
                    <p className="text-slate-400 font-bold mt-1">
                        {isDragging ? '드래그 앤 드롭으로 파일 업로드' : 'CSV, Excel, 영수증 사진, PDF 등 모든 형식을 AI가 자동으로 분석합니다.'}
                    </p>
                </div>

                {error && (
                    <div className="mt-4 flex items-center gap-2 text-rose-400 bg-rose-400/10 px-4 py-2 rounded-xl text-xs font-bold border border-rose-400/20">
                        <AlertTriangle size={14} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );
};
