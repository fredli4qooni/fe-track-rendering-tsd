/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { mat4 } from "gl-matrix";
import * as maptalks from "maptalks";

import { Raycaster } from "@common/raycast/Raycaster";

import {
	OwnShipConfig,
	OwnShipRenderer,
	OwnShipState
} from "../../../common/ownship/OwnShipRenderer";

type LayerOptions = maptalks.Layer["options"];

type MapMouseEvent = {
	containerPoint?: {
		x: number;
		y: number;
	};
};

interface OwnShipUpdateEvent {
	type: "ownshipupdate";
	ownShip?: OwnShipState;
}

export class OwnShipLayer extends maptalks.Layer {
	/**
	 * Current own-ship state or null when not set.
	 */
	private ownShip: OwnShipState | null = null;
	private clickHandler?: () => void;
	private readonly ownShipConfig?: OwnShipConfig;

	/**
	 * Create a OwnShipLayer renderer for the map.
	 * @param id - Unique layer id
	 * @param options - Optional maptalks layer options
	 * @param ownShipConfig - Optional OwnShipConfig for renderer customization
	 */
	constructor(
		id: string,
		options?: LayerOptions,
		ownShipConfig?: OwnShipConfig
	) {
		super(id, {
			forceRenderOnMoving: true,
			forceRenderOnZooming: true,
			forceRenderOnRotating: true,
			...options
		});
		this.ownShipConfig = ownShipConfig;
	}

	/**
	 * Update stored own-ship state and emit an "ownshipupdate" event.
	 * @param state - New own-ship state or null
	 */
	setOwnShipData(state: OwnShipState | null) {
		this.ownShip = state;
		this.fire("ownshipupdate", { type: "ownshipupdate", ownShip: state });
	}

	/**
	 * Return the current own-ship state, or null if none is set.
	 * @returns Current own-ship state or null
	 */
	getOwnShipData(): OwnShipState | null {
		return this.ownShip;
	}

	/**
	 * Return configured OwnShip options, if any.
	 * @returns OwnShipConfig or undefined
	 */
	getConfig(): OwnShipConfig | undefined {
		return this.ownShipConfig;
	}

	/**
	 * Provide a click handler that is called when the renderer receives a click for the own-ship.
	 * @param handler - Click handler called when own-ship is clicked
	 */
	setClickHandler(handler?: () => void) {
		this.clickHandler = handler;
	}

	/**
	 * Request that the stored click handler be invoked; falls back to firing an event.
	 */
	requestClick() {
		if (this.clickHandler) {
			this.clickHandler();
			return;
		}
		this.fire("ownshipclick", { type: "ownshipclick" });
	}
}

export class OwnShipLayerRenderer extends maptalks.renderer.CanvasRenderer {
	private glContext: WebGL2RenderingContext | null = null;
	private ownShipRenderer: OwnShipRenderer | null = null;
	private isInitialized = false;
	private isAssetsReady = false;
	private projectionMatrix = mat4.create();
	private boundMap: maptalks.Map | null = null;
	private hoverThrottleMs = 50;
	private lastPickTime = 0;
	private hovered = false;
	private providerId: string | null = null;
	private animationFrameId: number | null = null;
	private lastFrameTimestamp = 0;

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

	private readonly ownShipUpdateHandler = (ev: unknown) => {
		const payload = ev as OwnShipUpdateEvent;
		if (payload?.type === "ownshipupdate") {
			this.onOwnShipChanged(payload.ownShip ?? null);
		}
	};

	private readonly pickHandler = (e: unknown) =>
		this.pick(e as MapMouseEvent, "click");
	private readonly hoverHandler = (e: unknown) =>
		this.handleHover(e as MapMouseEvent);
	private readonly interactionRedrawHandler = () => this.setToRedraw();

	/**
	 * Create a renderer instance for the given OwnShipLayer.
	 * @param layer - OwnShipLayer instance this renderer is associated with
	 */
	constructor(layer: OwnShipLayer) {
		super(layer);
		layer.on(
			"ownshipupdate",
			this.ownShipUpdateHandler as unknown as () => void
		);
	}

	/**
	 * Create the WebGL2 context for this renderer's canvas.
	 * @returns WebGL2RenderingContext or null
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
	 * Called when the layer is added to the map; bind input handlers and start the render loop.
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
	 * Called when the layer is removed from the map; unbind handlers and cleanup resources.
	 */
	onRemove() {
		const map = this.getMapInstance();
		if (map) {
			map.off("click", this.pickHandler);
			map.off("mousemove", this.hoverHandler);
			this.unbindInteractionEvents(map);
			this.boundMap = null;
		}
		if (this.providerId) {
			Raycaster.unregister(this.providerId);
			this.providerId = null;
		}
		this.stopRenderLoop();
		if (this.ownShipRenderer) {
			try {
				this.ownShipRenderer.dispose();
			} catch {}
			this.ownShipRenderer = null;
		}
	}

	/**
	 * Draw the own-ship icon and line using the internal renderer.
	 */
	draw() {
		this.prepareCanvas();
		if (!this.isInitialized) this.initWebGL();

		const gl = this.glContext;
		const map = this.getMapInstance();
		if (!gl || !map || !this.ownShipRenderer || !this.isAssetsReady) {
			this.completeRender();
			return;
		}

		const size = map.getSize();
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

		this.ownShipRenderer.update(map);

		gl.bindFramebuffer(gl.FRAMEBUFFER, null);
		gl.viewport(
			0,
			0,
			this.canvas?.width ?? size.width,
			this.canvas?.height ?? size.height
		);
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		this.ownShipRenderer.render(
			this.projectionMatrix as Float32Array,
			{
				width: size.width,
				height: size.height
			},
			this.hovered
		);

		this.completeRender();
	}

	/**
	 * Draw during interactions (panning/zooming); reuse draw implementation.
	 */
	drawOnInteracting() {
		this.draw();
	}

	/**
	 * Initialize WebGL resources and register the raycast provider.
	 */
	private initWebGL() {
		const gl = this.glContext;
		if (!gl) return;

		const layerCfg = (this.layer as OwnShipLayer).getConfig();
		if (!layerCfg) {
			console.warn(
				"OwnShipLayer: ownShipConfig not provided. Skipping init until config available."
			);
			return;
		}
		this.ownShipRenderer = new OwnShipRenderer(gl, layerCfg);
		this.ownShipRenderer.init();
		this.ownShipRenderer
			.loadAssets()
			.then(() => {
				this.isAssetsReady = true;
				this.setToRedraw();
			})
			.catch((err: unknown) => {
				console.error("OwnShipLayer: failed to load assets", err);
			});

		const providerId = `ownship-layer-${Date.now()}`;
		this.providerId = providerId;
		Raycaster.register({
			id: providerId,
			getCandidates: () =>
				this.ownShipRenderer ? this.ownShipRenderer.getCandidates() : [],
			onClick: (cand) => {
				if (!cand) return;
				(this.layer as OwnShipLayer).requestClick();
				this.setToRedraw();
			},
			onHover: (cand) => {
				this.setHovered(!!cand);
			},
			priority: 10
		});

		this.isInitialized = true;
	}

	/**
	 * Update internal state when the layer receives a new own-ship state.
	 * @param state - New own-ship state or null
	 */
	private onOwnShipChanged(state: OwnShipState | null) {
		if (this.ownShipRenderer) {
			this.ownShipRenderer.setOwnShip(state);
		}
		this.setToRedraw();
	}

	/**
	 * Handle hover events with simple throttling.
	 * @param e - Map mouse event
	 */
	private handleHover(e: MapMouseEvent) {
		const now = performance.now();
		if (now - this.lastPickTime < this.hoverThrottleMs) return;
		this.lastPickTime = now;
		this.pick(e, "hover");
	}

	/**
	 * Perform a pick (click or hover) at the provided container point.
	 * @param e - Map mouse event (containerPoint required)
	 * @param mode - "click" or "hover"
	 */
	private pick(e: MapMouseEvent, mode: "click" | "hover") {
		if (!e?.containerPoint) return;
		const map = this.getMapInstance();
		if (!map || !this.ownShipRenderer) return;
		this.ownShipRenderer.update(map);
		if (mode === "click") {
			Raycaster.dispatchClick(e.containerPoint.x, e.containerPoint.y);
		} else {
			Raycaster.dispatchHover(e.containerPoint.x, e.containerPoint.y);
		}
	}

	/**
	 * Set hovered state and update the cursor.
	 * @param v - hovered flag
	 */
	private setHovered(v: boolean) {
		if (this.hovered === v) return;
		this.hovered = v;
		document.body.style.cursor = v ? "pointer" : "default";
		this.setToRedraw();
	}

	/**
	 * Safely retrieve the current maptalks Map instance or null if not available.
	 * @returns maptalks.Map | null
	 */
	private getMapInstance(): maptalks.Map | null {
		const map = this.getMap() as maptalks.Map | null;
		return map ?? null;
	}

	/**
	 * Bind internal redraw handler to map interaction events.
	 * @param map - maptalks Map instance
	 */
	private bindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionEvents) {
			map.on(eventName, this.interactionRedrawHandler as () => void);
		}
	}

	/**
	 * Unbind internal redraw handler from map events.
	 * @param map - maptalks Map instance
	 */
	private unbindInteractionEvents(map: maptalks.Map) {
		for (const eventName of this.interactionEvents) {
			map.off(eventName, this.interactionRedrawHandler as () => void);
		}
	}

	/**
	 * Start a simple render loop that requests redraws at a target frame rate.
	 * @param timestamp - animation frame timestamp
	 */
	private readonly renderLoop = (timestamp: number) => {
		const FRAME_INTERVAL_MS = 1000 / 30;
		if (timestamp - this.lastFrameTimestamp >= FRAME_INTERVAL_MS) {
			const layer = this.layer as OwnShipLayer | undefined;
			if (layer?.isVisible()) {
				this.setToRedraw();
			}
			this.lastFrameTimestamp = timestamp;
		}
		const raf = globalThis.requestAnimationFrame?.bind(globalThis);
		this.animationFrameId = raf ? raf(this.renderLoop) : null;
	};

	/**
	 * Start the render loop.
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
	 * Stop the render loop.
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
}

OwnShipLayer.registerRenderer("canvas", OwnShipLayerRenderer);
