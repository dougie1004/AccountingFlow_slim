import React, { useRef, useState, useEffect } from 'react';
import { Upload, Loader2, FileUp, AlertTriangle, User, Database } from 'lucide-react';
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

export const FileUploader = React.forwardRef<any, FileUploaderProps>(({ onTransactionsLoaded, onExcelDetected }, ref) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [mapperOpen, setMapperOpen] = useState(false);
    const [pendingFile, setPendingFile] = useState<{ bytes: Uint8Array, name: string, headers: string[], initialMapping: Record<string, string> } | null>(null);
    const [isMappingProgress, setIsMappingProgress] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const { config, corporateRules, applyMappingRules } = useAccounting();

    React.useImperativeHandle(ref, () => ({
        triggerUpload: () => {
            fileInputRef.current?.click();
        }
    }));

    const processFiles = async (files: File[]) => {
        if (files.length === 0) return;

        setIsUploading(true);
        setError(null);

        let contextString = "";
        let transactionFiles: File[] = [];
        let bulkFiles: File[] = [];

        // 1. Smart Routing (Speed + Precision)
        const contextFiles = files.filter(f => {
            const name = f.name.toLowerCase();
            const isDoc = (['.docx', '.doc', '.txt'].includes(name.slice(name.lastIndexOf('.'))));
            // Combined keywords for contracts, policies, guidelines, etc.
            const contextKeywords = [/규정/, /계약/, /지침/, /원칙/, /manual/, /policy/, /agreement/, /guideline/, /약관/];
            const hasKeyword = contextKeywords.some(rev => rev.test(name));
            return isDoc || hasKeyword;
        });

        // Evidence: Sources of transactions. We now allow docs and txt to be analyzed too!
        const evidenceFiles = files.filter(f => {
            const name = f.name.toLowerCase();
            const ext = name.slice(name.lastIndexOf('.'));

            // Rules/Policies remain strictly context to avoid noise in extraction
            const strictPolicyKeywords = [/규정/, /지침/, /원칙/, /manual/, /policy/, /guideline/, /약관/];
            if (strictPolicyKeywords.some(rev => rev.test(name))) return false;

            // Allow documents (Drafts, Reports) to be analyzed for transactions
            return (['.jpg', '.jpeg', '.png', '.webp', '.pdf', '.csv', '.xlsx', '.xls', '.docx', '.doc', '.txt'].includes(ext));
        });

        console.log(`[AI Routing] Context: ${contextFiles.length}, Evidence: ${evidenceFiles.length}`);

        try {
            // 2. Extract Context in Parallel
            console.log(`[AI Context] Total: ${contextFiles.length} files. Names:`, contextFiles.map(f => f.name));
            const contextPromises = contextFiles.map(async (f) => {
                const buf = await f.arrayBuffer();
                const bytes = new Uint8Array(buf);
                try {
                    const text = await invoke<string>('process_review_context', {
                        fileBytes: bytes,
                        fileName: f.name
                    });
                    return `\n[File: ${f.name}]\n${text}\n`;
                } catch (e) {
                    console.warn(`Context extraction failed for ${f.name}:`, e);
                    return "";
                }
            });
            const contextResults = await Promise.all(contextPromises);
            contextString += contextResults.join("");

            // 3. Parallel Transaction Processing (Evidence Files)
            const analysisPromises = evidenceFiles.map(async (file) => {
                try {
                    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
                    const isImage = ['.jpg', '.jpeg', '.png', '.webp'].includes(ext);

                    let bytes: Uint8Array;
                    if (isImage) {
                        bytes = await compressImage(file);
                    } else {
                        const buf = await file.arrayBuffer();
                        bytes = new Uint8Array(buf);
                    }

                    // AI Extraction
                    console.log(`[AI Parallel] Analyzing Evidence: ${file.name}...`);
                    const apiResults = await invoke<ParsedTransaction[]>('process_universal_file', {
                        fileBytes: bytes,
                        fileName: file.name
                    });

                    if (apiResults && apiResults.length > 0) {
                        const validResults = apiResults.filter(tx => tx && tx.description !== "NOT_A_FINANCIAL_DOCUMENT");
                        console.log(`[AI Parallel] Result for ${file.name}: ${validResults.length} transactions found.`, validResults);

                        if (isImage && validResults.length > 0) {
                            const blob = new Blob([bytes.buffer as any], { type: 'image/jpeg' });
                            const attachmentUrl = URL.createObjectURL(blob);
                            validResults.forEach(tx => tx.attachmentUrl = attachmentUrl);
                        }
                        return validResults;
                    } else {
                        console.warn(`[AI Parallel] No transactions found in ${file.name}`);
                        return [];
                    }
                } catch (beErr: any) {
                    console.error(`Analysis failed for ${file.name}:`, beErr);
                    // Deterministic Error Handling for Encoding and Format
                    if (beErr && typeof beErr === 'object' && beErr.code === 'encodingUncertain') {
                        setError("파일 인코딩을 확인할 수 없습니다. (UTF-8 권장)");
                    } else if (beErr && typeof beErr === 'object' && beErr.code === 'invalidFormat') {
                        setError(`파일 데이터 해석 오류: ${beErr.message || '형식이 올바르지 않습니다.'}`);
                    } else if (beErr && typeof beErr === 'object' && beErr.code === 'emptyFile') {
                        setError("파일 내용이 비어 있습니다.");
                    } else {
                        setError(`${file.name} 처리 중 오류가 발생했습니다.`);
                    }
                }
                return [];
            });

            // Wait for ALL files to be analyzed simultaneously
            const resultsBlocks = await Promise.all(analysisPromises);
            const allAiResults: ParsedTransaction[] = resultsBlocks.flat();

            let auditedResults = [...allAiResults];

            // 4. AI Audit Cross-Check (Uses the freshly extracted context!)
            if (auditedResults.length > 0) {
                try {
                    const fullAuditContext = `[사내 회계 규정]\n${corporateRules}\n\n[증빙 및 문서 컨텍스트]\n${contextString}`;
                    console.log(`[Financial Master Bridge] Commencing audit for ${auditedResults.length} transactions...`);
                    console.log(`[Financial Master Bridge] Context Size: ${fullAuditContext.length} chars. Sources: ${contextFiles.map(f => f.name).join(', ')}`);

                    auditedResults = await invoke<ParsedTransaction[]>('perform_review_check', {
                        transactions: auditedResults,
                        context: fullAuditContext
                    });
                    console.log("[Financial Master Bridge] Audit complete. Judgments applied.");
                } catch (auditErr) {
                    console.error("Audit Check Failed:", auditErr);
                }
            }

            // [Smart Memory Injection] Apply Mapping Rules & History
            const smartResults = applyMappingRules(auditedResults);

            // 5. Commit Results
            if (smartResults.length > 0) {
                const finalResults = smartResults.map((r: ParsedTransaction) => ({
                    ...r,
                    originalAmount: r.amount || 0,
                    status: (r as any).status || 'Unconfirmed'
                }));
                onTransactionsLoaded(finalResults);
            } else if (bulkFiles.length === 0) {
                setError("분석된 거래 내역이 없습니다. (규정/계약서만 업로드되었거나 증빙을 찾지 못함)");
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
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleMappingConfirm = async (mapping: Record<string, string>) => {
        if (!pendingFile) return;
        setIsMappingProgress(true);
        try {
            // Updated to use correct command if mapping is supported, or fallback
            const results = await invoke<ParsedTransaction[]>('process_universal_file', {
                fileBytes: Array.from(pendingFile.bytes),
                fileName: pendingFile.name,
                // mapping support depends on backend implementation
            });

            if (results.length === 0) {
                throw new Error("변환된 데이터가 없습니다.");
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
                    accept=".xlsx,.xls,.csv,.pdf,.jpg,.jpeg,.png,.webp,.docx,.pptx,.hwp"
                    multiple
                    onChange={handleFileUpload}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400 animate-pulse">
                            <Loader2 size={40} className="animate-spin" />
                        </div>
                        <p className="text-sm font-bold text-indigo-400">AI가 증빙 문서를 분석하고 있습니다...</p>
                    </div>
                ) : (
                    <div className="bg-indigo-500/10 p-5 rounded-3xl text-indigo-400">
                        <Upload size={40} />
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
});

FileUploader.displayName = 'FileUploader';
