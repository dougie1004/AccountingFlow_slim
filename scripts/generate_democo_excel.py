# DemoCo 체험판용 전표 데이터를 XLSX로 재생성

import pandas as pd
import os

# 기본 설정
months = range(1, 13)
data = []
journal_id = 1

def add_entry(date, account_code, account_name, debit, credit, description):
    global journal_id
    data.append({
        "journal_id": journal_id,
        "journal_date": date,
        "account_code": account_code,
        "account_name": account_name,
        "debit": debit,
        "credit": credit,
        "description": description
    })

def next_journal():
    global journal_id
    journal_id += 1

# 계정 정의
accounts = {
    "cash": ("1110", "보통예금"),
    "ar": ("1120", "외상매출금"),
    "capital": ("3110", "자본금"),
    "apic": ("3120", "자본잉여금"),
    "revenue": ("4110", "SaaS구독매출"),
    "salary": ("5110", "급여"),
    "rent": ("5120", "임차료"),
    "server": ("5130", "서버비"),
    "marketing": ("5140", "마케팅비"),
    "fee": ("5150", "지급수수료")
}

# 1월 설립 전표
add_entry("2025-01-01", *accounts["cash"], 350_000_000, 0, "Seed 투자 유입")
add_entry("2025-01-01", *accounts["capital"], 0, 50_000_000, "자본금 설정")
add_entry("2025-01-01", *accounts["apic"], 0, 300_000_000, "자본잉여금 설정")
next_journal()

monthly_revenue = {
    1: 5_000_000, 2: 5_000_000, 3: 5_000_000,
    4: 15_000_000, 5: 15_000_000, 6: 15_000_000,
    7: 40_000_000, 8: 40_000_000, 9: 40_000_000,
    10: 60_000_000, 11: 60_000_000, 12: 60_000_000
}

for m in months:
    date = f"2025-{m:02d}-28"
    rev = monthly_revenue[m]
    
    # 매출 (60% 현금, 40% 외상)
    add_entry(date, *accounts["cash"], rev * 0.6, 0, "구독매출 현금")
    add_entry(date, *accounts["ar"], rev * 0.4, 0, "구독매출 외상")
    add_entry(date, *accounts["revenue"], 0, rev, "매출 인식")
    next_journal()
    
    # 고정비
    add_entry(date, *accounts["salary"], 25_000_000, 0, "월 급여")
    add_entry(date, *accounts["rent"], 3_000_000, 0, "임차료")
    add_entry(date, *accounts["server"], 1_500_000, 0, "서버비")
    add_entry(date, *accounts["fee"], 2_000_000, 0, "지급수수료")
    add_entry(date, *accounts["cash"], 0, 31_500_000, "고정비 지급")
    next_journal()
    
    # 8월 마케팅 스파이크
    if m == 8:
        add_entry(date, *accounts["marketing"], 30_000_000, 0, "마케팅 캠페인 집행")
        add_entry(date, *accounts["cash"], 0, 30_000_000, "마케팅비 지급")
        next_journal()
    
    # 12월 보너스
    if m == 12:
        add_entry(date, *accounts["salary"], 25_000_000, 0, "연말 보너스")
        add_entry(date, *accounts["cash"], 0, 25_000_000, "보너스 지급")
        next_journal()

df = pd.DataFrame(data)

# Save to local dir instead of /mnt/data
file_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "DemoCo_Journal_2025.xlsx")
df.to_excel(file_path, index=False)

print(f"Generated successfully: {file_path}")
