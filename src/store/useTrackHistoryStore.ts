/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { TrackHistoryEntry } from "@type/history.types";
import { create } from "zustand";

export type { TrackHistoryEntry } from "@type/history.types";

const DEFAULT_MAX_HISTORY = 64;

/**
 * Normalizes a requested max history value into a positive integer or undefined.
 * @param max incoming max history value
 * @returns normalized max or undefined when unlimited
 */
const normalizeLimit = (max?: number) =>
	typeof max === "number" && Number.isFinite(max) && max > 0
		? Math.max(2, Math.floor(max))
		: undefined;

/**
 * Returns the most recent entries respecting an optional limit.
 * @param entries history entries array
 * @param limit maximum entries to keep
 * @returns sliced array containing at most limit entries
 */
const clampEntries = (
	entries: TrackHistoryEntry[],
	limit: number | undefined
): TrackHistoryEntry[] => {
	if (!limit) return entries.slice();
	if (entries.length <= limit) return entries.slice();
	return entries.slice(entries.length - limit);
};

type TrackHistoryState = {
	histories: Record<number, TrackHistoryEntry[]>;
	maxHistory?: number;
	setHistoryFor: (id: number, entries: TrackHistoryEntry[]) => void;
	clearHistory: (id?: number) => void;
	setMaxHistory: (max?: number) => void;
	ensureInitialHistory: (entries: TrackHistoryEntry[]) => void;
};

export const useTrackHistoryStore = create<TrackHistoryState>((set) => ({
	histories: {},
	maxHistory: DEFAULT_MAX_HISTORY,
	setHistoryFor: (id, entries) =>
		set((state) => {
			const limit = state.maxHistory ?? DEFAULT_MAX_HISTORY;
			const next = clampEntries(entries, limit);
			return { histories: { ...state.histories, [id]: next } };
		}),
	clearHistory: (id) =>
		set((s) => {
			if (typeof id === "number") {
				const copy = { ...s.histories };
				delete copy[id];
				return { histories: copy };
			}
			return { histories: {} };
		}),
	setMaxHistory: (max) =>
		set((state) => {
			const normalized = normalizeLimit(max);
			if (normalized === state.maxHistory) return state;
			const limit = normalized ?? DEFAULT_MAX_HISTORY;
			const trimmed: Record<number, TrackHistoryEntry[]> = {};
			for (const [key, value] of Object.entries(state.histories)) {
				const id = Number(key);
				trimmed[id] = clampEntries(value, normalized ?? limit);
			}
			return {
				histories: trimmed,
				maxHistory: normalized
			};
		}),
	/**
	 * Ensure each provided entry exists as the first history point when a track has no history yet.
	 * @param entries array of initial history entries keyed by track id
	 * @returns void
	 */
	ensureInitialHistory: (entries) =>
		set((state) => {
			if (!entries.length) return state;
			const limit = state.maxHistory ?? DEFAULT_MAX_HISTORY;
			let changed = false;
			const histories = { ...state.histories };
			for (const entry of entries) {
				const existing = histories[entry.id];
				if (!existing || existing.length === 0) {
					histories[entry.id] = clampEntries([entry], limit);
					changed = true;
				} else {
					const last = existing[existing.length - 1];
					const dLat = Math.abs(last.lat - entry.lat);
					const dLon = Math.abs(last.lon - entry.lon);
					if (dLat > 0.2 || dLon > 0.2) {
						histories[entry.id] = clampEntries([entry], limit);
						changed = true;
					}
				}
			}
			return changed ? { histories } : state;
		})
}));

export { DEFAULT_MAX_HISTORY };
export default useTrackHistoryStore;
