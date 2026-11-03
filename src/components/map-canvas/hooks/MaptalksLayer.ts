/* eslint-disable max-lines, jsdoc/require-jsdoc */
import fontJson from "@assets/fonts/Montserrat-regular.json";
import fontImage from "@assets/fonts/Montserrat-regular.png";
import { BMFontJson } from "@type/font.types";
import type { Track } from "@type/track.types";
import { mat4 } from "gl-matrix";
import * as maptalks from "maptalks";

import { CourseRenderer } from "@common/course/CourseRenderer";
import { LabelRenderer } from "@common/label/LabelRenderer";
import { RaycastCandidate, Raycaster } from "@common/raycast/Raycaster";
import { TrackRenderer } from "@common/track/Track";

import { loadFont } from "@utils/assetLoader";

type LayerOptions = maptalks.Layer["options"];

type MapMouseEvent = {
	containerPoint?: {
		x: number;
		y: number;
	};
};

type TracksUpdateEvent = {
	type: "tracksupdate";
	tracks: Track[];
};

interface SelectionUpdateEvent {
	type: "selectionupdate";
	selectedTrack?: number;
}

export class MaptalksLayer extends maptalks.Layer {
	private latestTracks: Track[] = [];
	private selectedTrackId: number | undefined;
	private selectionHandler?: (id: number | undefined) => void;

	/**
	 * Creates a new MaptalksLayer.
	 * @param id - The unique layer identifier.
	 * @param options - Optional layer configuration.
	 */
	constructor(id: string, options?: LayerOptions) {
		super(id, {
			forceRenderOnMoving: true,
			forceRenderOnZooming: true,
			forceRenderOnRotating: true,
			...options
		});
	}

	/**
	 * Update the layer's track data and emit a "tracksupdate" event.
	 * @param tracks - Array of Track objects to set as the latest tracks.
	 */
	setTrackData(tracks: Track[]) {
		this.latestTracks = tracks;
		this.fire("tracksupdate", { type: "tracksupdate", tracks });
	}

	/**
	 * Get the current track data stored in the layer.
	 * @returns Array of Track objects representing the latest tracks.
	 */
	getTrackData(): Track[] {
		return this.latestTracks;
	}

	/**
	 * Update the currently selected track ID and emit a "selectionupdate" event if it changed.
	 * @param selectedTrack - The ID of the track to select, or undefined to clear selection.
	 */
	setSelectedTrack(selectedTrack?: number) {
		if (this.selectedTrackId === selectedTrack) return;
		this.selectedTrackId = selectedTrack;
		this.fire("selectionupdate", {
			type: "selectionupdate",
			selectedTrack: selectedTrack ?? undefined
		});
	}

	/**
	 * Get the currently selected track ID.
	 * @returns The selected track ID, or undefined if no track is selected.
	 */
	getSelectedTrack(): number | undefined {
		return this.selectedTrackId;
	}

	/**
	 * Set a handler to be invoked when a track selection is requested.
	 * @param handler - Callback receiving the selected track id, or undefined to clear selection.
	 */
	setSelectionHandler(handler?: (id: number | undefined) => void) {
		this.selectionHandler = handler;
	}

	/**
	 * Request a change of the currently selected track by invoking the configured selection handler.
	 * @param nextSelection - The ID of the track to select, or undefined to clear the selection.
	 */
	requestTrackSelection(nextSelection?: number) {
		if (this.selectionHandler) {
			this.selectionHandler(nextSelection);
			return;
		}
		if (this.selectedTrackId === nextSelection) return;
		this.selectedTrackId = nextSelection;
		this.fire("selectionupdate", {
			type: "selectionupdate",
			selectedTrack: nextSelection ?? undefined
		});
	}
}

export class MaptalksLayerRenderer extends maptalks.renderer.CanvasRenderer {
	private readonly LABEL_ZOOM_THRESHOLD = 7.5;
	private readonly pickThrottleMs = 50;
	private readonly FRAME_INTERVAL_MS = 1000 / 30;

	private glContext: WebGL2RenderingContext | null = null;

	private trackRenderer: TrackRenderer | null = null;
	private labelRenderer: LabelRenderer | null = null;
	private courseRenderer: CourseRenderer | null = null;

	private readonly projectionMatrix = mat4.create();
	private readonly coordinateScratch = new maptalks.Coordinate(0, 0);
	private readonly pickHandler = (e: unknown) =>
		this.pick(e as MapMouseEvent, "click");
	private readonly hoverHandler = (e: unknown) =>
		this.handleHover(e as MapMouseEvent);

	private lastPickTime = 0;
	private isInitialized = false;
	private isAssetsReady = false;
	private hoveredTrackId: number | null = null;
	private selectedTrackId: number | undefined;

	private trackSnapshot: Track[] = [];
	private prevTrackIds: number[] = [];
	private readonly trackTypeCache = new Map<number, number | undefined>();
	private readonly trackNameCache = new Map<number, string>();
	private pendingStaticUpload = false;
	private animationFrameId: number | null = null;
	private lastFrameTimestamp = 0;
	private trackRaycasterProviderId: string | null = null;
	private labelRaycasterProviderId: string | null = null;
	private readonly labelCandidates: RaycastCandidate[] = [];
	private boundMap: maptalks.Map | null = null;
	private readonly interactionEvents = [
		"movestart",
		"moving",
		"moveend",
		"zoomstart",
		"zooming",
		"zoomend",
		"pitchstart",
		"pitching",
		"pitchend",
		"rotatestart",
		"rotating",
		"rotateend",
		"dragrotatestart",
		"dragrotateend",
		"dragpitchstart",
		"dragpitchend",
		"touchzoomstart",
		"touchzoomend",
		"touchrotatestart",
		"touchrotateend",
		"touchpitchstart",
		"touchpitchend"
	] as const;
	private readonly interactionRedrawHandler = () =>
		this.handleInteractionRedraw();

	private readonly trackUpdateHandler = (event: unknown) => {
		const payload = event as TracksUpdateEvent;
		if (payload?.type === "tracksupdate" && payload.tracks) {
			this.onTracksChanged(payload.tracks);
		}
	};

	private readonly selectionUpdateHandler = (event: unknown) => {
		const payload = event as SelectionUpdateEvent;
		if (payload?.type === "selectionupdate") {
			this.selectedTrackId = payload.selectedTrack;
			this.setToRedraw();
		}
	};

	/**
	 * Creates a renderer instance for the provided MaptalksLayer and initializes
	 * internal caches from the current layer data.
	 * @param layer - The MaptalksLayer this renderer is associated with.
	 */
	constructor(layer: MaptalksLayer) {
		super(layer);
		this.trackSnapshot = layer.getTrackData() ?? [];
		for (const track of this.trackSnapshot) {
			this.trackTypeCache.set(track.id, track.type);
			this.trackNameCache.set(track.id, track.name ?? "");
			this.prevTrackIds.push(track.id);
		}
		this.selectedTrackId = layer.getSelectedTrack();
		layer.on("tracksupdate", this.trackUpdateHandler as unknown as () => void);
		layer.on(
			"selectionupdate",
			this.selectionUpdateHandler as unknown as () => void
		);
	}

	/**
	 * Create or retrieve the WebGL2 rendering context from the canvas.
	 * @returns The WebGL2RenderingContext if available, otherwise null.
	 */
	createContext() {
		if (this.canvas) {
			this.glContext = this.canvas.getContext("webgl2", {
				alpha: true,
				antialias: false,
				preserveDrawingBuffer: true
			});
		}
		return this.glContext;
	}

	/**
	 * Called when the layer is added to the map: bind input handlers and start the render loop.
	 */
	onAdd() {
		const map = this.getMapInstance();
		if (map) {
			map.on("click", this.pickHandler);
			map.on("mousemove", this.hoverHandler);
			if (this.boundMap && this.boundMap !== map) {
				this.unbindInteractionEvents(this.boundMap);
			}
			this.bindInteractionEvents(map);
			this.boundMap = map;
		}
		this.startRenderLoop();
	}

	/**
	 * Called when the layer is removed from the map: unbind input handlers, unregister raycasters,
	 * clear label candidates and stop the render loop.
	 */
	onRemove() {
		const map = this.getMapInstance();
		if (map) {
			map.off("click", this.pickHandler);
			map.off("mousemove", this.hoverHandler);
			this.unbindInteractionEvents(map);
			this.boundMap = null;
		}
		(this.layer as MaptalksLayer).off(
			"tracksupdate",
			this.trackUpdateHandler as unknown as () => void
		);
		if (this.trackRaycasterProviderId) {
			Raycaster.unregister(this.trackRaycasterProviderId);
			this.trackRaycasterProviderId = null;
		}
		if (this.labelRaycasterProviderId) {
			Raycaster.unregister(this.labelRaycasterProviderId);
			this.labelRaycasterProviderId = null;
		}
		this.labelCandidates.length = 0;
		this.stopRenderLoop();
	}

	/**
	 * Initialize WebGL resources: create renderers, register raycasters and load assets.
	 * This sets up track, course and label renderers and schedules any pending uploads.
	 */
	private initWebGL() {
		const gl = this.glContext;
		if (!gl) return;
		this.trackRenderer = new TrackRenderer(gl);
		this.trackRenderer.init();
		this.courseRenderer = new CourseRenderer(gl);
		this.labelRenderer = new LabelRenderer(gl, {
			fontSize: 15,
			xOffset: 25,
			yOffset: 20,
			color: [1, 1, 1],
			selectedColor: [1, 0.8, 0]
		});

		this.ensureInstanceCapacity(this.trackSnapshot.length);

		if (this.trackRenderer) {
			const providerId = `track-layer-${Date.now()}`;
			this.trackRaycasterProviderId = providerId;
			Raycaster.register({
				id: providerId,
				getCandidates: () => this.trackRenderer!.getInstanceBoundingBoxes(),
				getCandidatesAt: (px: number, py: number) =>
					this.trackRenderer!.getCandidatesAt(px, py),
				onClick: (cand) => {
					if (!cand) return;
					this.toggleTrackSelection(cand.id);
					this.setToRedraw();
				},
				onHover: (cand) => {
					this.setHoveredTrack(cand ? cand.id : null);
				},
				priority: 1
			});
		}

		if (this.labelRenderer) {
			const labelProviderId = `label-layer-${Date.now()}`;
			this.labelRaycasterProviderId = labelProviderId;
			Raycaster.register({
				id: labelProviderId,
				getCandidates: () => this.labelCandidates,
				onClick: (cand) => {
					if (!cand) return;
					this.toggleTrackSelection(cand.id);
					this.setToRedraw();
				},
				onHover: (cand) => {
					this.setHoveredTrack(cand ? cand.id : null);
				},
				priority: 2
			});
		}

		void Promise.all([
			this.trackRenderer.loadAssets(),
			loadFont(gl, fontJson as BMFontJson, fontImage)
		])
			.then(([, fontResult]) => {
				if (this.labelRenderer) {
					this.labelRenderer.setAssets(fontResult.data, fontResult.texture);
					this.labelRenderer.updateLabels(this.trackSnapshot);
				}
				this.isAssetsReady = true;
				this.setToRedraw();
			})
			.catch((error) => {
				console.error("Failed to load layer assets", error);
			});

		this.isInitialized = true;
	}

	/**
	 * Handle canvas resize events forwarded from the maptalks renderer and delegate
	 * to the base implementation.
	 * @param param - Optional resize parameter provided by maptalks.
	 */
	onResize(param?: unknown) {
		super.onResize(param);
	}

	/**
	 * Render the WebGL layer into the canvas; initialize WebGL resources if needed,
	 * update dynamic/static data and draw tracks, courses and labels based on the
	 * current map state and visibility.
	 */
	draw() {
		this.prepareCanvas();
		if (!this.isInitialized) this.initWebGL();

		const gl = this.glContext;

		if (!gl || !this.trackRenderer || !this.isAssetsReady) {
			this.completeRender();
			return;
		}

		const map = this.getMapInstance();
		if (!map) {
			this.completeRender();
			return;
		}

		if (this.pendingStaticUpload) {
			if (this.trackRenderer)
				this.trackRenderer.populateStaticData(this.trackSnapshot);
			this.pendingStaticUpload = false;
		}

		const size = map.getSize();
		const zoom = map.getZoom();

		if (this.trackRenderer)
			this.trackRenderer.updateDynamicData(map, this.trackSnapshot);
		this.updateLabelCandidates(map);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, this.canvas.width, this.canvas.height);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.DEPTH_TEST);
		gl.depthFunc(gl.LEQUAL);

		const maxZ = 10000;
		mat4.ortho(
			this.projectionMatrix,
			0,
			size.width,
			size.height,
			0,
			-maxZ,
			maxZ
		);

		const selectedId = this.selectedTrackId ?? -1;
		const hoveredId = this.hoveredTrackId ?? -1;
		const selectedIndex = this.findTrackIndexById(this.selectedTrackId);
		const hoveredIndex = this.findTrackIndexById(this.hoveredTrackId);

		if (this.trackRenderer) {
			this.trackRenderer.render(
				this.projectionMatrix as Float32Array,
				{ width: size.width, height: size.height },
				selectedId,
				hoveredId
			);
		}

		const trackDataTexture = this.trackRenderer?.getDataTexture();
		const sharedTexture = trackDataTexture?.getTexture();
		const count = this.trackRenderer?.getCount() ?? 0;

		if (this.courseRenderer && sharedTexture && count > 0) {
			gl.lineWidth(1.5);

			const bearing = -(map.getBearing() * Math.PI) / 180;

			this.courseRenderer.render(
				this.projectionMatrix as Float32Array,
				sharedTexture,
				trackDataTexture!.getSize(),
				count,
				bearing
			);
		}

		if (
			zoom >= this.LABEL_ZOOM_THRESHOLD &&
			this.labelRenderer &&
			trackDataTexture &&
			sharedTexture
		) {
			this.labelRenderer.render(
				this.projectionMatrix as Float32Array,
				size.width,
				size.height,
				sharedTexture,
				trackDataTexture.getSize(),
				selectedIndex,
				hoveredIndex
			);
		}

		this.completeRender();
	}

	/**
	 * Handle mouse move events with throttling to limit pick frequency.
	 * @param e - Map mouse event containing containerPoint with x/y coordinates.
	 */
	private handleHover(e: MapMouseEvent) {
		const now = performance.now();
		if (now - this.lastPickTime < this.pickThrottleMs) return;
		this.lastPickTime = now;
		this.pick(e, "hover");
	}

	/**
	 * Perform a pick (click or hover) at the event's container point, update dynamic data,
	 * update label candidates and dispatch the event to the Raycaster.
	 * @param e - Map mouse event containing a containerPoint with x/y coordinates.
	 * @param mode - "click" to dispatch a click, "hover" to dispatch a hover.
	 */
	private pick(e: MapMouseEvent, mode: "click" | "hover") {
		if (!e?.containerPoint) return;
		const map = this.getMapInstance();
		if (!map || !this.trackRenderer) return;
		this.updateDynamicData(map);
		this.updateLabelCandidates(map);

		if (mode === "click") {
			Raycaster.dispatchClick(e.containerPoint.x, e.containerPoint.y);
		} else {
			Raycaster.dispatchHover(e.containerPoint.x, e.containerPoint.y);
		}
	}

	/**
	 * Called while the map is interacting (panning/zooming/rotating) to render the layer;
	 * this delegates to the regular draw() method to perform the actual rendering.
	 */
	drawOnInteracting() {
		this.draw();
	}

	/**
	 * Update per-frame dynamic data on the GPU for the current map state.
	 * This updates any buffers or textures that depend on the map (zoom, center, bearing, etc.).
	 * @param map - The maptalks map instance used to compute dynamic updates.
	 */
	private updateDynamicData(map: maptalks.Map) {
		if (!this.trackRenderer) return;
		this.trackRenderer.updateDynamicData(map, this.trackSnapshot);
	}

	/**
	 * Find the index of a track by its id.
	 * @param id - The track id to search for, or null/undefined.
	 * @returns The index of the track in the current trackSnapshot, or -1 if not found.
	 */
	private findTrackIndexById(id: number | null | undefined) {
		if (id === undefined || id === null) return -1;
		return this.trackSnapshot.findIndex((track) => track.id === id);
	}

	/**
	 * Toggle selection for a track: if the given trackId is already selected it will
	 * be deselected, otherwise it will become the new selection. The actual selection
	 * change is delegated to the associated MaptalksLayer via requestTrackSelection.
	 * @param trackId - The id of the track to toggle selection for.
	 */
	private toggleTrackSelection(trackId: number) {
		const layer = this.layer as MaptalksLayer;
		const current = this.selectedTrackId;
		const nextSelection = current === trackId ? undefined : trackId;
		layer.requestTrackSelection(nextSelection);
	}

	/**
	 * Update the currently hovered track id and request a redraw if it changed.
	 * @param trackId - The id of the hovered track, or null to clear the hover.
	 */
	private setHoveredTrack(trackId: number | null) {
		if (this.hoveredTrackId === trackId) return;
		this.hoveredTrackId = trackId;
		this.setToRedraw();
	}

	/**
	 * Update raycast candidates for labels based on the current track screen positions.
	 * Populates the labelCandidates array with entries containing id, index, position and size
	 * for tracks that are visible at the current zoom and have valid screen bounds.
	 * @param map - The maptalks Map instance or null when unavailable.
	 */
	private updateLabelCandidates(map: maptalks.Map | null) {
		if (!this.labelRenderer || !this.trackRenderer) {
			this.labelCandidates.length = 0;
			return;
		}
		if (!map || map.getZoom() < this.LABEL_ZOOM_THRESHOLD) {
			this.labelCandidates.length = 0;
			return;
		}
		const screenData = this.trackRenderer.getScreenDataBuffer();
		if (!screenData) {
			this.labelCandidates.length = 0;
			return;
		}
		const maxCount = Math.min(
			this.trackSnapshot.length,
			Math.floor(screenData.length / 4)
		);
		this.labelCandidates.length = 0;
		for (let i = 0; i < maxCount; i++) {
			const track = this.trackSnapshot[i];
			if (!track) continue;
			const base = i * 4;
			const screenX = screenData[base];
			const screenY = screenData[base + 1];
			const visible = screenData[base + 3];
			if (
				!Number.isFinite(screenX) ||
				!Number.isFinite(screenY) ||
				visible < 0.5
			) {
				continue;
			}
			const bounds = this.labelRenderer.getBoundsForIndex(i);
			if (!bounds) continue;
			const centerX = screenX + bounds.centerOffsetX;
			const centerY = screenY + bounds.centerOffsetY;
			const size = Math.max(bounds.width, bounds.height);
			if (!Number.isFinite(centerX) || !Number.isFinite(centerY) || size <= 0) {
				continue;
			}
			this.labelCandidates.push({
				id: track.id,
				index: i,
				x: centerX,
				y: centerY,
				size
			});
		}
	}

	/**
	 * Check whether the list of track IDs has changed compared to the previous snapshot.
	 * This compares both the length and the order of IDs.
	 * @param newIds - Array of current track IDs to compare.
	 * @returns True if the ID list (length or order) differs from the cached prevTrackIds.
	 */
	private haveTrackIdsChanged(newIds: number[]) {
		if (this.prevTrackIds.length !== newIds.length) {
			return true;
		}
		for (let i = 0; i < newIds.length; i++) {
			if (this.prevTrackIds[i] !== newIds[i]) {
				return true;
			}
		}
		return false;
	}

	/**
	 * Ensure the TrackRenderer has capacity for the given number of instances,
	 * initializing the renderer and deferring a static upload if WebGL isn't ready.
	 * @param count - Number of track instances to ensure capacity for.
	 */
	private ensureInstanceCapacity(count: number) {
		const gl = this.glContext;
		if (!gl) {
			this.pendingStaticUpload = true;
			return;
		}

		if (!this.trackRenderer) {
			this.trackRenderer = new TrackRenderer(gl);
			this.trackRenderer.init();
			this.pendingStaticUpload = true;
		}

		this.trackRenderer.ensureCapacity(count);
	}

	/**
	 * Populate GPU-only static data (buffers/textures) from the current track snapshot.
	 * This uploads immutable per-track data to the TrackRenderer and clears the pending flag.
	 */
	private populateStaticData(): void {
		if (!this.trackRenderer) return;
		this.trackRenderer.populateStaticData(this.trackSnapshot);
		this.pendingStaticUpload = false;
	}

	/**
	 * Handle updated track list: sort tracks, compute dirty flags for static and label data,
	 * update internal caches, ensure renderer capacity, and request a redraw if needed.
	 * @param tracks - Array of updated Track objects.
	 */
	private onTracksChanged(tracks: Track[]) {
		tracks.sort((a, b) => a.id - b.id);
		const prevTypes = new Map(this.trackTypeCache);
		const prevNames = new Map(this.trackNameCache);

		this.trackSnapshot = tracks;
		this.trackTypeCache.clear();
		this.trackNameCache.clear();

		const newIds = tracks.map((t) => t.id);
		const staticDirty =
			tracks.length !== prevTypes.size ||
			this.haveTrackIdsChanged(newIds) ||
			tracks.some((track) => prevTypes.get(track.id) !== track.type);

		const labelDirty =
			tracks.length !== prevNames.size ||
			tracks.some(
				(track) => (track.name ?? "") !== (prevNames.get(track.id) ?? "")
			);

		for (const track of tracks) {
			const currentName = track.name ?? "";
			this.trackTypeCache.set(track.id, track.type);
			this.trackNameCache.set(track.id, currentName);
		}

		if (this.glContext) {
			this.ensureInstanceCapacity(tracks.length);
		} else {
			this.pendingStaticUpload = true;
		}

		if (staticDirty) {
			if (this.trackRenderer) {
				this.populateStaticData();
			} else {
				this.pendingStaticUpload = true;
			}
		}

		if (labelDirty && this.labelRenderer) {
			this.labelRenderer.updateLabels(tracks);
		}

		this.prevTrackIds = newIds;
		if (this.hoveredTrackId !== null && !newIds.includes(this.hoveredTrackId)) {
			this.setHoveredTrack(null);
		}

		const layer = this.layer as MaptalksLayer | undefined;
		if (layer?.isVisible()) {
			this.setToRedraw();
		}
	}

	private readonly renderLoop = (timestamp: number) => {
		if (timestamp - this.lastFrameTimestamp >= this.FRAME_INTERVAL_MS) {
			const layer = this.layer as MaptalksLayer | undefined;
			if (layer?.isVisible()) {
				this.setToRedraw();
			}
			this.lastFrameTimestamp = timestamp;
		}
		const raf = globalThis.requestAnimationFrame?.bind(globalThis);
		this.animationFrameId = raf ? raf(this.renderLoop) : null;
	};

	private startRenderLoop() {
		const raf = globalThis.requestAnimationFrame?.bind(globalThis);
		if (!raf || this.animationFrameId !== null) return;
		const hasPerformanceNow =
			typeof performance === "object" && typeof performance.now === "function";
		this.lastFrameTimestamp = hasPerformanceNow
			? performance.now()
			: Date.now();
		this.animationFrameId = raf(this.renderLoop);
	}

	private stopRenderLoop() {
		const caf = globalThis.cancelAnimationFrame?.bind(globalThis);
		if (!caf || this.animationFrameId === null) {
			this.animationFrameId = null;
			return;
		}
		caf(this.animationFrameId);
		this.animationFrameId = null;
	}

	private bindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionEvents) {
			map.on(eventName, this.interactionRedrawHandler as () => void);
		}
	}

	private unbindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionEvents) {
			map.off(eventName, this.interactionRedrawHandler as () => void);
		}
	}

	private handleInteractionRedraw() {
		const map = this.getMapInstance();
		if (!map) return;
		this.updateDynamicData(map);
		this.updateLabelCandidates(map);
		const layer = this.layer as MaptalksLayer | undefined;
		if (layer?.isVisible()) {
			this.setToRedraw();
		}
	}

	private getMapInstance(): maptalks.Map | null {
		const map = this.getMap() as maptalks.Map | null;
		return map ?? null;
	}
}

MaptalksLayer.registerRenderer("canvas", MaptalksLayerRenderer);
