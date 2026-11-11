/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */

export type WorkerTrack = {
	id: number;
	name?: string;
	lon: number;
	lat: number;
	altitude?: number;
	course?: number;
	speed?: number;
	type?: string;
};

let tracks: WorkerTrack[] = [];
let intervalId: number | null = null;

const TICK_MS = 1000;

const MOVE_PROB = 0.5;

const MAX_SPEED = 0.01;

const MIN_LAT_COS = 0.1;

const MAX_ABS_LAT = 89.9;

/**
 * Convert degrees to radians.
 * @param d - Angle in degrees
 * @returns The angle in radians
 */
export function deg2rad(d: number): number {
	return (d * Math.PI) / 180;
}

/**
 * Wrap longitude cleanly into the [-180, 180] range.
 * @param lon - Longitude in degrees
 * @returns Wrapped longitude in degrees
 */
function wrapLongitude(lon: number): number {
	if (lon >= -180 && lon <= 180) return lon;
	return ((((lon + 180) % 360) + 360) % 360) - 180;
}

/**
 * Advance a track by one simulation step along its navigational compass bearing
 * (0° = North / +Lat, 90° = East / +Lon) so motion matches the course vector line.
 * @param track - Track to move
 * @param stepOverride - Optional deterministic step magnitude in degrees
 * @param courseDeltaDeg - Optional course jitter in degrees
 * @returns New track with updated position and course
 */
export function moveTrackStep(
	track: WorkerTrack,
	stepOverride?: number,
	courseDeltaDeg?: number
): WorkerTrack {
	if (
		stepOverride === undefined &&
		typeof track.speed === "number" &&
		track.speed <= 0
	) {
		return { ...track };
	}

	const step =
		stepOverride ??
		(typeof track.speed === "number"
			? (Math.min(Math.max(track.speed, 0), 120) / 100) * MAX_SPEED
			: Math.random() * MAX_SPEED);

	const angleDeg = track.course ?? Math.random() * 360;
	const angle = deg2rad(angleDeg);
	const latCos = Math.max(MIN_LAT_COS, Math.cos(deg2rad(track.lat)));

	// Compass bearing: 0° -> North (+Lat), 90° -> East (+Lon) with Mercator cos(lat) scaling
	const dLat = Math.cos(angle) * step;
	const dLon = (Math.sin(angle) * step) / latCos;

	const newLat = Math.max(
		-MAX_ABS_LAT,
		Math.min(MAX_ABS_LAT, track.lat + dLat)
	);
	const newLon = wrapLongitude(track.lon + dLon);
	const deltaCourse = courseDeltaDeg ?? Math.random() * 10 - 5;
	const newCourse = (((angleDeg + deltaCourse) % 360) + 360) % 360;

	return {
		...track,
		lon: newLon,
		lat: newLat,
		course: newCourse
	};
}

/**
 * Tick function called every interval to move active tracks along their course.
 */
function tick(): void {
	if (!tracks.length) return;
	const moved: (WorkerTrack & { nextTs?: number })[] = [];
	const ts = Date.now();
	const lookAhead = 400 + Math.floor(Math.random() * 300);

	for (let i = 0; i < tracks.length; i++) {
		const t = tracks[i];
		if (typeof t.speed === "number" && t.speed <= 0) {
			continue;
		}
		if (Math.random() < MOVE_PROB) {
			const m = moveTrackStep(t);
			tracks[i] = m;
			moved.push({
				id: m.id,
				lon: m.lon,
				lat: m.lat,
				course: m.course,
				nextTs: ts + lookAhead
			});
		}
	}

	if (moved.length) {
		postMessage({ type: "moved", tracks: moved });
	}
}

addEventListener("message", (event: MessageEvent) => {
	const data = event.data as { type?: string; tracks?: unknown } | undefined;
	if (!data?.type) return;

	if (data.type === "init" || data.type === "update_tracks") {
		tracks = Array.isArray(data.tracks) ? (data.tracks as WorkerTrack[]) : [];
		if (tracks.length === 0) {
			if (intervalId !== null) {
				clearInterval(intervalId);
				intervalId = null;
			}
		} else {
			intervalId ??= setInterval(tick, TICK_MS) as unknown as number;
		}
	}

	if (data.type === "stop") {
		if (intervalId !== null) {
			clearInterval(intervalId);
			intervalId = null;
		}
	}
});
