/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 * Unit tests for the backend entity REST API client.
 */
import {
	type BackendEntity,
	checkBackendHealth,
	createEntityInBackend,
	deleteEntityInBackend,
	fetchEntitiesFromBackend,
	getBackendBaseUrl,
	mapBackendEntityToTrack,
	seedBackendEntities,
	updateEntityInBackend
} from "./entityApi";

describe("entityApi client utility", () => {
	const originalFetch = globalThis.fetch;
	const originalEnv = process.env.BACKEND_API_URL;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	afterEach(() => {
		globalThis.fetch = originalFetch;
		process.env.BACKEND_API_URL = originalEnv;
	});

	describe("getBackendBaseUrl", () => {
		it("returns environment variable when defined", () => {
			process.env.BACKEND_API_URL = "http://api.test:9000/v1";
			expect(getBackendBaseUrl()).toBe("http://api.test:9000/v1");
		});

		it("returns default URL when environment variable is undefined", () => {
			delete process.env.BACKEND_API_URL;
			expect(getBackendBaseUrl()).toBe("http://localhost:8080/api/v1");
		});
	});

	describe("mapBackendEntityToTrack", () => {
		it("correctly maps all attributes to frontend Track structure", () => {
			const raw: BackendEntity = {
				id: 10,
				name: "KRI Bung Tomo-357",
				callsign: "TOMO-357",
				type: 0,
				status: "ACTIVE",
				lat: -5.9,
				lon: 106.1,
				altitude: 15,
				course: 180,
				speed: 24,
				updated_at: "2026-11-03T10:00:00Z"
			};

			const track = mapBackendEntityToTrack(raw);
			expect(track.id).toBe(10);
			expect(track.name).toBe("KRI Bung Tomo-357");
			expect(track.lat).toBe(-5.9);
			expect(track.lon).toBe(106.1);
			expect(track.altitude).toBe(15);
			expect(track.course).toBe(180);
			expect(track.speed).toBe(24);
			expect(track.type).toBe(0);
			expect(track.status).toBe("ACTIVE");
			expect(track.updatedAt).toBeGreaterThan(0);
		});

		it("falls back to default ACTIVE status when invalid status is provided", () => {
			const raw: BackendEntity = {
				id: 1,
				name: "Generic Target",
				type: 4,
				status: "DESTROYED" as any,
				lat: 0,
				lon: 0,
				course: 0,
				speed: 0
			};
			const track = mapBackendEntityToTrack(raw);
			expect(track.status).toBe("ACTIVE");
		});
	});

	describe("checkBackendHealth", () => {
		it("returns online true when backend status is UP", async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					status: "UP",
					service: "be-explore-maptalks",
					total_entities: 5
				})
			});

			const res = await checkBackendHealth();
			expect(res.online).toBe(true);
			expect(res.totalEntities).toBe(5);
		});

		it("returns online false when response is not ok", async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 503
			});

			const res = await checkBackendHealth();
			expect(res.online).toBe(false);
			expect(res.totalEntities).toBe(0);
		});

		it("returns online false on network rejection", async () => {
			globalThis.fetch = jest
				.fn()
				.mockRejectedValue(new Error("Connection refused"));

			const res = await checkBackendHealth();
			expect(res.online).toBe(false);
			expect(res.message).toBe("Connection refused");
		});
	});

	describe("fetchEntitiesFromBackend", () => {
		it("fetches and maps entity list successfully", async () => {
			const mockData: BackendEntity[] = [
				{
					id: 1,
					name: "Tgt 1",
					type: 1,
					status: "ACTIVE",
					lat: 10,
					lon: 20,
					course: 45,
					speed: 12
				}
			];

			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
					data: mockData
				})
			});

			const tracks = await fetchEntitiesFromBackend();
			expect(tracks).toHaveLength(1);
			expect(tracks[0].name).toBe("Tgt 1");
			expect(tracks[0].lat).toBe(10);
		});

		it("throws error when fetch response is not ok", async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: false,
				status: 500
			});

			await expect(fetchEntitiesFromBackend()).rejects.toThrow(
				"Failed to fetch entities: HTTP 500"
			);
		});

		it("throws error when payload success is false", async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: false,
					error: "Database lock"
				})
			});

			await expect(fetchEntitiesFromBackend()).rejects.toThrow("Database lock");
		});
	});

	describe("createEntityInBackend", () => {
		it("posts payload and returns newly created track", async () => {
			const mockEntity: BackendEntity = {
				id: 99,
				name: "New Vessel",
				type: 0,
				status: "ACTIVE",
				lat: -6.0,
				lon: 106.0,
				course: 0,
				speed: 10
			};

			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
					data: mockEntity
				})
			});

			const res = await createEntityInBackend({
				name: "New Vessel",
				type: 0,
				lat: -6.0,
				lon: 106.0,
				course: 0,
				speed: 10
			});

			expect(res.id).toBe(99);
			expect(res.name).toBe("New Vessel");
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/entities"),
				expect.objectContaining({ method: "POST" })
			);
		});
	});

	describe("updateEntityInBackend", () => {
		it("puts patch payload and returns updated track", async () => {
			const mockUpdated: BackendEntity = {
				id: 99,
				name: "Updated Vessel",
				type: 0,
				status: "STANDBY",
				lat: -6.0,
				lon: 106.0,
				course: 90,
				speed: 15
			};

			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
					data: mockUpdated
				})
			});

			const res = await updateEntityInBackend(99, {
				name: "Updated Vessel",
				status: "STANDBY",
				course: 90
			});

			expect(res.name).toBe("Updated Vessel");
			expect(res.course).toBe(90);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/entities/99"),
				expect.objectContaining({ method: "PUT" })
			);
		});
	});

	describe("deleteEntityInBackend", () => {
		it("deletes entity by ID and returns true", async () => {
			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true
				})
			});

			const res = await deleteEntityInBackend(99);
			expect(res).toBe(true);
			expect(globalThis.fetch).toHaveBeenCalledWith(
				expect.stringContaining("/entities/99"),
				expect.objectContaining({ method: "DELETE" })
			);
		});
	});

	describe("seedBackendEntities", () => {
		it("calls seed endpoint and returns seeded tracks", async () => {
			const mockSeeded: BackendEntity[] = [
				{
					id: 1,
					name: "KRI REMI-331",
					type: 0,
					status: "ACTIVE",
					lat: -5.9,
					lon: 106.0,
					course: 45,
					speed: 22
				}
			];

			globalThis.fetch = jest.fn().mockResolvedValue({
				ok: true,
				json: async () => ({
					success: true,
					data: mockSeeded
				})
			});

			const tracks = await seedBackendEntities();
			expect(tracks).toHaveLength(1);
			expect(tracks[0].name).toBe("KRI REMI-331");
		});
	});
});
