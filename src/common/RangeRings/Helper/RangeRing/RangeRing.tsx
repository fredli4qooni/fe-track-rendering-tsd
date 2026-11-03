/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo } from "react";

import { AzimuthLabel } from "../Azimuth/AzimuthLabel";
import { RingCircle } from "../RingCircle";
import { RingLabel } from "../RingLabel";
import { RANGE_RING_CONFIG } from "./rangeRings.constants";
import type { RangeRingProps } from "./rangeRings.types";

/**
 * Render a single range ring with optional azimuth ticks/labels and distance labels.
 * @param props - Range ring props containing rendering data.
 * @returns JSX fragment for a ring.
 */
const RangeRingComponent: React.FC<RangeRingProps> = (props) => {
	const { ring } = props;
	const isAzimuthRing = ring.isAzimuthRing === true;

	return (
		<>
			<RingCircle
				index={ring.index}
				radiusPixels={ring.radiusPixels}
				styleVariant={ring.styleVariant}
				isAzimuthRing={isAzimuthRing}
				azimuthTicks={ring.azimuthTicks}
			/>

			{RANGE_RING_CONFIG.LABEL_POSITIONS.map((position) => (
				<RingLabel
					key={`${ring.index}-${position}`}
					ring={ring}
					position={position}
				/>
			))}

			{isAzimuthRing && ring.azimuthLabels && (
				<>
					{ring.azimuthLabels.map((labelData) => (
						<AzimuthLabel
							key={`azimuth-${labelData.angle}`}
							labelData={labelData}
							radiusPixels={ring.radiusPixels}
						/>
					))}
				</>
			)}
		</>
	);
};

export const RangeRing = memo(RangeRingComponent, (prevProps, nextProps) => {
	const prev = prevProps.ring;
	const next = nextProps.ring;

	return (
		prev.index === next.index &&
		prev.radiusPixels === next.radiusPixels &&
		prev.label === next.label &&
		prev.styleVariant === next.styleVariant &&
		prev.isAzimuthRing === next.isAzimuthRing
	);
});

export default RangeRing;
