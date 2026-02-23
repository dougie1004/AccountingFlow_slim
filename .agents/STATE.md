# Project State: AccountingFlow CFO Intelligence

## 1. Core Terminology Refactor
- **Audit → Management Review**: Formal audit terms have been replaced with "Management Review" or "Integrity Verification" to match a startup's operational context.
- **Certified Mode → Reproducible Mode**: "Certified Audit" has been renamed to "Reproducible Review Run" or "Locked Compliance Run".

## 2. Active Demo Scenario: DemoCo 2025
- **Company Name**: DemoCo
- **Scenario Year**: 2025
- **Business Model**: Early-stage SaaS (Seed)
- **Key Events**:
    - Jan 1: Seed investment (350M KRW)
    - Aug 28: Marketing Spike (30M KRW)
    - Dec 28: Year-end Bonus (25M KRW)
    - Monthly: Scale revenue (5M → 60M) and fixed expenses (Payroll 25M, Rent 3M, Server 1.5M).

## 3. Data Generation Pipeline
- **Generator**: `scripts/generate_sample_excel.js`
- **Output**: `real_data_sample.xlsx` (Journal format)
- **Distribution**: Copied to `VC_Distribution/real_data_sample.xlsx`

## 4. Current Command Mapping
- `get_management_projects`: Returns DemoCo 2025 projects.
- `get_management_tasks`: Returns tasks for 2025.
- `process_review_context`: Handles AI analysis for management review.

---
*Last Updated: 2026-02-23*
