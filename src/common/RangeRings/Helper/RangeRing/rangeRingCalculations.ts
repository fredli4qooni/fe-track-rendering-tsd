/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { RANGE_RING_CONFIG, SCALE_CONFIG } from "./rangeRings.constants";
import type {
	AzimuthLabelData,
	AzimuthTickData,
	RingData
} from "./rangeRings.types";

export const calculateRequiredRings = (
	mapPixelWidth: number,
	mapPixelHeight: number,
	currentResolution: number,
	currentScaleNM: number,
	offsetX: number = 0,
	offsetY: number = 0
): number => {
	const ringCenterX = mapPixelWidth / 2 + offsetX;
	const ringCenterY = mapPixelHeight / 2 + offsetY;

	const distanceToLeft = ringCenterX;
	const distanceToRight = mapPixelWidth - ringCenterX;
	const distanceToTop = ringCenterY;
	const distanceToBottom = mapPixelHeight - ringCenterY;

	const cornerDistances = [
		Math.hypot(distanceToLeft, distanceToTop),
		Math.hypot(distanceToRight, distanceToTop),
		Math.hypot(distanceToLeft, distanceToBottom),
		Math.hypot(distanceToRight, distanceToBottom)
	];

	const maxDistancePixels = Math.max(...cornerDistances);
	const maxDistanceWithBuffer =
		maxDistancePixels * RANGE_RING_CONFIG.BUFFER_MULTIPLIER;

	const maxDistanceMeters = maxDistanceWithBuffer * currentResolution;
	const maxDistanceNM =
		maxDistanceMeters / SCALE_CONFIG.NAUTICAL_MILES_CONSTANT;

	const ringIntervalNM =
		currentScaleNM * RANGE_RING_CONFIG.RING_INTERVAL_FACTOR;
	const requiredRings = Math.ceil(maxDistanceNM / ringIntervalNM);

	return Math.min(requiredRings, RANGE_RING_CONFIG.MAX_RINGS);
};

export const nmToPixels = (
	nauticalMiles: number,
	currentResolution: number
): number => {
	const meters = nauticalMiles * SCALE_CONFIG.NAUTICAL_MILES_CONSTANT;
	return meters / currentResolution;
};

export const getStyleVariantIndex = (ringIndex: number): number => {
	return (
		Math.floor(ringIndex / RANGE_RING_CONFIG.STYLE_VARIATION_INTERVAL) %
		RANGE_RING_CONFIG.STYLE_VARIANTS.length
	);
};

export const formatRangeRingLabel = (nauticalMiles: number): string => {
	if (nauticalMiles < 0.1) {
		return `${nauticalMiles.toFixed(3)} NM`;
	}

	if (nauticalMiles < 1) {
		const rounded = Math.round(nauticalMiles * 1000) / 1000;

		const formatted = rounded.toString();
		return `${formatted} NM`;
	}

	return `${Math.round(nauticalMiles)} NM`;
};

export const getRingLabelFontSize = (ringIndex: number): string => {
	const { INNER_RING_MAX, MID_RING_MAX } = RANGE_RING_CONFIG.LABEL_STRATEGY;
	const { INNER, MID, OUTER } = RANGE_RING_CONFIG.FONT_SIZES;

	if (ringIndex <= INNER_RING_MAX) return INNER;
	if (ringIndex <= MID_RING_MAX) return MID;
	return OUTER;
};

export const getRingLabelOpacity = (ringIndex: number): number => {
	return ringIndex <= 10 ? 1 : 0.8;
};

export const generateAzimuthLabels = (
	radiusPixels: number
): AzimuthLabelData[] => {
	const { DEGREE_INTERVAL } = RANGE_RING_CONFIG.AZIMUTH_RING;
	const labels: AzimuthLabelData[] = [];

	const roundTo = (value: number, decimals = 2) => {
		const factor = Math.pow(10, decimals);
		return Math.round(value * factor) / factor;
	};

	for (let angle = 0; angle < 360; angle += DEGREE_INTERVAL) {
		const angleInRadians = ((angle - 90) * Math.PI) / 180;

		const x = roundTo(radiusPixels * Math.cos(angleInRadians));
		const y = roundTo(radiusPixels * Math.sin(angleInRadians));

		labels.push({
			angle,
			x,
			y,
			label: `${angle}°`
		});
	}

	return labels;
};

export const generateAzimuthTicks = (
	radiusPixels: number
): AzimuthTickData[] => {
	const { TICK_INTERVAL, MAJOR_TICK_LENGTH, MINOR_TICK_LENGTH } =
		RANGE_RING_CONFIG.AZIMUTH_RING.TICK_MARKS;
	const { DEGREE_INTERVAL } = RANGE_RING_CONFIG.AZIMUTH_RING;

	const ticks: AzimuthTickData[] = [];

	const roundTo = (value: number, decimals = 2) => {
		const factor = Math.pow(10, decimals);
		return Math.round(value * factor) / factor;
	};

	for (let angle = 0; angle < 360; angle += TICK_INTERVAL) {
		const isMajor = angle % DEGREE_INTERVAL === 0;
		const tickLength = isMajor ? MAJOR_TICK_LENGTH : MINOR_TICK_LENGTH;

		const angleInRadians = ((angle - 90) * Math.PI) / 180;

		const x1 = roundTo(radiusPixels * Math.cos(angleInRadians));
		const y1 = roundTo(radiusPixels * Math.sin(angleInRadians));

		const x2 = roundTo((radiusPixels - tickLength) * Math.cos(angleInRadians));
		const y2 = roundTo((radiusPixels - tickLength) * Math.sin(angleInRadians));

		ticks.push({
			angle,
			isMajor,
			x1,
			y1,
			x2,
			y2
		});
	}

	return ticks;
};

export const generateRingData = (
	currentScaleNM: number,
	currentResolution: number,
	mapPixelWidth: number,
	mapPixelHeight: number,
	offsetX: number = 0,
	offsetY: number = 0
): RingData[] => {
	const ringIntervalNM =
		currentScaleNM * RANGE_RING_CONFIG.RING_INTERVAL_FACTOR;

	const ringCount = calculateRequiredRings(
		mapPixelWidth,
		mapPixelHeight,
		currentResolution,
		currentScaleNM,
		offsetX,
		offsetY
	);

	const rings: RingData[] = [];
	const azimuthRingIndex = RANGE_RING_CONFIG.AZIMUTH_RING.RING_INDEX;

	const roundTo = (value: number, decimals = 2) => {
		const factor = Math.pow(10, decimals);
		return Math.round(value * factor) / factor;
	};

	for (let i = 1; i <= ringCount; i++) {
		const radiusNM = ringIntervalNM * i;
		const radiusPixels = roundTo(nmToPixels(radiusNM, currentResolution));
		const isAzimuthRing = i === azimuthRingIndex;

		rings.push({
			index: i,
			radiusNM,
			radiusPixels,
			label: formatRangeRingLabel(radiusNM),
			styleVariant: getStyleVariantIndex(i),
			isAzimuthRing,
			azimuthLabels: isAzimuthRing
				? generateAzimuthLabels(radiusPixels)
				: undefined,
			azimuthTicks: isAzimuthRing
				? generateAzimuthTicks(radiusPixels)
				: undefined
		});
	}

	return rings;
};
