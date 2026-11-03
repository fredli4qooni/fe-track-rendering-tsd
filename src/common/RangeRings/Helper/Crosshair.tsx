/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import { RANGE_RING_CONFIG } from "./RangeRing/rangeRings.constants";
import type { CrosshairProps } from "./RangeRing/rangeRings.types";

export const CrosshairComponent: React.FC<CrosshairProps> = ({
	isFollowingShip
}) => {
	const config = RANGE_RING_CONFIG.CROSSHAIR;

	const color = isFollowingShip ? config.FOLLOWING_COLOR : config.STATIC_COLOR;

	const lineLength = config.LINE_LENGTH;
	const centerGap = config.CENTER_GAP;
	const lineWidth = config.LINE_WIDTH;

	const viewBoxSize = lineLength * 2 + lineWidth * 2;
	const center = viewBoxSize / 2;

	return (
		<svg
			className="absolute pointer-events-none"
			style={{
				left: `-${viewBoxSize / 2}px`,
				top: `-${viewBoxSize / 2}px`,
				width: `${viewBoxSize}px`,
				height: `${viewBoxSize}px`,
				filter: `drop-shadow(0 0 ${config.SHADOW.BLUR}px ${color})`,
				opacity: config.OPACITY
			}}
			viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
			aria-label={
				isFollowingShip ? "Crosshair following ship" : "Crosshair static center"
			}
		>
			<line
				x1={center - lineLength}
				y1={center}
				x2={center - centerGap}
				y2={center}
				stroke={color}
				strokeWidth={lineWidth}
				strokeLinecap="round"
			/>

			<line
				x1={center + centerGap}
				y1={center}
				x2={center + lineLength}
				y2={center}
				stroke={color}
				strokeWidth={lineWidth}
				strokeLinecap="round"
			/>

			<line
				x1={center}
				y1={center - lineLength}
				x2={center}
				y2={center - centerGap}
				stroke={color}
				strokeWidth={lineWidth}
				strokeLinecap="round"
			/>

			<line
				x1={center}
				y1={center + centerGap}
				x2={center}
				y2={center + lineLength}
				stroke={color}
				strokeWidth={lineWidth}
				strokeLinecap="round"
			/>
		</svg>
	);
};

export const Crosshair = memo(CrosshairComponent);

export default Crosshair;
