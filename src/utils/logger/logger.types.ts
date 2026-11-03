/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export type LogLevel = "debug" | "info" | "warn" | "error" | "log";

export interface LogEntry {
	timestamp: string;
	level: LogLevel;
	context?: string;
	message: string;
	stack?: string;
	source?: string;
}
