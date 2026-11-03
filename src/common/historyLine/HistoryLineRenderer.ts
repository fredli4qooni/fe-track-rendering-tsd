/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { TrackHistoryEntry } from "@type/history.types";
import type { Track } from "@type/track.types";
import * as maptalks from "maptalks";

import { HistoryDataManager } from "./hooks/HistoryDataManager";
import historyLineFrag from "./shaders/historyLine.frag";
import historyLineVert from "./shaders/historyLine.vert";

export interface HistoryLineConfig {
	lineWidth?: number;

	dashSize?: number;

	gapSize?: number;

	color?: [number, number, number];

	visible?: boolean;

	maxPointsPerTrack?: number;

	minZoom?: number;
}

export interface ResolvedHistoryLineConfig {
	lineWidth: number;
	dashSize: number;
	gapSize: number;
	color: [number, number, number];
	visible: boolean;
	maxPointsPerTrack: number;
	minZoom: number;
}

export type TrackVisibilityMap = Map<number, boolean>;

export const DEFAULT_HISTORY_LINE_CONFIG: ResolvedHistoryLineConfig = {
	lineWidth: 1,
	dashSize: 2,
	gapSize: 2,
	color: [0.843, 0.773, 0.145],
	visible: true,
	maxPointsPerTrack: 64,
	minZoom: 0
};

/**
 * Resolve a partial HistoryLineConfig into a fully populated ResolvedHistoryLineConfig,
 * using DEFAULT_HISTORY_LINE_CONFIG for any missing values.
 *
 * @param config Optional partial configuration to resolve.
 * @returns ResolvedHistoryLineConfig with all required fields set.
 */
export function resolveConfig(
	config?: HistoryLineConfig
): ResolvedHistoryLineConfig {
	const c: Partial<HistoryLineConfig> = config ?? {};

	return {
		lineWidth: c.lineWidth ?? DEFAULT_HISTORY_LINE_CONFIG.lineWidth,
		dashSize: c.dashSize ?? DEFAULT_HISTORY_LINE_CONFIG.dashSize,
		gapSize: c.gapSize ?? DEFAULT_HISTORY_LINE_CONFIG.gapSize,
		color: c.color ?? DEFAULT_HISTORY_LINE_CONFIG.color,
		visible: c.visible ?? DEFAULT_HISTORY_LINE_CONFIG.visible,
		maxPointsPerTrack:
			c.maxPointsPerTrack ?? DEFAULT_HISTORY_LINE_CONFIG.maxPointsPerTrack,
		minZoom: c.minZoom ?? DEFAULT_HISTORY_LINE_CONFIG.minZoom
	};
}

export class HistoryLineRenderer {
	private readonly gl: WebGL2RenderingContext;
	private readonly config: ResolvedHistoryLineConfig;
	private readonly dataManager: HistoryDataManager;

	private lineProgram: WebGLProgram | null = null;
	private lineVAO: WebGLVertexArrayObject | null = null;

	private isReady = false;
	private meetsZoomThreshold = true;

	/**
	 * Create a new HistoryLineRenderer.
	 *
	 * @param gl - The WebGL2RenderingContext used to create shaders and buffers.
	 * @param config - Optional configuration overrides for rendering history lines.
	 */
	constructor(gl: WebGL2RenderingContext, config?: HistoryLineConfig) {
		this.gl = gl;
		this.config = resolveConfig(config);
		this.dataManager = new HistoryDataManager(
			gl,
			this.config.maxPointsPerTrack
		);
		this.init();
	}

	/**
	 * Initialize GL programs and resources used by the renderer.
	 *
	 * Sets up the line and circle shader programs and marks the renderer as ready
	 * to render history lines and circles.
	 */
	private init() {
		this.initLineProgram();
		this.isReady = true;
	}

	/**
	 * Initialize the shader program used to render history lines.
	 *
	 * Compiles the vertex and fragment shaders for the history lines,
	 * links them into a WebGL program and stores it in this.lineProgram.
	 * Any link errors are logged to the console.
	 */
	private initLineProgram() {
		const gl = this.gl;

		const vert = this.createShader(gl.VERTEX_SHADER, historyLineVert);
		const frag = this.createShader(gl.FRAGMENT_SHADER, historyLineFrag);

		this.lineProgram = gl.createProgram();
		if (!this.lineProgram) return;

		gl.attachShader(this.lineProgram, vert);
		gl.attachShader(this.lineProgram, frag);
		gl.linkProgram(this.lineProgram);

		if (!gl.getProgramParameter(this.lineProgram, gl.LINK_STATUS)) {
			console.error(
				"History Line Program Error:",
				gl.getProgramInfoLog(this.lineProgram)
			);
			return;
		}

		this.initLineVAO();
	}

	/**
	 * Initialize the vertex array that binds pooled line buffers to shader attributes.
	 */
	private initLineVAO() {
		const gl = this.gl;
		if (!this.lineProgram) return;

		const positionBuffer = this.dataManager.getLinePositionBuffer();
		const distanceBuffer = this.dataManager.getLineDistanceBuffer();
		if (!positionBuffer || !distanceBuffer) return;

		const positionLocation = gl.getAttribLocation(
			this.lineProgram,
			"a_position"
		);
		const distanceLocation = gl.getAttribLocation(
			this.lineProgram,
			"a_distance"
		);
		if (positionLocation === -1 || distanceLocation === -1) return;

		this.lineVAO = gl.createVertexArray();
		if (!this.lineVAO) return;

		gl.bindVertexArray(this.lineVAO);
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
		gl.enableVertexAttribArray(positionLocation);
		gl.vertexAttribPointer(positionLocation, 3, gl.FLOAT, false, 0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, distanceBuffer);
		gl.enableVertexAttribArray(distanceLocation);
		gl.vertexAttribPointer(distanceLocation, 1, gl.FLOAT, false, 0, 0);

		gl.bindVertexArray(null);
	}

	/**
	 * Update the renderer configuration by merging the provided partial configuration
	 * with the current configuration and resolving any missing values using defaults.
	 *
	 * @param newConfig Partial configuration overrides to apply to the renderer.
	 */
	public setConfig(newConfig: Partial<HistoryLineConfig>) {
		Object.assign(this.config, resolveConfig({ ...this.config, ...newConfig }));
	}

	/**
	 * Get a shallow copy of the resolved renderer configuration.
	 *
	 * Returns an object copy so callers cannot mutate the internal config directly.
	 *
	 * @returns ResolvedHistoryLineConfig - the current configuration values.
	 */
	public getConfig(): ResolvedHistoryLineConfig {
		return { ...this.config };
	}

	/**
	 * Set visibility for a specific track in the renderer.
	 *
	 * @param trackId - Identifier of the track to update visibility for.
	 * @param visible - Whether the track should be visible (true) or hidden (false).
	 */
	public setTrackVisibility(trackId: number, visible: boolean) {
		this.dataManager.setTrackVisibility(trackId, visible);
	}

	/**
	 * Clear any per-track visibility overrides so all tracks use the default visibility.
	 *
	 * This forwards the call to the HistoryDataManager to remove stored visibility flags
	 * for individual tracks.
	 */
	public clearTrackVisibility() {
		this.dataManager.clearTrackVisibility();
	}

	/**
	 * Set global visibility for history rendering.
	 *
	 * @param visible - Whether the history lines and circles should be visible.
	 */
	public setVisible(visible: boolean) {
		this.config.visible = visible;
	}

	/**
	 * Hint that the camera is currently moving so the renderer can choose cheaper update paths.
	 *
	 * @param moving - True while the camera is moving; false when idle.
	 */
	public setCameraMoving(moving: boolean) {
		this.dataManager.setFreezeDuringMove(moving);
	}

	/**
	 * Update internal buffers and textures with the latest track and history data so the renderer
	 * can prepare for the next render call.
	 *
	 * @param map - The maptalks.Map instance used for coordinate conversions.
	 * @param tracks - Array of Track objects to update.
	 * @param histories - Record mapping track IDs to arrays of TrackHistoryEntry points.
	 */
	public update(
		map: maptalks.Map,
		tracks: Track[],
		histories: Record<number, TrackHistoryEntry[]>
	) {
		if (!this.isReady) return;

		this.meetsZoomThreshold = map.getZoom() >= this.config.minZoom;
		this.dataManager.update(map, tracks, histories, this.config.visible);
	}

	/**
	 * Render the history visuals using the provided view-projection matrix.
	 *
	 * @param viewProjection - The combined view-projection matrix as a Float32Array.
	 */
	public render(viewProjection: Float32Array) {
		if (!this.isReady || !this.config.visible || !this.meetsZoomThreshold) {
			return;
		}

		this.renderLines(viewProjection);
	}

	/**
	 * Render history lines using the provided view-projection matrix.
	 *
	 * @param viewProjection - The combined view-projection matrix as a Float32Array.
	 */
	private renderLines(viewProjection: Float32Array) {
		const gl = this.gl;
		const vertexCount = this.dataManager.getLineVertexCount();
		if (!this.lineProgram || !this.lineVAO || vertexCount === 0) return;

		gl.useProgram(this.lineProgram);
		gl.uniformMatrix4fv(
			gl.getUniformLocation(this.lineProgram, "u_viewProjection"),
			false,
			viewProjection
		);
		gl.uniform3fv(
			gl.getUniformLocation(this.lineProgram, "u_color"),
			this.config.color
		);
		gl.uniform1f(
			gl.getUniformLocation(this.lineProgram, "u_dashSize"),
			this.config.dashSize
		);
		gl.uniform1f(
			gl.getUniformLocation(this.lineProgram, "u_gapSize"),
			this.config.gapSize
		);

		gl.bindVertexArray(this.lineVAO);
		gl.lineWidth(this.config.lineWidth);
		gl.drawArrays(gl.LINES, 0, vertexCount);
		gl.bindVertexArray(null);
	}

	/**
	 * Create and compile a WebGL shader from source and throw on error.
	 *
	 * @param type - Shader type (e.g. gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
	 * @param source - The GLSL source code for the shader.
	 * @returns The compiled WebGLShader.
	 * @throws Error if shader creation or compilation fails.
	 */
	private createShader(type: number, source: string): WebGLShader {
		const gl = this.gl;
		const shader = gl.createShader(type);
		if (!shader) throw new Error("Failed to create shader");

		gl.shaderSource(shader, source);
		gl.compileShader(shader);

		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			const info = gl.getShaderInfoLog(shader);
			console.error("Shader compile error:", info);
			throw new Error(`Shader compile error: ${info ?? "Unknown error"}`);
		}

		return shader;
	}

	/**
	 * Dispose of WebGL resources and internal data manager, and mark the renderer as not ready.
	 *
	 * This frees shader programs, buffers and vertex array objects created by this renderer,
	 * calls dispose on the underlying HistoryDataManager and sets the isReady flag to false.
	 */
	public dispose() {
		const gl = this.gl;

		if (this.lineProgram) {
			gl.deleteProgram(this.lineProgram);
			this.lineProgram = null;
		}
		if (this.lineVAO) {
			gl.deleteVertexArray(this.lineVAO);
			this.lineVAO = null;
		}

		this.dataManager.dispose();
		this.isReady = false;
	}
}
