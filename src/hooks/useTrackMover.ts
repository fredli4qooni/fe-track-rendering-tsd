/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { useEffect, useRef } from "react";

import useTrackHistoryStore, {
	DEFAULT_MAX_HISTORY,
	TrackHistoryEntry
} from "@store/useTrackHistoryStore";
import useTrackStore, { Track as StoreTrack } from "@store/useTrackStore";

type TrackUpdate = {
	id: number;
	lon: number;
	lat: number;
	course: number;
};
type TrackUpdateWithTs = TrackUpdate & { nextTs?: number };

const KM_PER_DEGREE = 111.32;
const HISTORY_RESET_DISTANCE_KM = 500;
const HISTORY_RESET_RATIO = 0.6;
const MIN_SHARED_TRACK_RATIO = 0.25;

/**
 * Convert degrees to radians.
 * @param deg Angle in degrees
 * @returns Angle in radians
 */
const degToRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Estimate distance between two tracks using a rough spherical approximation.
 * @param a First track snapshot
 * @param b Second track snapshot
 * @returns Great-circle distance in kilometers
 */
const approxDistanceKm = (a: StoreTrack, b: StoreTrack) => {
	const avgLatRad = degToRad((a.lat + b.lat) * 0.5);
	const dLatKm = Math.abs(a.lat - b.lat) * KM_PER_DEGREE;
	const dLonKm = Math.abs(a.lon - b.lon) * KM_PER_DEGREE * Math.cos(avgLatRad);
	return Math.hypot(dLatKm, dLonKm);
};

/**
 * Determine whether the bulk of tracks have teleported far enough to warrant history reset.
 * @param prev Previous track snapshot
 * @param next Current track snapshot
 * @returns True if histories should be cleared
 */
const shouldResetHistories = (prev: StoreTrack[], next: StoreTrack[]) => {
	if (!next.length || !prev.length) return true;
	const prevMap = new Map(prev.map((track) => [track.id, track]));
	let comparable = 0;
	let displaced = 0;
	for (const track of next) {
		const prevTrack = prevMap.get(track.id);
		if (!prevTrack) continue;
		comparable++;
		if (approxDistanceKm(prevTrack, track) > HISTORY_RESET_DISTANCE_KM)
			displaced++;
	}
	const sharedRatio = comparable / next.length;
	if (comparable === 0 || sharedRatio < MIN_SHARED_TRACK_RATIO) return true;
	return comparable > 0 && displaced / comparable >= HISTORY_RESET_RATIO;
};

/**
 * Hook that starts background workers to simulate track movement and manage histories.
 * It subscribes directly to the track store so React components don't have to.
 */
export const useTrackMover = () => {
	const workerRef = useRef<Worker | null>(null);
	const historyWorkerRef = useRef<Worker | null>(null);
	const prevTracksRef = useRef<StoreTrack[]>(useTrackStore.getState().tracks);
	const setTrackTargets = useTrackStore((s) => s.setTrackTargets);

	useEffect(() => {
		let w: Worker | null = null;
		try {
			w = new Worker(
				new URL("./worker/trackMover.worker.ts", import.meta.url),
				{ type: "module" }
			);
			workerRef.current = w;
		} catch (err) {
			console.warn("Failed to create track mover worker:", err);
			workerRef.current = null;
			return;
		}

		w.postMessage({
			type: "init",
			tracks: useTrackStore.getState().tracks
		});

		/**
		 * Handles messages from the worker indicating moved tracks.
		 * Applies updates to the zustand store.
		 * @param ev - Message event from the worker
		 */
		const onMessage = (ev: MessageEvent) => {
			const data = ev.data as
				| { type?: string; tracks?: TrackUpdate[] }
				| undefined;
			if (data?.type !== "moved" || !Array.isArray(data.tracks)) return;
			const moved = data.tracks;

			setTrackTargets(
				moved.map((m: TrackUpdateWithTs) => ({
					id: m.id,
					lon: m.lon,
					lat: m.lat,
					course: m.course,
					nextTs: m.nextTs
				}))
			);
		};

		w.addEventListener("message", onMessage);

		try {
			const hw = new Worker(
				new URL("./worker/trackHistory.worker.ts", import.meta.url),
				{ type: "module" }
			);
			historyWorkerRef.current = hw;

			const initialMax =
				useTrackHistoryStore.getState().maxHistory ?? DEFAULT_MAX_HISTORY;
			hw.postMessage({ type: "init", max: initialMax });

			hw.addEventListener("message", (ev: MessageEvent) => {
				const d = ev.data as { type?: string } | undefined;
				if (!d?.type) return;
				if (d.type === "get_response") {
					const msg = ev.data as {
						type: "get_response";
						id: number;
						entries: unknown[];
					};
					const entries = Array.isArray(msg.entries)
						? (msg.entries as TrackHistoryEntry[])
						: [];
					useTrackHistoryStore.getState().setHistoryFor(msg.id, entries);
				}
			});
		} catch (err) {
			console.warn("Failed to create track history worker:", err);
			historyWorkerRef.current = null;
		}

		return () => {
			w.postMessage({ type: "stop" });
			w.removeEventListener("message", onMessage);
			w.terminate();
			workerRef.current = null;

			if (historyWorkerRef.current) {
				historyWorkerRef.current.postMessage({ type: "stop" });
				historyWorkerRef.current.terminate();
				historyWorkerRef.current = null;
			}
		};
	}, []);

	useEffect(() => {
		const unsub = useTrackHistoryStore.subscribe((s) => {
			const hw = historyWorkerRef.current;
			if (!hw) return;
			hw.postMessage({ type: "set_max", max: s.maxHistory });
		});
		return () => {
			if (typeof unsub === "function") unsub();
		};
	}, []);

	useEffect(() => {
		const ensureInitialHistory =
			useTrackHistoryStore.getState().ensureInitialHistory;
		const clearHistory = useTrackHistoryStore.getState().clearHistory;

		/**
		 * Sends the current tracks to the worker whenever they change.
		 * @param tracks Array of current tracks from the store
		 */
		const processTracks = (tracks: StoreTrack[]) => {
			const prevTracks = prevTracksRef.current;
			if (
				tracks.length === 0 ||
				prevTracks.length === 0 ||
				shouldResetHistories(prevTracks, tracks)
			) {
				clearHistory();
				const hw = historyWorkerRef.current;
				hw?.postMessage({ type: "clear" });
			}

			if (tracks.length > 0) {
				const now = Date.now();
				ensureInitialHistory(
					tracks.map((t) => ({
						id: t.id,
						lon: t.lon,
						lat: t.lat,
						course: t.course,
						ts: now
					}))
				);
			}

			const w = workerRef.current;
			if (!w) return;
			const payload = tracks.map((t) => ({
				id: t.id,
				lon: t.lon,
				lat: t.lat,
				course: t.course
			}));
			w.postMessage({ type: "update_tracks", tracks: payload });
			prevTracksRef.current = tracks;
		};

		processTracks(prevTracksRef.current);

		const unsub = useTrackStore.subscribe((state) => {
			const nextTracks = state.tracks;
			if (nextTracks === prevTracksRef.current) return;
			processTracks(nextTracks);
		});

		return () => {
			unsub();
		};
	}, []);

	/**
	 * Message type sent from the mover worker when tracks moved.
	 */
	type MoverMovedMessage = { type: "moved"; tracks: TrackUpdateWithTs[] };

	useEffect(() => {
		const w = workerRef.current;
		const hw = historyWorkerRef.current;
		if (!w || !hw) return;

		/**
		 * Handle 'moved' messages from the mover worker and forward to history worker.
		 * @param ev MessageEvent from mover worker
		 */
		const onMsg = (ev: MessageEvent) => {
			const data = ev.data as MoverMovedMessage | { type?: string } | undefined;
			if (data?.type !== "moved") return;
			const moved = (data as MoverMovedMessage).tracks;
			if (!Array.isArray(moved) || moved.length === 0) return;

			// Verify with current track state: discard in-flight messages if tracks cleared or track deleted
			const currentTracks = useTrackStore.getState().tracks;
			if (!currentTracks.length) return;
			const activeIds = new Set(currentTracks.map((t) => t.id));

			const validMoved = moved.filter((m) => activeIds.has(m.id));
			if (!validMoved.length) return;

			const entries = validMoved.map((t) => ({
				id: t.id,
				lon: t.lon,
				lat: t.lat,
				course: t.course,
				ts: Date.now()
			}));

			hw.postMessage({ type: "record", entries });

			try {
				const grouped = new Map<number, TrackHistoryEntry[]>();
				for (const entry of entries) {
					const list = grouped.get(entry.id);
					if (list) list.push(entry);
					else grouped.set(entry.id, [entry]);
				}
				if (grouped.size > 0) {
					useTrackHistoryStore.setState((state) => {
						const limit = state.maxHistory ?? DEFAULT_MAX_HISTORY;
						const histories = { ...state.histories };
						for (const [id, newEntries] of grouped) {
							const existing = histories[id] ?? [];
							let merged = existing.concat(newEntries);

							// If the track displaced/teleported (> 0.2 deg ~ 22 km), reset history for this track
							if (existing.length > 0 && newEntries.length > 0) {
								const last = existing[existing.length - 1];
								const firstNew = newEntries[0];
								const dLat = Math.abs(last.lat - firstNew.lat);
								const dLon = Math.abs(last.lon - firstNew.lon);
								if (dLat > 0.2 || dLon > 0.2) {
									merged = newEntries;
								}
							}

							const clamped = limit
								? merged.slice(Math.max(merged.length - limit, 0))
								: merged;
							histories[id] = clamped;
						}
						return { histories };
					});
				}
			} catch (err) {
				console.debug("failed to append to history store", err);
			}
		};

		w.addEventListener("message", onMsg);
		return () => w.removeEventListener("message", onMsg);
	}, []);
};

export default useTrackMover;
