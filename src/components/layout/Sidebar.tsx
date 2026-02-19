import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Settings,
    LogOut,
    Menu,
    X,
    Landmark,
    ShieldCheck,
    Database,
    RotateCcw,
    FileText,
    Wallet,
    Building2,
    CheckCircle2,
    RefreshCw,
    Zap,
    ChevronRight,
    Activity,
    FileSpreadsheet,
    Shield,
    ClipboardCheck,
    TrendingUp,
    ListTodo,
    Lock,
    Sparkles,
    AlertCircle
} from 'lucide-react';
import { useContext } from 'react';
import { AccountingContext } from '../../context/AccountingContext';
import { useConfig } from '../../context/ConfigContext';
import { useTheme } from '../../context/ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Tooltip } from '../common/Tooltip';

interface SidebarProps {
    activeTab: string;
    setTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    const { tenantInfo, updateTenantInfo, usageStatus } = useConfig();
    const { theme, setTheme, resolvedTheme } = useTheme();

    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 1024;
            setIsMobile(mobile);
            if (!mobile) setIsOpen(true);
            else setIsOpen(false);
        };

        window.addEventListener('resize', handleResize);
        handleResize();

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const menuGroups = [
        {
            title: '경영 및 전략 (Strategy)',
            items: [
                { id: 'dashboard', label: 'CFO 대시보드', description: '실시간 재무 KPI 및 AI 전략 리포트', icon: LayoutDashboard, minPlan: 'Free' },
                { id: 'daily-cash', label: '자금수지 (Cash Flow)', description: '일일 시재 및 현금 흐름 분석', icon: Wallet, minPlan: 'Free' },
                { id: 'risk-dashboard', label: '리스크 대시보드', description: '이상 거래 및 세무 리스크 탐지', icon: Shield, minPlan: 'Standard' },
                { id: 'closing-manager', label: '월마감 센터', description: '회계 마감 및 정밀 검증 센터', icon: Lock, minPlan: 'Basic' },
                { id: 'simulation-report', label: '월별 손익 현황', description: '사업계획 대비 실적 시뮬레이션 상세', icon: FileSpreadsheet, minPlan: 'Free' },
            ]
        },
        {
            title: '회계 및 세무 (Accounting)',
            items: [
                { id: 'journal', label: '분개 전표 (Journal)', description: 'AI 자동화 디지털 분개장', icon: BookOpen, minPlan: 'Free' },
                { id: 'general-ledger', label: '총계정원장 (GL)', description: '계정별 원장 및 증빙 관리', icon: FileText, minPlan: 'Free' },
                { id: 'trial-balance', label: '재무제표 (Financial Statements)', description: '재무제표 및 시산표 기반 보고서', icon: FileSpreadsheet, minPlan: 'Free' },
                // { id: 'tax-report', label: '세무 및 신고 지원', description: '부가세/원천세 자동 계산 및 리포트', icon: Landmark, minPlan: 'Basic' },
            ]
        },
        {
            title: '운영 및 관리 (Operations)',
            items: [
                { id: 'arap-management', label: '채권/채무 정산 (Settlement)', description: '미수금/미지급금 연령 분석 및 정산', icon: RefreshCw, minPlan: 'Basic' },
                { id: 'assets', label: '고정자산 관리', description: '자산 대장 및 감가상각 자동화', icon: Landmark, minPlan: 'Standard' },
                { id: 'leases', label: '리스 부채 관리 (IFRS 16)', description: '리스 부식/이자 비용 자동 회계 처리', icon: Building2, minPlan: 'Standard' },
                { id: 'vendor-ledger', label: '거래처 원장', description: '파트너사별 거래 내역 조회', icon: Users, minPlan: 'Free' },
                { id: 'partners', label: '거래처 정보 관리', description: '주요 거래처 및 파트너 정보 관리', icon: Users, minPlan: 'Free' },
                { id: 'operation-plan', label: '사업 계획 및 예산', description: '예산 편성 및 실적 대비 분석(BP)', icon: TrendingUp, minPlan: 'Standard' },
            ]
        },
        {
            title: '시스템 권한 (Control)',
            items: [
                { id: 'approval-desk', label: '결재 센터 (Approval)', description: '전표 승인 및 내부 통제 프로세스', icon: ClipboardCheck, minPlan: 'Standard' },
                { id: 'ai-performance', label: 'AI 성능 연구소', description: 'AI 모델 성능 및 정확도 분석', icon: Activity, minPlan: 'Professional' },
                { id: 'process-monitoring', label: '프로세스 모니터링', description: '시스템 스트레스 테스트 및 이상 탐지', icon: Activity, minPlan: 'Professional' },
            ]
        }
    ];

    const switchPlan = (plan: 'Free' | 'Basic' | 'Standard' | 'Professional') => {
        if (!tenantInfo) return;
        const limits = { Free: 5, Basic: 50, Standard: 200, Professional: 1000 };
        updateTenantInfo({
            ...tenantInfo,
            plan,
            aiUsageLimit: limits[plan]
        });
        setIsPlanModalOpen(false);
    };

    const SidebarContent = () => {
        const { ledger } = useContext(AccountingContext)!;
        const unconfirmedCount = ledger.filter(e => e.status === 'Unconfirmed' || e.status === 'Pending Review').length;

        return (
            <div className="flex flex-col h-full bg-[#070C18] text-slate-400 border-r border-[#151D2E] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-[73px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20">
                            <Sparkles className="text-white" size={18} />
                        </div>
                        <span className="text-white font-black text-lg tracking-tight">AccountingFlow</span>
                    </div>
                    {isMobile && (
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-8">
                    {menuGroups.map((group, groupIdx) => (
                        <div key={groupIdx} className="space-y-1">
                            <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">{group.title}</h3>
                            {group.items.map((item) => (
                                <Tooltip key={item.id} content={item.description} position="right">
                                    <button
                                        onClick={() => {
                                            setTab(item.id);
                                            if (isMobile) setIsOpen(false);
                                        }}
                                        className={`w-full group flex items-center justify-between px-4 py-3 rounded-2xl transition-all duration-300 relative ${activeTab === item.id
                                            ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 active-glow'
                                            : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3 relative z-10">
                                            <div className="relative">
                                                <item.icon size={18} className={activeTab === item.id ? 'text-white' : 'text-slate-600 group-hover:text-indigo-400 transition-colors'} />
                                                {item.minPlan !== 'Free' && tenantInfo && tenantInfo.plan === 'Free' && (
                                                    <div className="absolute -top-1.5 -right-1.5 p-0.5 bg-slate-800 rounded-full border border-white/10 group-hover:scale-110 transition-transform">
                                                        <Lock size={8} className="text-amber-500" />
                                                    </div>
                                                )}
                                            </div>
                                            <span className="font-bold text-[13px] tracking-wide">{item.label}</span>
                                        </div>

                                        {item.id === 'journal' && unconfirmedCount > 0 && (
                                            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${activeTab === item.id
                                                ? 'bg-white text-indigo-600'
                                                : 'bg-[#1E293B] text-slate-300 border border-white/10'
                                                } animate-in zoom-in duration-300 flex items-center gap-1`}>
                                                <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
                                                {unconfirmedCount} Unclassified
                                            </span>
                                        )}

                                        {activeTab === item.id && (
                                            <motion.div
                                                layoutId="activeTab"
                                                className="absolute inset-0 bg-indigo-600 rounded-2xl -z-10"
                                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                            />
                                        )}
                                    </button>
                                </Tooltip>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* SaaS Plan Status Card */}
                {tenantInfo && (
                    <div className={`mx-4 mb-2 p-4 rounded-2xl shadow-lg shrink-0 overflow-hidden relative group transition-all duration-500 ${usageStatus === 'warning' ? 'bg-amber-500/10 border-amber-500/20' : usageStatus === 'blocked' ? 'bg-rose-500/10 border-rose-500/20' : 'bg-indigo-600/5 border-indigo-500/20'}`}>
                        <div className={`absolute -top-4 -right-4 w-12 h-12 rounded-full blur-xl group-hover:scale-150 transition-transform duration-700 ${usageStatus === 'warning' ? 'bg-amber-500/10' : usageStatus === 'blocked' ? 'bg-rose-500/10' : 'bg-indigo-500/10'}`}></div>
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md ${tenantInfo.plan === 'Professional' ? 'bg-amber-500/20 text-amber-400' :
                                    tenantInfo.plan === 'Standard' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-500/20 text-slate-400'
                                    }`}>
                                    {tenantInfo.plan} PLAN
                                </span>
                                <span className="text-[10px] font-bold text-slate-500">AI Usage</span>
                            </div>

                            <div className="flex justify-between items-end mb-1.5">
                                <span className="text-xs font-black text-white">{tenantInfo.aiUsageCurrent} <span className="text-slate-500 font-bold">/ {tenantInfo.aiUsageLimit}</span></span>
                                <span className="text-[10px] font-black text-indigo-400">{Math.round((tenantInfo.aiUsageCurrent / tenantInfo.aiUsageLimit) * 100)}%</span>
                            </div>

                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${usageStatus === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : usageStatus === 'blocked' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]'}`}
                                    style={{ width: `${Math.min(100, (tenantInfo.aiUsageCurrent / tenantInfo.aiUsageLimit) * 100)}%` }}
                                ></div>
                            </div>

                            {usageStatus !== 'normal' && (
                                <p className={`mt-2 text-[9px] font-black uppercase tracking-tight ${usageStatus === 'warning' ? 'text-amber-400' : 'text-rose-400'}`}>
                                    {usageStatus === 'warning' ? '⚠️ Usage Warning (80% reached)' : '🚫 Monthly AI Limit Reached'}
                                </p>
                            )}

                            <button
                                onClick={() => setIsPlanModalOpen(true)}
                                className="w-full mt-3 py-1.5 border border-white/5 rounded-lg text-[9px] font-black text-slate-400 hover:bg-white/5 hover:text-white transition-all uppercase tracking-widest"
                            >
                                Manage Subscription
                            </button>
                        </div>
                    </div>
                )}

                {/* Bottom Section */}
                <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm shrink-0 space-y-1">
                    <button
                        onClick={() => {
                            setTab('migration');
                            if (isMobile) setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${activeTab === 'migration' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Database size={18} className={activeTab === 'migration' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                        <span className="font-bold text-[13px] tracking-wide">데이터 연동 및 이관</span>
                    </button>

                    <button
                        onClick={() => {
                            const nextTheme = theme === 'auto' ? 'light' : theme === 'light' ? 'dark' : 'auto';
                            setTheme(nextTheme);
                        }}
                        className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl hover:bg-white/5 hover:text-slate-200 transition-all duration-300 group"
                    >
                        <div className="flex items-center gap-3">
                            {resolvedTheme === 'dark' ? (
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-slate-300">
                                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-500 group-hover:text-slate-300">
                                    <circle cx="12" cy="12" r="5" /><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72 1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                                </svg>
                            )}
                            <span className="font-bold text-[13px] tracking-wide">
                                {theme === 'auto' ? '자동 테마' : theme === 'light' ? '라이트' : '다크'}
                            </span>
                        </div>
                    </button>

                    <button
                        onClick={() => {
                            setTab('settings');
                            if (isMobile) setIsOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${activeTab === 'settings' ? 'bg-indigo-600/10 text-indigo-400' : 'hover:bg-white/5 text-slate-500 hover:text-slate-300'}`}
                    >
                        <Settings size={18} className={activeTab === 'settings' ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'} />
                        <span className="font-bold text-[13px] tracking-wide">시스템 설정</span>
                    </button>

                    <button className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group">
                        <LogOut size={18} className="text-slate-600 group-hover:text-red-400 shrink-0" />
                        <span className="font-bold text-[13px] tracking-wide truncate">로그아웃</span>
                    </button>
                </div>
            </div>
        );
    };

    return (
        <>
            {/* Plan Switcher Modal */}
            <AnimatePresence>
                {isPlanModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPlanModalOpen(false)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="relative w-full max-w-lg bg-[#151D2E] rounded-[32px] border border-white/5 p-10 shadow-2xl overflow-hidden"
                        >
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500 to-transparent"></div>
                            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">구독 플랜 시뮬레이터</h2>
                            <p className="text-slate-500 font-bold mb-10 text-sm">Phase 6 인프라 테스트를 위해 플랜을 즉시 전환할 수 있습니다.</p>

                            <div className="space-y-4">
                                {(['Free', 'Basic', 'Standard', 'Professional'] as const).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => switchPlan(p)}
                                        className={`w-full p-6 rounded-2xl border flex items-center justify-between transition-all group ${tenantInfo?.plan === p ? 'bg-indigo-600/10 border-indigo-500/40' : 'bg-white/5 border-white/5 hover:bg-white/10'
                                            }`}
                                    >
                                        <div className="text-left">
                                            <h4 className="text-lg font-black text-white mb-1">{p}</h4>
                                            <p className="text-xs text-slate-500 font-bold">
                                                {p === 'Free' ? 'AI 5회 한도 / 기본 분석' :
                                                    p === 'Basic' ? 'AI 50회 한도 / 클로징 분석' :
                                                        p === 'Standard' ? 'AI 200회 한도 / 전략 리포트' : 'AI 1000회 한도 / 전체 기능'}
                                            </p>
                                        </div>
                                        {tenantInfo?.plan === p && <Zap size={20} className="text-indigo-400 animate-pulse transition-transform" />}
                                    </button>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <div className="lg:hidden fixed top-4 left-4 z-[50]">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-3 bg-[#151D2E] rounded-xl shadow-2xl text-white hover:bg-[#1c283d] border border-white/5 transition-all active:scale-95"
                >
                    <Menu size={20} />
                </button>
            </div>

            <aside className="hidden lg:block w-[320px] h-screen shrink-0 sticky top-0">
                <SidebarContent />
            </aside>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/60 z-[60] backdrop-blur-sm lg:hidden"
                        />
                        <motion.aside
                            initial={{ x: "-100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "-100%" }}
                            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                            className="fixed inset-y-0 left-0 z-[70] w-[320px] lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
