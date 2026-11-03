/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
type Track = {
	id: number;
	name?: string;
	lon: number;
	lat: number;
	altitude?: number;
	course?: number;
	type?: string;
};

let tracks: Track[] = [];
let intervalId: number | null = null;

const TICK_MS = 1000;

const MOVE_PROB = 0.5;

const MAX_SPEED = 0.01;

/**
 * Convert degrees to radians.
 * @param d - Angle in degrees
 * @returns The angle in radians
 */
export function deg2rad(d: number) {
	return (d * Math.PI) / 180;
}

/**
 * Randomly move a track by a small amount and update its course.
 * @param track track to move
 * @returns new track with updated position and course
 */
function randomMove(track: Track): Track {
	const speed = Math.random() * MAX_SPEED;
	const angleDeg = track.course ?? Math.random() * 360;
	const angle = deg2rad(angleDeg);

	const dLon = Math.cos(angle) * speed;
	const dLat = Math.sin(angle) * speed;

	const newLon = track.lon + dLon;
	const newLat = track.lat + dLat;
	const newCourse = (((angleDeg + (Math.random() * 10 - 5)) % 360) + 360) % 360;

	return {
		...track,
		lon: newLon,
		lat: newLat,
		course: newCourse
	};
}

/**
 * Tick function called every interval to move tracks.
 * It randomly moves some tracks and posts back the updates.
 */
function tick() {
	if (!tracks.length) return;
	const moved: (Track & { nextTs?: number })[] = [];
	const ts = Date.now();
	const lookAhead = 400 + Math.floor(Math.random() * 300);

	for (const t of tracks) {
		if (Math.random() < MOVE_PROB) {
			const m = randomMove(t);
			const idx = tracks.findIndex((x) => x.id === m.id);
			if (idx !== -1) tracks[idx] = m;
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
		tracks = Array.isArray(data.tracks) ? (data.tracks as Track[]) : [];
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
