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

export const FileUploader: React.FC<FileUploaderProps> = ({ onTransactionsLoaded, onExcelDetected }) => {
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

        let contextString = "";
        let transactionFiles: File[] = [];
        let bulkFiles: File[] = [];

        // 1. First Pass: Identify Context & Sort
        for (const file of files) {
            const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

            // Context Sources: Regulations, Drafts, Emails
            if (['.docx', '.txt', '.pdf'].includes(ext)) {
                try {
                    const arrayBuffer = await file.arrayBuffer();
                    const text = await invoke<string>('process_audit_context', {
                        fileBytes: Array.from(new Uint8Array(arrayBuffer)),
                        fileName: file.name
                    });
                    contextString += `\n[Document: ${file.name}]\n${text}\n`;

                    // Note: We ALSO treat these as potential 'transaction sources' (e.g. Draft -> Transaction)
                    // so we add them to transactionFiles too.
                    transactionFiles.push(file);
                } catch (e) {
                    console.error("Context extraction failed:", e);
                }
            } else if (['.csv', '.xlsx', '.xls', '.tsv'].includes(ext)) {
                bulkFiles.push(file);
            } else {
                // Images are pure transaction sources
                transactionFiles.push(file);
            }
        }

        let aiResults: ParsedTransaction[] = [];

        // 2. Process Transaction Files (Images, & Documents acting as source)
        for (const file of transactionFiles) {
            try {
                const arrayBuffer = await file.arrayBuffer();
                const bytes = new Uint8Array(arrayBuffer);
                const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();

                const results = await invoke<ParsedTransaction[]>('process_universal_file', {
                    fileBytes: Array.from(bytes),
                    fileName: file.name
                });

                if (results && results.length > 0) {
                    // Image Preview
                    if (['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(ext)) {
                        const blob = new Blob([bytes], { type: file.type });
                        const attachmentUrl = URL.createObjectURL(blob);
                        results.forEach(tx => { (tx as any).attachmentUrl = attachmentUrl; });
                    }
                    aiResults.push(...results);
                }
            } catch (e) {
                console.warn(`Skipping ${file.name} as transaction source:`, e);
            }
        }

        // 3. AI Audit Cross-Check (The Magic Step)
        if (aiResults.length > 0 && contextString.trim().length > 0) {
            try {
                const auditedResults = await invoke<ParsedTransaction[]>('perform_audit_check', {
                    transactions: aiResults,
                    context: contextString
                });
                aiResults = auditedResults;
            } catch (auditErr) {
                console.error("Audit Check Failed:", auditErr);
                // Fallback: use unaudited results
            }
        }

        // 4. Commit Results
        if (aiResults.length > 0) {
            // Apply originalAmount for integrity
            const finalResults = aiResults.map(r => ({ ...r, originalAmount: r.amount }));
            onTransactionsLoaded(finalResults);
        }

        // 5. Bulk File Routing
        if (bulkFiles.length > 0 && onExcelDetected) {
            // Limitation: We can't easily pass the 'contextString' to the Excel Mapper yet in this architecture.
            // But we have successfully audited the unstructured files!
            onExcelDetected(bulkFiles[0]);
            setIsUploading(false);
            return;
        }

        setIsUploading(false);
        if (aiResults.length === 0 && bulkFiles.length === 0) {
            setError("처리할 수 있는 데이터가 없거나 분석에 실패했습니다.");
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
