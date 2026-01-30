import React, { useState, useContext, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ArrowRight, Settings, Check, CreditCard, Landmark, FileSpreadsheet, Sparkles, X } from 'lucide-react';
import { JournalEntry, MappingRule, ClassificationStatus, DocumentType } from '../types';
import { AccountingContext } from '../context/AccountingContext';

interface SmartExcelUploaderProps {
    onUpload: (entries: JournalEntry[]) => void;
    onClose?: () => void;
    externalFile?: File | null;
}

type ColumnMapping = {
    date: string;
    description: string;
    withdrawal: string;
    deposit: string;
    vendor: string;
    benefit: string;
    vat: string;
};

const DEFAULT_PRESETS: Record<string, ColumnMapping> = {
    '신한카드 (Shinhan)': {
        date: '이용일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명',
        benefit: '',
        vat: ''
    },
    '국민은행 (KB Bank)': {
        date: '거래일시',
        description: '적요',
        withdrawal: '찾으신금액',
        deposit: '맡기신금액',
        vendor: '거래점',
        benefit: '',
        vat: ''
    },
    '하나카드 (Hana)': {
        date: '거래일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명',
        benefit: '',
        vat: ''
    },
    '농협은행 (NH Bank)': {
        date: '거래일자',
        description: '기재내용',
        withdrawal: '출금금액',
        deposit: '입금금액',
        vendor: '거래점',
        benefit: '',
        vat: ''
    },
};

export const SmartExcelUploader: React.FC<SmartExcelUploaderProps> = ({ onUpload, onClose, externalFile }) => {
    const { mappingRules, addMappingRule, customAccounts } = useContext(AccountingContext)!;
    const [fileStats, setFileStats] = useState<{ name: string, rows: number } | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>(externalFile ? 'mapping' : 'upload');
    const [isReading, setIsReading] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [paymentAccount, setPaymentAccount] = useState('미지급금'); // Default for Smart Ingest (Card context)
    const [previewEntries, setPreviewEntries] = useState<JournalEntry[]>([]);
    const [originalSuggestions, setOriginalSuggestions] = useState<Record<string, string>>({}); // ID -> Initial Suggestion

    useEffect(() => {
        if (externalFile) {
            setIsReading(true);
            handleFileChange(externalFile);
        }
    }, [externalFile]);

    // AI Inference Engine (Phase 1 → 3 Unified)
    const inferAccountingDecision = (desc: string, vendor: string) => {
        const text = (desc + vendor).toLowerCase();
        let suggestedAccount = '미분류 (Unclassified)';
        let confidence = 0.3;
        let status: ClassificationStatus = 'UNCLASSIFIED';
        let reasoning: string[] = ['사내 회계 처리 규칙 확인 중...'];

        // 1. Phase 3: Check User-Defined Rules (Highest Priority)
        const rule = mappingRules.find(r => text.includes(r.keyword.toLowerCase()));
        if (rule) {
            return {
                account: rule.targetAccount,
                confidence: 1.0,
                status: 'AUTO_CLASSIFIED' as ClassificationStatus,
                reasoning: [`동일 거래처 처리 기록 발견 (키워드: ${rule.keyword})`, '과거 처리 내역에 따라 자동 확정']
            };
        }

        // 2. Phase 2: Context & Merchant Resolution
        if (text.includes('식당') || text.includes('푸드') || text.includes('국밥') || text.includes('식사') ||
            text.includes('커피') || text.includes('스타벅스') || text.includes('김밥') || text.includes('분식')) {
            suggestedAccount = '복리후생비';
            confidence = 0.85;
            reasoning.push('업종 식별: 음식점/카페');
            reasoning.push('임직원 복리후생 성격의 거래로 판단');
        } else if (text.includes('openai') || text.includes('chatgpt') || text.includes('google') || text.includes('aws')) {
            suggestedAccount = '지급수수료';
            confidence = 0.9;
            reasoning.push('업종 식별: IT/Software Subscription');
        } else if (text.includes('마트') || text.includes('편의점') || text.includes('세븐일레븐') || text.includes('코리아세븐')) {
            suggestedAccount = '소모품비';
            confidence = 0.75;
            reasoning.push('업종 식별: 유통/편의점');
        } else if (text.includes('택시') || text.includes('카카오t') || text.includes('철도')) {
            suggestedAccount = '여비교통비';
            confidence = 0.9;
            reasoning.push('업종 식별: 교통/운수');
            reasoning.push('업무 연관 교통비(여비교통비)로 자동 매핑');
        } else if (text.includes('sk텔레콤') || text.includes('skt') || text.includes('통신') || text.includes('kt') || text.includes('lgu')) {
            suggestedAccount = '통신비';
            confidence = 0.9;
            reasoning.push('업종 식별: 통신/네트워크 서비스');
        } else if (text.includes('교보문고') || text.includes('yes24') || text.includes('서점') || text.includes('교육') || text.includes('학원')) {
            suggestedAccount = '도서인쇄비';
            confidence = 0.95;
            reasoning.push('업종 식별: 서점/교육 (면세 대상)');
        } else if (text.includes('병원') || text.includes('의원') || text.includes('약국') || text.includes('메디컬') || text.includes('한의원')) {
            suggestedAccount = '복리후생비';
            confidence = 0.85;
            reasoning.push('업종 식별: 의료기관 (면세 대상)');
        } else if (text.includes('우체국')) {
            suggestedAccount = '통신비';
            reasoning.push('업종 식별: 우편 (면세 대상)');
        } else if (text.includes('수도') || text.includes('관리비')) {
            suggestedAccount = '수도광열비';
            reasoning.push('수도요금 등 면세 항목 확인 필요');
        } else if (text.includes('급여') || text.includes('월급') || text.includes('상여') || text.includes('salary') || text.includes('payroll')) {
            suggestedAccount = '급여';
            confidence = 0.95;
            status = 'AUTO_CLASSIFIED';
            reasoning.push('급여/상여금 관련 키워드 감지');
            reasoning.push('임직원 인건비로 자동 분류 (원천세 신고 대상)');
        } else if (text.includes('국민연금') || text.includes('건강보험') || text.includes('고용보험') || text.includes('산재보험') || text.includes('근로복지') || text.includes('보험공단')) {
            suggestedAccount = '예수금';
            confidence = 0.95;
            status = 'AUTO_CLASSIFIED';
            reasoning.push('4대보험 공단 키워드 감지');
            reasoning.push('급여 지급 시 원천징수한 보험료 납부로 처리 (면세)');
        }

        // Tax Type Inference
        let isExempt = false;
        if (suggestedAccount === '도서인쇄비' || suggestedAccount === '예수금' || text.includes('면세') ||
            text.includes('병원') || text.includes('의원') || text.includes('약국') ||
            text.includes('우체국') || (text.includes('수도') && !text.includes('광열'))) {
            isExempt = true;
            reasoning.push('면세 대상 거래로 추정됨 (Vat 0)');
        } else {
            reasoning.push('과세 대상 거래로 추정됨 (10% 부가세 분리)');
        }

        if (confidence >= 0.8) status = 'AUTO_CLASSIFIED';
        else if (confidence >= 0.5) status = 'CANDIDATE';

        reasoning.push(`${status === 'AUTO_CLASSIFIED' ? '신뢰도 높음' : '신뢰도 보통'}: 자동 분류 엔진 가동됨`);

        return { account: suggestedAccount, confidence, status, reasoning };
    };

    const [customPresets, setCustomPresets] = useState<Record<string, ColumnMapping>>(() => {
        const saved = localStorage.getItem('accounting_custom_presets');
        return saved ? JSON.parse(saved) : {};
    });

    const [mapping, setMapping] = useState<ColumnMapping>({
        date: '',
        description: '',
        withdrawal: '',
        deposit: '',
        vendor: '',
        benefit: '',
        vat: ''
    });

    const allPresets = { ...DEFAULT_PRESETS, ...customPresets };

    const applyPreset = (presetName: string) => {
        const preset = allPresets[presetName];
        if (preset) {
            setMapping({ ...mapping, ...preset });
        }
    };

    const saveCustomPreset = () => {
        if (!newPresetName) return;
        const updated = { ...customPresets, [newPresetName]: { ...mapping } };
        setCustomPresets(updated);
        localStorage.setItem('accounting_custom_presets', JSON.stringify(updated));
        setNewPresetName('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File) => {
        const file = e instanceof File ? e : e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const ws = wb.Sheets[wb.SheetNames[0]];
            let data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            // [Smart Fix] Detect if CSV was parsed as a single column (common encoding issue with XLSX)
            if (data.length > 0 && data[0].length === 1 && typeof data[0][0] === 'string' && (data[0][0] as string).includes(',')) {
                const parseCSVLine = (str: string) => {
                    const result: string[] = [];
                    let current = '';
                    let inQuote = false;
                    for (let i = 0; i < str.length; i++) {
                        const char = str[i];
                        if (char === '"') {
                            inQuote = !inQuote;
                        } else if (char === ',' && !inQuote) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result.map(s => s.replace(/^"|"$/g, '').replace(/""/g, '"')); // Remove surrounding quotes & fix escaped quotes
                };

                data = data.map(row => parseCSVLine(String(row[0])));
            }

            if (data.length > 0) {
                let headerRowIdx = -1;
                for (let i = 0; i < data.length; i++) {
                    const rowStr = (data[i] || []).join('|');
                    if ((rowStr.includes('거래일자') || rowStr.includes('이용일자')) && (rowStr.includes('가맹점') || rowStr.includes('적요'))) {
                        headerRowIdx = i;
                        break;
                    }
                }
                const headerRow = headerRowIdx !== -1 ? data[headerRowIdx] : data[0];
                const rows = data.slice(headerRowIdx + 1).filter(row => row.length > 0);
                const cleanHeaders = headerRow.map(h => String(h || '').trim());

                setHeaders(cleanHeaders);
                setRawRows(rows);
                setFileStats({ name: file.name, rows: rows.length });
                setStep('mapping');

                const nm = { ...mapping };
                cleanHeaders.forEach(h => {
                    // Date: '일자'가 들어간 것 중 가장 앞의 것
                    if ((h.includes('일자') || h.includes('날짜') || h.includes('일시')) && !nm.date) nm.date = h;

                    // Vendor: '가맹점', '거래처', '상호'
                    if ((h.includes('가맹점') || h.includes('거래처') || h.includes('상호') || h.includes('이용지')) && !nm.vendor) nm.vendor = h;

                    // Description: '적요'나 '내용'이 없으면 '가맹점명'을 같이 씀
                    if ((h.includes('적요') || h.includes('내용') || h.includes('품목')) && !nm.description) nm.description = h;

                    // Withdrawal: 중요! '혜택', '할인'은 제외하고 실 결제액 위주
                    if ((h.includes('금액') || h.includes('출금') || h.includes('지급')) && !h.includes('혜택') && !h.includes('포인트') && !h.includes('할인')) {
                        // '이용금액'이나 '결제금액'이 보이면 바로 확정
                        if (h.includes('이용') || h.includes('결제') || h.includes('승인') || h.includes('찾으신')) {
                            nm.withdrawal = h;
                        } else if (!nm.withdrawal) {
                            nm.withdrawal = h;
                        }
                    }

                    // Deposit: 입금/맡기신
                    if ((h.includes('입금') || h.includes('수입') || h.includes('맡기신')) && !nm.deposit) nm.deposit = h;

                    // Benefit/Discount: '혜택', '할인'
                    if ((h.includes('혜택') || h.includes('할인')) && !nm.benefit) nm.benefit = h;

                    // VAT: '부가세', '세액'
                    if ((h.includes('부가세') || h.includes('세액')) && !nm.vat) nm.vat = h;
                });

                // 최종 보정: 적요가 비어있는데 가맹점명이 있다면 복사
                if (!nm.description && nm.vendor) nm.description = nm.vendor;

                setMapping(nm);
                setIsReading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        const entries: JournalEntry[] = [];
        const suggestionsMap: Record<string, string> = {};

        rawRows.forEach((row) => {
            const getVal = (colName: string) => {
                const idx = headers.indexOf(colName);
                return idx >= 0 ? row[idx] : null;
            };

            const rawDate = getVal(mapping.date);
            if (!rawDate) return;

            const descStr = String(getVal(mapping.description) || '');
            const vendorStr = String(getVal(mapping.vendor) || '');
            const parseSafeFloat = (val: any) => {
                if (val === null || val === undefined || val === '') return 0;
                const clean = String(val).replace(/[^0-9.-]/g, '');
                if (!clean || clean === '-') return 0;
                const parsed = parseFloat(clean);
                return isNaN(parsed) ? 0 : parsed;
            };

            const usage = parseSafeFloat(getVal(mapping.withdrawal));
            const benefit = parseSafeFloat(mapping.benefit ? getVal(mapping.benefit) : 0);

            // --- Phase 1 & 2 Restored: Single Source of Truth ---
            const netAmount = usage + benefit;
            if (Math.abs(netAmount) < 0.01) return; // Skip invalid or zero rows

            const decision = inferAccountingDecision(descStr, vendorStr);
            const isReversal = netAmount < 0;
            const finalTotal = Math.abs(netAmount);

            // VAT Logic
            let finalVat = 0;
            const mappedVat = parseSafeFloat(mapping.vat ? getVal(mapping.vat) : 0);

            if (mappedVat > 0) {
                finalVat = mappedVat;
            } else {
                // Infer VAT (10/110) if not exempt
                const isExempt = decision.reasoning.some(r => r.includes('면세'));
                if (!isExempt) {
                    finalVat = Math.floor(finalTotal * 10 / 110); // Floor/Round preference
                }
            }

            const mainId = crypto.randomUUID();
            suggestionsMap[mainId] = decision.account;

            entries.push({
                id: mainId,
                date: String(rawDate),
                debitAccount: isReversal ? paymentAccount : decision.account,
                creditAccount: isReversal ? decision.account : paymentAccount,
                amount: finalTotal - finalVat, // Supply Value
                description: descStr,
                vendor: vendorStr,
                status: 'Unconfirmed',
                type: 'Expense',
                vat: finalVat,
                classificationStatus: decision.status,
                confidence: decision.confidence,
                reasoning: [
                    ...decision.reasoning,
                    benefit !== 0 ? `[정산 반영] 원금(₩${usage.toLocaleString()}) ${benefit < 0 ? '할인' : '추가'} 정산됨` : '',
                    finalVat > 0 ? `[부가세 분리] 과세 매입세액 ₩${finalVat.toLocaleString()} 인식` : '[부가세 면제] 면세 거래로 인식'
                ].filter(Boolean)
            });
        });

        setOriginalSuggestions(suggestionsMap);
        setPreviewEntries(entries);
        setStep('preview');
    };

    const confirmUpload = () => {
        // --- Phase 3: Smart Learning ---
        previewEntries.forEach(entry => {
            const original = originalSuggestions[entry.id];
            if (original && original !== entry.debitAccount && entry.vendor) {
                const hasRule = mappingRules.some(r => r.keyword === entry.vendor);
                if (!hasRule) {
                    addMappingRule({
                        id: crypto.randomUUID(),
                        keyword: entry.vendor,
                        targetAccount: entry.debitAccount,
                        type: 'Expense',
                        isAutoApprove: true
                    });
                }
            }
        });

        onUpload(previewEntries);
        setStep('upload');
        setPreviewEntries([]);
    };

    return (
        <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>

            {step === 'upload' && (
                <div className="py-20 text-center space-y-8">
                    <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-400 mx-auto relative group">
                        <Upload size={48} className="group-hover:scale-110 transition-transform" />
                    </div>
                    <h2 className="text-3xl font-black text-white">데이터 스마트 가져오기</h2>
                    <p className="text-slate-500">은행/카드 엑셀을 드래그하세요.</p>
                </div>
            )}

            {step === 'mapping' && (
                <div className="space-y-6">
                    <h3 className="text-xl font-black text-white">컬럼 매칭</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {Object.keys(mapping).map(k => (
                            <div key={k} className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-500 uppercase">{k}</label>
                                <select
                                    value={(mapping as any)[k]}
                                    onChange={e => setMapping({ ...mapping, [k]: e.target.value })}
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-lg p-2 text-white text-xs"
                                >
                                    <option value="">-- 선택 --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <button onClick={processData} className="w-full py-4 bg-indigo-600 text-white font-black rounded-xl hover:bg-indigo-500 transition-all">분석 엔진 가동</button>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xl font-black text-white">데이터 최종 검증 {previewEntries.length}건</h3>
                        <div className="flex gap-4">
                            <select
                                value={paymentAccount}
                                onChange={e => {
                                    const val = e.target.value;
                                    setPaymentAccount(val);
                                    setPreviewEntries(prev => prev.map(en => ({ ...en, creditAccount: val })));
                                }}
                                className="bg-[#0B1221] border border-emerald-500/30 rounded-lg px-3 py-1 text-xs text-white"
                            >
                                <option value="미지급금">미지급금</option>
                                <option value="현금">현금</option>
                            </select>
                            {onClose && <button onClick={onClose} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all"><X size={20} /></button>}
                        </div>
                    </div>

                    <div className="bg-[#0B1221] rounded-2xl border border-white/10 overflow-hidden max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-white/5 text-slate-500">
                                <tr>
                                    <th className="p-4 text-left">날짜/거래처</th>
                                    <th className="p-4 text-left">계정 과목 (Dr/Cr)</th>
                                    <th className="p-4 text-right">공급가액 (Supply)</th>
                                    <th className="p-4 text-right">부가세 (VAT)</th>
                                    <th className="p-4 text-left">AI 추론 근거</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {previewEntries.map((entry, i) => (
                                    <tr key={i} className="hover:bg-white/5">
                                        <td className="p-4">
                                            <div className="text-slate-400 text-[10px]">{entry.date}</div>
                                            <div className="text-white font-bold">{entry.vendor}</div>
                                        </td>
                                        <td className="p-4 space-y-1">
                                            <input
                                                type="text"
                                                value={entry.debitAccount}
                                                onChange={e => {
                                                    const next = [...previewEntries];
                                                    next[i].debitAccount = e.target.value;
                                                    setPreviewEntries(next);
                                                }}
                                                className={`bg-white/5 border border-white/10 rounded px-2 py-1 font-bold outline-none w-full text-[11px] ${entry.debitAccount === '미분류 (Unclassified)' ? 'text-amber-400' : 'text-emerald-400'}`}
                                            />
                                            <input
                                                type="text"
                                                value={entry.creditAccount}
                                                onChange={e => {
                                                    const next = [...previewEntries];
                                                    next[i].creditAccount = e.target.value;
                                                    setPreviewEntries(next);
                                                }}
                                                className="bg-white/5 border border-white/10 rounded px-2 py-1 font-bold outline-none w-full text-[11px] text-slate-500"
                                            />
                                        </td>
                                        <td className="p-4 text-right text-white font-bold font-mono">
                                            ₩{entry.amount.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <input
                                                type="number"
                                                value={entry.vat}
                                                onChange={e => {
                                                    const newVat = Number(e.target.value);
                                                    const oldVat = entry.vat;
                                                    const total = entry.amount + oldVat; // Reconstruct Total

                                                    const next = [...previewEntries];
                                                    next[i].vat = newVat;
                                                    next[i].amount = total - newVat; // Adjust Supply Value
                                                    setPreviewEntries(next);
                                                }}
                                                className="bg-transparent border-b border-white/20 text-right w-20 text-amber-400 font-bold outline-none focus:border-amber-400 transition-colors"
                                            />
                                        </td>
                                        <td className="p-4 text-slate-500 italic text-[10px] max-w-[200px]">
                                            {entry.reasoning?.map((r: string, idx: number) => <div key={idx} className="truncate">• {r}</div>)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button onClick={confirmUpload} className="px-10 py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all">장부 기입 확정</button>
                    </div>
                </div>
            )}
        </div>
    );
};
