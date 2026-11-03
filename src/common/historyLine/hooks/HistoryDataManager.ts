/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import type { TrackHistoryEntry } from "@type/history.types";
import type { Track } from "@type/track.types";
import * as maptalks from "maptalks";

import type { TrackVisibilityMap } from "../HistoryLineRenderer";

type TrackGeometryCache = {
	effectiveLength: number;
	lastHistoryTs: number;
	lastTrackLon: number;
	lastTrackLat: number;
	lastCameraRevision: number;
};

type SegmentWindow = {
	startIndex: number;
	effectiveLength: number;
	segmentCount: number;
};

type Vec2 = {
	x: number;
	y: number;
};

const MIN_VERTEX_CAPACITY = 256;

export class HistoryDataManager {
	private readonly gl: WebGL2RenderingContext;
	private readonly maxPointsPerTrack: number;
	private readonly segmentsPerTrack: number;

	private readonly trackVisibility: TrackVisibilityMap = new Map();
	private readonly coordScratch = new maptalks.Coordinate(0, 0);

	private readonly trackIndexMap: Map<number, number> = new Map();
	private readonly cachedTrackState: Map<number, TrackGeometryCache> =
		new Map();

	private linePositionBuffer: WebGLBuffer | null = null;
	private lineDistanceBuffer: WebGLBuffer | null = null;

	private linePositions = new Float32Array(0);
	private lineDistances = new Float32Array(0);

	private lineVertexCount = 0;

	private linePositionCapacity = 0;
	private lineDistanceCapacity = 0;

	private needsPositionUpload = false;
	private needsDistanceUpload = false;
	private forceFullUpload = false;
	private freezeProjectionForMove = false;
	private cameraRevision = 0;
	private lastCameraStateKey: string | null = null;
	private lastCameraSignature = {
		zoom: Number.NaN,
		bearing: Number.NaN,
		pitch: Number.NaN
	};
	private lastMapSizeKey: string | null = null;
	private lastMapTransformRevision = 0;

	/**
	 * Create a HistoryDataManager responsible for maintaining pooled buffers for history geometry.
	 *
	 * @param gl - WebGL2 rendering context used to create buffers.
	 * @param maxPointsPerTrack - Maximum number of history points (including the live track point).
	 */
	constructor(gl: WebGL2RenderingContext, maxPointsPerTrack: number) {
		this.gl = gl;
		this.maxPointsPerTrack = Math.max(1, maxPointsPerTrack);
		this.segmentsPerTrack = Math.max(0, this.maxPointsPerTrack - 1);
		this.initBuffers();
	}

	/**
	 * Initialize GPU buffers used for pooled line and circle geometry.
	 */
	private initBuffers() {
		this.linePositionBuffer = this.gl.createBuffer();
		this.lineDistanceBuffer = this.gl.createBuffer();
	}

	/**
	 * Store a per-track visibility override mapped by identifier.
	 *
	 * @param trackId - Identifier of the track to override.
	 * @param visible - Whether the track should be rendered.
	 */
	public setTrackVisibility(trackId: number, visible: boolean) {
		this.trackVisibility.set(trackId, visible);
	}

	/**
	 * Clear all per-track visibility overrides.
	 */
	public clearTrackVisibility(): void {
		this.trackVisibility.clear();
	}

	/**
	 * Determine whether a track is visible, respecting overrides.
	 *
	 * @param trackId - Identifier of the track to test.
	 * @param globalVisible - Global fallback visibility flag.
	 * @returns True when the track should be processed.
	 */
	public isTrackVisible(trackId: number, globalVisible: boolean): boolean {
		return this.trackVisibility.get(trackId) ?? globalVisible;
	}

	/**
	 * Update pooled buffers based on the latest track and history snapshots.
	 *
	 * @param map - Active maptalks map for coordinate projection.
	 * @param tracks - Array of track descriptors with live positions.
	 * @param histories - Mapping of track id to history entries.
	 * @param globalVisible - Global visibility toggle for the layer.
	 */
	public update(
		map: maptalks.Map,
		tracks: Track[],
		histories: Record<number, TrackHistoryEntry[]>,
		globalVisible: boolean
	) {
		if (!this.freezeProjectionForMove) {
			this.cameraRevision = this.computeCameraRevision(map);
		}

		if (!map || !globalVisible || tracks.length === 0) {
			this.resetCounts();
			return;
		}

		const visibleTracks = this.getVisibleTracks(
			tracks,
			histories,
			globalVisible
		);
		if (visibleTracks.length === 0) {
			this.resetCounts();
			return;
		}

		visibleTracks.sort((a, b) => a.id - b.id);
		this.syncTrackIndices(visibleTracks);
		this.ensureCapacity(visibleTracks.length);

		let wroteLine = false;

		for (const track of visibleTracks) {
			const trackIndex = this.trackIndexMap.get(track.id);
			if (trackIndex === undefined) continue;
			const historyEntries = histories[track.id] ?? [];
			const window = this.computeSegmentWindow(historyEntries);
			const changed = this.trackChanged(track, historyEntries, window);
			if (changed) {
				this.writeHistoryForIndex(
					map,
					trackIndex,
					track,
					historyEntries,
					window
				);
				wroteLine = true;
			}
		}

		this.lineVertexCount = visibleTracks.length * this.segmentsPerTrack * 2;

		if (wroteLine) this.needsPositionUpload = this.needsDistanceUpload = true;

		this.uploadBuffers();
	}

	/**
	 * Freeze screen-space reprojection while the camera is moving.
	 *
	 * When freezing, we keep drawing the last projected buffers (so panning is cheap).
	 * On unfreeze, we force a full reprojection & buffer upload on the next update.
	 *
	 * @param freeze - True to freeze reprojection during interaction; false to resume and refresh.
	 */
	public setFreezeDuringMove(freeze: boolean) {
		if (this.freezeProjectionForMove === freeze) return;
		this.freezeProjectionForMove = freeze;
		if (!freeze) {
			this.cameraRevision++;
			this.forceFullUpload = true;
			this.needsPositionUpload = true;
			this.needsDistanceUpload = true;
		}
	}

	/**
	 * Reset vertex counts and upload flags when rendering is skipped.
	 */
	private resetCounts() {
		this.lineVertexCount = 0;
		this.cachedTrackState.clear();
		this.trackIndexMap.clear();
		this.needsPositionUpload = false;
		this.needsDistanceUpload = false;
		this.forceFullUpload = true;
	}

	/**
	 * Filter tracks that have history data and are visible.
	 *
	 * @param tracks - Candidate tracks.
	 * @param histories - Mapping of track histories.
	 * @param globalVisible - Global visibility toggle for the layer.
	 * @returns Filtered track collection.
	 */
	private getVisibleTracks(
		tracks: Track[],
		histories: Record<number, TrackHistoryEntry[]>,
		globalVisible: boolean
	): Track[] {
		const result: Track[] = [];
		for (const track of tracks) {
			const history = histories[track.id];
			if (!history || history.length === 0) continue;
			if (!this.isTrackVisible(track.id, globalVisible)) continue;
			result.push(track);
		}
		return result;
	}

	/**
	 * Maintain the stable track → index mapping and prune stale caches.
	 *
	 * @param tracks - Tracks included in the current frame.
	 */
	private syncTrackIndices(tracks: Track[]) {
		this.trackIndexMap.clear();
		const activeIds = new Set<number>();
		tracks.forEach((track, index) => {
			this.trackIndexMap.set(track.id, index);
			activeIds.add(track.id);
		});
		for (const key of this.cachedTrackState.keys()) {
			if (!activeIds.has(key)) {
				this.cachedTrackState.delete(key);
			}
		}
	}

	/**
	 * Ensure CPU and GPU buffers can hold the required pooled capacity.
	 *
	 * @param trackCount - Number of visible tracks.
	 */
	private ensureCapacity(trackCount: number) {
		const requiredSegments = trackCount * this.segmentsPerTrack;
		const requiredPositionFloats = requiredSegments * 6;
		const requiredDistanceFloats = requiredSegments * 2;
		// circles removed: no circle capacity to manage
		if (requiredPositionFloats > this.linePositionCapacity) {
			this.reallocatePositions(this.nextCapacity(requiredPositionFloats));
		}
		if (requiredDistanceFloats > this.lineDistanceCapacity) {
			this.reallocateDistances(this.nextCapacity(requiredDistanceFloats));
		}
	}

	/**
	 * Compute the next power-of-two capacity that satisfies the requirement.
	 *
	 * @param required - Minimum number of floats required.
	 * @returns Capacity rounded up to the next power of two.
	 */
	private nextCapacity(required: number): number {
		if (required <= 0) return 0;
		let capacity = MIN_VERTEX_CAPACITY;
		while (capacity < required) {
			capacity <<= 1;
		}
		return capacity;
	}

	/**
	 * Grow the pooled position array and corresponding GPU buffer.
	 *
	 * @param newCapacity - New float capacity for the position array.
	 */
	private reallocatePositions(newCapacity: number) {
		const next = new Float32Array(newCapacity);
		next.set(this.linePositions.subarray(0, this.lineVertexCount * 3));
		this.linePositions = next;
		this.linePositionCapacity = newCapacity;
		if (this.linePositionBuffer) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);
			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				this.linePositionCapacity * Float32Array.BYTES_PER_ELEMENT,
				this.gl.DYNAMIC_DRAW
			);
		}
		this.forceFullUpload = true;
	}

	/**
	 * Grow the pooled line-distance array and GPU buffer.
	 *
	 * @param newCapacity - New float capacity for the distance array.
	 */
	private reallocateDistances(newCapacity: number) {
		const next = new Float32Array(newCapacity);
		next.set(this.lineDistances.subarray(0, this.lineVertexCount));
		this.lineDistances = next;
		this.lineDistanceCapacity = newCapacity;
		if (this.lineDistanceBuffer) {
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineDistanceBuffer);
			this.gl.bufferData(
				this.gl.ARRAY_BUFFER,
				this.lineDistanceCapacity * Float32Array.BYTES_PER_ELEMENT,
				this.gl.DYNAMIC_DRAW
			);
		}
		this.forceFullUpload = true;
	}

	/**
	 * Compute the sliding window of history entries that should be rendered.
	 *
	 * @param entries - Track history entries.
	 * @returns Segment window metadata for the track.
	 */
	private computeSegmentWindow(entries: TrackHistoryEntry[]): SegmentWindow {
		const effectiveLength = Math.min(entries.length, this.segmentsPerTrack);
		const startIndex = Math.max(0, entries.length - effectiveLength);
		const pointCount = effectiveLength + 1;
		const segmentCount = Math.max(
			0,
			Math.min(this.segmentsPerTrack, pointCount - 1)
		);
		return { startIndex, effectiveLength, segmentCount };
	}

	/**
	 * Decide whether geometry needs to be rewritten for a given track slice.
	 *
	 * @param track - Live track data.
	 * @param entries - Track history entries.
	 * @param window - Segment window metadata.
	 * @returns True when the pooled slice must be rewritten.
	 */
	private trackChanged(
		track: Track,
		entries: TrackHistoryEntry[],
		window: SegmentWindow
	): boolean {
		const cached = this.cachedTrackState.get(track.id);
		const lastHistoryTs =
			entries.length > 0 ? entries[entries.length - 1].ts : 0;
		if (
			cached &&
			cached.effectiveLength === window.effectiveLength &&
			cached.lastHistoryTs === lastHistoryTs &&
			cached.lastTrackLon === track.lon &&
			cached.lastTrackLat === track.lat &&
			cached.lastCameraRevision === this.cameraRevision
		) {
			return this.forceFullUpload;
		}

		this.cachedTrackState.set(track.id, {
			effectiveLength: window.effectiveLength,
			lastHistoryTs,
			lastTrackLon: track.lon,
			lastTrackLat: track.lat,
			lastCameraRevision: this.cameraRevision
		});
		return true;
	}

	/**
	 * Produce a simple revision number that increments when camera/viewport transforms change.
	 *
	 * We only recompute this once per update() call and store it in `cameraRevision`.
	 *
	 * @param map - Active map instance.
	 * @returns A monotonically increasing revision integer.
	 */
	private computeCameraRevision(map: maptalks.Map): number {
		const size = map.getSize();
		const sizeKey = `${size?.width ?? 0}x${size?.height ?? 0}`;
		const center = map.getCenter();
		const cameraKey = `${center?.x ?? 0},${center?.y ?? 0}`;
		const zoom = map.getZoom();
		const bearing = map.getBearing();
		const pitch = map.getPitch();

		let changed = false;
		if (this.lastMapSizeKey !== sizeKey) {
			this.lastMapSizeKey = sizeKey;
			changed = true;
		}
		if (this.lastCameraStateKey !== cameraKey) {
			this.lastCameraStateKey = cameraKey;
			changed = true;
		}
		if (
			zoom !== this.lastCameraSignature.zoom ||
			bearing !== this.lastCameraSignature.bearing ||
			pitch !== this.lastCameraSignature.pitch
		) {
			this.lastCameraSignature = { zoom, bearing, pitch };
			changed = true;
		}

		if (changed) {
			this.lastMapTransformRevision++;
		}

		return this.lastMapTransformRevision;
	}

	/**
	 * Write the buffered line data for a track slice.
	 *
	 * @param map - Map used for projection.
	 * @param trackIndex - Stable index of the track slice.
	 * @param track - Live track data.
	 * @param entries - Track history entries.
	 * @param window - Segment window metadata.
	 */
	private writeHistoryForIndex(
		map: maptalks.Map,
		trackIndex: number,
		track: Track,
		entries: TrackHistoryEntry[],
		window: SegmentWindow
	) {
		const trackPoint = this.project(map, track.lon, track.lat);
		if (this.segmentsPerTrack === 0) {
			return;
		}

		const points: Vec2[] = [];
		for (let i = 0; i < window.effectiveLength; i++) {
			const entry = entries[window.startIndex + i];
			points.push(this.project(map, entry.lon, entry.lat));
		}
		points.push(trackPoint);

		const lastDistance = this.writeSegments(
			trackIndex,
			points,
			window.segmentCount
		);
		this.clearTailSegments(
			trackIndex,
			window.segmentCount,
			points[points.length - 1],
			lastDistance
		);
	}

	/**
	 * Populate pooled buffer slices with per-segment vertices and distances.
	 *
	 * @param trackIndex - Stable track index.
	 * @param points - Projected points for the history slice.
	 * @param segmentCount - Number of real segments contained in the slice.
	 * @returns Accumulated distance at the tail of the slice.
	 */
	private writeSegments(
		trackIndex: number,
		points: Vec2[],
		segmentCount: number
	): number {
		const baseSegment = trackIndex * this.segmentsPerTrack;
		let distance = 0;
		for (let i = 0; i < segmentCount; i++) {
			const segmentIndex = baseSegment + i;
			const vertexOffset = segmentIndex * 6;
			const distanceOffset = segmentIndex * 2;
			const a = points[i];
			const b = points[i + 1];
			const dx = b.x - a.x;
			const dy = b.y - a.y;
			const length = Math.hypot(dx, dy);
			const distanceStart = distance;
			distance += length;
			const distanceEnd = distance;

			this.linePositions[vertexOffset] = a.x;
			this.linePositions[vertexOffset + 1] = a.y;
			this.linePositions[vertexOffset + 2] = 0;
			this.linePositions[vertexOffset + 3] = b.x;
			this.linePositions[vertexOffset + 4] = b.y;
			this.linePositions[vertexOffset + 5] = 0;

			this.lineDistances[distanceOffset] = distanceStart;
			this.lineDistances[distanceOffset + 1] = distanceEnd;
		}
		return distance;
	}

	/**
	 * Hide unused capacity for a track by writing degenerate segments.
	 *
	 * @param trackIndex - Stable track index.
	 * @param segmentCount - Number of active segments in the slice.
	 * @param lastPoint - Point to reuse for degenerate segments.
	 * @param lastDistance - Distance to reuse for degenerate segments.
	 */
	private clearTailSegments(
		trackIndex: number,
		segmentCount: number,
		lastPoint: Vec2,
		lastDistance: number
	) {
		const baseSegment = trackIndex * this.segmentsPerTrack;
		for (let i = segmentCount; i < this.segmentsPerTrack; i++) {
			const segmentIndex = baseSegment + i;
			const vertexOffset = segmentIndex * 6;
			const distanceOffset = segmentIndex * 2;
			this.linePositions[vertexOffset] = lastPoint.x;
			this.linePositions[vertexOffset + 1] = lastPoint.y;
			this.linePositions[vertexOffset + 2] = 0;
			this.linePositions[vertexOffset + 3] = lastPoint.x;
			this.linePositions[vertexOffset + 4] = lastPoint.y;
			this.linePositions[vertexOffset + 5] = 0;
			this.lineDistances[distanceOffset] = lastDistance;
			this.lineDistances[distanceOffset + 1] = lastDistance;
		}
	}

	/**
	 * Convert geographic coordinates into container-space pixels.
	 *
	 * @param map - Active map instance.
	 * @param lon - Longitude in degrees.
	 * @param lat - Latitude in degrees.
	 * @returns Projected container coordinates.
	 */
	private project(map: maptalks.Map, lon: number, lat: number): Vec2 {
		this.coordScratch.x = lon;
		this.coordScratch.y = lat;
		const point = map.coordinateToContainerPoint(this.coordScratch);
		return { x: point.x, y: point.y };
	}

	/**
	 * Upload dirty CPU buffers into their GPU counterparts.
	 */
	private uploadBuffers() {
		if (this.lineVertexCount === 0) {
			this.needsPositionUpload = false;
			this.needsDistanceUpload = false;
		}

		if (
			this.linePositionBuffer &&
			this.needsPositionUpload &&
			this.lineVertexCount > 0
		) {
			const floatCount = this.lineVertexCount * 3;
			const view = this.linePositions.subarray(0, floatCount);
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.linePositionBuffer);
			this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, view);
		}
		if (
			this.lineDistanceBuffer &&
			this.needsDistanceUpload &&
			this.lineVertexCount > 0
		) {
			const floatCount = this.lineVertexCount;
			const view = this.lineDistances.subarray(0, floatCount);
			this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.lineDistanceBuffer);
			this.gl.bufferSubData(this.gl.ARRAY_BUFFER, 0, view);
		}

		this.needsPositionUpload = false;
		this.needsDistanceUpload = false;
		this.forceFullUpload = false;
	}

	/**
	 * Get the GPU buffer that stores pooled line positions.
	 *
	 * @returns WebGL buffer handle or null.
	 */
	public getLinePositionBuffer(): WebGLBuffer | null {
		return this.linePositionBuffer;
	}

	/**
	 * Get the GPU buffer that stores pooled line distances.
	 *
	 * @returns WebGL buffer handle or null.
	 */
	public getLineDistanceBuffer(): WebGLBuffer | null {
		return this.lineDistanceBuffer;
	}

	/**
	 * Total number of vertices currently queued for line rendering.
	 *
	 * @returns Vertex count for gl.drawArrays.
	 */
	public getLineVertexCount(): number {
		return this.lineVertexCount;
	}

	/**
	 * Expose the configured maximum number of history points per track.
	 *
	 * @returns Configured maximum point count per track.
	 */
	public getMaxPointsPerTrack(): number {
		return this.maxPointsPerTrack;
	}

	/**
	 * Dispose GPU buffers and release pooled CPU memory.
	 */
	public dispose(): void {
		if (this.linePositionBuffer) {
			this.gl.deleteBuffer(this.linePositionBuffer);
			this.linePositionBuffer = null;
		}
		if (this.lineDistanceBuffer) {
			this.gl.deleteBuffer(this.lineDistanceBuffer);
			this.lineDistanceBuffer = null;
		}
		this.linePositions = new Float32Array(0);
		this.lineDistances = new Float32Array(0);
		this.cachedTrackState.clear();
		this.trackIndexMap.clear();
	}
}
