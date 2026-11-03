/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import * as maptalks from "maptalks";

import {
	DEFAULT_LABEL_STYLE,
	DEFAULT_LINE_STYLE,
	GRATICULE_LAYER_IDS,
	WEB_MERCATOR_BOUNDS
} from "./graticule.constants";
import type {
	GraticuleLabel,
	GraticuleLayerConfig,
	GraticuleLine
} from "./graticule.layer.types";
import type {
	GraticuleInterval,
	GraticuleLabelStyle,
	GraticuleLineStyle
} from "./graticule.types";
import type { MapBounds } from "./graticule.types";
import {
	clampLatitude,
	formatCompactDMS,
	generateIntervalValues,
	getMaritimeInterval,
	isMajorGridLine,
	normalizeLongitude
} from "./graticule.utils";

export class GraticuleLayerManager {
	private readonly map: maptalks.Map;
	private majorLineLayer: maptalks.VectorLayer | null = null;
	private minorLineLayer: maptalks.VectorLayer | null = null;
	private labelLayer: maptalks.VectorLayer | null = null;

	private lineStyle: GraticuleLineStyle;
	private labelStyle: GraticuleLabelStyle;
	private showLabels: boolean;

	private currentInterval: GraticuleInterval | null = null;
	private isVisible: boolean = true;

	private coveredBounds: MapBounds | null = null;

	private static readonly GRID_EXTENSION_FACTOR = 2;

	private forceRenderOnMoving: boolean = false;

	private readonly initialForceRenderOnMoving: boolean;
	private toggledForceRenderDuringInteraction = false;

	private lastMovingUpdate = 0;
	private readonly MOVING_UPDATE_INTERVAL_MS = 100;

	/**
	 * Creates a new GraticuleLayerManager instance.
	 *
	 * @param map - The maptalks Map instance
	 * @param config - Optional configuration for styles
	 */
	constructor(map: maptalks.Map, config?: GraticuleLayerConfig) {
		this.map = map;
		this.lineStyle = { ...DEFAULT_LINE_STYLE, ...config?.lineStyle };
		this.labelStyle = { ...DEFAULT_LABEL_STYLE, ...config?.labelStyle };
		this.showLabels = config?.showLabels ?? true;
		this.initialForceRenderOnMoving = config?.forceRenderOnMoving ?? false;
		this.forceRenderOnMoving = this.initialForceRenderOnMoving;

		this.initializeLayers();
		this.bindEvents();
		this.updateGraticule();
	}

	/**
	 * Initializes the vector layers for lines and labels.
	 */
	private initializeLayers(): void {
		this.majorLineLayer = new maptalks.VectorLayer(
			GRATICULE_LAYER_IDS.MAJOR_LINES,
			[],
			{
				enableAltitude: false,
				forceRenderOnMoving: this.forceRenderOnMoving,
				forceRenderOnZooming: false,
				forceRenderOnRotating: false
			}
		);

		this.minorLineLayer = new maptalks.VectorLayer(
			GRATICULE_LAYER_IDS.MINOR_LINES,
			[],
			{
				enableAltitude: false,
				forceRenderOnMoving: this.forceRenderOnMoving,
				forceRenderOnZooming: false,
				forceRenderOnRotating: false
			}
		);

		this.labelLayer = new maptalks.VectorLayer(GRATICULE_LAYER_IDS.LABELS, [], {
			enableAltitude: false,
			forceRenderOnMoving: this.forceRenderOnMoving,
			forceRenderOnZooming: false,
			forceRenderOnRotating: false
		});

		this.map.addLayer(this.minorLineLayer);
		this.map.addLayer(this.majorLineLayer);
		this.map.addLayer(this.labelLayer);
	}

	/**
	 * Binds map events to trigger graticule updates.
	 * Only updates on zoom end to minimize re-renders.
	 */
	private bindEvents(): void {
		this.map.on("zoomend", this.handleZoomEnd);
		this.map.on("moveend", this.handleMoveEnd);
		this.map.on("movestart", this.handleMoveStart);
		this.map.on("moving", this.handleMoving);
		this.map.on("pitch", this.handlePitchChange);
	}

	private readonly handlePitchChange = (): void => {
		if (this.showLabels && this.isVisible) {
			this.updateLabels();
		}
	};

	private readonly handleZoomEnd = (): void => {
		this.coveredBounds = null;
		this.updateGraticule();
	};

	private readonly handleMoveEnd = (): void => {
		if (!this.isVisible) return;

		if (this.needsGridUpdate()) {
			this.updateGridLines();
		}

		if (this.showLabels) {
			this.updateLabels();
		}

		if (this.toggledForceRenderDuringInteraction) {
			this.setForceRenderOnMoving(this.initialForceRenderOnMoving);
			this.toggledForceRenderDuringInteraction = false;
		}
	};

	private readonly handleMoveStart = (): void => {
		if (!this.isVisible) return;
		if (!this.forceRenderOnMoving) {
			this.setForceRenderOnMoving(true);
			this.toggledForceRenderDuringInteraction = true;
		}
		this.updateGridLines();
	};

	private readonly handleMoving = (): void => {
		if (!this.isVisible) return;

		const hasPerformanceNow =
			typeof performance === "object" && typeof performance.now === "function";
		const now = hasPerformanceNow ? performance.now() : Date.now();
		if (now - this.lastMovingUpdate < this.MOVING_UPDATE_INTERVAL_MS) return;
		this.lastMovingUpdate = now;

		this.updateGridLines();

		if (this.showLabels) {
			this.updateLabels();
		}
	};

	/**
	 * Checks if the grid needs to be updated based on viewport position.
	 *
	 * @returns True if viewport has moved outside covered bounds
	 */
	private needsGridUpdate(): boolean {
		if (!this.coveredBounds) return true;

		const viewport = this.getViewportBounds();

		return (
			viewport.west < this.coveredBounds.west ||
			viewport.east > this.coveredBounds.east ||
			viewport.south < this.coveredBounds.south ||
			viewport.north > this.coveredBounds.north
		);
	}

	/**
	 * Gets the current viewport bounds.
	 *
	 * @returns Current map bounds
	 */
	private getViewportBounds(): MapBounds {
		const extent = this.map.getExtent();
		const xmin = extent.xmin ?? WEB_MERCATOR_BOUNDS.minLon;
		const xmax = extent.xmax ?? WEB_MERCATOR_BOUNDS.maxLon;
		const ymin = extent.ymin ?? WEB_MERCATOR_BOUNDS.minLat;
		const ymax = extent.ymax ?? WEB_MERCATOR_BOUNDS.maxLat;

		return {
			west: Math.max(xmin, WEB_MERCATOR_BOUNDS.minLon),
			east: Math.min(xmax, WEB_MERCATOR_BOUNDS.maxLon),
			south: Math.max(ymin, WEB_MERCATOR_BOUNDS.minLat),
			north: Math.min(ymax, WEB_MERCATOR_BOUNDS.maxLat)
		};
	}

	/**
	 * Calculates the viewport height in degrees.
	 *
	 * @returns Viewport height in degrees
	 */
	private getViewportHeight(): number {
		const bounds = this.getViewportBounds();
		return bounds.north - bounds.south;
	}

	/**
	 * Updates the graticule grid based on current zoom level.
	 * Only recomputes geometry if interval has changed.
	 */
	private updateGraticule(): void {
		if (!this.isVisible) return;

		const viewportHeight = this.getViewportHeight();
		const newInterval = getMaritimeInterval(viewportHeight);

		if (
			this.currentInterval &&
			this.currentInterval.majorInterval === newInterval.majorInterval &&
			this.currentInterval.minorInterval === newInterval.minorInterval
		) {
			if (this.showLabels) {
				this.updateLabels();
			}
			return;
		}

		this.currentInterval = newInterval;
		this.updateGridLines();
		if (this.showLabels) {
			this.updateLabels();
		}
	}

	/**
	 * Updates the grid lines for current interval.
	 */
	private updateGridLines(): void {
		if (!this.currentInterval || !this.majorLineLayer || !this.minorLineLayer)
			return;

		const { majorInterval, minorInterval } = this.currentInterval;
		const bounds = this.getViewportBounds();

		const viewportWidth = bounds.east - bounds.west;
		const viewportHeight = bounds.north - bounds.south;

		const extensionFactor = GraticuleLayerManager.GRID_EXTENSION_FACTOR;
		const extendedBounds: MapBounds = {
			west: bounds.west - viewportWidth * extensionFactor,
			east: bounds.east + viewportWidth * extensionFactor,
			south: clampLatitude(bounds.south - viewportHeight * extensionFactor),
			north: clampLatitude(bounds.north + viewportHeight * extensionFactor)
		};

		extendedBounds.west = Math.max(
			extendedBounds.west,
			WEB_MERCATOR_BOUNDS.minLon
		);
		extendedBounds.east = Math.min(
			extendedBounds.east,
			WEB_MERCATOR_BOUNDS.maxLon
		);

		this.coveredBounds = {
			west: Math.max(
				bounds.west - viewportWidth * (extensionFactor - 0.5),
				WEB_MERCATOR_BOUNDS.minLon
			),
			east: Math.min(
				bounds.east + viewportWidth * (extensionFactor - 0.5),
				WEB_MERCATOR_BOUNDS.maxLon
			),
			south: clampLatitude(
				bounds.south - viewportHeight * (extensionFactor - 0.5)
			),
			north: clampLatitude(
				bounds.north + viewportHeight * (extensionFactor - 0.5)
			)
		};

		if (this.coveredBounds.west > this.coveredBounds.east) {
			this.coveredBounds.west = WEB_MERCATOR_BOUNDS.minLon;
			this.coveredBounds.east = WEB_MERCATOR_BOUNDS.maxLon;
		}

		const lines = this.generateGridLines(
			extendedBounds,
			majorInterval,
			minorInterval
		);

		const majorGeometries: maptalks.LineString[] = [];
		const minorGeometries: maptalks.LineString[] = [];

		for (const line of lines) {
			const lineString = new maptalks.LineString(line.coordinates, {
				symbol: {
					lineColor: line.isMajor
						? this.lineStyle.majorColor
						: this.lineStyle.minorColor,
					lineWidth: line.isMajor
						? this.lineStyle.majorWidth
						: this.lineStyle.minorWidth,
					lineOpacity: line.isMajor
						? this.lineStyle.majorOpacity
						: this.lineStyle.minorOpacity
				}
			});

			if (line.isMajor) {
				majorGeometries.push(lineString);
			} else {
				minorGeometries.push(lineString);
			}
		}

		this.majorLineLayer.clear();
		this.minorLineLayer.clear();
		this.majorLineLayer.addGeometry(majorGeometries);
		this.minorLineLayer.addGeometry(minorGeometries);
	}

	/**
	 * Generates grid lines for the given bounds and intervals.
	 *
	 * @param bounds - Map bounds to generate lines for
	 * @param majorInterval - Major grid interval
	 * @param minorInterval - Minor grid interval
	 * @returns Array of line data
	 */
	private generateGridLines(
		bounds: MapBounds,
		majorInterval: number,
		minorInterval: number
	): GraticuleLine[] {
		const lines: GraticuleLine[] = [];

		const south = clampLatitude(bounds.south);
		const north = clampLatitude(bounds.north);
		if (south > north) return lines;

		const latValues = generateIntervalValues(south, north, minorInterval);
		for (const lat of latValues) {
			const clampedLat = clampLatitude(lat);
			if (bounds.west <= bounds.east) {
				lines.push({
					coordinates: [
						[Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon), clampedLat],
						[Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon), clampedLat]
					],
					isMajor: isMajorGridLine(lat, majorInterval)
				});
			} else {
				const leftSeg: GraticuleLine = {
					coordinates: [
						[Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon), clampedLat],
						[WEB_MERCATOR_BOUNDS.maxLon, clampedLat]
					],
					isMajor: isMajorGridLine(lat, majorInterval)
				};
				const rightSeg: GraticuleLine = {
					coordinates: [
						[WEB_MERCATOR_BOUNDS.minLon, clampedLat],
						[Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon), clampedLat]
					],
					isMajor: isMajorGridLine(lat, majorInterval)
				};
				lines.push(leftSeg, rightSeg);
			}
		}

		let lonValues: number[] = [];
		if (bounds.west <= bounds.east) {
			lonValues = generateIntervalValues(
				Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon),
				Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon),
				minorInterval
			);
		} else {
			lonValues = generateIntervalValues(
				Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon),
				WEB_MERCATOR_BOUNDS.maxLon,
				minorInterval
			).concat(
				generateIntervalValues(
					WEB_MERCATOR_BOUNDS.minLon,
					Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon),
					minorInterval
				)
			);
		}

		for (const lon of lonValues) {
			const normalizedLon = normalizeLongitude(lon);
			lines.push({
				coordinates: [
					[normalizedLon, south],
					[normalizedLon, north]
				],
				isMajor: isMajorGridLine(normalizedLon, majorInterval)
			});
		}

		return lines;
	}

	/**
	 * Updates the coordinate labels at viewport edges.
	 */
	private updateLabels(): void {
		if (!this.currentInterval || !this.labelLayer) return;

		const { majorInterval } = this.currentInterval;
		const bounds = this.getViewportBounds();
		const labels = this.generateLabels(bounds, majorInterval);

		const labelGeometries: maptalks.Marker[] = [];

		for (const label of labels) {
			const marker = new maptalks.Marker(label.coordinate, {
				symbol: {
					textName: label.text,
					textFill: this.labelStyle.textColor,
					textSize: this.labelStyle.fontSize,
					textFaceName: this.labelStyle.fontFamily,
					textHaloFill: this.labelStyle.backgroundColor,
					textHaloRadius: 2,
					textHaloOpacity: this.labelStyle.backgroundOpacity,
					textDx: label.isLatitude ? 5 : 0,
					textDy: label.isLatitude ? 0 : 10,
					textHorizontalAlignment: label.isLatitude ? "left" : "middle",
					textVerticalAlignment: label.isLatitude ? "middle" : "top"
				}
			});
			labelGeometries.push(marker);
		}

		this.labelLayer.clear();
		this.labelLayer.addGeometry(labelGeometries);
	}

	/**
	 * Generates labels for major grid lines at viewport edges.
	 *
	 * @param bounds - Current viewport bounds
	 * @param majorInterval - Major grid interval
	 * @returns Array of label data
	 */
	private generateLabels(
		bounds: MapBounds,
		majorInterval: number
	): GraticuleLabel[] {
		const labels: GraticuleLabel[] = [];

		const pitch = this.map.getPitch();

		const baseOffset = (bounds.north - bounds.south) * 0.02;
		const pitchFactor = 1 + pitch / 45;
		const verticalOffset = baseOffset * pitchFactor;
		const horizontalOffset = (bounds.east - bounds.west) * 0.02 * pitchFactor;

		const latValues = generateIntervalValues(
			Math.max(bounds.south, WEB_MERCATOR_BOUNDS.minLat),
			Math.min(bounds.north, WEB_MERCATOR_BOUNDS.maxLat),
			majorInterval
		);
		for (const lat of latValues) {
			const clampedLat = clampLatitude(lat);
			let lon = bounds.west + horizontalOffset;
			lon = normalizeLongitude(lon);
			lon = Math.max(
				WEB_MERCATOR_BOUNDS.minLon,
				Math.min(WEB_MERCATOR_BOUNDS.maxLon, lon)
			);
			labels.push({
				coordinate: [lon, clampedLat],
				text: formatCompactDMS(lat, true),
				isLatitude: true
			});
		}

		let lonValues: number[] = [];
		if (bounds.west <= bounds.east) {
			lonValues = generateIntervalValues(
				Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon),
				Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon),
				majorInterval
			);
		} else {
			lonValues = generateIntervalValues(
				Math.max(bounds.west, WEB_MERCATOR_BOUNDS.minLon),
				WEB_MERCATOR_BOUNDS.maxLon,
				majorInterval
			).concat(
				generateIntervalValues(
					WEB_MERCATOR_BOUNDS.minLon,
					Math.min(bounds.east, WEB_MERCATOR_BOUNDS.maxLon),
					majorInterval
				)
			);
		}

		for (const lon of lonValues) {
			let normalizedLon = normalizeLongitude(lon);
			normalizedLon = Math.max(
				WEB_MERCATOR_BOUNDS.minLon,
				Math.min(WEB_MERCATOR_BOUNDS.maxLon, normalizedLon)
			);
			const lat = clampLatitude(bounds.north - verticalOffset);
			labels.push({
				coordinate: [normalizedLon, lat],
				text: formatCompactDMS(lon, false),
				isLatitude: false
			});
		}

		return labels;
	}

	/**
	 * Shows the graticule layers.
	 */
	public show(): void {
		this.isVisible = true;
		this.majorLineLayer?.show();
		this.minorLineLayer?.show();
		if (this.showLabels) {
			this.labelLayer?.show();
		}
		this.updateGraticule();
	}

	/**
	 * Hides the graticule layers.
	 */
	public hide(): void {
		this.isVisible = false;
		this.majorLineLayer?.hide();
		this.minorLineLayer?.hide();
		this.labelLayer?.hide();
	}

	/**
	 * Sets visibility of coordinate labels.
	 *
	 * @param visible - Whether to show labels
	 */
	public setShowLabels(visible: boolean): void {
		this.showLabels = visible;
		if (visible && this.isVisible) {
			this.labelLayer?.show();
			this.updateLabels();
		} else {
			this.labelLayer?.hide();
		}
	}

	/**
	 * Updates line style configuration.
	 *
	 * @param style - Partial line style to apply
	 */
	public setLineStyle(style: Partial<GraticuleLineStyle>): void {
		this.lineStyle = { ...this.lineStyle, ...style };
		if (this.isVisible) {
			this.updateGridLines();
		}
	}

	/**
	 * Updates label style configuration.
	 *
	 * @param style - Partial label style to apply
	 */
	public setLabelStyle(style: Partial<GraticuleLabelStyle>): void {
		this.labelStyle = { ...this.labelStyle, ...style };
		if (this.isVisible && this.showLabels) {
			this.updateLabels();
		}
	}

	/**
	 * Sets whether the graticule layers should force render during map moving.
	 * Reinitializes layers to apply the option.
	 *
	 * @param enable - Enable force render on moving
	 */
	public setForceRenderOnMoving(enable: boolean): void {
		if (this.forceRenderOnMoving === enable) return;
		this.forceRenderOnMoving = enable;

		if (this.majorLineLayer) {
			this.map.removeLayer(this.majorLineLayer);
			this.majorLineLayer = null;
		}
		if (this.minorLineLayer) {
			this.map.removeLayer(this.minorLineLayer);
			this.minorLineLayer = null;
		}
		if (this.labelLayer) {
			this.map.removeLayer(this.labelLayer);
			this.labelLayer = null;
		}

		this.initializeLayers();

		if (!this.isVisible) {
			this.hide();
		}

		this.updateGridLines();
		if (this.showLabels) {
			this.updateLabels();
		}
	}

	/**
	 * Cleans up the layer manager, removing all layers and event handlers.
	 */
	public destroy(): void {
		this.map.off("zoomend", this.handleZoomEnd);
		this.map.off("moveend", this.handleMoveEnd);
		this.map.off("moving", this.handleMoving);
		this.map.off("movestart", this.handleMoveStart);
		this.map.off("pitch", this.handlePitchChange);

		if (this.majorLineLayer) {
			this.map.removeLayer(this.majorLineLayer);
			this.majorLineLayer = null;
		}
		if (this.minorLineLayer) {
			this.map.removeLayer(this.minorLineLayer);
			this.minorLineLayer = null;
		}
		if (this.labelLayer) {
			this.map.removeLayer(this.labelLayer);
			this.labelLayer = null;
		}
	}
}
