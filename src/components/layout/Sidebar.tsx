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
    PieChart
} from 'lucide-react';
import { useContext } from 'react';
import { AccountingContext } from '../../context/AccountingContext';
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

    const menuItems = [
        { id: 'dashboard', label: '경영 관리 대시보드', description: '현금 흐름, 주요 KPI 등 회사의 재무 상태를 한눈에 파악합니다.', icon: LayoutDashboard },
        { id: 'ledger', label: '거래 전표 관리', description: 'AI가 추출한 모든 거래 데이터를 조회하고 개별적으로 관리합니다.', icon: BookOpen },
        { id: 'ledger-view', label: '총계정원장 (G/L)', description: '표준 회계 기준에 따른 계정별 원장을 상세하게 조회합니다.', icon: FileText },
        { id: 'migration', label: '데이터 연동 및 이관', description: '외부 ERP(더존 등) 데이터를 지능적으로 분석하여 연동합니다.', icon: Database },
        { id: 'scm', label: '공급망(SCM) 관리', description: '매입/매출 발주 관리 및 물류 프로세스를 회계와 연결합니다.', icon: ShoppingCart },
        { id: 'inventory', label: '재고 자산 관리', description: '품목별 재고 현황 및 자산 가치를 실시간으로 평가합니다.', icon: Package },
        { id: 'assets', label: '고정자산 관리', description: '유/무형 자산의 취득 및 감가상각 내역을 자동 관리합니다.', icon: Landmark },
        { id: 'partners', label: '거래처 네트워크', description: '연동된 주요 거래처와의 거래 관계 및 승인 상태를 관리합니다.', icon: Users },
        { id: 'approval-desk', label: '전표 승인 및 거버넌스', description: 'AI 분류 전표의 신뢰도를 검증하고 최종 승인을 수행합니다.', icon: ShieldCheck, badge: true },
        { id: 'tax-adjustments', label: '세무 조정 엔진 (Tax)', description: '법인세 추정, 부가세 맵핑 등 전문 세무 조정 기능을 수행합니다.', icon: Calculator },
        { id: 'financial-statements', label: '재무제표 관리 (B/S, P/L)', description: '대차대조표, 손익계산서, 현금흐름표 등 표준 재무제표를 조회합니다.', icon: PieChart },
        { id: 'advanced-ledger', label: '특수 회계 관리', description: 'R&D 자산화, 외화 평가 등 고난도 회계 처리를 수행합니다.', icon: Zap },
        { id: 'reports', label: '경영 분석 리포트', description: 'IR용 요약 및 경영진 대상 심층 분석 리포트를 생성합니다.', icon: TrendingUp },
        { id: 'settings', label: '시스템 설정', description: '조직 메타데이터, 보안 정책 등 시스템 전반을 설정합니다.', icon: Settings },
    ];

    const SidebarContent = () => {
        const { ledger, resetData } = useContext(AccountingContext)!;
        const unconfirmedCount = ledger.filter(e => e.status === 'Unconfirmed').length;

        return (
            <div className="flex flex-col h-full bg-[#070C18] text-slate-400 border-r border-[#151D2E] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-[73px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
                    <span className="text-white font-bold text-lg lg:text-xs lg:uppercase lg:tracking-[0.2em] lg:text-slate-500">Professional Controller</span>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <Tooltip key={item.id} content={item.description} position="right">
                            <button
                                onClick={() => {
                                    setTab(item.id);
                                    if (isMobile) setIsOpen(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group ${activeTab === item.id
                                    ? 'bg-indigo-600/10 text-indigo-400 shadow-[inset_0_0_20px_rgba(79,70,229,0.1)]'
                                    : 'hover:bg-white/5 hover:text-slate-200'
                                    }`}
                            >
                                <item.icon size={20} className={`transition-colors shrink-0 ${activeTab === item.id ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
                                <span className="font-semibold tracking-wide truncate">
                                    {item.id === 'migration' ? '데이터 연동 및 이관' : item.label}
                                </span>

                                {item.id === 'approval-desk' && unconfirmedCount > 0 && (
                                    <span className="ml-auto bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg shadow-rose-600/20">
                                        {unconfirmedCount}
                                    </span>
                                )}

                                {activeTab === item.id && (
                                    <div className={`${item.id === 'approval-desk' && unconfirmedCount > 0 ? 'ml-2' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.8)] shrink-0`}></div>
                                )}
                            </button>
                        </Tooltip>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm shrink-0 space-y-2">
                    <button
                        onClick={() => {
                            if (window.confirm('현재 장부의 모든 데이터를 초기화하시겠습니까? (이 작업은 되돌릴 수 없습니다)')) {
                                resetData();
                                setTab('dashboard');
                            }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-300 group"
                    >
                        <RotateCcw size={20} className="text-slate-500 group-hover:text-orange-400 shrink-0" />
                        <span className="font-semibold tracking-wide truncate">장부 데이터 초기화</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group">
                        <LogOut size={20} className="text-slate-500 group-hover:text-red-400 shrink-0" />
                        <span className="font-semibold tracking-wide truncate">시스템 로그아웃</span>
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
