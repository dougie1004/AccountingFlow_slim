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
    const { tenantInfo, updateTenantInfo, usageStatus, checkPlanAccess } = useConfig();
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
            title: '경영 인사이트 (Executive Insight)',
            items: [
                { id: 'dashboard', label: 'CFO 대시보드', description: '실시간 재무 KPI 및 AI 전략 리포트', icon: LayoutDashboard, minPlan: 'Free' },
                { id: 'executive-report', label: '경영 성과 리포트', description: '월간 확정 실적 및 VC 대응용 분석 보고서', icon: FileText, minPlan: 'Basic' },
                { id: 'simulation-report', label: '월별 손익 현황', description: '월별 손익 추뮬레이션 및 전략적 예측 (P&L)', icon: Zap, minPlan: 'Standard' },
                { id: 'daily-cash', label: '자금수지 (Cash Flow)', description: '일일 시재 및 현금 흐름 분석', icon: Wallet, minPlan: 'Free' },
                { id: 'risk-dashboard', label: '리스크 및 자금 통제', description: '미정산 항목, 가계정 정밀 분석 및 자금 사고 예방 모니터링', icon: Shield, minPlan: 'Standard' },
                { id: 'operation-plan', label: '사업 계획 및 예산', description: '예산 편성 및 실적 대비 분석(BP)', icon: TrendingUp, minPlan: 'Standard' },
            ].filter(item => checkPlanAccess(item.minPlan as any))
        },
        {
            title: '회계 실무 및 관리 (Operations)',
            items: [
                { id: 'journal', label: '분개 전표 (AI Journal)', description: 'AI 자동화 전표 처리 및 사전 검토', icon: BookOpen, minPlan: 'Free' },
                { id: 'general-ledger', label: '총계정원장 (Ledger)', description: '계정별 거래 상세 내역 및 장부 조회', icon: FileSpreadsheet, minPlan: 'Free' },
                { id: 'trial-balance', label: '합계잔액시산표 / 재무제표', description: '재무상태표, 손익계산서 및 시산표 실시간 조회', icon: FileText, minPlan: 'Free' },
                { id: 'arap-management', label: '미결제 및 정산 관리', description: '미수금(AR)·미지급금(AP) 상세 명세 및 수동 정산 처리', icon: RotateCcw, minPlan: 'Standard' },
                { id: 'closing-manager', label: '결산 및 승인 센터', description: '전표 승인 및 월마감 정밀 검증', icon: Lock, minPlan: 'Basic' },
                { id: 'assets', label: '고정자산 관리', description: '유형/무형 자산 상각 대장 및 명세서 관리', icon: Landmark, minPlan: 'Standard' },
                { id: 'leases', label: '리스 계약 관리', description: 'IFRS 16 기반 사용권자산 및 리스부채 관리', icon: Building2, minPlan: 'Professional' },
                { id: 'partners', label: '거래처 관리 및 원장', description: '주요 거래처 정보 및 거래 내역 관리', icon: Users, minPlan: 'Free' },
            ].filter(item => checkPlanAccess(item.minPlan as any))
        },
        {
            title: '시스템 및 거버넌스 (Governance)',
            items: [
                { id: 'migration', label: '데이터 연동 및 마이그레이션', description: '엑셀 및 외부 데이터 유입 및 정합성 검증', icon: Database, minPlan: 'Free' },
                { id: 'settings', label: '회계 정책 및 권한 설정', description: '현법 기반 회계 정책 및 Tenant 접근 제어', icon: Settings, minPlan: 'Free' },
                { id: 'ai-performance', label: 'AI 성능 및 내부통제 검증', description: 'AI 모델 정확도 및 시스템 스트레스 테스트', icon: Activity, minPlan: 'Professional' },
            ].filter(item => {
                const demoMode = (window as any).isDemoMode || import.meta.env.VITE_APP_MODE === 'demo';
                if (demoMode && ['ai-performance', 'process-monitoring'].includes(item.id)) return false;
                return checkPlanAccess(item.minPlan as any);
            })
        }
    ].filter(group => group.items.length > 0);

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
                    <button
                        onClick={() => {
                            setTab('dashboard');
                            if (isMobile) setIsOpen(false);
                        }}
                        className="flex items-center gap-3 hover:opacity-80 transition-opacity group"
                    >
                        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-600/20 group-hover:scale-110 transition-transform">
                            <Sparkles className="text-white" size={18} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-white font-black text-lg tracking-tight">AccountingFlow</span>
                            {((window as any).isDemoMode || import.meta.env.VITE_APP_MODE === 'demo') && (
                                <span className="text-[9px] text-emerald-400 font-black uppercase tracking-widest bg-emerald-400/10 px-1.5 py-0.5 rounded ml-0.5 w-fit">Demo Edition</span>
                            )}
                        </div>
                    </button>
                    {isMobile && (
                        <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                            <X size={20} />
                        </button>
                    )}
                </div>

                {/* Nav */}
                <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar space-y-8">
                    <div className="space-y-1">
                        <button
                            onClick={() => {
                                setTab('dashboard');
                                if (isMobile) setIsOpen(false);
                            }}
                            className={`w-full group flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 ${activeTab === 'dashboard'
                                ? 'bg-indigo-600/10 text-indigo-400'
                                : 'text-slate-500 hover:bg-white/[0.03] hover:text-slate-200'
                                }`}
                        >
                            <LayoutDashboard size={18} className={activeTab === 'dashboard' ? 'text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400'} />
                            <span className="font-bold text-[13px] tracking-wide">홈 (대시보드 메인)</span>
                        </button>
                    </div>

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
                                <span className="text-xs font-black text-white">{tenantInfo.aiUsageCurrent || 0} <span className="text-slate-500 font-bold">/ {tenantInfo.aiUsageLimit || 100}</span></span>
                                <span className="text-[10px] font-black text-indigo-400">
                                    {Math.round(((tenantInfo.aiUsageCurrent || 0) / (tenantInfo.aiUsageLimit || 1)) * 100)}%
                                </span>
                            </div>

                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div
                                    className={`h-full transition-all duration-1000 ${usageStatus === 'warning' ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : usageStatus === 'blocked' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' : 'bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.5)]'}`}
                                    style={{ width: `${Math.min(100, ((tenantInfo.aiUsageCurrent || 0) / (tenantInfo.aiUsageLimit || 1)) * 100)}%` }}
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
