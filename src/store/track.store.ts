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
				? "Koneksi backend terputus (Failed to fetch). Server Go di port :8080 belum menyala atau tidak dapat dijangkau. Jalankan: 'go run ./cmd/server/main.go' di folder be-explore-maptalks."
				: `Gagal memuat entitas dari backend: ${rawMsg}`;
			set({ isSyncing: false, syncError: msg, isBackendOnline: false });
		}
	},

	saveNewTrackToBackend: async (trackData: Omit<Track, "id">) => {
		const isOnline = get().isBackendOnline;
		if (!isOnline) {
			const msg =
				"Backend Go offline. Tidak dapat membuat entitas baru tanpa database.";
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
					: "Gagal menyimpan entitas ke backend";
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
						: "Gagal memperbarui entitas di backend";
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
						: "Gagal menghapus entitas dari backend";
				set({ syncError: msg });
			}
		}
	}
}));
