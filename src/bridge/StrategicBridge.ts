/**
 * ═══════════════════════════════════════════════════════════════════════════
 * STRATEGIC BRIDGE (Proprietary Interface)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * [INTERNAL CONTROL ART. 9]
 * This bridge is the ONLY authorized gateway to the Strategic Core.
 */

import * as CoreEngine from '../core_engine/accountingEngine';
import * as TrialBalance from '../core_engine/trialBalance';
import * as JournalValidator from '../core_engine/journalValidator';
import * as RawForecasting from '../strategic_layer/forecastingEngine';
import * as RawDeviation from '../strategic_layer/deviationEngine';
import * as RawRisk from '../strategic_layer/riskEngine';
import * as FinancialAnalyst from '../strategic_layer/financialAnalyst';
import * as RawResponsibility from '../strategic_layer/responsibilityEngine';

import { JournalEntry, Asset, LeaseContract, AccountNature, ClosingRecord, MonthlyBudget } from '../types';

/**
 * [Accounting Core]
 */
export const calculateFinancials = TrialBalance.calculateFinancials;
export const calculateNetCashChange = TrialBalance.calculateNetCashChange;
export const validateTransaction = JournalValidator.validateTransaction;
export const validateLedger = JournalValidator.validateLedger;

export const calculatePeriodDepreciation = CoreEngine.calculatePeriodDepreciation;
export const calculatePeriodLeaseEntries = CoreEngine.calculatePeriodLeaseEntries;
export const calculateLeaseSchedule = CoreEngine.calculateLeaseSchedule;
export const runClosingPrecheck = CoreEngine.runClosingPrecheck;
export const calculateDailyCashFlow = CoreEngine.calculateDailyCashFlow;

/**
 * [Closing Integration]
 * Orchestrates Core Data + Strategic Briefing
 */
export const generateClosingSnapshot = async (
    ledger: JournalEntry[],
    assets: Asset[],
    leases: LeaseContract[],
    period: string,
    note: string,
    userId: string,
    accountNatures: Record<string, AccountNature>,
    previousRecord?: ClosingRecord | null,
    budget?: MonthlyBudget
): Promise<ClosingRecord> => {
    // 1. Get raw deterministic data from core
    const data = CoreEngine.generateClosingSnapshotData(
        ledger, assets, leases, period, userId, accountNatures, note
    );

    // 2. Prepare the full record for analysis
    const fullRecord: ClosingRecord = {
        ...data,
        aiBriefing: '' // Placeholder
    };

    // 3. Generate strategic briefing
    const periodOnly = ledger.filter(e => e.status === 'Approved' && e.date.startsWith(period));
    fullRecord.aiBriefing = await FinancialAnalyst.generateClosingBriefing(
        fullRecord,
        previousRecord || null,
        budget,
        periodOnly
    );

    return fullRecord;
};

/**
 * [Forecasting]
 */
export const generateCashForecast = RawForecasting.generateCashForecast;
export const calculateRunway = RawForecasting.calculateRunway;

/**
 * [Intelligence & Risk]
 */
export const analyzeIntelligence = RawDeviation.analyzeIntelligence;
export const analyzeStrategicDeviation = RawDeviation.analyzeStrategicDeviation;
export const analyzeManagementRisks = RawRisk.analyzeManagementRisks;
export const generateManagementReport = RawRisk.generateManagementReport;
export const generateNarrativeBriefing = RawRisk.generateNarrativeBriefing;
export const getCFORiskSnapshot = RawRisk.getCFORiskSnapshot;

/**
 * [Consolidated Intelligence - SINGLE SOURCE OF TRUTH]
 * [CONSTITUTION ART 17] - Numerical Unification
 */
export const getConsolidatedMetrics = (
    ledger: JournalEntry[],
    closingRecords: ClosingRecord[],
    systemNow: string,
    initialCash: number,
    asOfDate?: string
) => {
    const targetDate = asOfDate || systemNow;
    const periodKey = targetDate.substring(0, 7);
    const closing = closingRecords.find(r => r.period === periodKey);

    if (closing && targetDate === `${periodKey}-31`) {
        // Return Sealed Truth
        return {
            cash: closing.summary.cash,
            revenue: closing.summary.revenue,
            expenses: closing.summary.expense,
            netIncome: closing.summary.profit,
            totalAssets: closing.summary.totalAssets,
            totalLiabilities: closing.summary.totalLiabilities,
            isSealed: true
        };
    }

    // Live Calculation
    const live = TrialBalance.calculateFinancials(ledger, targetDate, initialCash);
    return {
        cash: live.cash,
        revenue: live.revenue,
        expenses: live.expenses,
        netIncome: live.netIncome,
        totalAssets: live.totalAssets,
        totalLiabilities: live.totalLiabilities,
        isSealed: false
    };
};

/**
 * [Responsibility & Routing]
 */
export const getResponsibilityRoute = RawResponsibility.getResponsibilityRoute;
export const STARTUP_V1 = RawResponsibility.STARTUP_V1;

/**
 * [Internal Consistency Interface]
 */
export const StrategicInterface = {
    computeTruth: TrialBalance.calculateFinancials,
    predictFuture: RawForecasting.generateCashForecast,
    detectAnomalies: RawDeviation.analyzeIntelligence,
    getMetrics: getConsolidatedMetrics,
    version: '2.1.0-CONSOLIDATED'
};
