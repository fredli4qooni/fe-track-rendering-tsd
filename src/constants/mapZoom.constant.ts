/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export const AVAILABLE_SCALE_NM = [
	0.1, 0.5, 1, 2, 4, 8, 16, 24, 32, 48, 64, 128, 256, 512
] as const;

export const SCALE_MAPPING = [
	{ zoom: 1, scaleNM: 0.1 },
	{ zoom: 2, scaleNM: 0.5 },
	{ zoom: 3, scaleNM: 1 },
	{ zoom: 4, scaleNM: 2 },
	{ zoom: 5, scaleNM: 4 },
	{ zoom: 6, scaleNM: 8 },
	{ zoom: 7, scaleNM: 16 },
	{ zoom: 8, scaleNM: 24 },
	{ zoom: 9, scaleNM: 32 },
	{ zoom: 10, scaleNM: 48 },
	{ zoom: 11, scaleNM: 64 },
	{ zoom: 12, scaleNM: 128 },
	{ zoom: 13, scaleNM: 256 },
	{ zoom: 14, scaleNM: 512 }
] as const;

/**
 * Configuration constants for map scale and zoom calculations.
 */
export const SCALE_CONFIG = {
	/** Conversion factor: 1 nautical mile = 1852 meters */
	NAUTICAL_MILES_CONSTANT: 1852,
	/** Map resolution (meters per pixel) at zoom level 0 - standard Web Mercator value */
	INITIAL_RESOLUTION: 156543.0339,
	/** Minimum discrete zoom level (most zoomed in) */
	MIN_ZOOM: 1,
	/** Maximum discrete zoom level (most zoomed out) */
	MAX_ZOOM: 14,
	/** Default zoom level on map initialization */
	DEFAULT_ZOOM: 4
};

export const MIN_ZOOM = SCALE_CONFIG.MIN_ZOOM;
export const MAX_ZOOM = SCALE_CONFIG.MAX_ZOOM;

/**
 * Get the scale in nautical miles for a given discrete zoom level.
 * @param zoom - The discrete zoom level (1-14).
 * @returns The scale in nautical miles.
 */
export const getScaleFromZoom = (zoom: number): number => {
	const entry = SCALE_MAPPING.find((m) => m.zoom === zoom);
	return entry?.scaleNM ?? SCALE_MAPPING[3].scaleNM; // Default to zoom 4 (2 NM)
};

/**
 * Find the closest discrete zoom level for a given scale in nautical miles.
 * @param scaleNM - The scale in nautical miles.
 * @returns The closest discrete zoom level.
 */
export const getZoomFromScale = (scaleNM: number): number => {
	const exactMatch = SCALE_MAPPING.find((m) => m.scaleNM === scaleNM);
	if (exactMatch) return exactMatch.zoom;

	let minDiff = Infinity;
	let closestZoom: number = SCALE_MAPPING[0].zoom;

	for (const entry of SCALE_MAPPING) {
		const diff = Math.abs(scaleNM - entry.scaleNM);
		if (diff < minDiff) {
			minDiff = diff;
			closestZoom = entry.zoom;
		}
	}

	return closestZoom;
};

/**
 * Convert a scale in nautical miles to map resolution (meters per pixel).
 * Accounts for Mercator projection distortion at the given latitude.
 *
 * @param scaleNM - Scale in nautical miles (represents half the visible width).
 * @param mapPixelWidth - Map width in pixels.
 * @param centerLatitude - Center latitude for projection correction.
 * @returns The resolution in meters per pixel.
 */
export const scaleNMToResolution = (
	scaleNM: number,
	mapPixelWidth: number,
	centerLatitude: number = 0
): number => {
	if (mapPixelWidth === 0) return 1;
	const totalWidthNM = scaleNM * 2;
	const widthMeters = totalWidthNM * SCALE_CONFIG.NAUTICAL_MILES_CONSTANT;
	const latitudeInRadians = centerLatitude * (Math.PI / 180);
	const correctedMeters = widthMeters / Math.cos(latitudeInRadians);
	return correctedMeters / mapPixelWidth;
};

/**
 * Convert a resolution (meters per pixel) to maptalks zoom level.
 * @param resolution - The resolution in meters per pixel.
 * @returns The maptalks zoom level.
 */
export const resolutionToMapZoom = (resolution: number): number => {
	return Math.log2(SCALE_CONFIG.INITIAL_RESOLUTION / resolution);
};

/**
 * Get the next discrete zoom level in the given direction.
 * @param currentZoom - The current discrete zoom level.
 * @param direction - 'up' for zoom in (lower scaleNM), 'down' for zoom out (higher scaleNM).
 * @returns The next discrete zoom level.
 */
export const getNextZoom = (
	currentZoom: number,
	direction: "up" | "down"
): number => {
	const currentIndex = SCALE_MAPPING.findIndex((m) => m.zoom === currentZoom);
	if (currentIndex === -1) return currentZoom;

	if (direction === "up") {
		return currentIndex > 0
			? SCALE_MAPPING[currentIndex - 1].zoom
			: currentZoom;
	} else {
		return currentIndex < SCALE_MAPPING.length - 1
			? SCALE_MAPPING[currentIndex + 1].zoom
			: currentZoom;
	}
};
