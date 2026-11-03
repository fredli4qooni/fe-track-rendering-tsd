/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
type OwnShipState = {
	position: [number, number];
	speed: number;
	heading: number;
};

const state: OwnShipState = {
	position: [118, -2],
	speed: 1 + Math.random() * 5,
	heading: Math.floor(Math.random() * 360)
};

let ownShipIntervalId: number | null = null;
const OWN_TICK_MS = 1000;
const DEG2RAD = Math.PI / 180;

/**
 * Convert degrees to radians.
 * @param d - Angle in degrees
 * @returns The angle in radians
 */
export function deg2rad(d: number) {
	return (d * Math.PI) / 180;
}

/**
 * Start the internal simulation ticker.
 */
function start() {
	if (ownShipIntervalId !== null) return;
	ownShipIntervalId = setInterval(tick, OWN_TICK_MS) as unknown as number;
}

/**
 * Stop the internal simulation ticker.
 */
function stop() {
	if (ownShipIntervalId !== null) {
		clearInterval(ownShipIntervalId);
		ownShipIntervalId = null;
	}
}

/**
 * Perform a movement step and post the new position back to the main thread.
 */
function tick() {
	if (state.speed <= 0) return;
	const deltaSeconds = OWN_TICK_MS / 1000;
	const speedMetersPerSecond = state.speed * 0.5144;
	const distanceMeters = speedMetersPerSecond * deltaSeconds;
	const headingRad = deg2rad(state.heading);

	const dLat = (distanceMeters * Math.cos(headingRad)) / 111111;
	const dLon =
		(distanceMeters * Math.sin(headingRad)) /
		(111111 * Math.cos(state.position[1] * DEG2RAD));

	state.position = [state.position[0] + dLon, state.position[1] + dLat];

	postMessage({
		type: "moved",
		position: state.position,
		speed: state.speed,
		heading: state.heading,
		ts: Date.now()
	});
}

addEventListener("message", (ev: MessageEvent) => {
	const data = ev.data as { type?: string } | undefined;
	if (!data?.type) return;

	if (data.type === "init") {
		const init = ev.data as {
			type: "init";
			position?: [number, number];
			speed?: number;
			heading?: number;
		};
		if (Array.isArray(init.position) && init.position.length === 2) {
			state.position = [init.position[0], init.position[1]];
		}
		if (typeof init.speed === "number") state.speed = init.speed;
		if (typeof init.heading === "number") state.heading = init.heading;

		postMessage({
			type: "init_ok",
			position: state.position,
			speed: state.speed,
			heading: state.heading
		});

		if (state.speed > 0) start();
		return;
	}

	if (data.type === "start") {
		start();
		return;
	}

	if (data.type === "stop") {
		stop();
		return;
	}

	if (data.type === "update") {
		const upd = ev.data as {
			type: "update";
			position?: [number, number];
			speed?: number;
			heading?: number;
		};
		if (Array.isArray(upd.position) && upd.position.length === 2) {
			state.position = [upd.position[0], upd.position[1]];
		}
		if (typeof upd.speed === "number") state.speed = upd.speed;
		if (typeof upd.heading === "number") state.heading = upd.heading;
		if (state.speed > 0) start();
		if (state.speed <= 0) stop();
		return;
	}
});
