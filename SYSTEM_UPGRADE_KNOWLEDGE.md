# 🚀 Antigravity Upgrade & Knowledge Transfer Specification
**Project:** AccountingFlow (CFO-centric Strategic Accounting)
**Date:** 2026-02-20
**Version:** 2.2.0 (Post-Integrity Guard Deployment)

## 1. 📂 Core Objective & Philosophical Shift
Until Session 6, the system suffered from "Calculation Drift" where the Dashboard, AI Simulator, and Simulation Report interpreted "Current Cash" differently. 
**New Mandate:** Absolute Numerical Unification via `StrategicBridge`.

## 2. 🧠 Hard-Won Logic (Anti-Hallucination Guidelines)
*   **The Cash vs Equity Trap:** Never approximate "Cash" using `Assets - Liabilities` for closed periods. This ignores non-cash assets (Bi-pum, Intangibles) and accumulated losses, resulting in a false starting point for AI.
*   **Source of Truth:** Use `ClosingRecord.summary.cash`. This field was explicitly added to capture the bank balance at the moment of sealing.
*   **The Ghost Liability Fallacy:** Do not hallucinate "Gasoogeum" or "CEO Loans" to explain data gaps. If it's not in the ledger, it doesn't exist. Gaps are usually architectural (Live vs Sealed logic).

## 3. 🛡️ System Integrity Architecture
*   **StrategicBridge.ts:** Now functions as the **Single Source of Truth**. All components must call `getConsolidatedMetrics` to ensure they see the same reality.
*   **IntegrityGuard.tsx:** A background auditor that cross-references the Dashboard Cash vs the AI Forecast Start. It triggers a system-wide alert if divergence > 1 KRW occurs.
*   **Accounting Constitution Art. 16:** "Absolute Separation of Cash and Equity." The system is constitutionally prohibited from using anything other than the liquidated bank balance as a projection base.

## 4. 🛠️ Critical Code Interventions
| Component | Change Summary |
| :--- | :--- |
| `AccountingContext.tsx` | Switched `financials` and `getForecast` to use unified `getConsolidatedMetrics` logic. |
| `accountingEngine.ts` | Updated `generateClosingSnapshotData` to capture explicit `cash` values. |
| `SimulationReport.tsx` | Fixed `runningCash` initialization to use `initialCashBalance` instead of zero. |
| `IntegrityGuard.tsx` | New component monitoring numerical drift in real-time. |

## 5. 📈 Future Directives for "Upgraded" Antigravity
1.  **Trust but Verify:** Always check `IntegrityGuard` status before answering "Why is this number X?".
2.  **Architecture-First:** When a new report or simulation is added, it must inherit the `initialCashBalance` and `ClosingRecord` logic from the Bridge.
3.  **No Heuristics for Liquidity:** Liquidity is binary (it's in the bank or it isn't). Never apply "Strategic Pessimism" multipliers to the *starting* balance; only to *future* inflows/outflows.
4.  **AI Model Stability (Mandatory 2026):** Use ONLY Stable Gemini 2.0 Pro or higher models. Gemini 1.5, 1.0, and ALL Experimental (-exp) versions are strictly prohibited to prevent deprecation issues.

---
*This document serves as the "Memory Anchor" for the next version of Antigravity to ensure no regression of numerical integrity errors.*
