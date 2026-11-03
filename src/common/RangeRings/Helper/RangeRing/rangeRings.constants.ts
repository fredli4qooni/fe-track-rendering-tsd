/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export const RANGE_RING_CONFIG = {
	COLORS: "rgba(255, 255, 255, 0.15)",	LINE_WIDTH: 2,
	LINE_COLOR: "rgba(255, 255, 255, 0.5)",
	LABEL_COLOR: "#ffffff",
	LABEL_BG_COLOR: "rgba(255, 255, 255, 0.1)",
	RING_INTERVAL_FACTOR: 0.25,
	BUFFER_MULTIPLIER: 1.1,
	LABEL_POSITIONS: ["top", "right", "bottom", "left"] as const,
	LABEL_OFFSET: 10,
	LABEL_STRATEGY: {
		INNER_RING_MAX: 5,
		MID_RING_MAX: 20,
		INNER_INTERVAL: 1,
		MID_INTERVAL: 2,
		OUTER_INTERVAL: 4
	},
	STYLE_VARIATION_INTERVAL: 4,
	STYLE_VARIANTS: [
		{ style: "solid", width: 2, opacity: 0.5 },
		{ style: "dashed", width: 2, opacity: 0.4 },
		{ style: "solid", width: 1, opacity: 0.3 }
	] as const,
	FONT_SIZES: {
		INNER: "9px",
		MID: "8px",
		OUTER: "7px"
	},
	MAX_RINGS: 100,
	TRANSITION_DURATION: "0.3s",
	AZIMUTH_RING: {
		RING_INDEX: 4,
		DEGREE_INTERVAL: 30,
		COLOR: "rgba(255, 255, 255, 0.8)",
		LINE_WIDTH: 3,
		LABEL: {
			COLOR: "#ffffff",
			BG_COLOR: "rgba(255, 255, 255, 0.8)",
			FONT_SIZE: "9px",
			OFFSET: 25
		},
		TICK_MARKS: {
			TICK_INTERVAL: 1,
			MAJOR_TICK_LENGTH: 15,
			MINOR_TICK_LENGTH: 8,
			MAJOR_TICK_WIDTH: 2,
			MINOR_TICK_WIDTH: 1,
			TICK_COLOR: "rgba(255, 255, 255, 0.8)",
			MAJOR_TICK_OPACITY: 1,
			MINOR_TICK_OPACITY: 0.6
		}
	},
	CROSSHAIR: {
		LINE_LENGTH: 12,
		LINE_WIDTH: 1.5,
		CENTER_GAP: 3,
		STATIC_COLOR: "#4ade80",
		FOLLOWING_COLOR: "#fbbf24",
		OPACITY: 0.9,
		SHADOW: {
			BLUR: 8,
			OPACITY: 0.7
		}
	}
} as const;

export const SCALE_CONFIG = {
	NAUTICAL_MILES_CONSTANT: 1852,
	INITIAL_RESOLUTION: 156543.0339,
	MIN_ZOOM: 1,
	MAX_ZOOM: 14,
	DEFAULT_ZOOM: 4
};

export type RangeRingConfig = typeof RANGE_RING_CONFIG;

export type LabelPosition = (typeof RANGE_RING_CONFIG.LABEL_POSITIONS)[number];

export type StyleVariant = (typeof RANGE_RING_CONFIG.STYLE_VARIANTS)[number];
