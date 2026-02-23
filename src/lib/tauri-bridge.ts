import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { listen as tauriListen, UnlistenFn } from "@tauri-apps/api/event";

export const isTauri = (): boolean => {
    return typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__ !== undefined;
};

export const safeInvoke = async <T>(command: string, args?: Record<string, any>): Promise<T> => {
    try {
        if (isTauri()) {
            return await tauriInvoke<T>(command, args);
        } else {
            return await mockInvoke<T>(command, args);
        }
    } catch (error: any) {
        console.error(`[App Error] Backend command failed: ${command}. ${error?.message || error}`);
        throw error;
    }
};

const mockInvoke = async <T>(command: string, args?: any): Promise<T> => {
    console.warn(`[Web Mode] Mock for command: ${command}`, args);
    switch (command) {
        case 'init_db': return true as unknown as T;
        case 'get_management_projects':
            return [
                { id: "M-CARE-2026", title: "M-Care 서비스 런칭 무결성 검증", status: "Execution", progress_pct: 65, lead_reviewer: "CFO 김철수" }
            ] as unknown as T;
        case 'get_management_tasks':
            return [
                { id: 1, phase: "Planning", title: "2026년 설립 자본금 등기 대조", assignee: "김철수", due_date: "2026-05-15", status: "Completed" },
                { id: 2, phase: "Execution", title: "2026년 하반기 마케팅 지출 적정성 조사", assignee: "이영희", due_date: "2026-09-15", status: "InProgress" }
            ] as unknown as T;
        case 'process_review_context':
            return {
                summary: "AI 정밀 분석 완료",
                risk_score: 15,
                findings: []
            } as unknown as T;
        case 'get_audit_issues': return [] as unknown as T;
        default: return null as unknown as T;
    }
};

export const safeListen = async <T>(event: string, handler: (event: any) => void): Promise<UnlistenFn> => {
    try {
        if (isTauri()) {
            return await tauriListen<T>(event, handler);
        } else {
            return () => { };
        }
    } catch (error) {
        return () => { };
    }
};
