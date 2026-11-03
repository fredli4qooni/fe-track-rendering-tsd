/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { TrackHistoryEntry } from "@type/history.types";
import type { Track } from "@type/track.types";
import { mat4 } from "gl-matrix";
import * as maptalks from "maptalks";

import { HistoryLineRenderer } from "@common/historyLine/HistoryLineRenderer";

type LayerOptions = maptalks.Layer["options"];

type CameraState = {
	readonly x: number;
	readonly y: number;
	readonly zoom: number;
	readonly bearing: number;
	readonly pitch: number;
};

interface TracksUpdateEvent {
	type: "tracksupdate";
	tracks: Track[];
}

interface HistoryUpdateEvent {
	type: "historyupdate";
	histories: Record<number, TrackHistoryEntry[]>;
}

export class HistoryLayer extends maptalks.Layer {
	private tracks: Track[] = [];
	private histories: Record<number, TrackHistoryEntry[]> = {};

	/**
	 * Create a HistoryLayer.
	 *
	 * @param id - The unique layer identifier.
	 * @param options - Optional layer configuration options.
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
	 * Replace the current tracks with a new set and emit a "tracksupdate" event.
	 *
	 * @param tracks - Array of Track objects to set on the layer.
	 */
	setTrackData(tracks: Track[]) {
		this.tracks = tracks;
		this.fire("tracksupdate", { type: "tracksupdate", tracks });
	}

	/**
	 * Replace the current histories with a new mapping and emit a "historyupdate" event.
	 *
	 * @param histories - Record mapping track IDs to their TrackHistoryEntry arrays.
	 */
	setHistoryData(histories: Record<number, TrackHistoryEntry[]>) {
		this.histories = histories;
		this.fire("historyupdate", { type: "historyupdate", histories });
	}

	/**
	 * Get the current tracks stored in the layer.
	 *
	 * @returns An array of Track objects.
	 */
	getTrackData(): Track[] {
		return this.tracks;
	}

	/**
	 * Get the current histories stored in the layer.
	 *
	 * @returns A record mapping track IDs to arrays of TrackHistoryEntry.
	 */
	getHistoryData(): Record<number, TrackHistoryEntry[]> {
		return this.histories;
	}
}

export class HistoryLayerRenderer extends maptalks.renderer.CanvasRenderer {
	private readonly FRAME_INTERVAL_MS = 1000 / 30;
	private readonly CAMERA_IDLE_DELAY_MS = 150;
	private readonly CENTER_EPSILON = 1e-5;
	private readonly ZOOM_EPSILON = 1e-4;
	private readonly ANGLE_EPSILON = 0.05;
	private readonly interactionStartEvents = [
		"movestart",
		"moving",
		"zoomstart",
		"pitchstart",
		"rotatestart",
		"dragrotatestart",
		"dragpitchstart",
		"touchzoomstart",
		"touchrotatestart",
		"touchpitchstart"
	] as const;
	private readonly interactionEndEvents = [
		"moveend",
		"zoomend",
		"pitchend",
		"rotateend",
		"dragrotateend",
		"dragpitchend",
		"touchzoomend",
		"touchrotateend",
		"touchpitchend"
	] as const;

	private glContext: WebGL2RenderingContext | null = null;
	private historyLineRenderer: HistoryLineRenderer | null = null;

	private readonly projectionMatrix = mat4.create();
	private isInitialized = false;
	private isCameraMoving = false;
	private lastCameraState: CameraState | null = null;
	private lastCameraChangeTime = 0;

	private trackSnapshot: Track[] = [];
	private historySnapshot: Record<number, TrackHistoryEntry[]> = {};

	private animationFrameId: number | null = null;
	private lastFrameTimestamp = 0;
	private boundMap: maptalks.Map | null = null;

	private readonly trackUpdateHandler = (event: unknown) => {
		const payload = event as TracksUpdateEvent;
		if (payload?.type === "tracksupdate" && payload.tracks) {
			this.onTracksChanged(payload.tracks);
		}
	};

	private readonly historyUpdateHandler = (event: unknown) => {
		const payload = event as HistoryUpdateEvent;
		if (payload?.type === "historyupdate" && payload.histories) {
			this.onHistoriesChanged(payload.histories);
		}
	};

	private readonly cameraMoveStartHandler = () => {
		this.setCameraMoving(true);
	};

	private readonly cameraMoveEndHandler = () => {
		this.setCameraMoving(false);
	};

	/**
	 * Construct a HistoryLayerRenderer for the provided HistoryLayer.
	 *
	 * @param layer - The HistoryLayer instance this renderer is attached to.
	 */
	constructor(layer: HistoryLayer) {
		super(layer);
		this.trackSnapshot = layer.getTrackData() ?? [];
		this.historySnapshot = layer.getHistoryData() ?? {};
		layer.on("tracksupdate", this.trackUpdateHandler as unknown as () => void);
		layer.on(
			"historyupdate",
			this.historyUpdateHandler as unknown as () => void
		);
	}

	/**
	 * Create and return a WebGL2 rendering context for the layer's canvas.
	 *
	 * Initializes this.glContext from this.canvas if available and returns it.
	 *
	 * @returns The created WebGL2RenderingContext or null if unavailable.
	 */
	createContext(): WebGL2RenderingContext | null {
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
	 * Called when the renderer is added to a map: starts the render loop and
	 * binds map interaction events to track camera movement.
	 */
	onAdd() {
		this.startRenderLoop();
		const map = this.getMapInstance();
		if (map) {
			if (this.boundMap && this.boundMap !== map) {
				this.unbindInteractionEvents(this.boundMap);
			}
			this.bindInteractionEvents(map);
			this.boundMap = map;
		}
	}

	/**
	 * Called when the renderer is removed from the map.
	 *
	 * Performs cleanup by removing event listeners, stopping the render loop,
	 * unbinding map interaction events, and disposing of WebGL resources.
	 */
	onRemove() {
		(this.layer as HistoryLayer).off(
			"tracksupdate",
			this.trackUpdateHandler as unknown as () => void
		);
		(this.layer as HistoryLayer).off(
			"historyupdate",
			this.historyUpdateHandler as unknown as () => void
		);
		this.stopRenderLoop();
		if (this.boundMap) {
			this.unbindInteractionEvents(this.boundMap);
			this.boundMap = null;
		}
		if (this.historyLineRenderer) {
			this.historyLineRenderer.dispose();
			this.historyLineRenderer = null;
		}
	}

	/**
	 * Handle canvas resize events for the renderer: call the base implementation
	 * and mark the layer for redraw so the WebGL content is updated to the new size.
	 *
	 * @param param - Optional parameter provided by the map/renderer on resize.
	 */
	onResize(param?: unknown) {
		super.onResize(param);
		this.setToRedraw();
	}

	/**
	 * Draw the layer by preparing the canvas, initializing WebGL if required,
	 * updating camera state, and rendering history lines with the HistoryLineRenderer.
	 *
	 * This method is called by the maptalks rendering pipeline and performs
	 * clearing, viewport setup, and invokes the renderer update/render steps.
	 */
	draw() {
		this.prepareCanvas();
		if (!this.isInitialized) this.initWebGL();

		const gl = this.glContext;
		const map = this.getMapInstance();

		if (!gl || !map || !this.historyLineRenderer) {
			this.completeRender();
			return;
		}

		this.updateCameraMovement(map);

		if (this.isCameraMoving) {
			const size = map.getSize();
			const canvasWidth = this.canvas?.width ?? size.width;
			const canvasHeight = this.canvas?.height ?? size.height;
			gl.bindFramebuffer(gl.FRAMEBUFFER, null);
			gl.viewport(0, 0, canvasWidth, canvasHeight);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
			this.completeRender();
			return;
		}

		const size = map.getSize();
		const canvasWidth = this.canvas?.width ?? size.width;
		const canvasHeight = this.canvas?.height ?? size.height;

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(0, 0, canvasWidth, canvasHeight);
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

		this.historyLineRenderer.update(
			map,
			this.trackSnapshot,
			this.historySnapshot
		);
		this.historyLineRenderer.render(this.projectionMatrix as Float32Array);

		this.completeRender();
	}

	/**
	 * Render the layer while the map is being interacted with (e.g., moving,
	 * zooming, rotating). This method proxies to draw() to perform the actual
	 * rendering work.
	 */
	drawOnInteracting() {
		this.draw();
	}

	/**
	 * Initialize WebGL resources and create the HistoryLineRenderer when a
	 * WebGL2 context is available; marks the renderer as initialized.
	 */
	private initWebGL() {
		const gl = this.glContext;
		if (!gl) return;

		this.historyLineRenderer = new HistoryLineRenderer(gl, {
			lineWidth: 1,
			dashSize: 2,
			gapSize: 2,
			color: [0.843, 0.773, 0.145],
			visible: true,
			maxPointsPerTrack: 64
		});
		this.historyLineRenderer.setVisible(true);

		this.isInitialized = true;
	}

	/**
	 * Handle updated tracks by storing a sorted snapshot and requesting a redraw.
	 *
	 * @param tracks - Array of Track objects to store as the current snapshot.
	 */
	private onTracksChanged(tracks: Track[]) {
		this.trackSnapshot = [...tracks].sort((a, b) => a.id - b.id);
		this.setToRedraw();
	}

	/**
	 * Handle updated histories by storing a sorted snapshot (no sorting needed here)
	 * and requesting a redraw of the layer.
	 *
	 * @param histories - Record mapping track IDs to arrays of TrackHistoryEntry.
	 */
	private onHistoriesChanged(histories: Record<number, TrackHistoryEntry[]>) {
		this.historySnapshot = histories;
		this.setToRedraw();
	}

	/**
	 * Update internal camera movement tracking by sampling the current map camera
	 * state and toggling movement flags when thresholds indicate motion or idling.
	 *
	 * @param map - The maptalks Map instance to read camera state from.
	 */
	private updateCameraMovement(map: maptalks.Map) {
		const hasPerformanceNow =
			typeof performance === "object" && typeof performance.now === "function";
		const now = hasPerformanceNow ? performance.now() : Date.now();
		const cameraState = this.captureCameraState(map);
		const moved = this.hasCameraStateChanged(cameraState);
		if (moved) {
			this.lastCameraChangeTime = now;
			if (!this.isCameraMoving) {
				this.setCameraMoving(true);
			}
		} else if (
			this.isCameraMoving &&
			now - this.lastCameraChangeTime >= this.CAMERA_IDLE_DELAY_MS
		) {
			this.setCameraMoving(false);
		}
		this.lastCameraState = cameraState;
	}

	/**
	 * Capture the current camera state from the provided map.
	 *
	 * @param map - The maptalks Map instance to sample.
	 * @returns The current camera state including center x/y, zoom, bearing, and pitch.
	 */
	private captureCameraState(map: maptalks.Map): CameraState {
		const center = map.getCenter();
		return {
			x: center.x,
			y: center.y,
			zoom: map.getZoom(),
			bearing: map.getBearing(),
			pitch: map.getPitch()
		};
	}

	/**
	 * Determine whether the provided camera state differs from the last sampled
	 * camera state by more than the configured epsilon thresholds (center, zoom,
	 * bearing, or pitch).
	 *
	 * @param next - The newly captured camera state to compare.
	 * @returns True if the camera state has changed significantly; otherwise false.
	 */
	private hasCameraStateChanged(next: CameraState): boolean {
		if (!this.lastCameraState) return false;
		const dx = Math.abs(next.x - this.lastCameraState.x);
		const dy = Math.abs(next.y - this.lastCameraState.y);
		const dZoom = Math.abs(next.zoom - this.lastCameraState.zoom);
		const dBearing = Math.abs(next.bearing - this.lastCameraState.bearing);
		const dPitch = Math.abs(next.pitch - this.lastCameraState.pitch);
		return (
			dx > this.CENTER_EPSILON ||
			dy > this.CENTER_EPSILON ||
			dZoom > this.ZOOM_EPSILON ||
			dBearing > this.ANGLE_EPSILON ||
			dPitch > this.ANGLE_EPSILON
		);
	}

	private readonly renderLoop = (timestamp: number) => {
		if (timestamp - this.lastFrameTimestamp >= this.FRAME_INTERVAL_MS) {
			const layer = this.layer as HistoryLayer | undefined;
			if (layer?.isVisible()) {
				this.setToRedraw();
			}
			this.lastFrameTimestamp = timestamp;
		}
		const raf = globalThis.requestAnimationFrame?.bind(globalThis);
		this.animationFrameId = raf ? raf(this.renderLoop) : null;
	};

	/**
	 * Bind map interaction start and end events to camera movement handlers.
	 *
	 * This registers handlers for interaction start events (to mark the camera as moving)
	 * and interaction end events (to mark the camera as idle) on the provided map instance.
	 *
	 * @param map - The maptalks Map instance to bind events on.
	 */
	private bindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionStartEvents) {
			map.on(eventName, this.cameraMoveStartHandler as () => void);
		}
		for (const eventName of this.interactionEndEvents) {
			map.on(eventName, this.cameraMoveEndHandler as () => void);
		}
	}

	/**
	 * Unbind map interaction start and end events from the provided map instance.
	 *
	 * This removes the handlers that were registered in bindInteractionEvents so
	 * the renderer no longer responds to map interaction lifecycle events.
	 *
	 * @param map - The maptalks Map instance to remove event listeners from.
	 */
	private unbindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionStartEvents) {
			map.off(eventName, this.cameraMoveStartHandler as () => void);
		}
		for (const eventName of this.interactionEndEvents) {
			map.off(eventName, this.cameraMoveEndHandler as () => void);
		}
	}

	/**
	 * Update the internal flag indicating whether the camera is moving and
	 * request a redraw when the movement state changes.
	 *
	 * @param isMoving - True if the camera is currently moving; otherwise false.
	 */
	private setCameraMoving(isMoving: boolean) {
		if (this.isCameraMoving === isMoving) return;
		this.isCameraMoving = isMoving;

		this.historyLineRenderer?.setCameraMoving(isMoving);
		this.setToRedraw();
	}

	/**
	 * Start the internal requestAnimationFrame loop that periodically requests
	 * redraws for the layer; this is a no-op if an animation frame is already
	 * scheduled or requestAnimationFrame is not available in the environment.
	 */
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

	/**
	 * Stop the internal requestAnimationFrame loop if one is scheduled and cancel it.
	 *
	 * Ensures the animation frame id is cleared whether or not cancelAnimationFrame
	 * is available in the environment.
	 */
	private stopRenderLoop() {
		const caf = globalThis.cancelAnimationFrame?.bind(globalThis);
		if (!caf || this.animationFrameId === null) {
			this.animationFrameId = null;
			return;
		}
		caf(this.animationFrameId);
		this.animationFrameId = null;
	}

	/**
	 * Safely retrieve the associated maptalks.Map instance for this renderer.
	 *
	 * @returns The maptalks.Map instance if available, otherwise null.
	 */
	private getMapInstance(): maptalks.Map | null {
		const map = this.getMap() as maptalks.Map | null;
		return map ?? null;
	}
}

HistoryLayer.registerRenderer("canvas", HistoryLayerRenderer);
