/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { LogEntry, LogLevel } from "./logger.types";

const readLogLevel = (): LogLevel => {
	const env = (
		globalThis as typeof globalThis & {
			process?: { env?: Record<string, string | undefined> };
		}
	).process?.env;
	const fallback: LogLevel = "debug";
	const value = env?.LOG_LEVEL;
	if (!value) return fallback;
	const allowed: LogLevel[] = ["debug", "info", "warn", "error", "log"];
	return allowed.includes(value as LogLevel) ? (value as LogLevel) : fallback;
};

export const logger = {
	/**
	 * Logs a message with optional level, context, and additional data.
	 *
	 * @param message - The main message to log.
	 * @param context - Context or module source for the log.
	 * @param level - Log level ("debug", "info", "warn", "error").
	 * @param data - Optional additional data (e.g., object, error).
	 */
	log(
		message: string,
		context = "",
		level: LogLevel = "log",
		data?: unknown
	): void {
		const timestamp = new Date().toISOString();
		const logLevel = readLogLevel();

		const levels: LogLevel[] = ["debug", "info", "warn", "error"];
		const levelIndex = levels.indexOf(level);
		const envLevelIndex = levels.indexOf(logLevel);

		if (levelIndex < envLevelIndex) return;

		const entry: Partial<LogEntry> = {
			timestamp,
			level,
			message
		};

		if (context) entry.context = context;

		if (level === "error" && data instanceof Error && data.stack) {
			entry.stack = data.stack;
		}

		// Avoid logging `data` if it's just the same string as the message
		const logArgs = [entry];
		if (data !== undefined && data !== null) {
			logArgs.push(data);
		}

		switch (level) {
			case "info":
				console.info(...logArgs);
				break;
			case "warn":
				console.warn(...logArgs);
				break;
			case "error":
				console.error(...logArgs);
				break;
			case "debug":
				console.debug(...logArgs);
				break;
			default:
				console.log(...logArgs);
				break;
		}
	},

	info(message: string, context = "", data?: unknown) {
		this.log(message, context, "info", data);
	},

	warn(message: string, context = "", data?: unknown) {
		this.log(message, context, "warn", data);
	},

	error(message: string, context = "", error?: unknown) {
		this.log(message, context, "error", error);
	},

	debug(message: string, context = "", data?: unknown) {
		this.log(message, context, "debug", data);
	},

	logError(error: unknown, context = "") {
		const message = error instanceof Error ? error.message : String(error);
		this.error(message, context, error);
	}
};
