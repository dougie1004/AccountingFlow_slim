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
