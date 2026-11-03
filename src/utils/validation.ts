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
		return { valid: false, error: "Nama entity tidak boleh kosong." };
	}
	const trimmed = name.trim();
	if (trimmed.length < 2) {
		return { valid: false, error: "Nama entity minimal 2 karakter." };
	}
	if (trimmed.length > 60) {
		return { valid: false, error: "Nama entity maksimal 60 karakter." };
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
		return { valid: false, error: "Latitude harus berupa angka valid." };
	}
	if (lat < -90 || lat > 90) {
		return { valid: false, error: "Latitude harus berada dalam rentang -90° s/d +90°." };
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
		return { valid: false, error: "Longitude harus berupa angka valid." };
	}
	if (lon < -180 || lon > 180) {
		return { valid: false, error: "Longitude harus berada dalam rentang -180° s/d +180°." };
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
		return { valid: false, error: "Jumlah track harus berupa bilangan bulat." };
	}
	if (count < 50) {
		return { valid: false, error: "Jumlah minimal spawn adalah 50 track." };
	}
	if (count > 10000) {
		return { valid: false, error: "Jumlah maksimal spawn adalah 10.000 track (batas akselerasi GPU)." };
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
		return { valid: false, error: "Course / haluan harus berada antara 0° s/d 360°." };
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
		return { valid: false, error: "Kecepatan harus berada antara 0 s/d 120 knots." };
	}
	return { valid: true };
}

