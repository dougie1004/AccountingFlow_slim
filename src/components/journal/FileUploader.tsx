import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, FileUp, AlertTriangle } from 'lucide-react';
import { useAccounting } from '../../hooks/useAccounting';
import { invoke } from '@tauri-apps/api/core';
import { ParsedTransaction } from '../../types';
import * as XLSX from 'xlsx';
import { DataMapper } from './DataMapper';

interface FileUploaderProps {
    onTransactionsLoaded: (transactions: ParsedTransaction[]) => void;
    onExcelDetected?: (file: File) => void;
}

const compressImage = async (file: File): Promise<Uint8Array> => {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200; // Even smaller for speed
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_HEIGHT) {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                canvas.toBlob((blob) => {
                    if (!blob) {
                        file.arrayBuffer().then(buf => resolve(new Uint8Array(buf)));
                        return;
                    }
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
                    reader.readAsArrayBuffer(blob);
                }, 'image/jpeg', 0.8);
            };
        };
    });
};

export const FileUploader: React.FC<FileUploaderProps> = ({ onTransactionsLoaded, onExcelDetected }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mapperOpen, setMapperOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ bytes: Uint8Array, name: string, headers: string[], initialMapping: Record<string, string> } | null>(null);
    const [isMappingProgress, setIsMappingProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { config } = useAccounting();

    const processFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        let contextString = "";
        let transactionFiles: File[] = [];
        let bulkFiles: File[] = [];

        // 1. First Pass: Identify Context & Sort
        for (const file of files) {
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

            if (['.docx', '.txt', '.pdf'].includes(ext)) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const bytes = new Uint8Array(arrayBuffer);
                    const text = await invoke<string>('process_audit_context', {
                        fileBytes: bytes, // No Array.from
                        fileName: file.name
                    });
                    contextString += `\n[Document: ${file.name}]\n${text}\n`;
                    transactionFiles.push(file);
                } catch (e) {
                    console.error("Context extraction failed:", e);
                }
            } else if (['.csv', '.xlsx', '.xls', '.tsv'].includes(ext)) {
                bulkFiles.push(file);
            } else {
                transactionFiles.push(file);
            }
        }

        try {
            const allAiResults: ParsedTransaction[] = [];

            // 2. Sequential Processing (More stable, hits fewer API limits)
            for (const file of transactionFiles) {
                try {
                    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);
                    const isContextCandidate = ['.docx', '.txt', '.pdf'].includes(ext);

                    let bytes: Uint8Array;
                    if (isImage) {
                        bytes = await compressImage(file);
                    } else {
                        const buf = await file.arrayBuffer();
                        bytes = new Uint8Array(buf);
                    }

                    // Extract Context if needed
                    if (isContextCandidate) {
                        try {
                            const text = await invoke<string>('process_audit_context', {
                                fileBytes: bytes,
                                fileName: file.name
                            });
                            contextString += `\n[Doc: ${file.name}]\n${text}\n`;
                        } catch (e) {
                            console.warn("Context extraction failed for", file.name, e);
                        }
                    }

                    // AI Extraction
                    console.log(`Analyzing ${file.name} (${(bytes.length / 1024).toFixed(1)} KB) with AI...`);
                    const apiResults = await invoke<ParsedTransaction[]>('process_universal_file', {
                        fileBytes: bytes,
                        fileName: file.name
                    });

                    if (apiResults && apiResults.length > 0) {
                        if (isImage) {
                            // Fix: Use bytes.buffer for Blob to ensure correct binary format
                            const blob = new Blob([bytes.buffer as any], { type: 'image/jpeg' });
                            const attachmentUrl = URL.createObjectURL(blob);
                            apiResults.forEach(tx => { tx.attachmentUrl = attachmentUrl; });
                        }
                        allAiResults.push(...apiResults);
                    }
                } catch (beErr) {
                    console.error(`Analysis failed for ${file.name}:`, beErr);
                    // Single file failure shouldn't stop the whole process, but we log it
                }
            }

            let auditedResults = [...allAiResults];

            // 3. AI Audit Cross-Check
            if (auditedResults.length > 0 && contextString.trim().length > 0) {
                try {
                    auditedResults = await invoke<ParsedTransaction[]>('perform_audit_check', {
                        transactions: auditedResults,
                        context: contextString
                    });
                } catch (auditErr) {
                    console.error("Audit Check Failed:", auditErr);
                }
            }

            // 4. Commit Results
            if (auditedResults.length > 0) {
                const finalResults = auditedResults.map((r: ParsedTransaction) => ({ ...r, originalAmount: r.amount }));
                onTransactionsLoaded(finalResults);
            } else if (bulkFiles.length === 0) {
                setError("분석된 거래 내역이 없습니다. 파일 형식을 확인해주세요.");
            }

            // 5. Bulk File Routing
            if (bulkFiles.length > 0 && onExcelDetected) {
                onExcelDetected(bulkFiles[0]);
            }
        } catch (err) {
            console.error("General processing error:", err);
            setError("파일 처리 중 오류가 발생했습니다.");
        } finally {
            setIsUploading(false);
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
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400 animate-pulse">
                            <Loader2 size={40} className="animate-spin" />
                        </div>
                        <p className="text-sm font-bold text-indigo-400">AI가 전표 및 이미지 증빙을 분석 중입니다...</p>
                    </div>
                ) : (
                    <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400">
                        <FileUp size={40} />
                    </div>
                )}

                <div>
                    <h3 className="text-xl font-black text-white tracking-tight">
                        {isDragging ? '파일을 여기에 놓으세요!' : '스마트 증빙 및 데이터 거래 업로드'}
                    </h3>
                    <p className="text-slate-400 font-bold mt-1 text-sm">
                        {isDragging ? '드래그 앤 드롭으로 파일 업로드' : '카드 엑셀, 통장 내역, 영수증 사진, PDF 등 어떤 형식이든 분석합니다.'}
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
