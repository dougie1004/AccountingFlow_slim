# 🚀 Project: AccountingFlow (v1.2.0-Alpha)

## 💎 Premium Updates (2026-01-10)
- **Inventory Value Flow (SCM)**: 매입-재고-매출원가로 이어지는 자금 흐름 시각화 엔진 탑재.
- **Glassmorphism UI**: 투자자용 프리미엄 대시보드 인터페이스 개편.
- **Robust Infrastructure**: Tauri WebView2 다운로드 안정성 및 Rust 컴파일 안정성 확보.

## 🛡️ Security & Optimization [cite: 2026-01-07]
- **PII Density Detection**: 50자 이내 민감 정보 밀집 시 즉시 차단하는 가중치 기반 필터링 적용.
- **Hybrid Model Routing**: 단순 전표는 Gemini 1.5 Flash, 전략 리포트는 1.5 Pro로 자동 라우팅하여 운영 원가 절감.

## 📊 SCM 시각화 지표
1. **Purchase Cost**: 발주 기반 취득 원가 누계
2. **Current Asset Value**: 현재 실재고 장부 가액
3. **COGS Mapping**: 판매 시 실시간 매출원가 변환 로직 적용

## Accounting Engine Invariants (Non-Negotiable Rules)

The core engine enforces absolute invariants to guarantee accounting integrity.
These rules MUST NEVER be bypassed in UI or State layers.

- Amount < 0 : ❌ Rejected
- VAT < 0 : ❌ Rejected
- Self-dealing (Debit == Credit) : ❌ Rejected

### Exception Policy
Adjustment entries (e.g. correcting entries, reversals, refunds) are NOT handled
as raw Journal Entries. They must be explicitly classified and processed through
a dedicated Adjustment Pipeline before reaching the core engine.

The core engine remains invariant-only by design.
