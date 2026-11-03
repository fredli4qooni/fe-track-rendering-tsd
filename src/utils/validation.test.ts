/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import {
	validateCourse,
	validateLatitude,
	validateLongitude,
	validateSpawnCount,
	validateSpeed,
	validateTrackName
} from "./validation";

describe("validation utils", () => {
	describe("validateTrackName", () => {
		it("accepts valid track names", () => {
			expect(validateTrackName("KRI-001").valid).toBe(true);
			expect(validateTrackName("Frigate #12").valid).toBe(true);
			expect(validateTrackName("  Callsign Alpha  ").valid).toBe(true);
		});

		it("rejects empty or whitespace-only names", () => {
			expect(validateTrackName("").valid).toBe(false);
			expect(validateTrackName("   ").valid).toBe(false);
			expect(validateTrackName("").error).toBe("Entity name cannot be empty.");
		});

		it("rejects names shorter than 2 characters", () => {
			const res = validateTrackName("A");
			expect(res.valid).toBe(false);
			expect(res.error).toBe("Entity name must be at least 2 characters.");
		});

		it("rejects names longer than 60 characters", () => {
			const longName = "A".repeat(61);
			const res = validateTrackName(longName);
			expect(res.valid).toBe(false);
			expect(res.error).toBe("Entity name cannot exceed 60 characters.");
		});
	});

	describe("validateLatitude", () => {
		it("accepts valid latitudes between -90 and 90", () => {
			expect(validateLatitude(0).valid).toBe(true);
			expect(validateLatitude(-90).valid).toBe(true);
			expect(validateLatitude(90).valid).toBe(true);
			expect(validateLatitude(-6.2088).valid).toBe(true);
		});

		it("rejects out-of-range latitudes", () => {
			expect(validateLatitude(-90.01).valid).toBe(false);
			expect(validateLatitude(90.01).valid).toBe(false);
			expect(validateLatitude(120).error).toContain("-90° and +90°");
		});

		it("rejects NaN or non-number inputs", () => {
			expect(validateLatitude(Number.NaN).valid).toBe(false);
			expect(validateLatitude("45" as unknown as number).valid).toBe(false);
		});
	});

	describe("validateLongitude", () => {
		it("accepts valid longitudes between -180 and 180", () => {
			expect(validateLongitude(0).valid).toBe(true);
			expect(validateLongitude(-180).valid).toBe(true);
			expect(validateLongitude(180).valid).toBe(true);
			expect(validateLongitude(106.8456).valid).toBe(true);
		});

		it("rejects out-of-range longitudes", () => {
			expect(validateLongitude(-180.1).valid).toBe(false);
			expect(validateLongitude(180.1).valid).toBe(false);
			expect(validateLongitude(200).error).toContain("-180° and +180°");
		});

		it("rejects NaN or non-number inputs", () => {
			expect(validateLongitude(Number.NaN).valid).toBe(false);
			expect(validateLongitude("100" as unknown as number).valid).toBe(false);
		});
	});

	describe("validateCourse", () => {
		it("accepts valid courses between 0 and 360 degrees", () => {
			expect(validateCourse(0).valid).toBe(true);
			expect(validateCourse(360).valid).toBe(true);
			expect(validateCourse(115.5).valid).toBe(true);
		});

		it("rejects courses outside 0 to 360 range", () => {
			expect(validateCourse(-1).valid).toBe(false);
			expect(validateCourse(360.5).valid).toBe(false);
			expect(validateCourse(400).error).toContain("0° and 360°");
		});

		it("rejects NaN", () => {
			expect(validateCourse(Number.NaN).valid).toBe(false);
		});
	});

	describe("validateSpeed", () => {
		it("accepts valid speeds between 0 and 120 knots", () => {
			expect(validateSpeed(0).valid).toBe(true);
			expect(validateSpeed(120).valid).toBe(true);
			expect(validateSpeed(28.4).valid).toBe(true);
		});

		it("rejects negative speeds or speeds over 120 knots", () => {
			expect(validateSpeed(-0.5).valid).toBe(false);
			expect(validateSpeed(121).valid).toBe(false);
			expect(validateSpeed(150).error).toContain("0 and 120 knots");
		});

		it("rejects NaN", () => {
			expect(validateSpeed(Number.NaN).valid).toBe(false);
		});
	});

	describe("validateSpawnCount", () => {
		it("accepts valid spawn counts between 50 and 10,000", () => {
			expect(validateSpawnCount(50).valid).toBe(true);
			expect(validateSpawnCount(2000).valid).toBe(true);
			expect(validateSpawnCount(10000).valid).toBe(true);
		});

		it("rejects counts below 50", () => {
			const res = validateSpawnCount(49);
			expect(res.valid).toBe(false);
			expect(res.error).toBe("Minimum spawn count is 50 tracks.");
		});

		it("rejects counts above 10,000", () => {
			const res = validateSpawnCount(10001);
			expect(res.valid).toBe(false);
			expect(res.error).toBe(
				"Maximum spawn count is 10,000 tracks (GPU acceleration limit)."
			);
		});

		it("rejects non-integer counts or NaN", () => {
			expect(validateSpawnCount(50.5).valid).toBe(false);
			expect(validateSpawnCount(Number.NaN).valid).toBe(false);
		});
	});
});
