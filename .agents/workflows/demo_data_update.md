---
description: How to regenerate and sync DemoCo 2025 sample data
---

# Demo Data Update Workflow

To ensure the demo version always has the latest 2025 DemoCo scenario data, follow these steps:

1. **Verify Logic**: Check `scripts/generate_sample_excel.js` matches the current business plan.
// turbo
2. **Execute Generation**:
```powershell
node scripts/generate_sample_excel.js
```

3. **Verify Output**: Confirm `real_data_sample.xlsx` contains the expected 103 journal entries.

// turbo
4. **Sync to Distribution**:
```powershell
copy real_data_sample.xlsx VC_Distribution\real_data_sample.xlsx
```

5. **Frontend Sync**: Ensure `AuditWorkspace.tsx`'s `rawData` state matches the first few rows of the generated Excel for visual consistency.
