/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { DataTexture } from "@utils/DataTexture";
import type { Track } from "@type/track.types";
import * as maptalks from "maptalks";

import type { RaycastCandidate } from "@common/raycast/Raycaster";

import { ICON_MAP, loadTextureArray } from "@utils/assetLoader";

import trackFrag from "../shaders/track.frag";
import trackVert from "../shaders/track.vert";
import { TrackInstanceManager } from "./TrackInstanceManager";

export type HighlightStrokeStyle = {
	color?: [number, number, number, number];
	type?: "solid" | "dash";
	dashLength?: number;
	dashGap?: number;
};

export type HighlightBoxStyle = {
	size?: number;
	borderRadius?: number;
	borderWidth?: number;
	hover?: HighlightStrokeStyle;
	selected?: HighlightStrokeStyle;
};

type ResolvedStrokeStyle = {
	color: Float32Array;
	type: number;
	dashLength: number;
	dashGap: number;
};

export type TrackStyleOptions = {
	defaultSize?: number;
	iconAtlas?: string[];
	sizeResolver?: (track: Track) => number;
	iconResolver?: (track: Track, iconCount: number) => number;
	colorResolver?: (track: Track) => [number, number, number, number];
	hoverOverlayIconIndex?: number;
	selectedOverlayIconIndex?: number;
	gridCellSize?: number;
	highlightBoxStyle?: HighlightBoxStyle;
	/**
	 * Scale factor to convert track.altitude into world Z units.
	 * Defaults to a small value so that large altitudes do not explode the depth range.
	 */
	altitudeScale?: number;
	/**
	 * Multiplier applied to altitude (after scaling) to produce a screen-space offset, simulating perspective.
	 */
	altitudeScreenFactor?: number;
};

/**
 * Clamp a number to the inclusive range [min, max].
 * @param value - The value to clamp.
 * @param min - The lower bound.
 * @param max - The upper bound.
 * @returns The clamped value.
 */
const clamp = (value: number, min: number, max: number) =>
	Math.max(min, Math.min(max, value));

const DEFAULT_COLOR: [number, number, number, number] = [1, 0.8, 0, 1];

/**
 * Resolve a color tuple into a normalized Float32Array clamped to the [0,1] range.
 * @param color - Optional RGBA color array where each component is expected in the 0..1 range.
 * @returns A Float32Array [r, g, b, a] with each component clamped to [0,1].
 */
const resolveColor = (
	color?: [number, number, number, number]
): Float32Array => {
	const src = color ?? DEFAULT_COLOR;
	return new Float32Array([
		clamp(src[0], 0, 1),
		clamp(src[1], 0, 1),
		clamp(src[2], 0, 1),
		clamp(src[3] ?? 1, 0, 1)
	]);
};

/**
 * Resolve a HighlightStrokeStyle into a normalized ResolvedStrokeStyle used by the renderer.
 * - Clamps and converts the optional color to a Float32Array.
 * - Determines stroke numeric type (0 = solid, 1 = dash).
 * - Ensures minimum dash length/gap when dash style is used.
 * @param style Optional HighlightStrokeStyle
 * @returns ResolvedStrokeStyle with color, type, dashLength and dashGap
 */
const resolveStrokeStyle = (
	style?: HighlightStrokeStyle
): ResolvedStrokeStyle => {
	const strokeType = style?.type ?? (style?.dashLength ? "dash" : "solid");
	const isDash = strokeType === "dash";
	const dashLength = isDash ? Math.max(0.5, style?.dashLength ?? 3) : 0;
	const dashGap = isDash ? Math.max(0.5, style?.dashGap ?? dashLength) : 0;
	return {
		color: resolveColor(style?.color),
		type: isDash ? 1 : 0,
		dashLength,
		dashGap
	};
};

const DEG2RAD = Math.PI / 180;

/**
 * Get the effective device pixel ratio to use for rendering.
 * Returns the global devicePixelRatio if it is a finite number greater than 0,
 * otherwise returns 1.
 * @returns {number} device pixel ratio
 */
const getDevicePixelRatio = () => {
	const ratio = (globalThis as { devicePixelRatio?: number }).devicePixelRatio;
	if (typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0) {
		return ratio;
	}
	return 1;
};

export class TrackInstanceRenderer {
	private readonly gl: WebGL2RenderingContext;
	private readonly iconAtlas: string[];
	private readonly sizeResolver: (track: Track) => number;
	private readonly iconResolver: (track: Track, iconCount: number) => number;
	private readonly colorResolver: (
		track: Track
	) => [number, number, number, number];
	private readonly hoverOverlayIconIndex: number;
	private readonly selectedOverlayIconIndex: number;
	private readonly highlightBoxSize: number;
	private readonly highlightBorderRadius: number;
	private readonly highlightBorderWidth: number;
	private readonly hoverStroke: ResolvedStrokeStyle;
	private readonly selectedStroke: ResolvedStrokeStyle;

	// Scale to convert altitude value into world-space Z units used by the vertex shader.
	private readonly altitudeScale: number;
	// Multiplier to convert world-space altitude units into screen-space offset so altitude visibly affects Y.
	private readonly altitudeScreenFactor: number;

	private program: WebGLProgram | null = null;

	private instanceManager: TrackInstanceManager | null = null;
	private dataTexture: DataTexture | null = null;

	private textureBuffer: Float32Array | null = null;

	private textureArray: WebGLTexture | null = null;
	private readonly gridCellSize: number;
	private readonly grid = new Map<string, number[]>();
	private visited: Uint8Array | null = null;
	private readonly visitedIndices: number[] = [];
	private readonly candidateScratch: RaycastCandidate[] = [];

	private readonly coordinateScratch = new maptalks.Coordinate(0, 0);
	private readonly offscreenSentinel = -10000;

	/**
	 * Construct a TrackInstanceRenderer.
	 * @param gl - The WebGL2RenderingContext used to create shaders, buffers and textures.
	 * @param options - Optional rendering and style configuration for tracks.
	 */
	constructor(gl: WebGL2RenderingContext, options: TrackStyleOptions = {}) {
		this.gl = gl;
		this.iconAtlas = options.iconAtlas ?? ICON_MAP;

		const defaultSize = options.defaultSize ?? 32;
		this.sizeResolver = options.sizeResolver ?? (() => defaultSize);
		this.iconResolver = options.iconResolver ?? ((track) => track.type ?? 0);
		this.colorResolver = options.colorResolver ?? (() => [1, 1, 1, 1]);
		this.hoverOverlayIconIndex = options.hoverOverlayIconIndex ?? -1;
		this.selectedOverlayIconIndex = options.selectedOverlayIconIndex ?? -1;
		this.gridCellSize = Math.max(8, Math.round(options.gridCellSize ?? 128));
		const highlightStyle = options.highlightBoxStyle ?? {};
		this.highlightBoxSize = Math.max(1, highlightStyle.size ?? 40);
		this.highlightBorderRadius = Math.max(0, highlightStyle.borderRadius ?? 4);
		this.highlightBorderWidth = Math.max(0.5, highlightStyle.borderWidth ?? 2);
		this.hoverStroke = resolveStrokeStyle({
			type: "dash",
			...highlightStyle.hover
		});
		this.selectedStroke = resolveStrokeStyle({
			type: "solid",
			...highlightStyle.selected
		});

		this.altitudeScale = options.altitudeScale ?? 0.001;
		this.altitudeScreenFactor = options.altitudeScreenFactor ?? 6;
	}

	/**
	 * Initialize WebGL resources for the renderer: compile and link shaders, create the GL program,
	 * and allocate the instance manager and data texture. Call this once after construction and
	 * before using the renderer for updates or drawing.
	 */
	init() {
		const gl = this.gl;

		const vert = this.createShader(gl, gl.VERTEX_SHADER, trackVert);
		const frag = this.createShader(gl, gl.FRAGMENT_SHADER, trackFrag);
		this.program = gl.createProgram();
		if (this.program) {
			gl.attachShader(this.program, vert);
			gl.attachShader(this.program, frag);
			gl.linkProgram(this.program);
		}

		this.instanceManager = new TrackInstanceManager(gl, 0);
		this.dataTexture = new DataTexture(gl, 0, 4);
	}

	/**
	 * Asynchronously load the texture array for the configured icon atlas into this.textureArray.
	 * Any loading error is caught and logged; on failure this.textureArray will be set to null.
	 */
	async loadTextureArray() {
		const gl = this.gl;
		try {
			this.textureArray = await loadTextureArray(gl, this.iconAtlas);
		} catch (err) {
			console.error("Failed to load icon texture array", err);
			this.textureArray = null;
		}
	}

	/**
	 * Ensure capacity for the given number of instances by creating or resizing
	 * the TrackInstanceManager, DataTexture, texture buffer and visited array.
	 * This prepares GPU and CPU-side buffers to hold 'count' instances.
	 * @param count - Number of instances to allocate capacity for.
	 */
	ensureCapacity(count: number) {
		const gl = this.gl;
		if (!this.instanceManager) {
			this.instanceManager = new TrackInstanceManager(gl, count);
		} else if (this.instanceManager.getCount() !== count) {
			this.instanceManager.resize(count);
		}

		if (this.dataTexture) {
			this.dataTexture.resize(count);
		} else {
			this.dataTexture = new DataTexture(gl, count, 4);
		}

		this.textureBuffer = new Float32Array(count * 4);

		this.visited = new Uint8Array(Math.max(1, Math.floor(Math.max(1, count))));
		this.visitedIndices.length = 0;
	}

	/**
	 * Populate the GPU-side static instance buffer from an array of Track objects.
	 * Each track writes icon index, color (r,g,b,a), size and id into the instance staticData buffer.
	 * If the instance manager is not initialized this is a no-op.
	 * @param tracks Array of Track objects to populate into the static buffer
	 */
	populateStaticData(tracks: Track[]) {
		if (!this.instanceManager) return;
		const staticData = this.instanceManager.staticData;
		const maxIconIndex = Math.max(0, this.iconAtlas.length - 1);

		for (let i = 0; i < tracks.length; i++) {
			const offset = i * 7;
			const track = tracks[i];
			const iconIndex = clamp(
				this.iconResolver(track, this.iconAtlas.length),
				0,
				maxIconIndex
			);
			const [r, g, b, a] = this.colorResolver(track);
			staticData[offset] = iconIndex;
			staticData[offset + 1] = r;
			staticData[offset + 2] = g;
			staticData[offset + 3] = b;
			staticData[offset + 4] = a;
			staticData[offset + 5] = this.sizeResolver(track);
			staticData[offset + 6] = track.id;
		}

		this.instanceManager.uploadStaticBuffer();
	}

	/**
	 * Update per-instance dynamic buffers and the CPU-side data texture from the given tracks.
	 * Projects track coordinates to screen space, computes altitude-based offsets, snaps to device
	 * pixels, writes the dynamic attribute buffer and prepares the data texture used by the shader.
	 * @param map - The maptalks.Map used for coordinate projection.
	 * @param tracks - Array of Track objects to update dynamic state for.
	 */
	updateDynamicData(map: maptalks.Map, tracks: Track[]) {
		if (!this.instanceManager || !this.dataTexture || !this.textureBuffer)
			return;

		const attrData = this.instanceManager.dynamicData;
		const texData = this.textureBuffer;
		const staticData = this.instanceManager.staticData;
		const devicePixelRatio = getDevicePixelRatio();
		/**
		 * Snap a coordinate value to the device pixel grid using the current devicePixelRatio.
		 * @param value - The value in CSS pixels to snap.
		 * @returns The snapped value aligned to the device pixel grid.
		 */
		const snapToPixel = (value: number) =>
			Math.round(value * devicePixelRatio) / devicePixelRatio;

		const viewport = map.getSize();
		const viewportWidth = viewport?.width ?? 0;
		const viewportHeight = viewport?.height ?? 0;

		for (let i = 0; i < tracks.length; i++) {
			const track = tracks[i];

			const attrOffset = i * 3;
			const texOffset = i * 4;

			const lon = track.lon;
			const lat = track.lat;

			this.coordinateScratch.x = lon;
			this.coordinateScratch.y = lat;
			const point = map.coordinateToContainerPoint(this.coordinateScratch);

			const altitude = track.altitude ?? 0;
			const z = altitude * this.altitudeScale;
			const altitudeOffset = z * this.altitudeScreenFactor;
			const screenX = snapToPixel(point.x);
			const screenY = snapToPixel(point.y - altitudeOffset);

			const iconSize = staticData[i * 7 + 5] ?? 32;
			const isVisible = this.isIconWithinViewport(
				screenX,
				screenY,
				iconSize,
				viewportWidth,
				viewportHeight
			);

			if (isVisible) {
				attrData[attrOffset] = screenX;
				attrData[attrOffset + 1] = screenY;
				attrData[attrOffset + 2] = z;
			} else {
				attrData[attrOffset] = this.offscreenSentinel;
				attrData[attrOffset + 1] = this.offscreenSentinel;
				attrData[attrOffset + 2] = 0;
			}

			texData[texOffset] = screenX;
			texData[texOffset + 1] = screenY;
			texData[texOffset + 3] = isVisible ? 1 : 0;

			const courseRad = (track.course ?? 0) * DEG2RAD;
			texData[texOffset + 2] = courseRad;
		}

		this.resetInactiveInstances(attrData, texData, tracks.length);

		this.instanceManager.updateDynamicBuffer();
		this.dataTexture.update(texData);

		this.rebuildSpatialGrid(attrData);
	}

	/**
	 * Reset dynamic instance attributes and texture flags for all instances starting at startIndex.
	 * This moves instances offscreen by writing the offscreen sentinel into the dynamic attribute buffer
	 * and clears the visibility flag in the texture buffer so shaders will treat them as inactive.
	 * @param attrData - The dynamic attribute buffer (x, y, z) for each instance.
	 * @param texData - The CPU-side texture buffer (x, y, course, visible) for each instance.
	 * @param startIndex - The first instance index to reset (inclusive).
	 */
	private resetInactiveInstances(
		attrData: Float32Array,
		texData: Float32Array,
		startIndex: number
	) {
		if (!this.instanceManager) return;
		const totalCapacity = this.instanceManager.getCount();
		for (let i = startIndex; i < totalCapacity; i++) {
			const attrOffset = i * 3;
			attrData[attrOffset] = this.offscreenSentinel;
			attrData[attrOffset + 1] = this.offscreenSentinel;
			attrData[attrOffset + 2] = 0;

			texData[i * 4 + 3] = 0;
		}
	}

	/**
	 * Rebuild the spatial grid that maps grid-cell keys to arrays of instance indices for visible instances.
	 * This iterates over the dynamic attribute buffer entries, skips offscreen or invalid coordinates,
	 * computes the bounding box for each visible instance based on its size, and inserts the instance index
	 * into every grid cell covered by that bounding box.
	 * @param attrData - Float32Array containing per-instance dynamic attributes [x, y, z] for each instance.
	 */
	private rebuildSpatialGrid(attrData: Float32Array) {
		if (!this.instanceManager) return;
		this.grid.clear();
		const count = this.instanceManager.getCount();
		const stat = this.instanceManager.staticData;

		for (let i = 0; i < count; i++) {
			const base = i * 3;
			const x = attrData[base];
			const y = attrData[base + 1];

			if (
				!Number.isFinite(x) ||
				!Number.isFinite(y) ||
				x === this.offscreenSentinel
			)
				continue;

			const size = stat[i * 7 + 5] ?? 32;
			const half = size * 0.5;
			const minX = x - half;
			const minY = y - half;
			const maxX = x + half;
			const maxY = y + half;
			const cxMin = Math.floor(minX / this.gridCellSize);
			const cyMin = Math.floor(minY / this.gridCellSize);
			const cxMax = Math.floor(maxX / this.gridCellSize);
			const cyMax = Math.floor(maxY / this.gridCellSize);
			for (let cx = cxMin; cx <= cxMax; cx++) {
				for (let cy = cyMin; cy <= cyMax; cy++) {
					const key = `${cx}_${cy}`;
					const arr = this.grid.get(key) ?? [];
					arr.push(i);
					this.grid.set(key, arr);
				}
			}
		}
	}

	/**
	 * Determine whether an icon centered at (centerX, centerY) with the given size
	 * intersects the viewport defined by viewportWidth and viewportHeight.
	 * @param centerX - X coordinate of the icon center in screen/container pixels.
	 * @param centerY - Y coordinate of the icon center in screen/container pixels.
	 * @param size - Width/height of the icon in pixels (assumed square).
	 * @param viewportWidth - Width of the viewport/container in pixels.
	 * @param viewportHeight - Height of the viewport/container in pixels.
	 * @returns True if any part of the icon is within the viewport, otherwise false.
	 */
	private isIconWithinViewport(
		centerX: number,
		centerY: number,
		size: number,
		viewportWidth: number,
		viewportHeight: number
	) {
		if (size <= 0 || viewportWidth <= 0 || viewportHeight <= 0) return false;
		const half = size * 0.5;
		const left = centerX - half;
		const right = centerX + half;
		const top = centerY - half;
		const bottom = centerY + half;

		return (
			right >= 0 &&
			left <= viewportWidth &&
			bottom >= 0 &&
			top <= viewportHeight
		);
	}

	/**
	 * Render all instances to the current WebGL context using the supplied view-projection matrix
	 * and viewport size, applying highlight state for the given selected and hovered track IDs.
	 *
	 * @param viewProjection - A 4x4 view-projection matrix provided as a Float32Array.
	 * @param viewportSize - Object containing viewport width and height in pixels.
	 * @param viewportSize.width - Width of the viewport in pixels.
	 * @param viewportSize.height - Height of the viewport in pixels.
	 * @param selectedId - Numeric ID of the currently selected track (or -1 if none).
	 * @param hoveredId - Numeric ID of the currently hovered track (or -1 if none).
	 */
	render(
		viewProjection: Float32Array,
		viewportSize: { width: number; height: number },
		selectedId: number,
		hoveredId: number
	) {
		const gl = this.gl;
		if (!this.program || !this.instanceManager || !this.textureArray) return;
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		gl.useProgram(this.program);
		gl.uniformMatrix4fv(
			gl.getUniformLocation(this.program, "u_viewProjection"),
			false,
			viewProjection
		);
		gl.uniform2f(
			gl.getUniformLocation(this.program, "u_viewportSize"),
			viewportSize.width,
			viewportSize.height
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_selectedID"),
			selectedId
		);
		gl.uniform1f(gl.getUniformLocation(this.program, "u_hoveredID"), hoveredId);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_hoverOverlayIconID"),
			this.hoverOverlayIconIndex
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_selectedOverlayIconID"),
			this.selectedOverlayIconIndex
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_highlightBoxSize"),
			this.highlightBoxSize
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_highlightBorderRadius"),
			this.highlightBorderRadius
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_highlightBorderWidth"),
			this.highlightBorderWidth
		);
		gl.uniform4fv(
			gl.getUniformLocation(this.program, "u_highlightColorHover"),
			this.hoverStroke.color
		);
		gl.uniform4fv(
			gl.getUniformLocation(this.program, "u_highlightColorSelected"),
			this.selectedStroke.color
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_hoverStrokeType"),
			this.hoverStroke.type
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_selectedStrokeType"),
			this.selectedStroke.type
		);
		gl.uniform2f(
			gl.getUniformLocation(this.program, "u_hoverDashParams"),
			this.hoverStroke.dashLength,
			this.hoverStroke.dashGap
		);
		gl.uniform2f(
			gl.getUniformLocation(this.program, "u_selectedDashParams"),
			this.selectedStroke.dashLength,
			this.selectedStroke.dashGap
		);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.textureArray);
		gl.uniform1i(gl.getUniformLocation(this.program, "u_textureArray"), 0);

		gl.disable(gl.POLYGON_OFFSET_FILL);
		const count = this.instanceManager.getCount();
		this.instanceManager.bindAttributes();
		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
	}

	/**
	 * Return the DataTexture containing per-instance texture data used by the shader.
	 * @returns {DataTexture | null} The DataTexture if initialized, otherwise null.
	 */
	getDataTexture(): DataTexture | null {
		return this.dataTexture;
	}

	/**
	 * Get the current number of instances managed by the renderer.
	 * @returns {number} The instance count, or 0 if the instance manager is not initialized.
	 */
	getCount(): number {
		return this.instanceManager ? this.instanceManager.getCount() : 0;
	}

	/**
	 * Get the CPU-side texture buffer containing per-instance screen-space data (x, y, course, visible).
	 * @returns {Float32Array | null} The texture buffer used for the data texture, or null if uninitialized.
	 */
	public getScreenDataBuffer() {
		return this.textureBuffer;
	}

	/**
	 * Get bounding boxes for all managed instances used for raycasting and hit-testing.
	 * Returns an array of RaycastCandidate objects containing id, index, screen-space x/y and size.
	 * Offscreen instances (marked by the offscreen sentinel) are omitted.
	 * @returns {RaycastCandidate[]} Array of raycast candidates for the currently managed instances.
	 */
	public getInstanceBoundingBoxes(): RaycastCandidate[] {
		if (!this.instanceManager) return [];
		const data = this.instanceManager.dynamicData;
		const stat = this.instanceManager.staticData;
		const count = this.instanceManager.getCount();

		const result: RaycastCandidate[] = [];
		for (let i = 0; i < count; i++) {
			const dx = data[i * 2];
			const dy = data[i * 2 + 1];

			if (dx === this.offscreenSentinel) continue;

			const size = stat[i * 7 + 5];
			const id = stat[i * 7 + 6];

			result.push({ id: Math.trunc(id), index: i, x: dx, y: dy, size: size });
		}
		return result;
	}

	/**
	 * Get candidate raycast targets near the provided screen coordinates.
	 * Returns an array of RaycastCandidate for instances whose bounding boxes overlap
	 * the grid cells surrounding the given point (including adjacent cells). If the
	 * instance manager is not initialized or the coordinates are not finite, an empty
	 * array is returned.
	 *
	 * @param px - X coordinate in screen/container pixels.
	 * @param py - Y coordinate in screen/container pixels.
	 * @returns Array of RaycastCandidate objects near the given point.
	 */
	public getCandidatesAt(px: number, py: number): RaycastCandidate[] {
		if (!this.instanceManager) return [];
		if (!Number.isFinite(px) || !Number.isFinite(py)) return [];
		const cellX = Math.floor(px / this.gridCellSize);
		const cellY = Math.floor(py / this.gridCellSize);
		this.candidateScratch.length = 0;
		const visited = this.visited;
		if (!visited) return [];
		this.visitedIndices.length = 0;
		const stat = this.instanceManager.staticData;
		const data = this.instanceManager.dynamicData;

		for (let cx = cellX - 1; cx <= cellX + 1; cx++) {
			for (let cy = cellY - 1; cy <= cellY + 1; cy++) {
				const key = `${cx}_${cy}`;
				const bucket = this.grid.get(key);
				if (!bucket) continue;
				this._collectBucketCandidates(bucket, data, stat, visited);
			}
		}

		for (const idx of this.visitedIndices) visited[idx] = 0;
		this.visitedIndices.length = 0;
		return this.candidateScratch;
	}

	/**
	 * Collect candidates from a spatial grid bucket into the raycast candidate scratch array.
	 *
	 * This method iterates over the provided bucket of instance indices, uses the visited
	 * array to avoid duplicates, and pushes RaycastCandidate-like objects (id, index, x, y, size)
	 * into this.candidateScratch for later hit-testing.
	 *
	 * @param bucket - Array of instance indices contained in a spatial grid cell.
	 * @param data - Dynamic per-instance data buffer (x, y, z) used to read screen-space coords.
	 * @param stat - Static per-instance data buffer used to read size and id.
	 * @param visited - Uint8Array used as a visitation bitset to prevent duplicate candidates.
	 */
	private _collectBucketCandidates(
		bucket: number[],
		data: Float32Array,
		stat: Float32Array,
		visited: Uint8Array
	) {
		for (const idx of bucket) {
			if (visited[idx]) continue;
			visited[idx] = 1;
			this.visitedIndices.push(idx);

			const base = idx * 3;
			const x = data[base];
			const y = data[base + 1];

			const size = stat[idx * 7 + 5];
			const id = stat[idx * 7 + 6];
			this.candidateScratch.push({
				id: Math.trunc(id),
				index: idx,
				x,
				y,
				size
			});
		}
	}

	/**
	 * Create, compile and validate a WebGL shader from the provided GLSL source.
	 *
	 * @param gl - The WebGL2RenderingContext used to create and compile the shader.
	 * @param type - The shader type (e.g. gl.VERTEX_SHADER or gl.FRAGMENT_SHADER).
	 * @param source - GLSL source code for the shader.
	 * @returns The compiled WebGLShader.
	 * @throws Will throw an Error if shader creation or compilation fails.
	 */
	private createShader(
		gl: WebGL2RenderingContext,
		type: number,
		source: string
	) {
		const shader = gl.createShader(type);
		if (!shader) throw new Error("Failed to create shader");
		gl.shaderSource(shader, source);
		gl.compileShader(shader);
		if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
			console.error(gl.getShaderInfoLog(shader));
			throw new Error("Shader Error");
		}
		return shader;
	}
}
