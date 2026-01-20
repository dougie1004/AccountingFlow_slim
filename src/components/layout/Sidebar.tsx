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
    Zap
} from 'lucide-react';
import { useContext } from 'react';
import { AccountingContext } from '../../context/AccountingContext';
import { AnimatePresence, motion } from 'framer-motion';

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
        { id: 'dashboard', label: '경영 관리 대시보드', icon: LayoutDashboard },
        { id: 'ledger', label: 'AI 자동 분개장', icon: BookOpen },
        { id: 'ledger-view', label: '총계정원장 (G/L)', icon: FileText },
        { id: 'migration', label: 'ERP 데이터 이관', icon: Database },
        { id: 'scm', label: '공급망(SCM) 관리', icon: ShoppingCart },
        { id: 'inventory', label: '재고 자산 관리', icon: Package },
        { id: 'assets', label: '고정자산 관리', icon: Landmark },
        { id: 'partners', label: '거래처 네트워크', icon: Users },
        { id: 'approval-desk', label: '전표 승인 및 거버넌스', icon: ShieldCheck, badge: true },
        { id: 'tax-adjustments', label: '세무 조정 엔진 (Tax)', icon: Calculator },
        { id: 'advanced-ledger', label: '[Advanced] 특수 회계', icon: Zap },
        { id: 'reports', label: 'AI 경영 분석 리포트', icon: TrendingUp },
        { id: 'settings', label: '시스템 설정', icon: Settings },
    ];

    const SidebarContent = () => {
        const { ledger } = useContext(AccountingContext)!;
        const unconfirmedCount = ledger.filter(e => e.status === 'Unconfirmed').length;

        return (
            <div className="flex flex-col h-full bg-[#070C18] text-slate-400 border-r border-[#151D2E] shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="h-[73px] flex items-center justify-between px-6 border-b border-white/5 shrink-0">
                    <span className="text-white font-bold text-lg lg:text-xs lg:uppercase lg:tracking-[0.2em] lg:text-slate-500">Navigation Menu</span>
                    <button onClick={() => setIsOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
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
                            <span className="font-semibold tracking-wide truncate">{item.label}</span>

                            {item.id === 'approval-desk' && unconfirmedCount > 0 && (
                                <span className="ml-auto bg-rose-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-md min-w-[20px] text-center shadow-lg shadow-rose-600/20">
                                    {unconfirmedCount}
                                </span>
                            )}

                            {activeTab === item.id && (
                                <div className={`${item.id === 'approval-desk' && unconfirmedCount > 0 ? 'ml-2' : 'ml-auto'} w-1.5 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_8px_rgba(79,70,229,0.8)] shrink-0`}></div>
                            )}
                        </button>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5 bg-slate-950/50 backdrop-blur-sm shrink-0 space-y-2">
                    <button
                        onClick={() => {
                            if (window.confirm('시연을 위해 모든 데이터를 초기화하시겠습니까?')) {
                                (window as any).resetData?.();
                                setTab('dashboard');
                            }
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-orange-500/10 hover:text-orange-400 transition-all duration-300 group"
                    >
                        <RotateCcw size={20} className="text-slate-500 group-hover:text-orange-400 shrink-0" />
                        <span className="font-semibold tracking-wide truncate">시연 환경 초기화</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 hover:text-red-400 transition-all duration-300 group">
                        <LogOut size={20} className="text-slate-500 group-hover:text-red-400 shrink-0" />
                        <span className="font-semibold tracking-wide truncate">로그아웃</span>
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
            <aside className="hidden lg:block w-[280px] h-screen shrink-0 sticky top-0">
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
                            className="fixed inset-y-0 left-0 z-[70] w-[280px] lg:hidden"
                        >
                            <SidebarContent />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    );
};
