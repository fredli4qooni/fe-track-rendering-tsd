/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { Track } from "@type/track.types";
import * as maptalks from "maptalks";

import type { RaycastCandidate } from "@common/raycast/Raycaster";

import {
	TrackInstanceRenderer,
	TrackStyleOptions
} from "./hooks/TrackInstanceRenderer";

export type TrackRendererOptions = TrackStyleOptions;

export class TrackRenderer {
	private readonly renderer: TrackInstanceRenderer;

	/**
	 * Create a new TrackRenderer.
	 *
	 * @param gl - The WebGL2 rendering context used for creating GL resources.
	 * @param options - Optional renderer style and configuration options.
	 */
	constructor(gl: WebGL2RenderingContext, options?: TrackRendererOptions) {
		this.renderer = new TrackInstanceRenderer(gl, options);
	}

	/**
	 * Initialize the underlying TrackInstanceRenderer and allocate any required GL resources.
	 */
	init(): void {
		this.renderer.init();
	}

	/**
	 * Load GPU assets required by the renderer, such as texture arrays.
	 *
	 * This method is asynchronous because loading textures may perform I/O or
	 * GPU work; callers should await it before attempting to render.
	 *
	 * @returns A promise that resolves when all assets have been loaded.
	 */
	async loadAssets(): Promise<void> {
		await this.renderer.loadTextureArray();
	}

	/**
	 * Ensure the renderer has capacity for the given number of instances.
	 *
	 * @param count - Number of instances to ensure capacity for.
	 */
	ensureCapacity(count: number): void {
		this.renderer.ensureCapacity(count);
	}

	/**
	 * Populate static per-track data (uploaded once or when tracks change) into
	 * GPU buffers used by the renderer.
	 *
	 * @param tracks - Array of Track objects to upload as static instance data.
	 */
	populateStaticData(tracks: Track[]) {
		this.renderer.populateStaticData(tracks);
	}

	/**
	 * Update dynamic per-frame instance data (e.g. positions/transforms) from the map and tracks.
	 *
	 * @param map - The maptalks.Map instance providing current view/projection and coordinate transforms.
	 * @param tracks - Array of Track objects to update dynamically each frame.
	 */
	updateDynamicData(map: maptalks.Map, tracks: Track[]) {
		this.renderer.updateDynamicData(map, tracks);
	}

	/**
	 * Render the tracks using the provided view-projection matrix and viewport size.
	 *
	 * @param viewProjection - A Float32Array containing the combined view and projection matrix.
	 * @param viewportSize - An object with width and height properties describing the viewport size in pixels.
	 * @param viewportSize.width - The width of the viewport in pixels.
	 * @param viewportSize.height - The height of the viewport in pixels.
	 * @param selectedId - The ID of the currently selected track, or -1 if none selected.
	 * @param hoveredId - The ID of the currently hovered track, or -1 if none hovered.
	 */
	render(
		viewProjection: Float32Array,
		viewportSize: { width: number; height: number },
		selectedId: number,
		hoveredId: number
	) {
		this.renderer.render(viewProjection, viewportSize, selectedId, hoveredId);
	}

	/**
	 * Get the data texture used by the renderer.
	 *
	 * This returns the underlying texture (if any) that the TrackInstanceRenderer
	 * exposes for instance data; callers should handle a null/undefined result.
	 *
	 * @returns The renderer's data texture or null/undefined if not available.
	 */
	getDataTexture() {
		return this.renderer.getDataTexture();
	}

	/**
	 * Get the number of instances currently managed by the renderer.
	 *
	 * @returns The count of instances.
	 */
	getCount(): number {
		return this.renderer.getCount();
	}

	/**
	 * Get the screen-space data buffer for all instances, or null if unavailable.
	 *
	 * This returns the Float32Array used internally for screen-space per-instance data,
	 * which can be used for CPU-side hit testing or debugging. The result may be null
	 * if the underlying renderer does not expose the buffer.
	 *
	 * @returns Float32Array | null when not available.
	 */
	getScreenDataBuffer(): Float32Array | null {
		return (
			(
				this.renderer as unknown as {
					getScreenDataBuffer?: () => Float32Array | null;
				}
			).getScreenDataBuffer?.() ?? null
		);
	}

	/**
	 * Get the bounding boxes for each instance for raycasting/collision tests.
	 *
	 * @returns Array of RaycastCandidate representing instance bounding boxes (empty if unavailable).
	 */
	getInstanceBoundingBoxes(): RaycastCandidate[] {
		return (
			(
				this.renderer as unknown as {
					getInstanceBoundingBoxes?: () => RaycastCandidate[];
				}
			).getInstanceBoundingBoxes?.() ?? []
		);
	}

	/**
	 * Get raycast candidates at the given screen coordinates (in pixels).
	 *
	 * This delegates to the underlying renderer's getCandidatesAt method, if
	 * available, and returns an empty array otherwise.
	 *
	 * @param px - X coordinate in pixels.
	 * @param py - Y coordinate in pixels.
	 * @returns Array of RaycastCandidate objects under the given pixel coordinates, or an empty array if unavailable.
	 */
	getCandidatesAt(px: number, py: number): RaycastCandidate[] {
		return (
			(
				this.renderer as unknown as {
					getCandidatesAt?: (px: number, py: number) => RaycastCandidate[];
				}
			).getCandidatesAt?.(px, py) ?? []
		);
	}
}
