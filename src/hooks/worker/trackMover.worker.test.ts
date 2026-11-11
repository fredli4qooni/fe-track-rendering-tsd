/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { type WorkerTrack, deg2rad, moveTrackStep } from "./trackMover.worker";

describe("trackMover.worker kinematics", () => {
	const baseTrack: WorkerTrack = {
		id: 1,
		name: "KRI-TEST",
		lon: 106.0,
		lat: 0.0,
		course: 0,
		speed: 20
	};

	it("moves strictly North (+lat, unchanged lon) when course is 0°", () => {
		const moved = moveTrackStep({ ...baseTrack, course: 0 }, 0.01, 0);
		expect(moved.lat).toBeCloseTo(0.01, 6);
		expect(moved.lon).toBeCloseTo(106.0, 6);
	});

	it("moves strictly East (+lon, unchanged lat) when course is 90°", () => {
		const moved = moveTrackStep({ ...baseTrack, course: 90 }, 0.01, 0);
		expect(moved.lat).toBeCloseTo(0.0, 6);
		expect(moved.lon).toBeCloseTo(106.01, 6);
	});

	it("moves strictly South (-lat, unchanged lon) when course is 180°", () => {
		const moved = moveTrackStep({ ...baseTrack, course: 180 }, 0.01, 0);
		expect(moved.lat).toBeCloseTo(-0.01, 6);
		expect(moved.lon).toBeCloseTo(106.0, 6);
	});

	it("moves strictly West (-lon, unchanged lat) when course is 270°", () => {
		const moved = moveTrackStep({ ...baseTrack, course: 270 }, 0.01, 0);
		expect(moved.lat).toBeCloseTo(0.0, 6);
		expect(moved.lon).toBeCloseTo(105.99, 6);
	});

	it("scales longitude displacement by cos(lat) at non-equatorial latitudes", () => {
		const lat = 60;
		const moved = moveTrackStep({ ...baseTrack, lat, course: 45 }, 0.01, 0);
		const dLat = moved.lat - lat;
		const dLon = moved.lon - baseTrack.lon;

		expect(dLat).toBeGreaterThan(0);
		expect(dLon).toBeGreaterThan(0);
		expect(dLon * Math.cos(deg2rad(lat))).toBeCloseTo(dLat, 6);
	});

	it("keeps stationary tracks (speed = 0) fixed in position and course", () => {
		const depot: WorkerTrack = {
			...baseTrack,
			course: 45,
			speed: 0
		};
		const next = moveTrackStep(depot);
		expect(next.lat).toBe(depot.lat);
		expect(next.lon).toBe(depot.lon);
		expect(next.course).toBe(depot.course);
	});

	it("scales displacement proportionally to track speed and wraps antimeridian", () => {
		const slow = moveTrackStep({ ...baseTrack, speed: 30, course: 0 });
		const fast = moveTrackStep({ ...baseTrack, speed: 60, course: 0 });
		expect(fast.lat - baseTrack.lat).toBeCloseTo(
			(slow.lat - baseTrack.lat) * 2,
			6
		);

		const nearDateLine = moveTrackStep(
			{ ...baseTrack, lon: 179.995, course: 90 },
			0.01,
			0
		);
		expect(nearDateLine.lon).toBeCloseTo(-179.995, 6);
	});
});
