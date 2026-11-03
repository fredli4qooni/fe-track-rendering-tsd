/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { memo, useEffect, useRef, useState } from "react";

import * as maptalks from "maptalks";

import Crosshair from "./Helper/Crosshair";
import RangeRing from "./Helper/RangeRing/RangeRing";
import { RANGE_RING_CONFIG } from "./Helper/RangeRing/rangeRings.constants";
import { useRangeRings } from "./Helper/RangeRing/rangeRings.hooks";
import { RangeRingsConfig } from "./Helper/RangeRing/rangeRings.types";

export interface RangeRingsProps {
	config: RangeRingsConfig;
}


/**
 * RangeRingsComponent
 *
 * Renders range rings and crosshair positioned relative to the own-ship and current
 * map state; handles both follow and static modes and optimizes updates to avoid
 * unnecessary React re-renders.
 *
 * @param props - Component props.
 * @param props.config - Configuration object for range rings.
 * @returns React.ReactElement | null - The rendered range rings or null when hidden.
 */
export const RangeRingsComponent: React.FC<RangeRingsProps> = (props: RangeRingsProps) => {
	const { config } = props;
	const {
		currentScaleValue,
		currentResolution,
		mapPixelWidth,
		mapPixelHeight,
		visible,
		ownShipPosition,
		ownShipPositionRef,
		mapRef,
		isFollowing,
		isFreeDrag
	} = config;

	const [snapshotPos, setSnapshotPos] = useState<[number, number]>(
		ownShipPosition ?? ownShipPositionRef?.current ?? [0, 0]
	);

	useEffect(() => {
		if (!isFollowing) {
			const snapshot =
				ownShipPositionRef?.current ?? ownShipPosition ?? snapshotPos;
			setSnapshotPos(snapshot);
		}
	}, [isFollowing, ownShipPositionRef, ownShipPosition]);

	const { rings, offsetX, offsetY, ringsFollowShip } = useRangeRings({
		currentScaleValue,
		currentResolution,
		mapPixelWidth,
		mapPixelHeight,
		ownShipPosition: snapshotPos,
		mapRef,
		isFollowing,
		isFreeDrag
	});

	const wrapperRef = useRef<HTMLDivElement | null>(null);
	
		useEffect(() => {
		let rafId: number | null = null;
		const el = wrapperRef.current;

		if (isFollowing && isFreeDrag && ownShipPositionRef && mapRef?.current) {
			/**
			 * Update loop that repositions the wrapper element on each animation frame
			 * while the map is being followed and free-dragged, keeping the visual
			 * range rings aligned with the own-ship position.
			 */
			const update = () => {
				try {
					const own = ownShipPositionRef.current;
					if (!own || !mapRef.current) {
						rafId = requestAnimationFrame(update);
						return;
					}

					const map = mapRef.current as unknown as maptalks.Map;
					const mapCenter = map.getCenter();
					const ownShipPixel = map.coordinateToContainerPoint(
						new maptalks.Coordinate(own)
					);
					const centerPixel = map.coordinateToContainerPoint(
						new maptalks.Coordinate([mapCenter.x, mapCenter.y])
					);

					const dx =
						Math.abs(ownShipPixel.x - centerPixel.x) < 0.5
							? 0
							: ownShipPixel.x - centerPixel.x;
					const dy =
						Math.abs(ownShipPixel.y - centerPixel.y) < 0.5
							? 0
							: ownShipPixel.y - centerPixel.y;

					if (el) {
						el.style.left = `calc(50% + ${dx}px)`;
						el.style.top = `calc(50% + ${dy}px)`;
						el.style.transform = "translate(-50%, -50%)";
						el.style.transition = "none";
					}
				} catch {
				}
				rafId = requestAnimationFrame(update);
			};

			update();
		} else if (el) {
			el.style.left = ringsFollowShip ? `calc(50% + ${offsetX}px)` : "50%";
			el.style.top = ringsFollowShip ? `calc(50% + ${offsetY}px)` : "50%";
			el.style.transform = "translate(-50%, -50%)";
			el.style.transition = ringsFollowShip
				? "none"
				: `left ${RANGE_RING_CONFIG.TRANSITION_DURATION}, top ${RANGE_RING_CONFIG.TRANSITION_DURATION}`;
		}

		return () => {
			if (rafId !== null) cancelAnimationFrame(rafId);
		};
	}, [
		isFollowing,
		isFreeDrag,
		ownShipPositionRef,
		mapRef,
		ringsFollowShip,
		offsetX,
		offsetY,
		mapPixelWidth,
		mapPixelHeight
	]);

	if (!visible || currentResolution === 0) {
		return null;
	}

	return (
		<div className="absolute inset-0 pointer-events-none">
			<div
				ref={wrapperRef}
				data-testid="range-rings-wrapper"
				data-snapshot-pos={`${snapshotPos[0]},${snapshotPos[1]}`}
				className="absolute"
				style={{
					left: ringsFollowShip ? `calc(50% + ${offsetX}px)` : "50%",
					top: ringsFollowShip ? `calc(50% + ${offsetY}px)` : "50%",
					transform: "translate(-50%, -50%)",
					width: 0,
					height: 0,

					transition: ringsFollowShip
						? "none"
						: `left ${RANGE_RING_CONFIG.TRANSITION_DURATION}, top ${RANGE_RING_CONFIG.TRANSITION_DURATION}`
				}}
			>
				{rings.map((ring) => (
					<RangeRing key={`ring-${ring.index}`} ring={ring} />
				))}

				<Crosshair isFollowingShip={ringsFollowShip} />
			</div>
		</div>
	);
};

export const RangeRings = memo(RangeRingsComponent, (prevProps, nextProps) => {
	const prev = prevProps.config;
	const next = nextProps.config;

	const ownShipEqual =
		prev.ownShipPositionRef && next.ownShipPositionRef
			? prev.ownShipPositionRef === next.ownShipPositionRef
			: (prev.ownShipPosition || [0, 0])[0] ===
					(next.ownShipPosition || [0, 0])[0] &&
				(prev.ownShipPosition || [0, 0])[1] ===
					(next.ownShipPosition || [0, 0])[1];

	return (
		prev.currentScaleValue === next.currentScaleValue &&
		prev.currentResolution === next.currentResolution &&
		prev.mapPixelWidth === next.mapPixelWidth &&
		prev.mapPixelHeight === next.mapPixelHeight &&
		prev.visible === next.visible &&
		ownShipEqual &&
		prev.mapRef === next.mapRef &&
		prev.isFollowing === next.isFollowing &&
		prev.isFreeDrag === next.isFreeDrag
	);
});

export default RangeRings;
