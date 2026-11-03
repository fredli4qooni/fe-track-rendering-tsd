/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type * as maptalks from "maptalks";

export type NavigationType = "oceanic" | "regional" | "coastal" | "harbour";

export interface GraticuleInterval {
	majorInterval: number;
	minorInterval: number;
	threshold: number;
	navigationType: NavigationType;
}

export interface DMSCoordinate {
	degrees: number;
	minutes: number;
	seconds: number;
	direction: "N" | "S" | "E" | "W";
	formatted: string;
}

export interface MapBounds {
	west: number;
	east: number;
	south: number;
	north: number;
}

export interface GraticuleLineStyle {
	majorColor: string;
	minorColor: string;
	majorWidth: number;
	minorWidth: number;
	majorOpacity: number;
	minorOpacity: number;
}

export interface GraticuleLabelStyle {
	textColor: string;
	fontSize: number;
	fontFamily: string;
	backgroundColor: string;
	backgroundOpacity: number;
	padding: [number, number];
}

export interface GraticuleConfig {
	visible: boolean;
	showLabels: boolean;
	lineStyle: GraticuleLineStyle;
	labelStyle: GraticuleLabelStyle;
	forceRenderOnMoving?: boolean;
}

export interface GraticuleProps {
	mapRef: React.MutableRefObject<maptalks.Map | null>;
	visible?: boolean;
	showLabels?: boolean;
	lineStyle?: Partial<GraticuleLineStyle>;
	labelStyle?: Partial<GraticuleLabelStyle>;
	forceRenderOnMoving?: boolean;
}
