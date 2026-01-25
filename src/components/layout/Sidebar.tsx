import React, { useState, useEffect } from 'react';
import {
    LayoutDashboard,
    BookOpen,
    Users,
    Settings,
    LogOut,
    TrendingUp,
    ListFilter,
    Menu,
    X,
    Calculator,
    Package,
    ShoppingCart,
    Landmark,
    ShieldCheck,
    Database,
    RotateCcw,
    FileText,
    Zap,
    PieChart,
    TrendingDown
} from 'lucide-react';
import { useContext } from 'react';
import { AccountingContext } from '../../context/AccountingContext';
import { useTheme } from '../../context/ThemeContext';
import { AnimatePresence, motion } from 'framer-motion';
import { Tooltip } from '../common/Tooltip';

interface SidebarProps {
    activeTab: string;
    setTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setTab }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

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
            title: '경영 및 분석 (Analysis)',
            items: [
                { id: 'dashboard', label: '대시보드', description: '현금 흐름, 주요 KPI 등 회사의 재무 상태를 파악합니다.', icon: LayoutDashboard },
                { id: 'reports', label: '경영 분석 리포트', description: 'IR용 및 경영진 대상 심층 분석 리포트를 생성합니다.', icon: TrendingUp },
            ]
        },
        {
            title: '회계 원장 (Accounting)',
            items: [
                { id: 'ledger', label: '거래 전표 관리', description: 'AI가 추출한 모든 거래 데이터를 조회하고 관리합니다.', icon: BookOpen },
                { id: 'ledger-view', label: '총계정원장 (G/L)', description: '표준 회계 기준에 따른 계정별 원장을 조회합니다.', icon: FileText },
                { id: 'approval-desk', label: '전표 승인 데스크', description: 'AI 분류 전표의 신뢰도를 검증하고 최종 승인합니다.', icon: ShieldCheck, badge: true },
                { id: 'financial-statements', label: '재무제표 (B/S, P/L)', description: '대차대조표, 손익계산서 등 표준 재무제표를 조회합니다.', icon: PieChart },
                { id: 'lease-ledger', label: '리스 회계 관리', description: 'K-IFRS 1116 리스 자산/부채 및 상환 스케줄을 관리합니다.', icon: TrendingDown },
                { id: 'advanced-ledger', label: '특수 회계 관리', description: 'R&D 자산화, 외화 평가 등 고난도 처리를 수행합니다.', icon: Zap },
            ]
        },
        {
            title: '운영 및 자산 (Operations)',
            items: [
                { id: 'scm', label: '공급망(SCM) 관리', description: '매입/매출 발주 및 물류 프로세스를 관리합니다.', icon: ShoppingCart },
                { id: 'inventory', label: '재고 자산 관리', description: '품목별 재고 현황 및 가치를 실시간으로 평가합니다.', icon: Package },
                { id: 'assets', label: '고정자산 관리', description: '유/무형 자산의 취득 및 감가상각을 관리합니다.', icon: Landmark },
                { id: 'partners', label: '거래처 네트워크', description: '주요 거래처와의 거래 관계 및 승인 상태를 관리합니다.', icon: Users },
            ]
        },
        {
            title: '세무 및 규제 (Tax)',
            items: [
                { id: 'tax-adjustments', label: '세무 조정 엔진', description: '법인세 추정, 부가세 맵핑 등 전문 세무 기능을 수행합니다.', icon: Calculator },
            ]
        }
    ];

    const SidebarContent = () => {
        const { ledger, resetData } = useContext(AccountingContext)!;
        const { theme, setTheme, resolvedTheme } = useTheme();
        const unconfirmedCount = ledger.filter(e => e.status === 'Unconfirmed' || e.status === 'Pending Review').length;

        return (
            <div className="flex flex-col h-full bg-[#070C18] text-slate-400 border-r border-[#151D2E] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-[73px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
                    <div className="flex flex-col">
                        <span className="text-white font-black text-sm tracking-tight">AccountingFlow</span>
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-indigo-500/80">Professional Controller</span>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto custom-scrollbar">
                    {menuGroups.map((group) => (
                        <div key={group.title} className="space-y-2">
                            <h3 className="px-4 text-[10px] font-black text-slate-600 uppercase tracking-[0.15em] mb-3">{group.title}</h3>
                            <div className="space-y-1">
                                {group.items.map((item) => (
                                    <Tooltip key={item.id} content={item.description} position="right">
                                        <button
                                            onClick={() => {
                                                setTab(item.id);
                                                if (isMobile) setIsOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-300 group ${activeTab === item.id
                                                ? 'bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]'
                                                : 'hover:bg-white/5 hover:text-slate-200'
                                                }`}
                                        >
                                            <item.icon size={18} className={`transition-colors shrink-0 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                            <span className="font-bold text-[13px] tracking-wide truncate">
                                                {item.label}
                                            </span>

                                            {item.id === 'approval-desk' && unconfirmedCount > 0 && (
                                                <span className="ml-auto bg-rose-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md min-w-[18px] text-center shadow-lg shadow-rose-600/20">
                                                    {unconfirmedCount}
                                                </span>
                                            )}

                                            {activeTab === item.id && (
                                                <div className={`${item.id === 'approval-desk' && unconfirmedCount > 0 ? 'ml-2' : 'ml-auto'} w-1 h-1 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.8)] shrink-0`}></div>
                                            )}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {/* Bottom Section: System & Onboarding */}
                <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm shrink-0 space-y-1">
                    <h3 className="px-4 text-[9px] font-black text-slate-700 uppercase tracking-[0.15em] mb-2">System Setup</h3>

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

                    {/* Theme Toggle Button */}
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
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider">
                            {theme.toUpperCase()}
                        </span>
                    </button>

                    <div className="my-2 border-t border-white/5" />

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

                    <div className="my-2 border-t border-white/5" />

                    <button
                        onClick={() => {
                            if (window.confirm('현재 장부의 모든 데이터를 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
                                resetData();
                                setTab('dashboard');
                            }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-300 group"
                    >
                        <RotateCcw size={18} className="text-slate-600 group-hover:text-orange-400 shrink-0" />
                        <span className="font-bold text-[13px] tracking-wide truncate">장부 데이터 초기화</span>
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
            {/* Mobile Toggle Button (Visible only on lg:hidden) */}
            <div className="lg:hidden fixed top-4 left-4 z-[50]">
                <button
                    onClick={() => setIsOpen(true)}
                    className="p-3 bg-[#151D2E] rounded-xl shadow-2xl text-white hover:bg-[#1c283d] border border-white/5 transition-all active:scale-95"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Desktop Sidebar (Static space occupier) */}
            <aside className="hidden lg:block w-[320px] h-screen shrink-0 sticky top-0">
                <SidebarContent />
            </aside>

            {/* Mobile/Tablet Drawer (Animated) */}
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
