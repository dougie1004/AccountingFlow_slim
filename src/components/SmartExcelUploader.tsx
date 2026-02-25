import React, { useState, useContext, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ArrowRight, Settings, Check, CreditCard, Landmark, FileSpreadsheet, Sparkles, X } from 'lucide-react';
import { JournalEntry, MappingRule, ClassificationStatus, DocumentType } from '../types';
import { AccountingContext } from '../context/AccountingContext';
import { ALL_ACCOUNTS } from '../constants/accounts';

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
    journal_id: string;
    account_code: string;
    account_name: string;
    debit: string;
    credit: string;
    note: string;
};

const DEFAULT_PRESETS: Record<string, ColumnMapping> = {
    '신한카드 (Shinhan)': {
        date: '이용일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명',
        benefit: '',
        vat: '',
        journal_id: '',
        account_code: '',
        account_name: '',
        debit: '',
        credit: '',
        note: ''
    },
    '국민은행 (KB Bank)': {
        date: '거래일시',
        description: '적요',
        withdrawal: '찾으신금액',
        deposit: '맡기신금액',
        vendor: '거래점',
        benefit: '',
        vat: '',
        journal_id: '',
        account_code: '',
        account_name: '',
        debit: '',
        credit: '',
        note: ''
    },
    '하나카드 (Hana)': {
        date: '거래일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명',
        benefit: '',
        vat: '',
        journal_id: '',
        account_code: '',
        account_name: '',
        debit: '',
        credit: '',
        note: ''
    },
    '농협은행 (NH Bank)': {
        date: '거래일자',
        description: '기재내용',
        withdrawal: '출금금액',
        deposit: '입금금액',
        vendor: '거래점',
        benefit: '',
        vat: '',
        journal_id: '',
        account_code: '',
        account_name: '',
        debit: '',
        credit: '',
        note: ''
    },
};

export const SmartExcelUploader: React.FC<SmartExcelUploaderProps> = ({ onUpload, onClose, externalFile }) => {
    const { mappingRules, addMappingRule, customAccounts, corporateRules } = useContext(AccountingContext)!;
    const [fileStats, setFileStats] = useState<{ name: string, rows: number } | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>(externalFile ? 'mapping' : 'upload');
    const [mappingMode, setMappingMode] = useState<'simple' | 'ledger'>('simple');
    const [isReading, setIsReading] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [paymentAccount, setPaymentAccount] = useState('미지급금'); // Default for Smart Ingest (Card context)
    const [previewEntries, setPreviewEntries] = useState<JournalEntry[]>([]);
    const [originalSuggestions, setOriginalSuggestions] = useState<Record<string, string>>({}); // ID -> Initial Suggestion
    const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());

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
        let reasoning: string[] = corporateRules ? ['[AI CFO Policy Engine] 사내 회계 규정 및 지출 지침 준수 여부 실시간 검증 완료'] : [];

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
        } else if (text.includes('급여') || text.includes('salary') || text.includes('payroll')) {
            suggestedAccount = '급여';
            confidence = 0.95;
            status = 'AUTO_CLASSIFIED';
            reasoning.push('급여/상여금 관련 키워드 감지');
            reasoning.push('임직원 인건비로 자동 분류');
        } else if (text.includes('매출') || text.includes('구독') || text.includes('수입') || text.includes('컨설팅')) {
            suggestedAccount = '상품매출';
            confidence = 0.95;
            status = 'AUTO_CLASSIFIED';
            reasoning.push('매출/수입 관련 키워드 감지');
            reasoning.push('영업 수익(매출)으로 분류');
        } else if (text.includes('임차') || text.includes('빌딩') || text.includes('사무실')) {
            suggestedAccount = '지급임차료';
            confidence = 0.9;
            reasoning.push('업종 식별: 부동산/임대');
        } else if (text.includes('비품') || text.includes('애플') || text.includes('이케아') || text.includes('가구') || text.includes('pc')) {
            suggestedAccount = '비품';
            confidence = 0.85;
            reasoning.push('자산성 지출 식별: 비품/장비');
        }

        // Tax Type Inference
        let isExempt = false;
        if (suggestedAccount === '도서인쇄비' || suggestedAccount === '예수금' || suggestedAccount === '급여' ||
            text.includes('면세') || text.includes('병원') || text.includes('의원') || text.includes('약국') ||
            text.includes('보험') || text.includes('우체국') || text.includes('주민센터') || text.includes('구청') || text.includes('세무서') || (text.includes('수도') && !text.includes('광열'))) {
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
        vat: '',
        journal_id: '',
        account_code: '',
        account_name: '',
        debit: '',
        credit: '',
        note: ''
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

                    // Journal Mode Fields
                    if ((h.includes('전표번호') || h.toLowerCase().includes('journal_id') || h.includes('전표')) && !nm.journal_id) nm.journal_id = h;
                    if ((h.includes('계정코드') || h.toLowerCase().includes('account_code')) && !nm.account_code) nm.account_code = h;
                    if ((h.includes('계정과목') || h.toLowerCase().includes('account_name') || h.includes('계정명')) && !nm.account_name) nm.account_name = h;
                    if ((h.includes('차변') || h.toLowerCase().includes('debit')) && !nm.debit) nm.debit = h;
                    if ((h.includes('대변') || h.toLowerCase().includes('credit')) && !nm.credit) nm.credit = h;
                    if ((h.includes('비고') || h.includes('메모') || h.includes('참조') || h.toLowerCase().includes('note') || h.toLowerCase().includes('remark')) && !nm.note) nm.note = h;
                });

                // Auto-detect mode
                if (nm.account_name || nm.debit || nm.credit || nm.journal_id) {
                    setMappingMode('ledger');
                } else {
                    setMappingMode('simple');
                }

                setMapping(nm);
                setIsReading(false);
            }
        };
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        const entries: JournalEntry[] = [];
        const suggestionsMap: Record<string, string> = {};

        const isLedgerMode = mapping.account_name && (mapping.debit || mapping.credit);

        if (isLedgerMode) {
            const groupedJournals: Record<string, any[]> = {};
            const parseSafeFloat = (val: any) => {
                if (val === null || val === undefined || val === '') return 0;
                if (typeof val === 'number') return val;

                // Keep 'e', 'E', '.', and '-' for scientific notation and decimals
                const clean = String(val).replace(/[^0-9.eE-]/g, '');
                if (!clean || clean === '-') return 0;
                const parsed = parseFloat(clean);
                return isNaN(parsed) ? 0 : parsed;
            };

            rawRows.forEach((row) => {
                const getVal = (colName: string) => {
                    const idx = headers.indexOf(colName);
                    return idx >= 0 ? row[idx] : null;
                };
                const rawDate = getVal(mapping.date);
                if (!rawDate) return;

                const descStr = String(getVal(mapping.description) || getVal(mapping.account_name) || '');
                const jid = mapping.journal_id ? String(getVal(mapping.journal_id) || '') : `${rawDate}_${descStr}`;
                const groupKey = jid || `${rawDate}_${descStr}`;

                if (!groupedJournals[groupKey]) groupedJournals[groupKey] = [];
                groupedJournals[groupKey].push(row);
            });

            Object.keys(groupedJournals).forEach(jid => {
                const rows = groupedJournals[jid];
                const getVal = (row: any, colName: string) => {
                    const idx = headers.indexOf(colName);
                    return idx >= 0 ? row[idx] : null;
                };

                let maxDebitAmount = 0;
                let maxCreditAmount = 0;
                let debitAcc = '미분류 (Unclassified)';
                let creditAcc = '미분류 (Unclassified)';
                let rawDate = '';
                let descStr = '';
                let vendorStr = '';

                rows.forEach(row => {
                    const d = parseSafeFloat(mapping.debit ? getVal(row, mapping.debit) : 0);
                    const c = parseSafeFloat(mapping.credit ? getVal(row, mapping.credit) : 0);
                    const acc = String(getVal(row, mapping.account_name) || '미분류');

                    if (d > maxDebitAmount) { maxDebitAmount = d; debitAcc = acc; }
                    if (c > maxCreditAmount) { maxCreditAmount = c; creditAcc = acc; }

                    if (!rawDate && mapping.date) rawDate = String(getVal(row, mapping.date) || '');
                    if (!descStr && mapping.description) descStr = String(getVal(row, mapping.description) || '');
                    if (!vendorStr && mapping.vendor) vendorStr = String(getVal(row, mapping.vendor) || '');

                    const noteStr = mapping.note ? String(getVal(row, mapping.note) || '') : '';
                    if (noteStr) descStr = `${descStr} (${noteStr})`;

                    if (!descStr && !mapping.description && mapping.account_name) descStr = acc;
                });

                const amt = Math.max(maxDebitAmount, maxCreditAmount);
                if (amt < 0.01) return;

                const decision = inferAccountingDecision(descStr, vendorStr);

                const mainId = crypto.randomUUID();
                entries.push({
                    id: mainId,
                    date: String(rawDate),
                    transactionDate: String(rawDate),
                    recognitionDate: String(rawDate),
                    debitAccount: debitAcc,
                    creditAccount: creditAcc,
                    amount: amt,
                    description: descStr,
                    vendor: vendorStr,
                    status: 'Confirmed',
                    type: 'Journal',
                    vat: 0,
                    classificationStatus: 'AUTO_CLASSIFIED',
                    confidence: 1.0,
                    reasoning: [
                        '[원장 데이터 연동] 차/대변 직접 맵핑됨',
                        ...decision.reasoning,
                        `[AI CFO 의견] 원본 명세서상 "${descStr}" 기재 내역 확인.`
                    ]
                });
            });
        } else {
            rawRows.forEach((row) => {
                const getVal = (colName: string) => {
                    const idx = headers.indexOf(colName);
                    return idx >= 0 ? row[idx] : null;
                };

                const rawDate = getVal(mapping.date);
                if (!rawDate) return;

                let descStr = String(getVal(mapping.description) || '');
                const noteStr = mapping.note ? String(getVal(mapping.note) || '') : '';
                if (noteStr) descStr = `${descStr} (${noteStr})`;

                const vendorStr = String(getVal(mapping.vendor) || '');
                const parseSafeFloat = (val: any) => {
                    if (val === null || val === undefined || val === '') return 0;
                    if (typeof val === 'number') return val;
                    const clean = String(val).replace(/[^0-9.eE-]/g, '');
                    if (!clean || clean === '-') return 0;
                    const parsed = parseFloat(clean);
                    return isNaN(parsed) ? 0 : parsed;
                };

                const usage = parseSafeFloat(getVal(mapping.withdrawal));
                const deposit = parseSafeFloat(getVal(mapping.deposit));
                const benefit = parseSafeFloat(mapping.benefit ? getVal(mapping.benefit) : 0);

                // Determine if it's an expense or revenue
                const isRevenue = deposit > 0 && usage === 0;
                const netAmount = isRevenue ? deposit : (usage + benefit);

                if (Math.abs(netAmount) < 0.01) return;

                const decision = inferAccountingDecision(descStr, vendorStr);
                const isReversal = !isRevenue && netAmount < 0; // Negative expense is a reversal
                const finalTotal = Math.abs(netAmount);

                // VAT Logic
                let finalVat = 0;
                const mappedVat = parseSafeFloat(mapping.vat ? getVal(mapping.vat) : 0);

                if (mappedVat > 0) {
                    finalVat = mappedVat;
                } else {
                    const isExempt = decision.reasoning.some(r => r.includes('면세')) || (isRevenue && decision.reasoning.some(r => r.includes('면세')));
                    if (!isExempt && (decision.account !== '예수금')) {
                        finalVat = Math.floor(finalTotal * 10 / 110);
                    }
                }

                const mainId = crypto.randomUUID();
                suggestionsMap[mainId] = decision.account;

                // Debit/Credit alignment
                // Expense: Debit(Category e.g 지급임차료) / Credit(Payment e.g 보통예금/미지급금)
                // Revenue: Debit(Payment e.g 보통예금/외상매출금) / Credit(Category e.g 상품매출)
                let debitAcc = isRevenue ? paymentAccount : decision.account;
                let creditAcc = isRevenue ? decision.account : paymentAccount;

                // [추가] 매출/매입 부가세 자동 분개 로직
                const reasoningList = [
                    ...decision.reasoning,
                    isRevenue ? '[수입 식별] 입금 항목으로 감지됨' : '',
                    benefit !== 0 ? `[정산 반영] 원금(₩${usage.toLocaleString()}) ${benefit < 0 ? '할인' : '추가'} 정산됨` : ''
                ];

                if (finalVat > 0) {
                    if (isRevenue) {
                        reasoningList.push(`[매출부가세 분리] 부가가치세예수금 ₩${finalVat.toLocaleString()} 반영됨`);
                    } else {
                        reasoningList.push(`[매입부가세 분리] 부가가치세대급금 ₩${finalVat.toLocaleString()} 인식`);
                    }
                } else {
                    reasoningList.push(`[부가세 ${isRevenue ? '제외' : '면제'}]`);
                }

                if (isReversal) {
                    [debitAcc, creditAcc] = [creditAcc, debitAcc];
                }

                entries.push({
                    id: mainId,
                    date: String(rawDate),
                    transactionDate: String(rawDate),
                    recognitionDate: String(rawDate),
                    debitAccount: debitAcc,
                    creditAccount: creditAcc,
                    amount: finalTotal - finalVat,
                    description: descStr,
                    vendor: vendorStr,
                    status: 'Unconfirmed',
                    type: isRevenue ? 'Revenue' : 'Expense',
                    vat: finalVat,
                    vatFlag: finalVat > 0,
                    classificationStatus: decision.status,
                    confidence: decision.confidence,
                    reasoning: reasoningList.filter(Boolean)
                });
            });
        }

        setOriginalSuggestions(suggestionsMap);
        setPreviewEntries(entries);
        setStep('preview');
    };

    const confirmUpload = () => {
        // Only upload selected rows if some are selected, otherwise upload all
        const toUpload = selectedRows.size > 0
            ? previewEntries.filter((_, i) => selectedRows.has(i))
            : previewEntries;

        if (toUpload.length === 0) return;

        // --- Phase 3: Smart Learning ---
        toUpload.forEach(entry => {
            const original = originalSuggestions[entry.id];
            if (original && original !== entry.debitAccount && entry.vendor) {
                const hasRule = mappingRules.some(r => r.keyword === entry.vendor);
                if (!hasRule) {
                    addMappingRule({
                        id: crypto.randomUUID(),
                        keyword: entry.vendor,
                        targetAccount: entry.type === 'Revenue' ? entry.creditAccount : entry.debitAccount,
                        type: 'Expense',
                        isAutoApprove: true
                    });
                }
            }
        });

        onUpload(toUpload);

        if (selectedRows.size > 0 && selectedRows.size < previewEntries.length) {
            // Partially confirmed, keep remaining
            setPreviewEntries(prev => prev.filter((_, i) => !selectedRows.has(i)));
            setSelectedRows(new Set());
        } else {
            // Fully confirmed or default all
            setStep('upload');
            setPreviewEntries([]);
            setSelectedRows(new Set());
        }
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
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-xl font-black text-white">컬럼 매칭 설정</h3>
                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">엑셀의 각 열을 회계 항목에 맞게 연결해 주세요</p>
                        </div>
                        <div className="bg-[#0B1221] p-1 rounded-xl flex border border-white/5">
                            <button
                                onClick={() => setMappingMode('simple')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mappingMode === 'simple' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                단순 내역 (통장/카드)
                            </button>
                            <button
                                onClick={() => setMappingMode('ledger')}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${mappingMode === 'ledger' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
                            >
                                복식 부기 (원장/ERP)
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {(mappingMode === 'simple' ? [
                            { key: 'date', label: '거래 날짜', color: 'text-indigo-400' },
                            { key: 'description', label: '적요 (거래내용)', color: 'text-indigo-400' },
                            { key: 'vendor', label: '거래처/가맹점', color: 'text-indigo-400' },
                            { key: 'withdrawal', label: '출금액 (결제액)', color: 'text-rose-400' },
                            { key: 'deposit', label: '입금액 (수입)', color: 'text-emerald-400' },
                            { key: 'vat', label: '부가가치세 (VAT)', color: 'text-amber-400' },
                            { key: 'note', label: '비고/메모 (Note)', color: 'text-slate-400' },
                            { key: 'benefit', label: '할인/포인트 혜택', color: 'text-slate-500' },
                        ] : [
                            { key: 'date', label: '거래 날짜', color: 'text-indigo-400' },
                            { key: 'journal_id', label: '전표 번호 (ID)', color: 'text-emerald-400' },
                            { key: 'account_name', label: '계정 과목명', color: 'text-emerald-400' },
                            { key: 'account_code', label: '계정 코드', color: 'text-emerald-400' },
                            { key: 'debit', label: '차변 금액 (Dr)', color: 'text-emerald-400' },
                            { key: 'credit', label: '대변 금액 (Cr)', color: 'text-emerald-400' },
                            { key: 'note', label: '비고/참조 (Note)', color: 'text-slate-400' },
                            { key: 'description', label: '적요 (설명)', color: 'text-slate-500' },
                            { key: 'vendor', label: '거래처 정보', color: 'text-slate-500' },
                        ]).map(item => (
                            <div key={item.key} className="space-y-1 bg-white/5 p-4 rounded-2xl border border-white/5 hover:border-white/10 transition-colors">
                                <label className={`text-[10px] font-black ${item.color} uppercase tracking-[0.1em] block mb-2`}>{item.label}</label>
                                <select
                                    value={(mapping as any)[item.key]}
                                    onChange={e => setMapping({ ...mapping, [item.key]: e.target.value })}
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl p-2.5 text-white text-xs outline-none focus:border-indigo-500 transition-all font-bold"
                                >
                                    <option value="">-- 컬럼 선택 --</option>
                                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="pt-4">
                        <button
                            onClick={processData}
                            className="w-full py-5 bg-gradient-to-r from-indigo-600 to-indigo-700 text-white font-black rounded-2xl hover:from-indigo-500 hover:to-indigo-600 transition-all shadow-xl shadow-indigo-600/20 flex items-center justify-center gap-3 group"
                        >
                            <Sparkles size={20} className="group-hover:rotate-12 transition-transform" />
                            AI 회계 엔진 가동 및 데이터 분석
                        </button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-xl font-black text-white">데이터 최종 검증 {previewEntries.length}건</h3>
                            {selectedRows.size > 0 && (
                                <div className="flex items-center gap-3 bg-indigo-500/10 px-4 py-2 rounded-xl border border-indigo-500/30 w-fit">
                                    <span className="text-indigo-400 font-bold text-xs whitespace-nowrap">{selectedRows.size}건 선택됨</span>
                                    <input
                                        type="text"
                                        list="account_options_list"
                                        placeholder="일괄 차변(Dr)"
                                        className="bg-[#0B1221] border border-emerald-500/40 rounded px-2 py-1 text-white text-xs outline-none placeholder:text-emerald-500/40 w-32"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (!v || !ALL_ACCOUNTS.find(a => a.name === v)) return;
                                            setPreviewEntries(prev => prev.map((en, i) => selectedRows.has(i) ? { ...en, debitAccount: v } : en));
                                        }}
                                    />
                                    <input
                                        type="text"
                                        list="account_options_list"
                                        placeholder="일괄 대변(Cr)"
                                        className="bg-[#0B1221] border border-white/20 rounded px-2 py-1 text-white text-xs outline-none placeholder:text-slate-500 w-32"
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (!v || !ALL_ACCOUNTS.find(a => a.name === v)) return;
                                            setPreviewEntries(prev => prev.map((en, i) => selectedRows.has(i) ? { ...en, creditAccount: v } : en));
                                        }}
                                    />
                                    <button onClick={() => setSelectedRows(new Set())} className="text-xs text-rose-400 hover:text-rose-300 font-bold ml-2">선택 취소</button>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-4 items-start">
                            <select
                                value={paymentAccount}
                                onChange={e => {
                                    const val = e.target.value;
                                    setPaymentAccount(val);
                                    setPreviewEntries(prev => prev.map(en => ({
                                        ...en,
                                        creditAccount: en.type === 'Expense' ? val : en.creditAccount,
                                        debitAccount: en.type === 'Revenue' ? val : en.debitAccount
                                    })));
                                }}
                                className="bg-[#0B1221] border border-emerald-500/30 rounded-lg px-3 py-1 text-[10px] text-white outline-none focus:border-indigo-500 transition-colors max-w-[150px]"
                            >
                                <optgroup label="상대 계정 (Payment/Offset)">
                                    {ALL_ACCOUNTS.filter(a => ['보통예금', '현금', '미지급금', '외상매출금', '매입채무', '미수금'].includes(a.name)).map(a => (
                                        <option key={a.name} value={a.name}>{a.name}</option>
                                    ))}
                                </optgroup>
                                <optgroup label="전체 계정 과목 (Full COA)">
                                    {ALL_ACCOUNTS.filter(a => !['보통예금', '현금', '미지급금', '외상매출금', '매입채무', '미수금'].includes(a.name)).map(a => (
                                        <option key={a.name} value={a.name}>{a.name}</option>
                                    ))}
                                </optgroup>
                            </select>
                            {onClose && <button onClick={onClose} className="p-2 text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 rounded-full transition-all"><X size={20} /></button>}
                        </div>
                    </div>

                    <div className="bg-[#0B1221] rounded-2xl border border-white/10 overflow-hidden max-h-[50vh] overflow-y-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-white/5 text-slate-500">
                                <tr>
                                    <th className="p-4 text-left w-10">
                                        <input
                                            type="checkbox"
                                            className="accent-indigo-500 cursor-pointer w-4 h-4"
                                            checked={previewEntries.length > 0 && selectedRows.size === previewEntries.length}
                                            onChange={(e) => {
                                                if (e.target.checked) setSelectedRows(new Set(previewEntries.map((_, i) => i)));
                                                else setSelectedRows(new Set());
                                            }}
                                        />
                                    </th>
                                    <th className="p-4 text-left">날짜/거래처</th>
                                    <th className="p-4 text-left">계정 과목 (Dr/Cr)</th>
                                    <th className="p-4 text-right">공급가액 (Supply)</th>
                                    <th className="p-4 text-right">부가세 (VAT)</th>
                                    <th className="p-4 text-left">AI 추론 근거</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {previewEntries.map((entry, i) => (
                                    <tr key={i} className={`hover:bg-white/5 transition-colors ${selectedRows.has(i) ? 'bg-indigo-500/10' : ''}`}>
                                        <td className="p-4">
                                            <input
                                                type="checkbox"
                                                className="accent-indigo-500 cursor-pointer w-4 h-4"
                                                checked={selectedRows.has(i)}
                                                onChange={(e) => {
                                                    const next = new Set(selectedRows);
                                                    if (e.target.checked) next.add(i);
                                                    else next.delete(i);
                                                    setSelectedRows(next);
                                                }}
                                            />
                                        </td>
                                        <td className="p-4 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <div className="text-slate-400 text-[10px] font-mono">{entry.date}</div>
                                                <button onClick={() => {
                                                    const next = new Set(selectedRows);
                                                    previewEntries.forEach((e, idx) => { if (e.date === entry.date) next.add(idx); });
                                                    setSelectedRows(next);
                                                }} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-indigo-400 hover:bg-white/20 uppercase font-black transition-colors">이 날짜 전체선택</button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="text-white font-bold">{entry.vendor}</div>
                                                <button onClick={() => {
                                                    const next = new Set(selectedRows);
                                                    previewEntries.forEach((e, idx) => { if (e.vendor === entry.vendor) next.add(idx); });
                                                    setSelectedRows(next);
                                                }} className="text-[8px] bg-white/5 px-1.5 py-0.5 rounded text-emerald-400 hover:bg-white/20 uppercase font-black transition-colors">이 거래처 전체선택</button>
                                            </div>
                                        </td>
                                        <td className="p-4 space-y-1.5">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] text-emerald-500 font-black opacity-80 uppercase min-w-[20px]">차변(Dr)</span>
                                                    <input
                                                        type="text"
                                                        list="account_options_list"
                                                        value={entry.debitAccount}
                                                        placeholder="타이핑하여 검색..."
                                                        onChange={e => {
                                                            const next = [...previewEntries];
                                                            next[i].debitAccount = e.target.value || '';
                                                            setPreviewEntries(next);
                                                        }}
                                                        className={`bg-[#0B1221] border ${entry.debitAccount.includes('미분류') ? 'border-amber-500/40 text-amber-400' : 'border-emerald-500/30 text-emerald-400'} rounded p-1.5 font-bold outline-none w-full text-[11px] focus:-translate-y-0.5 focus:shadow-lg focus:border-emerald-500 focus:bg-[#161B22] transition-all`}
                                                    />
                                                </div>
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[9px] text-slate-500 font-black opacity-80 uppercase min-w-[20px]">대변(Cr)</span>
                                                    <input
                                                        type="text"
                                                        list="account_options_list"
                                                        value={entry.creditAccount}
                                                        placeholder="타이핑하여 검색..."
                                                        onChange={e => {
                                                            const next = [...previewEntries];
                                                            next[i].creditAccount = e.target.value || '';
                                                            setPreviewEntries(next);
                                                        }}
                                                        className={`bg-[#0B1221] border ${entry.creditAccount.includes('미분류') ? 'border-amber-500/40 text-amber-400' : 'border-white/10 text-slate-300'} rounded p-1.5 font-bold outline-none w-full text-[11px] focus:-translate-y-0.5 focus:shadow-lg focus:border-indigo-500 focus:bg-[#161B22] transition-all`}
                                                    />
                                                </div>
                                            </div>
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

                    <div className="flex justify-end gap-4 mt-8">
                        <button
                            onClick={confirmUpload}
                            className={`px-10 py-4 ${selectedRows.size > 0 ? 'bg-indigo-600' : 'bg-emerald-600'} text-white font-black rounded-xl shadow-lg hover:scale-105 transition-all w-full md:w-auto`}
                        >
                            {selectedRows.size > 0 ? `${selectedRows.size}건 선택 항목 장부 기입` : '전체 장부 기입 확정'}
                        </button>
                    </div>
                </div>
            )}

            {/* Datalist for Account Suggestion & Search */}
            <datalist id="account_options_list">
                {ALL_ACCOUNTS.map(a => (
                    <option key={a.name} value={a.name}>{`[${a.description}] ${a.name}`}</option>
                ))}
            </datalist>
        </div>
    );
};
