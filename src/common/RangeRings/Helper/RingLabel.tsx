/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import {
	getRingLabelFontSize,
	getRingLabelOpacity
} from "./RangeRing/rangeRingCalculations";
import { RANGE_RING_CONFIG } from "./RangeRing/rangeRings.constants";
import type { RingLabelProps } from "./RangeRing/rangeRings.types";

export const RingLabelComponent: React.FC<RingLabelProps> = ({
	ring,
	position
}) => {
	const getLabelPosition = (): React.CSSProperties => {
		const baseStyle: React.CSSProperties = {
			position: "absolute"
		};

		switch (position) {
			case "top":
				return {
					...baseStyle,
					left: "0px",
					top: `${-ring.radiusPixels - RANGE_RING_CONFIG.LABEL_OFFSET - 15}px`,
					transform: "translateX(-50%)"
				};
			case "right":
				return {
					...baseStyle,
					left: `${ring.radiusPixels + RANGE_RING_CONFIG.LABEL_OFFSET}px`,
					top: "0px",
					transform: "translateY(-50%)"
				};
			case "bottom":
				return {
					...baseStyle,
					left: "0px",
					top: `${ring.radiusPixels + RANGE_RING_CONFIG.LABEL_OFFSET}px`,
					transform: "translateX(-50%)"
				};
			case "left":
				return {
					...baseStyle,
					left: `${-ring.radiusPixels - RANGE_RING_CONFIG.LABEL_OFFSET}px`,
					top: "0px",
					transform: "translate(-100%, -50%)"
				};
		}
	};

	const fontSize = getRingLabelFontSize(ring.index);
	const opacity = getRingLabelOpacity(ring.index);

	return (
		<div style={getLabelPosition()}>
			<div
				className="font-mono font-bold whitespace-nowrap"
				style={{
					color: RANGE_RING_CONFIG.LABEL_COLOR,
					fontSize,
					opacity
				}}
			>
				{ring.label}
			</div>
		</div>
	);
};

export const RingLabel = memo(RingLabelComponent, (prevProps, nextProps) => {
	return (
		prevProps.ring.label === nextProps.ring.label &&
		prevProps.ring.radiusPixels === nextProps.ring.radiusPixels &&
		prevProps.ring.index === nextProps.ring.index &&
		prevProps.position === nextProps.position
	);
});

export default RingLabel;
