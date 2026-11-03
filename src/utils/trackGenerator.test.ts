/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import {
	generateTacticalName,
	generateBatchTracks,
	generateSingleTrack
} from "./trackGenerator";

describe("trackGenerator utils", () => {
	describe("generateTacticalName", () => {
		it("generates structured multi-line tactical name", () => {
			const name = generateTacticalName(1, 2);
			const lines = name.split("\n");

			expect(lines).toHaveLength(3);
			expect(lines[0]).toMatch(/^[A-Z-]+-0001$/);
			expect(lines[1]).toContain("#1");
			expect(lines[2]).toBe("Type-2");
		});

		it("formats track ID with 4 zero-padded digits", () => {
			const name = generateTacticalName(42, 0);
			expect(name).toContain("-0042");
		});
	});

	describe("generateBatchTracks", () => {
		it("generates the exact requested number of tracks", () => {
			const tracks = generateBatchTracks(50);
			expect(tracks).toHaveLength(50);
		});

		it("assigns sequential IDs starting from 1", () => {
			const tracks = generateBatchTracks(10);
			expect(tracks[0].id).toBe(1);
			expect(tracks[9].id).toBe(10);
		});

		it("generates valid tactical attributes within acceptable operational ranges", () => {
			const tracks = generateBatchTracks(25, 118, -2, 5);

			for (const track of tracks) {
				expect(track.status).toBe("ACTIVE");
				expect(track.course).toBeGreaterThanOrEqual(0);
				expect(track.course).toBeLessThan(360);
				expect(track.speed).toBeGreaterThanOrEqual(8);
				expect(track.speed).toBeLessThanOrEqual(36);
				expect(track.lon).toBeDefined();
				expect(track.lat).toBeDefined();
				expect(track.name).toBeDefined();
				expect(track.updatedAt).toBeGreaterThan(0);
			}
		});
	});

	describe("generateSingleTrack", () => {
		it("generates a track with specified ID and preferred tactical type", () => {
			const track = generateSingleTrack(999, 106.8, -6.2, 3);

			expect(track.id).toBe(999);
			expect(track.type).toBe(3);
			expect(track.name).toContain("Type-3");
			expect(track.lon).toBeGreaterThanOrEqual(105.0);
			expect(track.lon).toBeLessThanOrEqual(108.5);
			expect(track.lat).toBeGreaterThanOrEqual(-8.0);
			expect(track.lat).toBeLessThanOrEqual(-4.5);
		});

		it("picks a type automatically when preferredType is omitted", () => {
			const track = generateSingleTrack(100);

			expect(track.id).toBe(100);
			expect(track.type).toBeGreaterThanOrEqual(0);
			expect(track.status).toBe("ACTIVE");
		});
	});
});

