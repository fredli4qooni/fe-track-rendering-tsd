/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import * as maptalks from "maptalks";
import { create } from "zustand";

import {
	MAX_ZOOM,
	MIN_ZOOM,
	SCALE_CONFIG,
	SCALE_MAPPING,
	getNextZoom,
	getScaleFromZoom,
	resolutionToMapZoom,
	scaleNMToResolution
} from "@constants/mapZoom.constant";

type MapState = {
	map: maptalks.Map | null;
	setMap: (map: maptalks.Map | null) => void;
	zoomLevel: number | null;
	setZoomLevel: (zoom: number | null) => void;
	zoomIn: () => void;
	zoomOut: () => void;
	setZoom: (zoom: number) => void;
	setZoomForScaleNM: (scaleNM: number) => void;
	getCurrentScaleNM: () => number | null;
	canZoomIn: () => boolean;
	canZoomOut: () => boolean;
};

/**
 * Get the smallest positive dimension of the map viewport.
 * @param width - Map width in pixels.
 * @param height - Map height in pixels.
 * @returns The smallest dimension (at least 1 pixel).
 */
const getSmallestDimension = (width: number, height: number): number => {
	return Math.max(1, Math.min(width || 1, height || width || 1));
};

/**
 * Calculate the actual maptalks zoom level from a discrete zoom level.
 * Uses the smallest viewport dimension to keep scale consistent on resize.
 * @param discreteZoom - The discrete zoom level (1-14).
 * @param map - The maptalks map instance.
 * @returns The actual maptalks zoom level.
 */
const calculateMaptalksZoom = (
	discreteZoom: number,
	map: maptalks.Map
): number => {
	const scaleNM = getScaleFromZoom(discreteZoom);
	const size = map.getSize();
	const center = map.getCenter();
	const effectivePixels = getSmallestDimension(size.width, size.height);
	const resolution = scaleNMToResolution(scaleNM, effectivePixels, center.y);
	return resolutionToMapZoom(resolution);
};

const useMapStore = create<MapState>((set, get) => ({
	map: null,
	zoomLevel: SCALE_CONFIG.DEFAULT_ZOOM,
	setMap(map) {
		set({ map, zoomLevel: map ? SCALE_CONFIG.DEFAULT_ZOOM : null });
	},
	setZoomLevel(zoom) {
		set({ zoomLevel: zoom === null ? null : Math.round(zoom) });
	},
	zoomIn() {
		const map = get().map;
		const currentLevel = get().zoomLevel;
		if (!map || currentLevel === null) return;

		const nextLevel = getNextZoom(currentLevel, "up");
		if (nextLevel === currentLevel) return;

		const mapZoom = calculateMaptalksZoom(nextLevel, map);
		map.setZoom(mapZoom, { animation: false });
		set({ zoomLevel: nextLevel });
	},
	zoomOut() {
		const map = get().map;
		const currentLevel = get().zoomLevel;
		if (!map || currentLevel === null) return;

		const nextLevel = getNextZoom(currentLevel, "down");
		if (nextLevel === currentLevel) return;

		const mapZoom = calculateMaptalksZoom(nextLevel, map);
		map.setZoom(mapZoom, { animation: false });
		set({ zoomLevel: nextLevel });
	},
	setZoom(zoom) {
		const map = get().map;
		if (!map) return;
		const target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.round(zoom)));
		const mapZoom = calculateMaptalksZoom(target, map);
		map.setZoom(mapZoom, { animation: false });
		set({ zoomLevel: target });
	},
	setZoomForScaleNM(scaleNM) {
		const map = get().map;
		if (!map) return;
		const mapping = SCALE_MAPPING.find((m) => m.scaleNM === scaleNM);
		if (!mapping) return;
		const mapZoom = calculateMaptalksZoom(mapping.zoom, map);
		map.setZoom(mapZoom, { animation: false });
		set({ zoomLevel: mapping.zoom });
	},
	getCurrentScaleNM() {
		const level = get().zoomLevel;
		if (level === null) return null;
		return getScaleFromZoom(level);
	},
	canZoomIn() {
		const z = get().zoomLevel;
		if (z === null) return false;
		return z > MIN_ZOOM;
	},
	canZoomOut() {
		const z = get().zoomLevel;
		if (z === null) return false;
		return z < MAX_ZOOM;
	}
}));

export default useMapStore;
