/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";
import { create } from "zustand";

export type { Track } from "@type/track.types";

type TrackState = {
	tracks: Track[];
	selectedTrack?: number;
	setTracks: (tracks: Track[]) => void;
	addOrUpdateTrack: (track: Track) => void;
	updateTrack: (id: number, track: Partial<Track>) => void;
	removeTrack: (id: number) => void;
	selectTrack: (id: number | undefined) => void;

	setTrackTargets: (
		targets: {
			id: number;
			lon: number;
			lat: number;
			course?: number;
		}[]
	) => void;
};

export const useTrackStore = create<TrackState>((set) => ({
	tracks: [],

	setTracks: (tracks: Track[]) => {
		const direct: Track[] = tracks.map((t) => ({ ...t }));
		set((state) => ({
			tracks: direct,
			selectedTrack:
				direct.some((t) => t.id === state.selectedTrack)
					? state.selectedTrack
					: undefined
		}));
	},

	addOrUpdateTrack: (track: Track) =>
		set((state) => {
			const idx = state.tracks.findIndex((t) => t.id === track.id);
			if (idx === -1) {
				const newTrack: Track = {
					...track
				};
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
			selectedTrack: state.selectedTrack === id ? undefined : state.selectedTrack
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
		})
}));

export default useTrackStore;
