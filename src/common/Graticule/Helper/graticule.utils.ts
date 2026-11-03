/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import {
	FALLBACK_INTERVAL,
	MARITIME_INTERVALS,
	WEB_MERCATOR_BOUNDS
} from "./graticule.constants";
import type {
	DMSCoordinate,
	GraticuleInterval,
	MapBounds
} from "./graticule.types";

/**
 * Converts a decimal degree value to degrees, minutes, seconds format.
 *
 * @param decimal - The decimal degree value to convert
 * @param isLatitude - Whether this is a latitude (true) or longitude (false)
 * @returns The DMS coordinate object with formatted string
 */
export function decimalToDMS(
	decimal: number,
	isLatitude: boolean
): DMSCoordinate {
	const absoluteValue = Math.abs(decimal);
	const degrees = Math.floor(absoluteValue);
	const minutesDecimal = (absoluteValue - degrees) * 60;
	const minutes = Math.floor(minutesDecimal);
	const seconds = Math.round((minutesDecimal - minutes) * 60);

	let direction: "N" | "S" | "E" | "W";
	if (isLatitude) {
		direction = decimal >= 0 ? "N" : "S";
	} else {
		direction = decimal >= 0 ? "E" : "W";
	}

	const formatted = `${degrees}°${minutes.toString().padStart(2, "0")}'${seconds.toString().padStart(2, "0")}"${direction}`;

	return {
		degrees,
		minutes,
		seconds,
		direction,
		formatted
	};
}

/**
 * Formats a decimal coordinate to a compact DMS string.
 * Omits seconds if zero, and omits minutes/seconds if both are zero.
 *
 * @param decimal - The decimal degree value to format
 * @param isLatitude - Whether this is a latitude (true) or longitude (false)
 * @returns Formatted coordinate string
 */
export function formatCompactDMS(decimal: number, isLatitude: boolean): string {
	const dms = decimalToDMS(decimal, isLatitude);

	if (dms.minutes === 0 && dms.seconds === 0) {
		return `${dms.degrees}°${dms.direction}`;
	}

	if (dms.seconds === 0) {
		return `${dms.degrees}°${dms.minutes.toString().padStart(2, "0")}'${dms.direction}`;
	}

	return dms.formatted;
}

/**
 * Gets the appropriate maritime interval for the given viewport height in degrees.
 * Uses IHO S-52/S-101 standards for maritime navigation.
 *
 * @param viewportHeight - The viewport height in degrees
 * @returns The appropriate graticule interval configuration
 */
export function getMaritimeInterval(viewportHeight: number): GraticuleInterval {
	for (const interval of MARITIME_INTERVALS) {
		if (viewportHeight >= interval.threshold) {
			return interval;
		}
	}
	return FALLBACK_INTERVAL;
}

/**
 * Calculates the map bounds from center and extent.
 *
 * @param centerLon - Center longitude
 * @param centerLat - Center latitude
 * @param extentWidth - Width of the extent in degrees
 * @param extentHeight - Height of the extent in degrees
 * @returns Clamped map bounds within Web Mercator limits
 */
export function calculateMapBounds(
	centerLon: number,
	centerLat: number,
	extentWidth: number,
	extentHeight: number
): MapBounds {
	const halfWidth = extentWidth / 2;
	const halfHeight = extentHeight / 2;

	return {
		west: Math.max(centerLon - halfWidth, WEB_MERCATOR_BOUNDS.minLon),
		east: Math.min(centerLon + halfWidth, WEB_MERCATOR_BOUNDS.maxLon),
		south: Math.max(centerLat - halfHeight, WEB_MERCATOR_BOUNDS.minLat),
		north: Math.min(centerLat + halfHeight, WEB_MERCATOR_BOUNDS.maxLat)
	};
}

/**
 * Generates an array of values at regular intervals within a range.
 *
 * @param start - Start of the range
 * @param end - End of the range
 * @param interval - Interval between values
 * @returns Array of values at the specified interval
 */
export function generateIntervalValues(
	start: number,
	end: number,
	interval: number
): number[] {
	const values: number[] = [];
	const firstValue = Math.ceil(start / interval) * interval;

	for (let value = firstValue; value <= end; value += interval) {
		values.push(Math.round(value * 1000000) / 1000000);
	}

	return values;
}

/**
 * Checks if a value is a major grid line based on the interval configuration.
 *
 * @param value - The coordinate value to check
 * @param majorInterval - The major interval value
 * @returns True if this is a major grid line
 */
export function isMajorGridLine(value: number, majorInterval: number): boolean {
	const tolerance = majorInterval / 1000;
	const remainder = Math.abs(value % majorInterval);
	return (
		remainder < tolerance || Math.abs(remainder - majorInterval) < tolerance
	);
}

/**
 * Normalizes longitude to the -180 to 180 range.
 *
 * @param lon - Longitude value to normalize
 * @returns Normalized longitude
 */
export function normalizeLongitude(lon: number): number {
	while (lon > 180) lon -= 360;
	while (lon < -180) lon += 360;
	return lon;
}

/**
 * Clamps latitude to valid Web Mercator bounds.
 *
 * @param lat - Latitude value to clamp
 * @returns Clamped latitude
 */
export function clampLatitude(lat: number): number {
	return Math.max(
		WEB_MERCATOR_BOUNDS.minLat,
		Math.min(WEB_MERCATOR_BOUNDS.maxLat, lat)
	);
}
