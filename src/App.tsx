import { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Dashboard } from './pages/Dashboard';
import BrandHeader from './components/layout/BrandHeader';
import Journal from './pages/Journal';
import LedgerView from './pages/LedgerView';
import Partners from './pages/Partners';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import { TaxAdjustments } from './pages/TaxAdjustments';
import ApprovalDesk from './pages/ApprovalDesk';
import { DataMigration } from './pages/DataMigration';
import { SCM } from './pages/SCM';
import { Assets } from './pages/Assets';
import { Inventory } from './pages/Inventory';

import { AccountingProvider } from './context/AccountingContext';
import { ConfigProvider, useConfig } from './context/ConfigContext';
import { OnboardingWizard } from './features/onboarding/OnboardingWizard';

const AppContent = () => {
    const [activeTab, setActiveTab] = useState('dashboard');
    const { isInitialized, updateConfig } = useConfig();

    return (
        <div className="flex h-screen bg-[#0B1221] font-sans antialiased text-white overflow-hidden">
            <Sidebar activeTab={activeTab} setTab={setActiveTab} />

            {/* Onboarding Overlay */}
            {!isInitialized && (
                <OnboardingWizard onComplete={(data) => {
                    updateConfig({
                        tenantId: `tenant-${crypto.randomUUID()}`,
                        isReadOnly: false,
                        entityMetadata: {
                            companyName: data.companyName,
                            regId: data.regId,
                            repName: "Manager",
                            corpType: data.isSme ? "SME" : "Large",
                            fiscalYearEnd: "12-31",
                            isStartupTaxBenefit: data.isStartupTaxBenefit
                        },
                        taxPolicy: {
                            depreciationMethod: "StraightLine",
                            entertainmentLimitBase: 24000000,
                            vatFilingCycle: "Quarterly",
                            aiGovernanceThreshold: data.governanceThreshold
                        },
                        initialBalances: data.initialBalances
                    });
                }} />
            )}

            <main className="flex-1 flex flex-col min-w-0 transition-all duration-300 relative">
                <BrandHeader />

                <div className="flex-1 overflow-y-auto scroll-smooth custom-scrollbar pt-16 lg:pt-0">
                    <div className="w-full max-w-[1600px] p-4 md:p-8 lg:p-10 mx-auto">
                        {activeTab === 'dashboard' && <Dashboard />}
                        {activeTab === 'ledger' && <Journal />}
                        {activeTab === 'ledger-view' && <LedgerView />}
                        {activeTab === 'scm' && <SCM />}
                        {activeTab === 'inventory' && <Inventory />}
                        {activeTab === 'assets' && <Assets />}
                        {activeTab === 'partners' && <Partners />}
                        {activeTab === 'reports' && <Reports />}
                        {activeTab === 'tax-adjustments' && <TaxAdjustments />}
                        {activeTab === 'approval-desk' && <ApprovalDesk />}
                        {activeTab === 'migration' && <DataMigration setTab={setActiveTab} />}
                        {activeTab === 'settings' && <Settings />}
                    </div>
                </div>
            </main>
        </div>
    );
};

function App() {
    return (
        <ConfigProvider>
            <AccountingProvider>
                <AppContent />
            </AccountingProvider>
        </ConfigProvider>
    );
}

export default App;
