/**
 * Form and input validation utilities for Tactical Entity management.
 */

export interface ValidationResult {
	valid: boolean;
	error?: string;
}

/**
 * Validate entity / track name.
 * @param name - The track name string
 * @returns Validation result with valid flag and optional error message
 */
export function validateTrackName(name: string): ValidationResult {
	if (!name || !name.trim()) {
		return { valid: false, error: "Entity name cannot be empty." };
	}
	const trimmed = name.trim();
	if (trimmed.length < 2) {
		return {
			valid: false,
			error: "Entity name must be at least 2 characters."
		};
	}
	if (trimmed.length > 60) {
		return { valid: false, error: "Entity name cannot exceed 60 characters." };
	}
	return { valid: true };
}

/**
 * Validate latitude coordinate (-90 to +90 degrees).
 * @param lat - Latitude in degrees
 * @returns Validation result with valid flag and optional error message
 */
export function validateLatitude(lat: number): ValidationResult {
	if (Number.isNaN(lat) || typeof lat !== "number") {
		return { valid: false, error: "Latitude must be a valid number." };
	}
	if (lat < -90 || lat > 90) {
		return {
			valid: false,
			error: "Latitude must be between -90° and +90°."
		};
	}
	return { valid: true };
}

/**
 * Validate longitude coordinate (-180 to +180 degrees).
 * @param lon - Longitude in degrees
 * @returns Validation result with valid flag and optional error message
 */
export function validateLongitude(lon: number): ValidationResult {
	if (Number.isNaN(lon) || typeof lon !== "number") {
		return { valid: false, error: "Longitude must be a valid number." };
	}
	if (lon < -180 || lon > 180) {
		return {
			valid: false,
			error: "Longitude must be between -180° and +180°."
		};
	}
	return { valid: true };
}

/**
 * Validate spawn count for batch track generation (50 to 10,000).
 * @param count - Total tracks to spawn
 * @returns Validation result with valid flag and optional error message
 */
export function validateSpawnCount(count: number): ValidationResult {
	if (Number.isNaN(count) || !Number.isInteger(count)) {
		return { valid: false, error: "Track count must be an integer." };
	}
	if (count < 50) {
		return { valid: false, error: "Minimum spawn count is 50 tracks." };
	}
	if (count > 10000) {
		return {
			valid: false,
			error: "Maximum spawn count is 10,000 tracks (GPU acceleration limit)."
		};
	}
	return { valid: true };
}

/**
 * Validate course / bearing angle (0 to 360 degrees).
 * @param course - Angle in degrees
 * @returns Validation result with valid flag and optional error message
 */
export function validateCourse(course: number): ValidationResult {
	if (Number.isNaN(course) || course < 0 || course > 360) {
		return {
			valid: false,
			error: "Course must be between 0° and 360°."
		};
	}
	return { valid: true };
}

/**
 * Validate speed in knots (0 to 120 knots).
 * @param speed - Speed in knots
 * @returns Validation result with valid flag and optional error message
 */
export function validateSpeed(speed: number): ValidationResult {
	if (Number.isNaN(speed) || speed < 0 || speed > 120) {
		return {
			valid: false,
			error: "Speed must be between 0 and 120 knots."
		};
	}
	return { valid: true };
}
