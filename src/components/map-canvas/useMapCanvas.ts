import { useEffect, useRef, useState } from "react";

import * as maptalks from "maptalks";
import type { DistanceTool } from "maptalks";
import "maptalks/dist/maptalks.css";

import useMapStore from "@store/useMapStore";
import useOwnShipStore from "@store/useOwnShipStore";
import useTrackHistoryStore from "@store/useTrackHistoryStore";
import useTrackStore from "@store/useTrackStore";
import useUIStore from "@store/useUIStore";

import { RANGE_RING_CONFIG } from "@common/RangeRings/Helper/RangeRing/rangeRings.constants";
import { OwnShipConfig } from "@common/ownship/OwnShipRenderer";

import { HistoryLayer } from "@component/map-canvas/hooks/HistoryLayer";
import { MaptalksLayer } from "@component/map-canvas/hooks/MaptalksLayer";
import { OwnShipLayer } from "@component/map-canvas/hooks/OwnShipLayer";

import { DISTANCE_TOOL_CONFIG } from "@constants/distanceTool.constant";
import {
	SCALE_CONFIG,
	getScaleFromZoom,
	getZoomFromScale,
	resolutionToMapZoom,
	scaleNMToResolution
} from "@constants/mapZoom.constant";

const MAP_CONFIG = {
	CENTER: [118, -2] as [number, number],
	INITIAL_DISCRETE_ZOOM: SCALE_CONFIG.DEFAULT_ZOOM,
	REFERENCE_LATITUDE: 49.2827
};

const CARTO_API_KEY =
	(typeof process !== "undefined" && process.env?.CARTO_API_KEY) ||
	"cb1_50pw_1_1e6a8c0e26802916fbfc5e9c";

const BASEMAP_URL =
	(typeof process !== "undefined" && process.env?.BASEMAP_URL) ||
	`https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_API_KEY}`;

const EPSILON_ZOOM = 0.01;

/**
 * Compute resolution in meters/pixel required so that azimuth ring radius
 * will be approximately half of the smallest map dimension (touching the edge).
 * @param scaleNM - current scale in nautical miles
 * @param minDimensionPx - smallest container dimension in pixels
 * @returns required resolution (meters per pixel) to make azimuth ring touch edge
 */
const computeResolutionToFitAzimuth = (
	scaleNM: number,
	minDimensionPx: number
): number => {
	const azimuthIndex = RANGE_RING_CONFIG.AZIMUTH_RING.RING_INDEX;
	const ringIntervalNM = scaleNM * RANGE_RING_CONFIG.RING_INTERVAL_FACTOR;
	const radiusNM = ringIntervalNM * azimuthIndex;

	const radiusMeters = radiusNM * SCALE_CONFIG.NAUTICAL_MILES_CONSTANT;

	const stroke = RANGE_RING_CONFIG.AZIMUTH_RING.LINE_WIDTH || 0;
	const margin = 2;
	const targetPixels = Math.max(
		8,
		Math.floor(minDimensionPx / 2 - stroke - margin)
	);

	return radiusMeters / targetPixels;
};

/**
 * Adjust the map zoom so that the computed azimuth resolution is achieved.
 * @param map - the maptalks Map instance
 * @param scaleNM - current scale in nautical miles
 * @returns the resolution (meters per pixel) used to fit the azimuth ring
 * Returns the resolution used to fit the azimuth ring.
 */
const applyAzimuthFit = (map: maptalks.Map, scaleNM: number): number => {
	const size = map.getSize();
	const minDim = getSmallestDimension(size.width, size.height);

	const requiredResolution = computeResolutionToFitAzimuth(scaleNM, minDim);
	const desiredZoom = resolutionToMapZoom(requiredResolution);

	try {
		const currentZoom = map.getZoom();
		if (Math.abs(currentZoom - desiredZoom) > EPSILON_ZOOM) {
			map.setZoom(desiredZoom, { animation: false });

			try {
				const discreteZoom = getZoomFromScale(scaleNM);
				useMapStore.getState().setZoomLevel(discreteZoom);
			} catch (e) {
				console.warn("applyAzimuthFit: failed to update store zoom", e);
			}
		}
	} catch (error) {
		console.warn("applyAzimuthFit: error setting map zoom", error);
	}

	return requiredResolution;
};

/**
 * Get the smallest non-zero dimension to keep scaling consistent on resize.
 * @param width - Container width in pixels.
 * @param height - Container height in pixels.
 * @returns The smallest positive dimension (at least 1).
 */
const getSmallestDimension = (width: number, height?: number): number => {
	const safeWidth = width || 1;
	const safeHeight = height || safeWidth;
	return Math.max(1, Math.min(safeWidth, safeHeight));
};

/**
 * Calculate the actual maptalks zoom from discrete zoom level and map dimensions.
 * Uses the smallest container dimension to keep scale stable across aspect ratios.
 * @param discreteZoom - The discrete zoom level (1-14).
 * @param mapPixelWidth - The width of the map in pixels.
 * @param mapPixelHeight - The height of the map in pixels.
 * @param centerLatitude - The latitude of the map center.
 * @returns The actual maptalks zoom level.
 */
const calculateMaptalksZoom = (
	discreteZoom: number,
	mapPixelWidth: number,
	mapPixelHeight: number,
	centerLatitude: number
): number => {
	const scaleNM = getScaleFromZoom(discreteZoom);
	const effectivePixels = getSmallestDimension(mapPixelWidth, mapPixelHeight);
	const resolution = scaleNMToResolution(
		scaleNM,
		effectivePixels,
		centerLatitude
	);
	return resolutionToMapZoom(resolution);
};

/**
 * React hook that creates and manages a maptalks Map instance and related UI state,
 * exposing refs and state values for use by the map canvas component.
 *
 * @param ownShipConfig - Optional configuration passed to the own-ship renderer.
 * @returns {{
 *   mapContainerRef: import('react').RefObject<HTMLDivElement>,
 *   mapRef: import('react').RefObject<maptalks.Map | null>,
 *   mapReady: boolean,
 *   currentResolution: number,
 *   mapPixelWidth: number,
 *   mapPixelHeight: number,
 *   currentScaleNM: number,
 *   ownShipPosition: [number, number],
 *   isFollowing: boolean,
 *   isFreeDrag: boolean,
 *   showRangeRings: boolean,
 *   showGraticule: boolean,
 *   showGraticuleLabels: boolean,
 *   setOwnShipPosition: (pos: [number, number]) => void,
 *   setIsFollowing: (v: boolean) => void,
 *   setIsFreeDrag: (v: boolean) => void,
 *   setShowRangeRings: (v: boolean) => void,
 *   setShowGraticule: (v: boolean) => void,
 *   setShowGraticuleLabels: (v: boolean) => void
 * }} An object containing refs, numeric map state, display toggles, and setter functions for the map canvas.
 */
export const useMapCanvas = (ownShipConfig?: OwnShipConfig) => {
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapRef = useRef<maptalks.Map | null>(null);
	const distanceToolRef = useRef<DistanceTool | null>(null);

	const initialDiscreteZoom = MAP_CONFIG.INITIAL_DISCRETE_ZOOM;
	const initialScaleNM = getScaleFromZoom(initialDiscreteZoom);

	const [rangeRingsState, setRangeRingsState] = useState({
		currentResolution: 0,
		mapPixelWidth: 0,
		mapPixelHeight: 0,
		currentScaleNM: initialScaleNM
	});

	const currentDiscreteZoomRef = useRef(initialDiscreteZoom);
	const currentScaleNMRef = useRef(initialScaleNM);

	const ownShipPositionRef = useRef<[number, number]>(
		useOwnShipStore.getState().position
	);
	const setOwnShipPosition = useOwnShipStore((s) => s.setPosition);

	useEffect(() => {
		const unsubscribe = useOwnShipStore.subscribe((s) => {
			ownShipPositionRef.current = s.position;
		});
		return () => unsubscribe();
	}, []);

	const isFollowing = useOwnShipStore((s) => s.isFollowing);
	const setIsFollowing = useOwnShipStore((s) => s.setIsFollowing);
	const isFreeDrag = useOwnShipStore((s) => s.isFreeDrag);
	const setIsFreeDrag = useOwnShipStore((s) => s.setIsFreeDrag);
	const [showRangeRings, setShowRangeRings] = useState(true);
	const [showGraticule, setShowGraticule] = useState(true);
	const [showGraticuleLabels, setShowGraticuleLabels] = useState(true);
	const [mapReady, setMapReady] = useState(false);
	const isMeasuring = useUIStore((state) => state.isMeasuring);
	const setIsMeasuring = useUIStore((state) => state.setIsMeasuring);

	const isFollowingRef = useRef(isFollowing);
	isFollowingRef.current = isFollowing;

	useEffect(() => {
		if (!mapContainerRef.current) return;
		if (mapRef.current) return;

		const containerWidth =
			mapContainerRef.current.clientWidth || window.innerWidth;
		const containerHeight =
			mapContainerRef.current.clientHeight || window.innerHeight;
		const initialMaptalksZoom = calculateMaptalksZoom(
			initialDiscreteZoom,
			containerWidth,
			containerHeight,
			MAP_CONFIG.REFERENCE_LATITUDE
		);

		const map = new maptalks.Map(mapContainerRef.current, {
			center: MAP_CONFIG.CENTER,
			zoom: initialMaptalksZoom,
			minZoom: 1,
			maxZoom: 20,
			zoomAnimation: false,
			zoomAnimationDuration: 0,
			maxExtent: new maptalks.Extent(-180, -85.0511, 180, 85.0511),
			baseLayer: new maptalks.TileLayer("base", {
				urlTemplate: BASEMAP_URL,
				subdomains: ["a", "b", "c", "d"],
				repeatWorld: false,
				attribution: "© CARTO © OpenStreetMap"
			})
		});

		mapRef.current = map;

		if (
			(maptalks as typeof maptalks & { DistanceTool?: typeof DistanceTool })
				.DistanceTool
		) {
			const distanceTool = new maptalks.DistanceTool(
				DISTANCE_TOOL_CONFIG
			).addTo(map);
			distanceToolRef.current = distanceTool;
			distanceTool.disable();

			if (useUIStore.getState().isMeasuring) {
				distanceTool.enable();
				setIsFollowing(false);
			}
		}
		useMapStore.getState().setMap(map);
		setMapReady(true);

		const size = map.getSize();
		const initScaleNM = getScaleFromZoom(initialDiscreteZoom);
		const initResolution = applyAzimuthFit(map, initScaleNM);

		currentDiscreteZoomRef.current = initialDiscreteZoom;
		currentScaleNMRef.current = initScaleNM;

		setRangeRingsState({
			currentResolution: initResolution,
			mapPixelWidth: size.width,
			mapPixelHeight: size.height,
			currentScaleNM: initScaleNM
		});

		/**
		 * Handler for the map 'resize' event; updates stored map dimensions and
		 * recalculates the current resolution (meters per pixel) based on the
		 * current scale in nautical miles and the new map pixel width.
		 */
		const onResize = () => {
			const currentSize = map.getSize();
			const effectivePixels = getSmallestDimension(
				currentSize.width,
				currentSize.height
			);

			const azimuthResolution = computeResolutionToFitAzimuth(
				currentScaleNMRef.current,
				effectivePixels
			);

			applyAzimuthFit(map, currentScaleNMRef.current);

			setRangeRingsState((prev) => ({
				...prev,
				mapPixelWidth: currentSize.width,
				mapPixelHeight: currentSize.height,
				currentResolution: azimuthResolution
			}));
		};

		/**
		 * Handle mouse wheel zoom events using our discrete zoom levels.
		 * @param evt - The wheel Event.
		 */
		const onWheel = (evt: Event) => {
			const e = evt as WheelEvent;
			e.preventDefault();
			e.stopPropagation();
			const maybeEvt = e as WheelEvent & {
				stopImmediatePropagation?: () => void;
			};
			if (maybeEvt.stopImmediatePropagation) {
				maybeEvt.stopImmediatePropagation();
			}
			const store = useMapStore.getState();

			if (e.deltaY < 0) {
				if (store.canZoomIn()) {
					store.zoomIn();
				}
			} else if (e.deltaY > 0) {
				if (store.canZoomOut()) {
					store.zoomOut();
				}
			}
		};

		let prevZoomLevel = useMapStore.getState().zoomLevel;
		const unsubscribeZoom = useMapStore.subscribe((state) => {
			const zoomLevel = state.zoomLevel;
			if (zoomLevel === prevZoomLevel || zoomLevel === null || !mapRef.current)
				return;
			prevZoomLevel = zoomLevel;

			const newScaleNM = getScaleFromZoom(zoomLevel);
			const currentSize = mapRef.current.getSize();
			const effectivePixels = getSmallestDimension(
				currentSize.width,
				currentSize.height
			);
			const azimuthResolution = computeResolutionToFitAzimuth(
				newScaleNM,
				effectivePixels
			);

			if (mapRef.current) {
				applyAzimuthFit(mapRef.current, newScaleNM);
			}

			setRangeRingsState((prev) => ({
				...prev,
				currentScaleNM: newScaleNM,
				currentResolution: azimuthResolution
			}));
		});

		map.on("resize", onResize);

		const container =
			mapRef.current && typeof mapRef.current.getContainer === "function"
				? mapRef.current.getContainer()
				: mapContainerRef.current;
		container?.addEventListener("wheel", onWheel, {
			passive: false,
			capture: true
		});

		const trackLayer = new MaptalksLayer("custom-webgl-layer");
		const historyLayer = new HistoryLayer("custom-history-layer");

		const initialTracks = useTrackStore.getState().tracks;
		trackLayer.setTrackData(initialTracks);
		historyLayer.setTrackData(initialTracks);
		historyLayer.setHistoryData(useTrackHistoryStore.getState().histories);

		const unsubscribeTracks = useTrackStore.subscribe((state) => {
			trackLayer.setTrackData(state.tracks);
			historyLayer.setTrackData(state.tracks);
		});
		const unsubscribeHistories = useTrackHistoryStore.subscribe((state) => {
			historyLayer.setHistoryData(state.histories);
		});

		map.addLayer(historyLayer);
		map.addLayer(trackLayer);

		trackLayer.setSelectionHandler((id?: number) => {
			useTrackStore.getState().selectTrack(id);
		});

		const unsubscribeSelection = useTrackStore.subscribe((s) => {
			if (trackLayer && typeof trackLayer.setSelectedTrack === "function") {
				trackLayer.setSelectedTrack(s.selectedTrack);
			}
		});

		const ownShipLayer = new OwnShipLayer(
			"custom-ownship-layer",
			undefined,
			ownShipConfig
		);
		map.addLayer(ownShipLayer);

		// Initialize store position to map center so the ship starts centered on the map.
		{
			const center = map.getCenter();
			const pos: [number, number] = [center.x, center.y];
			useOwnShipStore.getState().setPosition(pos);
		}

		/** Marker click handler: toggle follow mode. */
		const handleOwnShipClick = () => {
			const current = useOwnShipStore.getState().isFollowing;
			useOwnShipStore.getState().setIsFollowing(!current);
		};

		ownShipLayer.setClickHandler(handleOwnShipClick);

		if (useUIStore.getState().showOwnShip) {
			ownShipLayer.setOwnShipData(useOwnShipStore.getState());
		}

		const unsubOwnShip = useOwnShipStore.subscribe((s) => {
			if (useUIStore.getState().showOwnShip) {
				ownShipLayer.setOwnShipData(s);
			} else {
				ownShipLayer.setOwnShipData(null);
			}
		});

		const unsubUIShow = useUIStore.subscribe((u) => {
			if (u.showOwnShip) {
				ownShipLayer.setOwnShipData(useOwnShipStore.getState());
			} else {
				ownShipLayer.setOwnShipData(null);
			}
		});

		let prevFollow = useOwnShipStore.getState().isFollowing;

		let prevOwnShipPos: [number, number] | null = useOwnShipStore.getState()
			? useOwnShipStore.getState().position
			: null;
		let userOffset: { dx: number; dy: number } | null = null;

		let lastUserInteraction = false;

		/**
		 * Called when the user finishes moving the map (drag/pan). Capture the
		 * offset between the current map center and the own-ship so we can preserve
		 * it while in follow mode.
		 */
		const onUserMove = () => {
			if (!map) return;
			try {
				const center = map.getCenter();
				const shipPos = useOwnShipStore.getState().position;
				userOffset = { dx: center.x - shipPos[0], dy: center.y - shipPos[1] };
				lastUserInteraction = true;
			} catch {
			}
		};

		const unsubCameraFollow = useOwnShipStore.subscribe((s) => {
			if (!map) return;

			try {
				if (s.isFollowing && !prevFollow) {
					const ship = s.position;
					if (userOffset) {
						map.setCenter(
							new maptalks.Coordinate(
								ship[0] + userOffset.dx,
								ship[1] + userOffset.dy
							)
						);
					} else {
						map.setCenter(new maptalks.Coordinate(ship[0], ship[1]));
					}
					lastUserInteraction = false;
				}

				if (s.isFollowing && prevOwnShipPos && !lastUserInteraction) {
					const prev = prevOwnShipPos;
					const cur = s.position;
					const deltaX = cur[0] - prev[0];
					const deltaY = cur[1] - prev[1];
					if (Math.abs(deltaX) > 1e-12 || Math.abs(deltaY) > 1e-12) {
						map.setCenter(
							new maptalks.Coordinate(
								map.getCenter().x + deltaX,
								map.getCenter().y + deltaY
							)
						);
					}
				}

				if (lastUserInteraction) {
					const center = map.getCenter();
					userOffset = {
						dx: center.x - s.position[0],
						dy: center.y - s.position[1]
					};
					lastUserInteraction = false;
				}
			} catch {
			}

			prevFollow = s.isFollowing;
			prevOwnShipPos = s.position;
		});

		if (map && typeof map.on === "function") {
			map.on("moveend", onUserMove);
		}

		return () => {
			container?.removeEventListener("wheel", onWheel, { capture: true });
			unsubscribeZoom();
			if (mapRef.current) {
				mapRef.current.off("resize", onResize);
				mapRef.current.remove();
				mapRef.current = null;
				useMapStore.getState().setMap(null);
			}
			if (distanceToolRef.current) {
				distanceToolRef.current.remove();
				distanceToolRef.current = null;
			}
			setIsMeasuring(false);
			unsubscribeTracks?.();
			unsubscribeHistories?.();
			unsubOwnShip?.();
			unsubUIShow?.();
			unsubscribeSelection?.();
			if (typeof unsubCameraFollow === "function") unsubCameraFollow();
			if (map && typeof map.off === "function") {
				map.off("moveend", onUserMove);
			}
		};
	}, []);

	useEffect(() => {
		if (!distanceToolRef.current) return;

		if (isMeasuring) {
			distanceToolRef.current.enable();
			setIsFollowing(false);
		} else {
			distanceToolRef.current.clear();
			distanceToolRef.current.disable();
		}
	}, [isMeasuring, setIsFollowing]);

	return {
		mapContainerRef,
		mapRef,
		mapReady,
		currentResolution: rangeRingsState.currentResolution,
		mapPixelWidth: rangeRingsState.mapPixelWidth,
		mapPixelHeight: rangeRingsState.mapPixelHeight,
		currentScaleNM: rangeRingsState.currentScaleNM,
		ownShipPositionRef,
		isFollowing,
		isFreeDrag,
		showRangeRings,
		showGraticule,
		showGraticuleLabels,
		setOwnShipPosition,
		setIsFollowing,
		setIsFreeDrag,
		setShowRangeRings,
		setShowGraticule,
		setShowGraticuleLabels
	};
};
