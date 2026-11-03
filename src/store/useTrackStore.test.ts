/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";

import { useTrackStore } from "./useTrackStore";

const mockTrack1: Track = {
	id: 1,
	name: "KRI-0001",
	lon: 118.0,
	lat: -2.0,
	altitude: 0,
	course: 90,
	speed: 20,
	type: 1,
	status: "ACTIVE",
	updatedAt: 1000
};

const mockTrack2: Track = {
	id: 2,
	name: "KRI-0002",
	lon: 119.0,
	lat: -3.0,
	altitude: 0,
	course: 180,
	speed: 15,
	type: 2,
	status: "ACTIVE",
	updatedAt: 2000
};

describe("useTrackStore", () => {
	beforeEach(() => {
		useTrackStore.setState({ tracks: [], selectedTrack: undefined });
	});

	it("initializes with empty tracks and no selected track", () => {
		const state = useTrackStore.getState();
		expect(state.tracks).toEqual([]);
		expect(state.selectedTrack).toBeUndefined();
	});

	it("sets tracks correctly via setTracks", () => {
		useTrackStore.getState().setTracks([mockTrack1, mockTrack2]);
		const state = useTrackStore.getState();
		expect(state.tracks).toHaveLength(2);
		expect(state.tracks[0].id).toBe(1);
		expect(state.tracks[1].id).toBe(2);
	});

	it("preserves or clears selectedTrack when setTracks is called", () => {
		useTrackStore.getState().setTracks([mockTrack1, mockTrack2]);
		useTrackStore.getState().selectTrack(1);
		expect(useTrackStore.getState().selectedTrack).toBe(1);

		// If setTracks still contains track 1, keep selectedTrack
		useTrackStore.getState().setTracks([mockTrack1]);
		expect(useTrackStore.getState().selectedTrack).toBe(1);

		// If setTracks does not contain track 1, clear selectedTrack
		useTrackStore.getState().setTracks([mockTrack2]);
		expect(useTrackStore.getState().selectedTrack).toBeUndefined();
	});

	it("adds new track via addOrUpdateTrack when ID does not exist", () => {
		useTrackStore.getState().addOrUpdateTrack(mockTrack1);
		expect(useTrackStore.getState().tracks).toHaveLength(1);
		expect(useTrackStore.getState().tracks[0].name).toBe("KRI-0001");
	});

	it("updates existing track via addOrUpdateTrack when ID exists", () => {
		useTrackStore.getState().setTracks([mockTrack1]);
		useTrackStore.getState().addOrUpdateTrack({
			...mockTrack1,
			name: "KRI-UPDATED",
			speed: 35
		});

		const tracks = useTrackStore.getState().tracks;
		expect(tracks).toHaveLength(1);
		expect(tracks[0].name).toBe("KRI-UPDATED");
		expect(tracks[0].speed).toBe(35);
	});

	it("partially updates a track via updateTrack", () => {
		useTrackStore.getState().setTracks([mockTrack1]);
		useTrackStore.getState().updateTrack(1, { course: 270 });

		const track = useTrackStore.getState().tracks[0];
		expect(track.course).toBe(270);
		expect(track.speed).toBe(20); // Unchanged
	});

	it("removes a track and deselects it if selected", () => {
		useTrackStore.getState().setTracks([mockTrack1, mockTrack2]);
		useTrackStore.getState().selectTrack(1);
		expect(useTrackStore.getState().selectedTrack).toBe(1);

		useTrackStore.getState().removeTrack(1);

		const state = useTrackStore.getState();
		expect(state.tracks).toHaveLength(1);
		expect(state.tracks[0].id).toBe(2);
		expect(state.selectedTrack).toBeUndefined();
	});

	it("guards against zombie track resurrection when tracks list is empty", () => {
		useTrackStore.getState().setTracks([]);

		// Background worker sends targets when user cleared all tracks
		useTrackStore.getState().setTrackTargets([
			{ id: 1, lon: 120, lat: -1, course: 45 },
			{ id: 2, lon: 121, lat: -2, course: 90 }
		]);

		const state = useTrackStore.getState();
		// Must remain strictly empty - no resurrected tracks!
		expect(state.tracks).toEqual([]);
	});

	it("updates coordinates of existing tracks via setTrackTargets", () => {
		useTrackStore.getState().setTracks([mockTrack1, mockTrack2]);

		useTrackStore
			.getState()
			.setTrackTargets([{ id: 1, lon: 118.5, lat: -2.2, course: 95 }]);

		const tracks = useTrackStore.getState().tracks;
		expect(tracks[0].lon).toBe(118.5);
		expect(tracks[0].lat).toBe(-2.2);
		expect(tracks[0].course).toBe(95);
		// Track 2 unchanged
		expect(tracks[1].lon).toBe(119.0);
	});

	it("toggles track selected state cleanly when selecting and deselecting", () => {
		useTrackStore.getState().setTracks([mockTrack1, mockTrack2]);

		useTrackStore.getState().selectTrack(1);
		expect(useTrackStore.getState().tracks[0].selected).toBe(true);
		expect(useTrackStore.getState().tracks[1].selected).toBeFalsy();

		useTrackStore.getState().selectTrack(2);
		expect(useTrackStore.getState().tracks[0].selected).toBe(false);
		expect(useTrackStore.getState().tracks[1].selected).toBe(true);

		useTrackStore.getState().selectTrack(undefined);
		expect(useTrackStore.getState().tracks[1].selected).toBe(false);
		expect(useTrackStore.getState().selectedTrack).toBeUndefined();
	});
});
