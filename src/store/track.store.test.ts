/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";

import { trackStore } from "./track.store";

const mockTrack: Track = {
	id: 88,
	name: "KRI-VANILLA-88",
	lon: 118,
	lat: -2,
	altitude: 0,
	course: 120,
	speed: 22,
	type: 1,
	status: "ACTIVE",
	updatedAt: 1000
};

describe("trackStore vanilla store", () => {
	beforeEach(() => {
		trackStore.setState({ tracks: [], selectedTrack: undefined });
	});

	it("operates without React environment and manages state directly", () => {
		trackStore.getState().setTracks([mockTrack]);
		expect(trackStore.getState().tracks).toHaveLength(1);
		expect(trackStore.getState().tracks[0].name).toBe("KRI-VANILLA-88");

		trackStore.getState().updateTrack(88, { speed: 30 });
		expect(trackStore.getState().tracks[0].speed).toBe(30);

		trackStore.getState().removeTrack(88);
		expect(trackStore.getState().tracks).toHaveLength(0);
	});
});
