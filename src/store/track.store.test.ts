/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";

import * as entityApi from "@utils/entityApi";

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
		trackStore.setState({
			tracks: [],
			selectedTrack: undefined,
			isBackendOnline: false,
			isSyncing: false,
			syncError: null
		});
		jest.clearAllMocks();
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

	describe("backend sync operations", () => {
		it("syncHealthCheck sets isBackendOnline true when UP", async () => {
			jest.spyOn(entityApi, "checkBackendHealth").mockResolvedValue({
				online: true,
				totalEntities: 5
			});

			const isOnline = await trackStore.getState().syncHealthCheck();
			expect(isOnline).toBe(true);
			expect(trackStore.getState().isBackendOnline).toBe(true);
		});

		it("loadFromBackend populates tracks from backend API", async () => {
			jest
				.spyOn(entityApi, "fetchEntitiesFromBackend")
				.mockResolvedValue([mockTrack]);

			await trackStore.getState().loadFromBackend();
			expect(trackStore.getState().tracks).toHaveLength(1);
			expect(trackStore.getState().isBackendOnline).toBe(true);
			expect(trackStore.getState().isSyncing).toBe(false);
		});

		it("loadFromBackend sets syncError when backend fails", async () => {
			jest
				.spyOn(entityApi, "fetchEntitiesFromBackend")
				.mockRejectedValue(new Error("Network Error"));

			await trackStore.getState().loadFromBackend();
			expect(trackStore.getState().isBackendOnline).toBe(false);
			expect(trackStore.getState().syncError).toContain("Network Error");
		});

		it("saveNewTrackToBackend uses API when online", async () => {
			trackStore.setState({ isBackendOnline: true });
			jest.spyOn(entityApi, "createEntityInBackend").mockResolvedValue({
				...mockTrack,
				id: 99
			});

			const created = await trackStore.getState().saveNewTrackToBackend({
				name: "New Vessel",
				lat: -5,
				lon: 106,
				course: 0,
				speed: 10,
				type: 0,
				status: "ACTIVE"
			});

			expect(created?.id).toBe(99);
			expect(trackStore.getState().tracks).toHaveLength(1);
		});

		it("saveNewTrackToBackend rejects and sets syncError when offline", async () => {
			trackStore.setState({ isBackendOnline: false, tracks: [] });

			const created = await trackStore.getState().saveNewTrackToBackend({
				name: "Offline Vessel",
				lat: -5,
				lon: 106,
				course: 0,
				speed: 10,
				type: 0,
				status: "ACTIVE"
			});

			expect(created).toBeNull();
			expect(trackStore.getState().tracks).toHaveLength(0);
			expect(trackStore.getState().syncError).toContain("Backend Go offline");
		});

		it("saveTrackUpdateToBackend calls API when online", async () => {
			trackStore.setState({ isBackendOnline: true, tracks: [mockTrack] });
			const updateSpy = jest
				.spyOn(entityApi, "updateEntityInBackend")
				.mockResolvedValue({
					...mockTrack,
					speed: 35
				});

			await trackStore.getState().saveTrackUpdateToBackend(88, { speed: 35 });
			expect(trackStore.getState().tracks[0].speed).toBe(35);
			expect(updateSpy).toHaveBeenCalledWith(88, { speed: 35 });
		});

		it("deleteTrackFromBackend calls API when online", async () => {
			trackStore.setState({ isBackendOnline: true, tracks: [mockTrack] });
			const deleteSpy = jest
				.spyOn(entityApi, "deleteEntityInBackend")
				.mockResolvedValue(true);

			await trackStore.getState().deleteTrackFromBackend(88);
			expect(trackStore.getState().tracks).toHaveLength(0);
			expect(deleteSpy).toHaveBeenCalledWith(88);
		});
	});
});
