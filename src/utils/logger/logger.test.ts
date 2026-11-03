/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { logger } from "./logger";

describe("logger", () => {
	const consoleDebugSpy = jest
		.spyOn(console, "debug")
		.mockImplementation(() => {});
	const consoleInfoSpy = jest
		.spyOn(console, "info")
		.mockImplementation(() => {});
	const consoleWarnSpy = jest
		.spyOn(console, "warn")
		.mockImplementation(() => {});
	const consoleErrorSpy = jest
		.spyOn(console, "error")
		.mockImplementation(() => {});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it("should log info message", () => {
		logger.info("Info message", "InfoContext");
		expect(consoleInfoSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Info message",
				context: "InfoContext",
				level: "info"
			})
		);
	});

	it("should log info message with data", () => {
		const data = { user: "admin" };
		logger.info("User login", "AuthModule", data);
		expect(consoleInfoSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "User login",
				context: "AuthModule",
				level: "info"
			}),
			data
		);
	});

	it("should log warn message", () => {
		logger.warn("Warning", "WarnContext");
		expect(consoleWarnSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Warning",
				context: "WarnContext",
				level: "warn"
			})
		);
	});

	it("should log error message", () => {
		logger.error("Something failed", "ErrorContext");
		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Something failed",
				context: "ErrorContext",
				level: "error"
			})
		);
	});

	it("should handle logError with Error object", () => {
		const error = new Error("Something broke");
		logger.logError(error, "MyContext");

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Something broke",
				context: "MyContext",
				level: "error"
			}),
			error
		);
	});

	it("should handle logError with string", () => {
		const error = "Just a string error";
		logger.logError(error);

		expect(consoleErrorSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Just a string error",
				level: "error"
			}),
			error
		);
	});

	it("should handle logDebug with debug level", () => {
		logger.debug("Debug message", "DebugContext");

		expect(consoleDebugSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "Debug message",
				context: "DebugContext",
				level: "debug"
			})
		);
	});

	it("should not print data if it's equal to message", () => {
		logger.info("SameMessage", "Context", "SameMessage");
		expect(consoleInfoSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				message: "SameMessage",
				context: "Context",
				level: "info"
			}),
			"SameMessage"
		);
		expect(consoleInfoSpy.mock.calls[0].length).toBe(2);
	});
});
