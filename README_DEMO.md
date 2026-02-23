# AccountingFlow Demo Mode Guide

This guide explains how to use and verify the new Demo Mode features.

## 1. Running in Demo Mode
To start the application in demo mode locally, use:
```bash
npm run dev:demo
```
This sets `VITE_APP_MODE=demo`, which triggers several UI changes.

## 2. Key Demo Features

### 🟢 Demo Sandbox Badge
A "Demo Sandbox Active" badge will appear in the Sidebar header to indicate the mode.

### 🤖 Custom AI Engine Setup
Users can now use their own Gemini API key for AI features:
1. Go to **Settings (설정)**.
2. Find the **AI 엔진 설정** section.
3. Enter your Gemini API key.
4. This key is stored in your local browser and used directly for:
   - CFO Assistant (Chat)
   - Transaction Parsing (AI Scanner)
   - Strategic Intelligence

### 🏆 Tier Simulation (Free vs Professional)
Experience the difference between subscription plans:
1. Go to **Settings (설정)**.
2. At the top, click **"Professional 플랜으로 전환"** or **"Free 플랜으로 전환"**.
3. **Free Plan**: Access to "Executive Report" and "Strategic Intelligence" will be blurred and locked.
4. **Professional Plan**: All premium features are unlocked.

### 🧹 Clean Navigation
Testing-specific menus (Integrity Center, AI Lab, Process Monitoring) are automatically hidden in demo mode to provide a focused experience for potential users.

## 3. Demo Data Exploration
- Use the "Load Demo Data" button in Settings to populate the app with a 3-year simulation including COGS, SG&A, and detailed transaction history.
- Upload `real_data_sample.xlsx` (located in the root folder) using the **Data Upload** menu to see the AI scan and ingest real-world accounting patterns.

---
*Powered by AccountingFlow Intelligent Engine*
