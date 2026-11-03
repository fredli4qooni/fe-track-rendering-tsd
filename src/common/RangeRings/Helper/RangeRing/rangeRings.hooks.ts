/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { useEffect, useMemo, useRef, useState } from "react";

import * as maptalks from "maptalks";

import { generateRingData } from "./rangeRingCalculations";
import type { RingData, UseRangeRingsResult } from "./rangeRings.types";

export const useRingOffset = (
	mapRef: React.MutableRefObject<maptalks.Map | null>,
	ownShipPosition: [number, number],
	isFollowing: boolean,
	isFreeDrag: boolean
) => {
	const [offsetX, setOffsetX] = useState(0);
	const [offsetY, setOffsetY] = useState(0);

	const updateOffsetRef = useRef<() => void>();

	useEffect(() => {
		if (!mapRef.current) return;

		const shouldRingsFollowShip = isFollowing && isFreeDrag;

		if (!shouldRingsFollowShip) {
			setOffsetX(0);
			setOffsetY(0);
			return;
		}

		const updateOffset = () => {
			try {
				const map = mapRef.current;
				if (!map) return;
				const mapCenter = map.getCenter();
				const ownShipPixel = map.coordinateToContainerPoint(
					new maptalks.Coordinate(ownShipPosition)
				);
				const centerPixel = map.coordinateToContainerPoint(
					new maptalks.Coordinate([mapCenter.x, mapCenter.y])
				);

				const deltaX = ownShipPixel.x - centerPixel.x;
				const deltaY = ownShipPixel.y - centerPixel.y;

				setOffsetX((prev) => (Math.abs(prev - deltaX) < 0.5 ? prev : deltaX));
				setOffsetY((prev) => (Math.abs(prev - deltaY) < 0.5 ? prev : deltaY));
			} catch (error) {
				console.warn("Error calculating ring offset:", error);
			}
		};

		updateOffsetRef.current = updateOffset;

		const handler = () => updateOffsetRef.current?.();

		updateOffset();

		mapRef.current.on("moving moveend", handler);

		return () => {
			if (mapRef.current) {
				mapRef.current.off("moving moveend", handler);
			}
		};
	}, [mapRef, ownShipPosition, isFollowing, isFreeDrag]);

	return { offsetX, offsetY };
};

export interface UseRangeRingsConfig {
	currentScaleValue: number;
	currentResolution: number;
	mapPixelWidth: number;
	mapPixelHeight: number;
	ownShipPosition: [number, number];
	mapRef: React.MutableRefObject<maptalks.Map | null>;
	isFollowing: boolean;
	isFreeDrag: boolean;
}

export const useRangeRings = (
	config: UseRangeRingsConfig
): UseRangeRingsResult => {
	const {
		currentScaleValue,
		currentResolution,
		mapPixelWidth,
		mapPixelHeight,
		ownShipPosition,
		mapRef,
		isFollowing,
		isFreeDrag
	} = config;

	const { offsetX, offsetY } = useRingOffset(
		mapRef,
		ownShipPosition,
		isFollowing,
		isFreeDrag
	);

	const rings = useMemo<RingData[]>(
		() =>
			generateRingData(
				currentScaleValue,
				currentResolution,
				mapPixelWidth,
				mapPixelHeight,
				offsetX,
				offsetY
			),
		[
			currentScaleValue,
			currentResolution,
			mapPixelWidth,
			mapPixelHeight,
			offsetX,
			offsetY
		]
	);

	const ringsFollowShip = isFollowing && isFreeDrag;

	return {
		rings,
		offsetX,
		offsetY,
		ringsFollowShip
	};
};
