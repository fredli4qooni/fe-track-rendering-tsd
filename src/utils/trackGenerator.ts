import { Track } from "@type/track.types";

import { ICON_MAP } from "@utils/assetLoader";

const OPERATIONAL_CENTER = {
	lon: 118,
	lat: -2
};

const CALLSIGN_PREFIXES = [
	"KRI",
	"BKN",
	"TNI-AL",
	"PAT",
	"TGT",
	"RAD",
	"AIS",
	"VSS"
];
const VESSEL_CLASSES = [
	"Frigate",
	"Corvette",
	"Submarine",
	"Patrol",
	"Cargo",
	"Tanker",
	"Fast Boat"
];

/**
 * Generate a realistic tactical track name.
 * @param id - Track ID
 * @param type - Type index 0..5
 * @returns The formatted multi-line tactical name string
 */
export function generateTacticalName(id: number, type: number): string {
	const prefix = CALLSIGN_PREFIXES[id % CALLSIGN_PREFIXES.length];
	const vClass = VESSEL_CLASSES[id % VESSEL_CLASSES.length];
	const code = String(id).padStart(4, "0");

	// Multi-line tactical label format used by the WebGL BMFont label renderer
	return `${prefix}-${code}\n${vClass} #${id}\nType-${type}`;
}

/**
 * Generate a batch of random tactical tracks.
 * @param count - Total tracks to generate (50 to 10,000)
 * @param centerLon - Operational center longitude
 * @param centerLat - Operational center latitude
 * @param spread - Geographic spread in degrees
 * @returns Array of generated tactical tracks
 */
export function generateBatchTracks(
	count: number,
	centerLon: number = OPERATIONAL_CENTER.lon,
	centerLat: number = OPERATIONAL_CENTER.lat,
	spread: number = 8
): Track[] {
	const spriteTypes = ICON_MAP.map((_, i) => i);
	const now = Date.now();

	return Array.from({ length: count }, (_, i) => {
		const id = i + 1;
		const type = spriteTypes[Math.floor(Math.random() * spriteTypes.length)];
		const course = Math.floor(Math.random() * 360);
		const speed = Math.floor(8 + Math.random() * 28); // 8-36 knots

		// Clustered circular distribution around the center
		const angle = Math.random() * Math.PI * 2;
		const distance = Math.pow(Math.random(), 0.6) * spread;
		const lon = centerLon + Math.cos(angle) * distance * 1.5;
		const lat = centerLat + Math.sin(angle) * distance;

		return {
			id,
			name: generateTacticalName(id, type),
			lon: Number(lon.toFixed(5)),
			lat: Number(lat.toFixed(5)),
			altitude: 0,
			course,
			speed,
			type,
			status: "ACTIVE",
			updatedAt: now
		};
	});
}

/**
 * Generate a single new random track near a reference coordinate.
 * @param id - Unique track ID
 * @param centerLon - Center longitude
 * @param centerLat - Center latitude
 * @param preferredType - Optional tactical type index (0..5)
 * @returns The newly generated single track object
 */
export function generateSingleTrack(
	id: number,
	centerLon: number = OPERATIONAL_CENTER.lon,
	centerLat: number = OPERATIONAL_CENTER.lat,
	preferredType?: number
): Track {
	const spriteTypes = ICON_MAP.map((_, i) => i);
	const type =
		preferredType !== undefined
			? preferredType
			: spriteTypes[Math.floor(Math.random() * spriteTypes.length)];
	const course = Math.floor(Math.random() * 360);
	const speed = Math.floor(12 + Math.random() * 20);

	const offsetLon = (Math.random() - 0.5) * 1.5;
	const offsetLat = (Math.random() - 0.5) * 1.5;

	return {
		id,
		name: generateTacticalName(id, type),
		lon: Number((centerLon + offsetLon).toFixed(5)),
		lat: Number((centerLat + offsetLat).toFixed(5)),
		altitude: 0,
		course,
		speed,
		type,
		status: "ACTIVE",
		updatedAt: Date.now()
	};
}
