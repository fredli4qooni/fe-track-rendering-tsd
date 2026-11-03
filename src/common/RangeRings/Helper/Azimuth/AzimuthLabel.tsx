/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import { RANGE_RING_CONFIG } from "../RangeRing/rangeRings.constants";
import type { AzimuthLabelProps } from "../RangeRing/rangeRings.types";

/**
 * Renders an azimuth degree label at the calculated position on the azimuth ring.
 * @param root0 - component props
 * @param root0.labelData - azimuth label geometry and text
 * @returns JSX.Element
 */
export const AzimuthLabelComponent: React.FC<AzimuthLabelProps> = ({
	labelData
}) => {
	const { LABEL } = RANGE_RING_CONFIG.AZIMUTH_RING;

	const offsetAngle = ((labelData.angle - 90) * Math.PI) / 180;

	const offsetDistance = -LABEL.OFFSET;

	const offsetX = offsetDistance * Math.cos(offsetAngle);
	const offsetY = offsetDistance * Math.sin(offsetAngle);

	return (
		<div
			style={{
				position: "absolute",
				left: `${labelData.x + offsetX}px`,
				top: `${labelData.y + offsetY}px`,
				transform: "translate(-50%, -50%)"
			}}
		>
			<div
				className="font-mono font-bold whitespace-nowrap"
				style={{
					color: LABEL.COLOR,
					fontSize: LABEL.FONT_SIZE
				}}
			>
				{labelData.label}
			</div>
		</div>
	);
};

export const AzimuthLabel = memo(
	AzimuthLabelComponent,
	(prevProps, nextProps) => {
		const prev = prevProps.labelData;
		const next = nextProps.labelData;

		const EPSILON = 0.01;
		/**
		 * Small numeric equality helper to avoid rerenders from tiny float diffs
		 * @param a - first number
		 * @param b - second number
		 * @returns whether numbers are approximately equal
		 */
		const eq = (a: number, b: number) => Math.abs(a - b) < EPSILON;

		return (
			prev.angle === next.angle &&
			prev.label === next.label &&
			eq(prev.x, next.x) &&
			eq(prev.y, next.y)
		);
	}
);

export default AzimuthLabel;
