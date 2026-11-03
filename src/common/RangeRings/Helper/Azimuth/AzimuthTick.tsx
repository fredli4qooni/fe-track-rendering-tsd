/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import { RANGE_RING_CONFIG } from "../RangeRing/rangeRings.constants";
import type { AzimuthTickProps } from "../RangeRing/rangeRings.types";

export const AzimuthTickComponent: React.FC<AzimuthTickProps> = ({
	tickData
}) => {
	const { TICK_MARKS } = RANGE_RING_CONFIG.AZIMUTH_RING;

	const strokeWidth = tickData.isMajor
		? TICK_MARKS.MAJOR_TICK_WIDTH
		: TICK_MARKS.MINOR_TICK_WIDTH;

	const opacity = tickData.isMajor
		? TICK_MARKS.MAJOR_TICK_OPACITY
		: TICK_MARKS.MINOR_TICK_OPACITY;

	return (
		<line
			x1={tickData.x1}
			y1={tickData.y1}
			x2={tickData.x2}
			y2={tickData.y2}
			stroke={TICK_MARKS.TICK_COLOR}
			strokeWidth={strokeWidth}
			opacity={opacity}
			strokeLinecap="round"
		/>
	);
};

export const AzimuthTick = memo(
	AzimuthTickComponent,
	(prevProps, nextProps) => {
		const prev = prevProps.tickData;
		const next = nextProps.tickData;

		const EPSILON = 0.01;
		const eq = (a: number, b: number) => Math.abs(a - b) < EPSILON;

		return (
			prev.angle === next.angle &&
			prev.isMajor === next.isMajor &&
			eq(prev.x1, next.x1) &&
			eq(prev.y1, next.y1) &&
			eq(prev.x2, next.x2) &&
			eq(prev.y2, next.y2)
		);
	}
);

export default AzimuthTick;
