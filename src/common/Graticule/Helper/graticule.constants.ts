/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type {
	GraticuleConfig,
	GraticuleInterval,
	GraticuleLabelStyle,
	GraticuleLineStyle
} from "./graticule.types";

export const MARITIME_INTERVALS: readonly GraticuleInterval[] = [
	{
		majorInterval: 10,
		minorInterval: 5,
		threshold: 30,
		navigationType: "oceanic"
	},
	{
		majorInterval: 5,
		minorInterval: 2.5,
		threshold: 15,
		navigationType: "oceanic"
	},
	{
		majorInterval: 2,
		minorInterval: 1,
		threshold: 6,
		navigationType: "oceanic"
	},
	{
		majorInterval: 1,
		minorInterval: 0.5,
		threshold: 3,
		navigationType: "regional"
	},
	{
		majorInterval: 0.5,
		minorInterval: 0.25,
		threshold: 1.5,
		navigationType: "coastal"
	},
	{
		majorInterval: 0.25,
		minorInterval: 0.1,
		threshold: 0.75,
		navigationType: "coastal"
	},
	{
		majorInterval: 0.1,
		minorInterval: 0.05,
		threshold: 0.3,
		navigationType: "coastal"
	},
	{
		majorInterval: 0.05,
		minorInterval: 0.025,
		threshold: 0.15,
		navigationType: "coastal"
	},
	{
		majorInterval: 1 / 60,
		minorInterval: 1 / 120,
		threshold: 0.05,
		navigationType: "harbour"
	},
	{
		majorInterval: 1 / 120,
		minorInterval: 1 / 240,
		threshold: 0.025,
		navigationType: "harbour"
	},
	{
		majorInterval: 1 / 240,
		minorInterval: 1 / 480,
		threshold: 0.0125,
		navigationType: "harbour"
	},
	{
		majorInterval: 1 / 480,
		minorInterval: 1 / 960,
		threshold: 0.006,
		navigationType: "harbour"
	}
] as const;

export const FALLBACK_INTERVAL: GraticuleInterval = {
	majorInterval: 1 / 960,
	minorInterval: 1 / 1920,
	threshold: 0,
	navigationType: "harbour"
};

export const DEFAULT_LINE_STYLE: GraticuleLineStyle = {
	majorColor: "#ffffff",
	minorColor: "#808080",
	majorWidth: 1.2,
	minorWidth: 0.6,
	majorOpacity: 0.5,
	minorOpacity: 0.25
};

export const DEFAULT_LABEL_STYLE: GraticuleLabelStyle = {
	textColor: "#ffffff",
	fontSize: 11,
	fontFamily: "'Courier New', Consolas, monospace",
	backgroundColor: "#141e28",
	backgroundOpacity: 0.85,
	padding: [6, 3]
};

export const DEFAULT_GRATICULE_CONFIG: GraticuleConfig = {
	visible: true,
	showLabels: true,
	lineStyle: DEFAULT_LINE_STYLE,
	labelStyle: DEFAULT_LABEL_STYLE,
	forceRenderOnMoving: false
};

export const WEB_MERCATOR_BOUNDS = {
	minLon: -180,
	maxLon: 180,
	minLat: -85.0511,
	maxLat: 85.0511
} as const;

export const GRATICULE_LAYER_IDS = {
	MAJOR_LINES: "graticule-major-lines",
	MINOR_LINES: "graticule-minor-lines",
	LABELS: "graticule-labels"
} as const;
