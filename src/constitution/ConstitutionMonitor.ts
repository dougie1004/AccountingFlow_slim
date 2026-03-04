
import { AccountNature } from '../types';

type DetectionMethod = 'EXPLICIT' | 'HEURISTIC';
type SystemContext = 'REAL_WORLD' | 'SIMULATION';
export type ViolationLevel = 'WARNING' | 'CRITICAL' | 'SYSTEM_SHUTDOWN';

export interface ViolationLog {
    timestamp: string;
    type: string;
    detail: string;
    count: number;
    level: ViolationLevel;
}

/**
 * 🛡️ ConstitutionMonitor (System Immunity System)
 * 
 * "The Constitution is not just a document; it's a living immune system."
 * 
 * This module tracks:
 * 1. Nature Detection Confidence (Explicit vs Heuristic)
 * 2. System Context (Simulation vs Real World)
 * 3. Violation Recurrence & Escalation
 */
export class ConstitutionMonitor {
    private static instance: ConstitutionMonitor;

    // Internal Logs (In-memory for now, could be flushed to backend)
    private detectionLogs: Array<{ account: string; nature: AccountNature; method: DetectionMethod; context: SystemContext }> = [];
    private violationHistory: Map<string, ViolationLog> = new Map();

    private currentContext: SystemContext = 'REAL_WORLD';

    private constructor() {
        console.log("🛡️ ConstitutionMonitor Initialized: System Integrity Protection Active");
    }

    public static getInstance(): ConstitutionMonitor {
        if (!ConstitutionMonitor.instance) {
            ConstitutionMonitor.instance = new ConstitutionMonitor();
        }
        return ConstitutionMonitor.instance;
    }

    public setContext(context: SystemContext) {
        if (this.currentContext !== context) {
            console.log(`[System Context Change] ${this.currentContext} -> ${context}`);
            this.currentContext = context;
        }
    }

    public getContext(): SystemContext {
        return this.currentContext;
    }

    /**
     * Directive 1: Heuristic Confidence Logging
     */
    public logNatureDetection(account: string, nature: AccountNature, method: DetectionMethod) {
        // We only log to console in non-production or specific debug modes to avoid noise,
        // but store internally for "Black Box" analysis.

        this.detectionLogs.push({
            account,
            nature,
            method,
            context: this.currentContext
        });

        // "Explosion" Pre-check: If heuristic, we watch it closely.
        if (method === 'HEURISTIC') {
            // Internal trace only
            // console.debug(`[Nature Detection] Heuristic applied for '${account}' -> ${nature}`); 
        }
    }

    /**
     * Directive 3: Violation Recurrence Check
     */
    public recordViolation(type: string, detail: string): ViolationLevel {
        const key = `${type}:${detail}`;
        const now = new Date().toISOString();

        let log = this.violationHistory.get(key);

        if (!log) {
            log = {
                timestamp: now,
                type,
                detail,
                count: 1,
                level: 'WARNING'
            };
            this.violationHistory.set(key, log);
            console.warn(`[Constitution Warning] ${type}: ${detail}`);
            return 'WARNING';
        } else {
            // Recurrence detected! Escalate.
            log.count++;
            log.timestamp = now;

            if (log.count >= 2) {
                log.level = 'CRITICAL';
                console.error(`[Constitution Escalation] RECURRENT VIOLATION (${log.count}x): ${type} - ${detail}`);
                console.error("⛔ SYSTEM INTEGRITY AT RISK. IMMUNITY REACTION TRIGGERED.");
            }

            return log.level;
        }
    }

    public getStats() {
        return {
            totalDetections: this.detectionLogs.length,
            heuristicCount: this.detectionLogs.filter(l => l.method === 'HEURISTIC').length,
            violations: Array.from(this.violationHistory.values())
        };
    }
}
