/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import { AzimuthTick } from "./Azimuth/AzimuthTick";
import { RANGE_RING_CONFIG } from "./RangeRing/rangeRings.constants";
import type { AzimuthTickData } from "./RangeRing/rangeRings.types";

export interface RingCircleProps {
	index: number;
	radiusPixels: number;
	styleVariant: number;
	isAzimuthRing: boolean;
	azimuthTicks?: AzimuthTickData[];
}

const RingCircleComponent: React.FC<RingCircleProps> = ({
	radiusPixels,
	styleVariant,
	isAzimuthRing,
	azimuthTicks
}) => {
	const style = isAzimuthRing
		? null
		: RANGE_RING_CONFIG.STYLE_VARIANTS[styleVariant];

	const strokePadding = isAzimuthRing
		? RANGE_RING_CONFIG.AZIMUTH_RING.LINE_WIDTH
		: (style?.width ?? RANGE_RING_CONFIG.LINE_WIDTH);

	const svgSize = radiusPixels + strokePadding;
	const svgCenter = radiusPixels + strokePadding;

	return (
		<svg
			className="absolute pointer-events-none"
			style={{
				left: -(radiusPixels + strokePadding),
				top: -(radiusPixels + strokePadding),
				width: svgSize,
				height: svgSize,
				overflow: "visible"
			}}
		>
			{isAzimuthRing && azimuthTicks && (
				<g transform={`translate(${svgCenter}, ${svgCenter})`}>
					{azimuthTicks.map((tickData) => (
						<AzimuthTick key={`tick-${tickData.angle}`} tickData={tickData} />
					))}
				</g>
			)}

			<circle
				cx={svgCenter}
				cy={svgCenter}
				r={radiusPixels}
				fill="none"
				stroke={
					isAzimuthRing
						? RANGE_RING_CONFIG.AZIMUTH_RING.COLOR
						: RANGE_RING_CONFIG.LINE_COLOR
				}
				strokeWidth={
					isAzimuthRing
						? RANGE_RING_CONFIG.AZIMUTH_RING.LINE_WIDTH
						: (style?.width ?? RANGE_RING_CONFIG.LINE_WIDTH)
				}
				strokeDasharray={
					!isAzimuthRing && style?.style === "dashed" ? "5,5" : undefined
				}
				opacity={isAzimuthRing ? 1 : (style?.opacity ?? 0.5)}
			/>
		</svg>
	);
};

export const RingCircle = memo(RingCircleComponent, (prevProps, nextProps) => {
	return (
		prevProps.index === nextProps.index &&
		prevProps.radiusPixels === nextProps.radiusPixels &&
		prevProps.styleVariant === nextProps.styleVariant &&
		prevProps.isAzimuthRing === nextProps.isAzimuthRing &&
		prevProps.azimuthTicks === nextProps.azimuthTicks
	);
});

export default RingCircle;
