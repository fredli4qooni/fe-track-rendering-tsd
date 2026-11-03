/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import * as maptalks from "maptalks";
import type { RaycastCandidate } from "@common/raycast/Raycaster";

import ownshipFrag from "./shaders/ownship.frag";
import lineFrag from "./shaders/ownship.line.frag";
import lineVert from "./shaders/ownship.line.vert";
import ownshipVert from "./shaders/ownship.vert";

const OFFSCREEN_SENTINEL = -10000;

export type OwnShipState = {
	position: [number, number];
	speed: number;
	heading: number;
};

export type OwnShipConfig = {
	size: number;
	lineLength: number;
	iconUrl: string;
	iconOpacity: number;
	lineColor: [number, number, number, number];
};

/**
 * Renderer responsible for drawing the own-ship icon and course line using WebGL.
 */
export class OwnShipRenderer {
	private readonly gl: WebGL2RenderingContext;
	private iconProgram: WebGLProgram | null = null;
	private lineProgram: WebGLProgram | null = null;
	private iconVAO: WebGLVertexArrayObject | null = null;
	private iconBuffer: WebGLBuffer | null = null;
	private lineVAO: WebGLVertexArrayObject | null = null;
	private lineBuffer: WebGLBuffer | null = null;
	private iconTexture: WebGLTexture | null = null;

	private size: number;
	private lineLength: number;
	private iconUrl: string;
	private iconOpacity: number;
	private lineColor: [number, number, number, number];
	private state: OwnShipState | null = null;
	private centerX = OFFSCREEN_SENTINEL;
	private centerY = OFFSCREEN_SENTINEL;
	private endX = OFFSCREEN_SENTINEL;
	private endY = OFFSCREEN_SENTINEL;
	private visible = false;
	private coordinateScratch = new maptalks.Coordinate(0, 0);

	/**
	 * Create a new OwnShipRenderer.
	 * @param gl - WebGL2 rendering context
	 * @param config - Rendering configuration (must provide size, lineLength, iconUrl, iconOpacity, lineColor)
	 */
	constructor(gl: WebGL2RenderingContext, config: OwnShipConfig) {
		this.gl = gl;
		this.size = config.size;
		this.lineLength = config.lineLength;
		this.iconUrl = config.iconUrl;
		this.iconOpacity = config.iconOpacity;
		this.lineColor = config.lineColor;
	}

	/**
	 * Initialize GL programs, buffers and VAOs used by the renderer.
	 */
	init() {
		const gl = this.gl;
		const iv = this.createShader(gl, gl.VERTEX_SHADER, ownshipVert);
		const ifr = this.createShader(gl, gl.FRAGMENT_SHADER, ownshipFrag);
		this.iconProgram = gl.createProgram();
		if (this.iconProgram) {
			gl.attachShader(this.iconProgram, iv);
			gl.attachShader(this.iconProgram, ifr);
			gl.linkProgram(this.iconProgram);
		}

		this.iconVAO = gl.createVertexArray();
		this.iconBuffer = gl.createBuffer();
		const quad = new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]);
		if (this.iconVAO && this.iconBuffer) {
			gl.bindVertexArray(this.iconVAO);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.iconBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.bindVertexArray(null);
		}

		const lv = this.createShader(gl, gl.VERTEX_SHADER, lineVert);
		const lfr = this.createShader(gl, gl.FRAGMENT_SHADER, lineFrag);
		this.lineProgram = gl.createProgram();
		if (this.lineProgram) {
			gl.attachShader(this.lineProgram, lv);
			gl.attachShader(this.lineProgram, lfr);
			gl.linkProgram(this.lineProgram);
		}

		this.lineVAO = gl.createVertexArray();
		this.lineBuffer = gl.createBuffer();
		if (this.lineVAO && this.lineBuffer) {
			gl.bindVertexArray(this.lineVAO);
			gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
			gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(4), gl.DYNAMIC_DRAW);
			gl.enableVertexAttribArray(0);
			gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
			gl.bindVertexArray(null);
		}
	}

	/**
	 * Load image assets (icon texture) required by the renderer.
	 */
	async loadAssets(): Promise<void> {
		const gl = this.gl;
		const img = await new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.src = this.iconUrl;
			image.onload = () => resolve(image);
			image.onerror = reject;
		});

		const texture = gl.createTexture();
		if (!texture) throw new Error("Failed to create texture");
		this.iconTexture = texture;
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
		gl.generateMipmap(gl.TEXTURE_2D);
		gl.texParameteri(
			gl.TEXTURE_2D,
			gl.TEXTURE_MIN_FILTER,
			gl.LINEAR_MIPMAP_LINEAR
		);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	}

	/**
	 * Set the own-ship state to be rendered.
	 * @param state - OwnShip state or null to clear
	 */
	setOwnShip(state: OwnShipState | null) {
		this.state = state;
	}

	/**
	 * Update screen-space coordinates and dynamic buffers from the given map.
	 * @param map - maptalks map used to project coordinates
	 */
	update(map: maptalks.Map) {
		if (!this.state) {
			this.centerX = OFFSCREEN_SENTINEL;
			this.centerY = OFFSCREEN_SENTINEL;
			this.endX = OFFSCREEN_SENTINEL;
			this.endY = OFFSCREEN_SENTINEL;
			this.visible = false;
			return;
		}

		const lon = this.state.position[0];
		const lat = this.state.position[1];
		this.coordinateScratch.x = lon;
		this.coordinateScratch.y = lat;
		const center = map.coordinateToContainerPoint(this.coordinateScratch);
		this.centerX = center.x;
		this.centerY = center.y;

		const rad = (this.state.heading * Math.PI) / 180;
		const endLat = lat + this.lineLength * Math.cos(rad);
		const endLon = lon + this.lineLength * Math.sin(rad);
		this.coordinateScratch.x = endLon;
		this.coordinateScratch.y = endLat;
		const endPt = map.coordinateToContainerPoint(this.coordinateScratch);
		this.endX = endPt.x;
		this.endY = endPt.y;

		const size = this.size;
		const viewport = map.getSize();
		const viewportWidth = viewport?.width ?? 0;
		const viewportHeight = viewport?.height ?? 0;
		const half = size * 0.5;
		this.visible =
			this.centerX + half >= 0 &&
			this.centerX - half <= viewportWidth &&
			this.centerY + half >= 0 &&
			this.centerY - half <= viewportHeight;

		if (this.lineBuffer) {
			const gl = this.gl;
			gl.bindBuffer(gl.ARRAY_BUFFER, this.lineBuffer);
			gl.bufferSubData(
				gl.ARRAY_BUFFER,
				0,
				new Float32Array([this.centerX, this.centerY, this.endX, this.endY])
			);
		}
	}

	/**
	 * Return raycast candidates for the own-ship (empty if not visible).
	 * @returns Array of RaycastCandidate for the own-ship or empty array.
	 */
	getCandidates(): RaycastCandidate[] {
		if (!this.visible) return [];
		return [
			{
				id: -1,
				index: 0,
				x: this.centerX,
				y: this.centerY,
				size: this.size
			}
		];
	}

	/**
	 * Render the own-ship icon and course line onto the current GL context.
	 * @param viewProjection - Combined view-projection matrix (map pixel-space -> clip)
	 * @param viewportSize - Object describing viewport width/height in pixels
	 * @param viewportSize.width - Viewport width in pixels
	 * @param viewportSize.height - Viewport height in pixels
	 * @param hovered - Whether the own-ship is hovered (controls hover visual)
	 */
	render(
		viewProjection: Float32Array,
		viewportSize: { width: number; height: number },
		hovered: boolean
	) {
		if (!this.visible) return;
		const gl = this.gl;

		// Draw line
		if (this.lineProgram && this.lineVAO) {
			gl.useProgram(this.lineProgram);
			const loc = gl.getUniformLocation(this.lineProgram, "u_viewProjection");
			if (loc) gl.uniformMatrix4fv(loc, false, viewProjection);
			const colorLoc = gl.getUniformLocation(this.lineProgram, "u_color");
			if (colorLoc)
				gl.uniform4f(
					colorLoc,
					this.lineColor[0],
					this.lineColor[1],
					this.lineColor[2],
					this.lineColor[3]
				);
			gl.bindVertexArray(this.lineVAO);
			gl.lineWidth(2.0);
			gl.disable(gl.DEPTH_TEST);
			gl.drawArrays(gl.LINES, 0, 2);
			gl.bindVertexArray(null);
		}

		if (!this.iconProgram || !this.iconVAO || !this.iconTexture) return;
		gl.useProgram(this.iconProgram);
		const centerLoc = gl.getUniformLocation(this.iconProgram, "u_center");
		const sizeLoc = gl.getUniformLocation(this.iconProgram, "u_size");
		const vpLoc = gl.getUniformLocation(this.iconProgram, "u_viewProjection");
		const texLoc = gl.getUniformLocation(this.iconProgram, "u_texture");
		const opacLoc = gl.getUniformLocation(this.iconProgram, "u_opacity");
		if (vpLoc) gl.uniformMatrix4fv(vpLoc, false, viewProjection);
		if (centerLoc) gl.uniform2f(centerLoc, this.centerX, this.centerY);
		const s = hovered ? this.size * 1.15 : this.size;
		if (sizeLoc) gl.uniform1f(sizeLoc, s);
		if (opacLoc) gl.uniform1f(opacLoc, this.iconOpacity);
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, this.iconTexture);
		if (texLoc) gl.uniform1i(texLoc, 0);
		gl.bindVertexArray(this.iconVAO);
		gl.disable(gl.DEPTH_TEST);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindVertexArray(null);
	}

	/**
	 * Dispose of any allocated GL resources.
	 */
	dispose() {
		const gl = this.gl;
		if (this.iconBuffer) gl.deleteBuffer(this.iconBuffer);
		if (this.lineBuffer) gl.deleteBuffer(this.lineBuffer);
		if (this.iconVAO) gl.deleteVertexArray(this.iconVAO);
		if (this.lineVAO) gl.deleteVertexArray(this.lineVAO);
		if (this.iconProgram) gl.deleteProgram(this.iconProgram);
		if (this.lineProgram) gl.deleteProgram(this.lineProgram);
		if (this.iconTexture) gl.deleteTexture(this.iconTexture);
	}

	/**
	 * Compile a shader and throw if compilation fails.
	 * @param gl - WebGL2Rendering context
	 * @param type - Shader type (gl.VERTEX_SHADER or gl.FRAGMENT_SHADER)
	 * @param source - GLSL source code
	 * @returns Compiled WebGLShader
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
