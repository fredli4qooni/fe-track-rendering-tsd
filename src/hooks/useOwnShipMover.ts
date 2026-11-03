/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { useEffect, useRef } from "react";

import useOwnShipStore from "@store/useOwnShipStore";

/** Hook that starts a worker to simulate own-ship movement and forwards updates to the store. */
export const useOwnShipMover = () => {
	const workerRef = useRef<Worker | null>(null);

	useEffect(() => {
		let w: Worker | null = null;
		try {
			w = new Worker(
				new URL("./worker/ownShipMover.worker.ts", import.meta.url),
				{
					type: "module"
				}
			);
			workerRef.current = w;
		} catch (err) {
			console.warn("Failed to create own ship mover worker:", err);
			workerRef.current = null;
			return;
		}

		w.postMessage({
			type: "init",
			position: useOwnShipStore.getState().position
		});

		/**
		 * Handle messages from worker and update global store accordingly.
		 * @param ev - MessageEvent from worker
		 */
		const onMessage = (ev: MessageEvent) => {
			const data = ev.data as
				| {
						type?: string;
						position?: [number, number];
						speed?: number;
						heading?: number;
				  }
				| undefined;
			if (!data?.type) return;

			if (data.type === "init_ok") {
				if (Array.isArray(data.position)) {
					useOwnShipStore
						.getState()
						.setPosition([data.position[0], data.position[1]]);
				}
				if (typeof data.speed === "number")
					useOwnShipStore.getState().setSpeed(data.speed);
				if (typeof data.heading === "number")
					useOwnShipStore.getState().setHeading(data.heading);
				return;
			}

			if (data.type === "moved" && Array.isArray(data.position)) {
				useOwnShipStore
					.getState()
					.setPosition([data.position[0], data.position[1]]);
				if (typeof data.speed === "number")
					useOwnShipStore.getState().setSpeed(data.speed);
				if (typeof data.heading === "number")
					useOwnShipStore.getState().setHeading(data.heading);
			}
		};

		w.addEventListener("message", onMessage);

		return () => {
			if (w) {
				w.postMessage({ type: "stop" });
				w.removeEventListener("message", onMessage);
				w.terminate();
				workerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		const w = workerRef.current;
		if (!w) return;

		let prevSpeed = useOwnShipStore.getState().speed;
		let prevHeading = useOwnShipStore.getState().heading;
		let prevPosition = useOwnShipStore.getState().position;

		const unsub = useOwnShipStore.subscribe((state) => {
			const newSpeed = state.speed;
			const newHeading = state.heading;
			const newPosition = state.position;

			if (newSpeed !== prevSpeed) {
				prevSpeed = newSpeed;
				w.postMessage({ type: "update", speed: newSpeed });
				if (newSpeed > 0) w.postMessage({ type: "start" });
				else w.postMessage({ type: "stop" });
			}

			if (newHeading !== prevHeading) {
				prevHeading = newHeading;
				w.postMessage({ type: "update", heading: newHeading });
			}

			if (
				newPosition[0] !== prevPosition[0] ||
				newPosition[1] !== prevPosition[1]
			) {
				prevPosition = newPosition;
				w.postMessage({ type: "update", position: newPosition });
			}
		});

		return () => {
			if (typeof unsub === "function") unsub();
		};
	}, []);
};

export default useOwnShipMover;
