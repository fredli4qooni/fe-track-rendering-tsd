/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { LabelPosition } from "./rangeRings.constants";
import type { MutableRefObject, RefObject } from "react";
import type * as maptalks from "maptalks";

export interface AzimuthLabelData {
	angle: number;
	x: number;
	y: number;
	label: string;
}

export interface AzimuthTickData {
	angle: number;
	isMajor: boolean;
	x1: number;
	y1: number;
	x2: number;
	y2: number;
}

export interface RingData {
	index: number;
	radiusNM: number;
	radiusPixels: number;
	label: string;
	styleVariant: number;
	isAzimuthRing?: boolean;
	azimuthLabels?: AzimuthLabelData[];
	azimuthTicks?: AzimuthTickData[];
}
export interface RangeRingsConfig {
	currentScaleValue: number;
	currentResolution: number;
	mapPixelWidth: number;
	mapPixelHeight: number;
	visible: boolean;
	ownShipPosition?: [number, number];
	ownShipPositionRef?: RefObject<[number, number]>;
	mapRef: MutableRefObject<maptalks.Map | null>;
	isFollowing: boolean;
	isFreeDrag: boolean;
}

export interface RangeRingsProps {
	config: RangeRingsConfig;
}

export interface RangeRingProps {
	ring: RingData;
}

export interface RingLabelProps {
	ring: RingData;
	position: LabelPosition;
}

export interface AzimuthLabelProps {
	labelData: AzimuthLabelData;
	radiusPixels: number;
}

export interface AzimuthTickProps {
	tickData: AzimuthTickData;
}

export interface CrosshairProps {
	isFollowingShip: boolean;
}

export interface RingOffset {
	x: number;
	y: number;
}

export interface UseRangeRingsResult {
	rings: RingData[];
	offsetX: number;
	offsetY: number;
	ringsFollowShip: boolean;
}
