/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";
import { createStore } from "zustand/vanilla";

import {
	checkBackendHealth,
	createEntityInBackend,
	deleteEntityInBackend,
	fetchEntitiesFromBackend,
	updateEntityInBackend
} from "@utils/entityApi";

export interface TrackState {
	tracks: Track[];
	selectedTrack?: number;
	isBackendOnline: boolean;
	isSyncing: boolean;
	syncError: string | null;

	setTracks: (tracks: Track[]) => void;
	addOrUpdateTrack: (track: Track) => void;
	updateTrack: (id: number, track: Partial<Track>) => void;
	removeTrack: (id: number) => void;
	selectTrack: (id: number | undefined) => void;
	setIsBackendOnline: (status: boolean) => void;
	clearSyncError: () => void;
	setTrackTargets: (
		targets: {
			id: number;
			lon: number;
			lat: number;
			course?: number;
		}[]
	) => void;

	// Backend API Synchronization Methods
	syncHealthCheck: () => Promise<boolean>;
	loadFromBackend: () => Promise<void>;
	saveNewTrackToBackend: (track: Omit<Track, "id">) => Promise<Track | null>;
	saveTrackUpdateToBackend: (
		id: number,
		patch: Partial<Track>
	) => Promise<void>;
	deleteTrackFromBackend: (id: number) => Promise<void>;
}

export const trackStore = createStore<TrackState>((set, get) => ({
	tracks: [],
	selectedTrack: undefined,
	isBackendOnline: false,
	isSyncing: false,
	syncError: null,

	setIsBackendOnline: (status: boolean) => {
		set({ isBackendOnline: status });
	},

	clearSyncError: () => {
		set({ syncError: null });
	},

	setTracks: (tracks: Track[]) => {
		const direct: Track[] = tracks.map((t) => ({ ...t }));
		set((state) => ({
			tracks: direct,
			selectedTrack: direct.some((t) => t.id === state.selectedTrack)
				? state.selectedTrack
				: undefined
		}));
	},

	addOrUpdateTrack: (track: Track) =>
		set((state) => {
			const idx = state.tracks.findIndex((t) => t.id === track.id);
			if (idx === -1) {
				const newTrack: Track = { ...track };
				return { tracks: [...state.tracks, newTrack] };
			}
			const newTracks = state.tracks.slice();
			const cur = newTracks[idx];
			newTracks[idx] = {
				...cur,
				...track
			};
			return { tracks: newTracks };
		}),

	updateTrack: (id: number, track: Partial<Track>) =>
		set((state) => {
			const idx = state.tracks.findIndex((t) => t.id === id);
			if (idx === -1) return {};
			const newTracks = state.tracks.slice();
			const cur = newTracks[idx];
			newTracks[idx] = {
				...cur,
				...track
			};
			return { tracks: newTracks };
		}),

	removeTrack: (id: number) =>
		set((state) => ({
			tracks: state.tracks.filter((t) => t.id !== id),
			selectedTrack:
				state.selectedTrack === id ? undefined : state.selectedTrack
		})),

	setTrackTargets: (targets) =>
		set((state) => {
			if (!state.tracks.length) return {};
			const newTracks = state.tracks.slice();
			let changed = false;
			for (const tgt of targets) {
				const idx = newTracks.findIndex((t) => t.id === tgt.id);
				if (idx !== -1) {
					const cur = newTracks[idx];
					newTracks[idx] = {
						...cur,
						course: tgt.course ?? cur.course,
						lon: tgt.lon,
						lat: tgt.lat
					};
					changed = true;
				}
			}
			return changed ? { tracks: newTracks } : {};
		}),

	selectTrack: (id: number | undefined) =>
		set((state) => {
			const newTracks = state.tracks.slice();
			if (state.selectedTrack !== undefined) {
				const prevIdx = newTracks.findIndex(
					(t) => t.id === state.selectedTrack
				);
				if (prevIdx !== -1) {
					const prev = newTracks[prevIdx];
					newTracks[prevIdx] = {
						...prev,
						selected: false
					};
				}
			}
			if (id !== undefined) {
				const newIdx = newTracks.findIndex((t) => t.id === id);
				if (newIdx !== -1) {
					const newlySelected = newTracks[newIdx];
					newTracks[newIdx] = {
						...newlySelected,
						selected: true
					};
				}
			}
			return {
				tracks: newTracks,
				selectedTrack: id
			};
		}),

	syncHealthCheck: async () => {
		try {
			const res = await checkBackendHealth();
			set({ isBackendOnline: res.online });
			return res.online;
		} catch {
			set({ isBackendOnline: false });
			return false;
		}
	},

	loadFromBackend: async () => {
		set({ isSyncing: true, syncError: null });
		try {
			const entities = await fetchEntitiesFromBackend();
			get().setTracks(entities);
			set({ isBackendOnline: true, isSyncing: false, syncError: null });
		} catch (err) {
			const rawMsg = err instanceof Error ? err.message : String(err);
			const isConnError =
				rawMsg.toLowerCase().includes("failed to fetch") ||
				rawMsg.toLowerCase().includes("networkerror") ||
				rawMsg.toLowerCase().includes("abort");

			const msg = isConnError
				? "Backend service unreachable (Failed to fetch). Ensure Go backend is running at http://localhost:8080 (execute 'go run ./cmd/server/main.go' in be-explore-maptalks)."
				: `Failed to load entities from backend: ${rawMsg}`;
			set({ isSyncing: false, syncError: msg, isBackendOnline: false });
		}
	},

	saveNewTrackToBackend: async (trackData: Omit<Track, "id">) => {
		const isOnline = get().isBackendOnline;
		if (!isOnline) {
			const msg =
				"Backend service offline. Cannot create entities without database connection.";
			set({ syncError: msg });
			return null;
		}

		try {
			const created = await createEntityInBackend(trackData);
			get().addOrUpdateTrack(created);
			set({ syncError: null });
			return created;
		} catch (err) {
			const msg =
				err instanceof Error
					? err.message
					: "Failed to persist entity to backend";
			set({ syncError: msg });
			return null;
		}
	},

	saveTrackUpdateToBackend: async (id: number, patch: Partial<Track>) => {
		get().updateTrack(id, patch);
		const isOnline = get().isBackendOnline;
		if (isOnline) {
			try {
				await updateEntityInBackend(id, patch);
				set({ syncError: null });
			} catch (err) {
				const msg =
					err instanceof Error
						? err.message
						: "Failed to update entity in backend";
				set({ syncError: msg });
			}
		}
	},

	deleteTrackFromBackend: async (id: number) => {
		get().removeTrack(id);
		const isOnline = get().isBackendOnline;
		if (isOnline) {
			try {
				await deleteEntityInBackend(id);
				set({ syncError: null });
			} catch (err) {
				const msg =
					err instanceof Error
						? err.message
						: "Failed to delete entity from backend";
				set({ syncError: msg });
			}
		}
	}
}));
