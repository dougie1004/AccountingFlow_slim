import React, { useState, useContext, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ArrowRight, Settings, Check, CreditCard, Landmark, FileSpreadsheet, Sparkles } from 'lucide-react';
import { JournalEntry, MappingRule } from '../types';
import { AccountingContext } from '../context/AccountingContext';

interface SmartExcelUploaderProps {
    onUpload: (entries: JournalEntry[]) => void;
    externalFile?: File | null;
}

type ColumnMapping = {
    date: string;
    description: string;
    withdrawal: string;
    deposit: string;
    vendor: string;
};

const DEFAULT_PRESETS: Record<string, ColumnMapping> = {
    '신한카드 (Shinhan)': {
        date: '이용일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명'
    },
    '국민은행 (KB Bank)': {
        date: '거래일시',
        description: '적요',
        withdrawal: '찾으신금액',
        deposit: '맡기신금액',
        vendor: '거래점'
    },
    '하나카드 (Hana)': {
        date: '거래일자',
        description: '가맹점명',
        withdrawal: '이용금액',
        deposit: '',
        vendor: '가맹점명'
    },
    '농협은행 (NH Bank)': {
        date: '거래일자',
        description: '기재내용',
        withdrawal: '출금금액',
        deposit: '입금금액',
        vendor: '거래점'
    },
};

export const SmartExcelUploader: React.FC<SmartExcelUploaderProps> = ({ onUpload, externalFile }) => {
    const { mappingRules, customAccounts } = useContext(AccountingContext)!;
    const [fileStats, setFileStats] = useState<{ name: string, rows: number } | null>(null);
    const [headers, setHeaders] = useState<string[]>([]);
    const [rawRows, setRawRows] = useState<any[]>([]);
    const [step, setStep] = useState<'upload' | 'mapping' | 'preview'>(externalFile ? 'mapping' : 'upload');
    const [isReading, setIsReading] = useState(false);
    const [newPresetName, setNewPresetName] = useState('');
    const [paymentAccount, setPaymentAccount] = useState('Cash'); // Default Credit Account
    const [previewEntries, setPreviewEntries] = useState<JournalEntry[]>([]);

    useEffect(() => {
        if (externalFile) {
            setIsReading(true);
            handleFileChange(externalFile);
        }
    }, [externalFile]);

    // Local heuristic for AI inference when no rules exist
    const inferAccount = (desc: string, vendor: string): string => {
        const text = (desc + vendor).toLowerCase();

        // 1. Check User-Defined Rules First (The Learning Part)
        const rule = mappingRules.find(r => text.includes(r.keyword.toLowerCase()));
        if (rule) return rule.targetAccount;

        // 2. Heuristic AI (The Hardcoded Knowledge Part - to be replaced by LLM later)
        if (text.includes('식당') || text.includes('푸드') || text.includes('커피') || text.includes('스타벅스')) return '복리후생비';
        if (text.includes('택시') || text.includes('카카오T') || text.includes('철도') || text.includes('버스')) return '여비교통비';
        if (text.includes('마트') || text.includes('편의점') || text.includes('다이소')) return '소모품비';
        if (text.includes('통신') || text.includes('KT') || text.includes('SKT') || text.includes('LG') || text.includes('넷플릭스')) return '통신비';
        if (text.includes('임대') || text.includes('월세')) return '지급임차료';
        if (text.includes('이자') || text.includes('수취')) return '이자수익';

        return '가지급금(Suspense)'; // Fallback
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
        vendor: ''
    });

    const allPresets = { ...DEFAULT_PRESETS, ...customPresets };

    const applyPreset = (presetName: string) => {
        const preset = allPresets[presetName];
        if (preset) {
            const newMapping = { ...mapping };
            // Fuzzy search: Find actual header that matches preset string or is very similar
            Object.keys(preset).forEach((key) => {
                const targetHeader = (preset as any)[key];
                if (!targetHeader) return;

                // 1. Exact match
                if (headers.includes(targetHeader)) {
                    (newMapping as any)[key] = targetHeader;
                } else {
                    // 2. Fuzzy match: Does any actual header contain the preset name? or vice versa?
                    const match = headers.find(h => h.includes(targetHeader) || targetHeader.includes(h));
                    if (match) (newMapping as any)[key] = match;
                }
            });
            setMapping(newMapping);
        }
    };

    const saveCustomPreset = () => {
        if (!newPresetName) {
            alert('프리셋 이름을 입력해주세요. (예: 우리회사 하나카드)');
            return;
        }
        const updated = { ...customPresets, [newPresetName]: { ...mapping } };
        setCustomPresets(updated);
        localStorage.setItem('accounting_custom_presets', JSON.stringify(updated));
        alert(`'${newPresetName}' 프리셋이 저장되었습니다.`);
        setNewPresetName('');
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement> | File) => {
        const file = e instanceof File ? e : e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            const bstr = evt.target?.result;
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

            if (data.length > 0) {
                // --- INTELLIGENT HEADER SCANNING ---
                let headerRowIdx = -1;
                for (let i = 0; i < data.length; i++) {
                    const rowStr = (data[i] || []).join('|');
                    if (
                        (rowStr.includes('거래일자') || rowStr.includes('이용일자') || rowStr.includes('날짜')) &&
                        (rowStr.includes('가맹점') || rowStr.includes('적요') || rowStr.includes('내용'))
                    ) {
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

                const newMapping = { ...mapping };
                cleanHeaders.forEach((h: string) => {
                    if (h.includes('일자') || h.includes('date') || h.includes('날짜') || h.includes('일시')) newMapping.date = h;
                    if (h.includes('적요') || h.includes('내용') || h.includes('desc') || h.includes('항목')) newMapping.description = h;
                    if (h.includes('출금') || h.includes('지급') || h.includes('찾으신') || h.includes('이용금액') || h.includes('결제금액')) newMapping.withdrawal = h;
                    if (h.includes('입금') || h.includes('수입') || h.includes('맡기신')) newMapping.deposit = h;
                    if (h.includes('거래처') || h.includes('가맹점') || h.includes('상호')) newMapping.vendor = h;
                });
                setMapping(newMapping);
                setIsReading(false);
            }
        };
        reader.onerror = () => setIsReading(false);
        reader.readAsBinaryString(file);
    };

    const processData = () => {
        const entries: JournalEntry[] = [];

        rawRows.forEach((row) => {
            const getVal = (colName: string) => {
                const idx = headers.indexOf(colName);
                return idx >= 0 ? row[idx] : null;
            };

            const rawDate = getVal(mapping.date);
            const desc = getVal(mapping.description);
            const rawWithdrawal = getVal(mapping.withdrawal);
            const rawDeposit = getVal(mapping.deposit);
            const vendor = getVal(mapping.vendor);

            // Skip noise rows (e.g. card headers, non-date strings)
            if (!rawDate || (String(rawDate).includes('본인') && !String(rawDate).includes('.'))) return;

            // Date Parsing Logic
            let dateStr = '';
            if (rawDate) {
                if (typeof rawDate === 'number') {
                    const date = new Date(Math.round((rawDate - 25569) * 86400 * 1000));
                    dateStr = date.toISOString().split('T')[0];
                } else {
                    const s = String(rawDate).trim();
                    const match = s.match(/(\d{4})[-./]?(\d{1,2})[-./]?(\d{1,2})/);
                    if (match) {
                        const y = match[1];
                        const m = match[2].padStart(2, '0');
                        const d = match[3].padStart(2, '0');
                        dateStr = `${y}-${m}-${d}`;
                    }
                }
            }

            if (!dateStr) return;

            const withdrawal = Math.abs(parseFloat(String(rawWithdrawal || '0').replace(/,/g, '')));
            const deposit = Math.abs(parseFloat(String(rawDeposit || '0').replace(/,/g, '')));

            if (withdrawal > 0 || deposit > 0) {
                const isExpense = withdrawal > 0;
                const vendorStr = String(vendor || '');
                const descStr = String(desc || 'Imported Transaction');

                // --- AI INFERENCE & RULE ENGINE ---
                const inferredAccount = isExpense
                    ? inferAccount(descStr, vendorStr)
                    : (deposit > 0 ? '가수금(Unidentified)' : 'Cash');

                entries.push({
                    id: crypto.randomUUID(),
                    date: dateStr,
                    debitAccount: isExpense ? inferredAccount : 'Cash',
                    creditAccount: isExpense ? paymentAccount : inferredAccount,
                    amount: isExpense ? withdrawal : deposit,
                    description: descStr,
                    vendor: vendorStr,
                    status: 'Unconfirmed',
                    type: isExpense ? 'Expense' : 'Revenue',
                    vat: 0,
                    auditTrail: [`[AI Smart Ingest] Inferred as ${inferredAccount}`]
                });
            }
        });

        setPreviewEntries(entries);
        setStep('preview');
    };

    const confirmUpload = () => {
        onUpload(previewEntries);
        setStep('upload');
        setFileStats(null);
        setPreviewEntries([]);
    };

    return (
        <div className="bg-[#151D2E] p-8 rounded-[2.5rem] border border-white/5 shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-emerald-500 to-indigo-500"></div>

            {(step === 'upload' || isReading) && (
                <div className="space-y-8 py-10">
                    <div className="text-center">
                        <div className="w-24 h-24 bg-indigo-500/10 rounded-[2.5rem] flex items-center justify-center text-indigo-400 mx-auto mb-8 relative">
                            <div className="absolute inset-0 bg-indigo-500/20 rounded-[2.5rem] animate-ping opacity-20"></div>
                            {isReading ? <Sparkles size={48} className="animate-pulse" /> : <Upload size={48} />}
                        </div>
                        <h2 className="text-3xl font-black text-white tracking-tight">
                            {isReading ? '데이터 정밀 분석 중...' : '데이터 스마트 가져오기'}
                        </h2>
                        <p className="text-slate-500 mt-4 text-base leading-relaxed">
                            {isReading ? '엑셀 구조를 파악하고 AI 분류 엔진을 가동하고 있습니다.\n잠시만 기다려 주세요.' : '은행, 카드사의 엑셀/CSV 파일을 그대로 업로드하세요.\n시스템이 자동으로 형식을 분석합니다.'}
                        </p>
                    </div>

                    {!isReading && (
                        <>
                            <div className="flex justify-center gap-6">
                                {[
                                    { icon: Landmark, label: '은행/계좌 내역', color: 'text-emerald-400' },
                                    { icon: CreditCard, label: '카드 이용 내역', color: 'text-sky-400' },
                                    { icon: FileSpreadsheet, label: '범용 엑셀/CSV', color: 'text-amber-400' },
                                ].map((item, i) => (
                                    <div key={i} className="flex flex-col items-center gap-3 p-6 bg-white/5 rounded-3xl border border-white/5 w-40">
                                        <item.icon className={item.color} size={28} />
                                        <span className="text-xs font-black text-slate-400">{item.label}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="flex flex-col items-center gap-4 pt-4">
                                <label className="relative group cursor-pointer inline-flex items-center gap-3 px-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-[2rem] text-lg transition-all shadow-2xl shadow-indigo-600/30 active:scale-95">
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls,.csv"
                                        onChange={handleFileChange}
                                    />
                                    <span>파일 선택하기</span>
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </label>
                                <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest italic tracking-widest uppercase">또는 파일을 여기로 드래그하세요</p>
                            </div>
                        </>
                    )}
                </div>
            )}

            {step === 'mapping' && (
                <div className="space-y-8">
                    <header className="flex justify-between items-center bg-white/5 -mx-8 -mt-8 p-8 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Sparkles size={24} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">AI 지능형 매핑 및 분류</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{fileStats?.name} 분석 중...</p>
                            </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                            <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">결제 계정 선택:</span>
                                <select
                                    className="bg-[#0B1221] border border-emerald-500/30 rounded-lg px-3 py-1 text-[10px] text-white outline-none focus:border-emerald-500"
                                    value={paymentAccount}
                                    onChange={(e) => setPaymentAccount(e.target.value)}
                                >
                                    <option value="Cash">현금 (Cash)</option>
                                    <option value="미지급금">미지급금 (카드/외상)</option>
                                    <option value="보통예금">보통예금 (통장)</option>
                                    {customAccounts.map(acc => <option key={acc} value={acc}>{acc}</option>)}
                                </select>
                            </div>
                            <div className="flex flex-wrap gap-1.5 max-w-xs justify-end">
                                {Object.keys(allPresets).map(name => (
                                    <button
                                        key={name}
                                        onClick={() => applyPreset(name)}
                                        className="px-2.5 py-1 bg-[#0B1221] hover:bg-indigo-500 hover:text-white border border-white/10 rounded-lg text-[9px] font-black text-slate-400 transition-all"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </header>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                        {[
                            { id: 'date', label: '거래일자 (Date)', req: true, color: 'text-indigo-400' },
                            { id: 'description', label: '적요/내용 (Description)', req: true, color: 'text-emerald-400' },
                            { id: 'vendor', label: '거래처/가맹점 (Vendor)', req: false, color: 'text-sky-400' },
                            { id: 'withdrawal', label: '출금액 (Withdrawal)', req: false, color: 'text-rose-400' },
                            { id: 'deposit', label: '입금액 (Deposit)', req: false, color: 'text-emerald-400' },
                        ].map((field) => (
                            <div key={field.id} className="space-y-2 group">
                                <div className="flex justify-between items-center">
                                    <label className={`text-xs font-black flex gap-1 ${field.color}`}>
                                        {field.label} {field.req && <span className="text-rose-500">*</span>}
                                    </label>
                                    {(mapping as any)[field.id] && <Check size={14} className="text-emerald-500" />}
                                </div>
                                <select
                                    value={(mapping as any)[field.id]}
                                    onChange={(e) => setMapping({ ...mapping, [field.id]: e.target.value })}
                                    className="w-full bg-[#0B1221] border border-white/10 rounded-xl px-4 py-3 text-white text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none"
                                >
                                    <option value="">-- 컬럼 선택 --</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <div className="bg-white/5 p-6 rounded-[2rem] border border-white/5 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                                <Check size={16} className="text-emerald-500" />
                                분석된 {fileStats?.rows}개의 행 중 입/출금이 있는 항목만 가져옵니다.
                            </div>

                            <div className="flex gap-2 items-center">
                                <input
                                    type="text"
                                    placeholder="새 프리셋 이름"
                                    value={newPresetName}
                                    onChange={(e) => setNewPresetName(e.target.value)}
                                    className="bg-[#0B1221] border border-white/10 rounded-lg px-3 py-1.5 text-[10px] text-white outline-none focus:border-indigo-500"
                                />
                                <button
                                    onClick={saveCustomPreset}
                                    className="text-[10px] font-black text-indigo-400 hover:text-indigo-300 transition-colors"
                                >
                                    현재 설정 저장
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 flex justify-between gap-4">
                        <button
                            onClick={() => setStep('upload')}
                            className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white"
                        >
                            처음으로
                        </button>
                        <button
                            onClick={processData}
                            disabled={!mapping.date || (!mapping.withdrawal && !mapping.deposit)}
                            className="px-10 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl text-base flex items-center gap-3 transition-all hover:scale-105 shadow-xl shadow-indigo-600/20"
                        >
                            데이터 미리보기 및 분석
                        </button>
                    </div>
                </div>
            )}

            {step === 'preview' && (
                <div className="space-y-6">
                    <header className="flex justify-between items-center bg-white/5 -mx-8 -mt-8 p-8 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
                                <Check size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black text-white">데이터 최종 검점 (Verify)</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{previewEntries.length}건의 전표가 생성될 예정입니다.</p>
                            </div>
                        </div>
                    </header>

                    <div className="bg-[#0B1221] rounded-2xl border border-white/10 overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead>
                                <tr className="bg-white/5 text-slate-500 border-b border-white/5">
                                    <th className="p-4 font-black">날짜</th>
                                    <th className="p-4 font-black">거래처/적요</th>
                                    <th className="p-4 font-black">차변 (Account)</th>
                                    <th className="p-4 font-black text-right">금액</th>
                                    <th className="p-4 font-black">AI 추론 근거</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {previewEntries.slice(0, 10).map((entry, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="p-4 text-slate-400 font-mono">{entry.date}</td>
                                        <td className="p-4 font-bold text-white">
                                            {entry.vendor}
                                            <div className="text-[10px] text-slate-500 font-normal">{entry.description}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-lg text-[10px] font-black ${entry.debitAccount === '가지급금(Suspense)' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'}`}>
                                                {entry.debitAccount}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right font-black text-white">₩{entry.amount.toLocaleString()}</td>
                                        <td className="p-4 text-slate-500 italic text-[10px]">{entry.auditTrail?.[0]}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {previewEntries.length > 10 && (
                            <div className="p-4 text-center text-slate-500 text-[10px] border-t border-white/5 bg-white/5">
                                외 {previewEntries.length - 10}건의 내역이 더 있습니다...
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-4">
                        <button
                            onClick={() => setStep('mapping')}
                            className="px-6 py-4 text-slate-400 font-bold text-sm hover:text-white"
                        >
                            매핑 수정하기
                        </button>
                        <div className="flex gap-4">
                            <div className="flex flex-col items-end justify-center">
                                <span className="text-[10px] text-slate-500 font-bold">합계 금액</span>
                                <span className="text-xl font-black text-white">₩{previewEntries.reduce((sum, e) => sum + e.amount, 0).toLocaleString()}</span>
                            </div>
                            <button
                                onClick={confirmUpload}
                                className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-2xl text-base shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
                            >
                                장부 기입 확정
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
