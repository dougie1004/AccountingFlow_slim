import { useState, useEffect, createContext, useContext } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import BrandHeader from './components/layout/BrandHeader';
import { CfoAssistant } from './components/ai/CfoAssistant';
import Journal from './pages/Journal';
import LedgerView from './pages/LedgerView';
import Partners from './pages/Partners';
import Settings from './pages/Settings';
import ApprovalDesk from './pages/ApprovalDesk';
import { DataMigration } from './pages/DataMigration';
import { Assets } from './pages/Assets';
import FinancialStatements from './pages/FinancialStatements';
import DailyCashReport from './pages/DailyCashReport';
import VendorLedger from './pages/VendorLedger';
import TaxReport from './pages/TaxReport';
import { AiLab } from './pages/AiLab';
import { ArApManagement } from './pages/ArApManagement';
import { RiskDashboard } from './pages/RiskDashboard';
import { ClosingManager } from './pages/ClosingManager';
import { Leases } from './pages/Leases';
import { OperationPlan } from './pages/OperationPlan';

import { AccountingProvider } from './context/AccountingContext';
import { ConfigProvider } from './context/ConfigContext';
import { ThemeProvider } from './context/ThemeContext';


interface AppContextType {
    activeProject: string | null;
    setActiveProject: (id: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const useApp = () => {
    const context = useContext(AppContext);
    return context || { activeProject: null, setActiveProject: () => { } };
};

const AppContent = () => {
    // [Fix] Persist active tab to localStorage to maintain navigation state on refresh
    const [activeTab, setActiveTab] = useState(() => localStorage.getItem('last_active_tab') || 'dashboard');

    useEffect(() => {
        localStorage.setItem('last_active_tab', activeTab);
    }, [activeTab]);

    return (
        <div className="flex h-screen font-sans antialiased overflow-hidden" style={{ backgroundColor: 'var(--bg-main)', color: 'var(--text-high)' }}>
            <Sidebar activeTab={activeTab} setTab={setActiveTab} />

            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
                <BrandHeader />

                <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar pt-16 lg:pt-0">
                    <div className="w-full max-w-full p-4 md:p-6 lg:p-8">
                        {activeTab === 'dashboard' && <Dashboard setTab={setActiveTab} />}
                        {activeTab === 'tax-report' && <TaxReport />}
                        {activeTab === 'financial-statements' && <FinancialStatements />}
                        {activeTab === 'daily-cash' && <DailyCashReport />}
                        <div style={{ display: activeTab === 'ledger' ? 'block' : 'none' }}>
                            <Journal />
                        </div>
                        <div style={{ display: activeTab === 'ledger-view' ? 'block' : 'none' }}>
                            <LedgerView />
                        </div>
                        {activeTab === 'assets' && <Assets />}
                        {activeTab === 'leases' && <Leases />}
                        {activeTab === 'partners' && <Partners />}
                        {activeTab === 'vendor-ledger' && <VendorLedger />}
                        {activeTab === 'approval-desk' && <ApprovalDesk />}
                        {activeTab === 'migration' && <DataMigration setTab={setActiveTab} />}
                        {activeTab === 'ai-performance' && <AiLab />}
                        {activeTab === 'arap-management' && <ArApManagement />}
                        {activeTab === 'risk-dashboard' && <RiskDashboard setTab={setActiveTab} />}
                        {activeTab === 'closing-manager' && <ClosingManager />}
                        {activeTab === 'operation-plan' && <OperationPlan />}
                        {activeTab === 'settings' && <Settings />}
                    </div>
                </div>
            </main>
            <CfoAssistant />
        </div>
    );
};

function App() {
    const [activeProject, setActiveProject] = useState<string | null>(null);

    return (
        <ThemeProvider>
            <ConfigProvider>
                <AccountingProvider>
                    <AppContext.Provider value={{ activeProject, setActiveProject }}>
                        <AppContent />
                    </AppContext.Provider>
                </AccountingProvider>
            </ConfigProvider>
        </ThemeProvider>
    );
}

export default App;
