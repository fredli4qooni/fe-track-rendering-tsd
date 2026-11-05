/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 * Client library for communicating with the Go REST API backend service.
 */
import type { Track } from "@type/track.types";

export interface BackendEntity {
	id: number;
	name: string;
	callsign?: string;
	type: number;
	status: "ACTIVE" | "STANDBY" | "ENGAGED" | "INACTIVE" | "DESTROYED";
	lat: number;
	lon: number;
	altitude?: number;
	course: number;
	speed: number;
	created_at?: string;
	updated_at?: string;
}

export interface BackendApiResponse<T> {
	success: boolean;
	message?: string;
	data?: T;
	error?: string;
}

export interface BackendHealthResponse {
	status: string;
	service: string;
	version: string;
	author: string;
	total_entities: number;
}

const DEFAULT_BACKEND_URL = "http://localhost:8080/api/v1";

/**
 * Retrieve the active backend base API URL.
 * @returns The resolved backend base URL
 */
export function getBackendBaseUrl(): string {
	return process.env.BACKEND_API_URL || DEFAULT_BACKEND_URL;
}

/**
 * Maps a backend entity payload to a frontend Track object.
 * @param entity - The raw entity from the backend API
 * @returns Transformed Track object for frontend use
 */
export function mapBackendEntityToTrack(entity: BackendEntity): Track {
	const validStatus: Track["status"] =
		entity.status === "ACTIVE" ||
		entity.status === "STANDBY" ||
		entity.status === "ENGAGED" ||
		entity.status === "INACTIVE"
			? entity.status
			: "ACTIVE";

	return {
		id: entity.id,
		name: entity.name,
		lat: entity.lat,
		lon: entity.lon,
		course: entity.course ?? 0,
		speed: entity.speed ?? 0,
		type: entity.type ?? 4,
		altitude: entity.altitude ?? 0,
		status: validStatus,
		updatedAt: entity.updated_at
			? new Date(entity.updated_at).getTime()
			: Date.now()
	};
}

/**
 * Internal helper to perform fetch with a timeout using AbortController.
 * @param url - Destination endpoint URL
 * @param options - Request options (headers, method, body)
 * @param timeoutMs - Max timeout in milliseconds (default: 4000)
 * @returns Promise resolving to the Response
 */
async function fetchWithTimeout(
	url: string,
	options: RequestInit = {},
	timeoutMs: number = 4000
): Promise<Response> {
	const controller = new AbortController();
	const id = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			...options,
			signal: controller.signal
		});
		return response;
	} finally {
		clearTimeout(id);
	}
}

/**
 * Check if the Go backend service is online and healthy.
 * @returns Object with online boolean, total entities, and optional error message
 */
export async function checkBackendHealth(): Promise<{
	online: boolean;
	totalEntities: number;
	message?: string;
}> {
	const url = `${getBackendBaseUrl()}/health`;
	try {
		const res = await fetchWithTimeout(url, { method: "GET" }, 2500);
		if (!res.ok) {
			return {
				online: false,
				totalEntities: 0,
				message: `HTTP status: ${res.status}`
			};
		}
		const data = (await res.json()) as BackendHealthResponse;
		return {
			online: data.status === "UP",
			totalEntities: data.total_entities ?? 0
		};
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Connection failed";
		return { online: false, totalEntities: 0, message: msg };
	}
}

/**
 * Fetch all tactical entities stored in the PostgreSQL + PostGIS backend database.
 * @returns Promise resolving to an array of Track objects
 */
export async function fetchEntitiesFromBackend(): Promise<Track[]> {
	const url = `${getBackendBaseUrl()}/entities`;
	const res = await fetchWithTimeout(url, {
		method: "GET",
		headers: { Accept: "application/json" }
	});

	if (!res.ok) {
		throw new Error(`Failed to fetch entities: HTTP ${res.status}`);
	}

	const body = (await res.json()) as BackendApiResponse<BackendEntity[]>;
	if (!body.success || !body.data) {
		throw new Error(
			body.error || "Failed to parse entities from backend response"
		);
	}

	return body.data.map(mapBackendEntityToTrack);
}

/**
 * Create a new tactical entity in the backend database.
 * @param track - Track payload to create
 * @returns Promise resolving to the created Track with assigned ID
 */
export async function createEntityInBackend(
	track: Omit<Track, "id">
): Promise<Track> {
	const url = `${getBackendBaseUrl()}/entities`;
	const payload = {
		name: track.name,
		type: track.type ?? 4,
		status: track.status ?? "ACTIVE",
		lat: track.lat,
		lon: track.lon,
		altitude: track.altitude ?? 0,
		course: track.course ?? 0,
		speed: track.speed ?? 0
	};

	const res = await fetchWithTimeout(url, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify(payload)
	});

	const body = (await res.json()) as BackendApiResponse<BackendEntity>;
	if (!res.ok || !body.success || !body.data) {
		throw new Error(
			body.error || `Failed to create entity: HTTP ${res.status}`
		);
	}

	return mapBackendEntityToTrack(body.data);
}

/**
 * Update an existing tactical entity in the backend database.
 * @param id - Entity ID to update
 * @param patch - Partial fields to update
 * @returns Promise resolving to the updated Track
 */
export async function updateEntityInBackend(
	id: number,
	patch: Partial<Track>
): Promise<Track> {
	const url = `${getBackendBaseUrl()}/entities/${id}`;
	const payload: Record<string, unknown> = {};

	if (patch.name !== undefined) payload.name = patch.name;
	if (patch.type !== undefined) payload.type = patch.type;
	if (patch.status !== undefined) payload.status = patch.status;
	if (patch.lat !== undefined) payload.lat = patch.lat;
	if (patch.lon !== undefined) payload.lon = patch.lon;
	if (patch.altitude !== undefined) payload.altitude = patch.altitude;
	if (patch.course !== undefined) payload.course = patch.course;
	if (patch.speed !== undefined) payload.speed = patch.speed;

	const res = await fetchWithTimeout(url, {
		method: "PUT",
		headers: {
			"Content-Type": "application/json",
			Accept: "application/json"
		},
		body: JSON.stringify(payload)
	});

	const body = (await res.json()) as BackendApiResponse<BackendEntity>;
	if (!res.ok || !body.success || !body.data) {
		throw new Error(
			body.error || `Failed to update entity ${id}: HTTP ${res.status}`
		);
	}

	return mapBackendEntityToTrack(body.data);
}

/**
 * Delete a tactical entity from the backend database by ID.
 * @param id - Entity ID to delete
 * @returns Promise resolving to true if deleted successfully
 */
export async function deleteEntityInBackend(id: number): Promise<boolean> {
	const url = `${getBackendBaseUrl()}/entities/${id}`;
	const res = await fetchWithTimeout(url, {
		method: "DELETE",
		headers: { Accept: "application/json" }
	});

	const body = (await res.json()) as BackendApiResponse<null>;
	if (!res.ok || !body.success) {
		throw new Error(
			body.error || `Failed to delete entity ${id}: HTTP ${res.status}`
		);
	}

	return true;
}

/**
 * Trigger automatic initial seeding of realistic tactical entities in the backend.
 * @returns Promise resolving to seeded Track array
 */
export async function seedBackendEntities(): Promise<Track[]> {
	const url = `${getBackendBaseUrl()}/entities/seed`;
	const res = await fetchWithTimeout(url, {
		method: "POST",
		headers: { Accept: "application/json" }
	});

	const body = (await res.json()) as BackendApiResponse<BackendEntity[]>;
	if (!res.ok || !body.success || !body.data) {
		throw new Error(
			body.error || `Failed to seed backend entities: HTTP ${res.status}`
		);
	}

	return body.data.map(mapBackendEntityToTrack);
}
