import { BMFontJson } from "@type/font.types";
import type { Track } from "@type/track.types";

import { LabelBatcher, LabelBounds } from "./LabelBatcher";
import labelFrag from "./shaders/label.frag";
import labelVert from "./shaders/label.vert";

export interface LabelStyle {
	color: [number, number, number];
	selectedColor: [number, number, number];
	hoverColor: [number, number, number];
	fontSize: number;
	xOffset: number;
	yOffset: number;

	outlineColor: [number, number, number];
	outlineWidth: number;
}

const DEFAULT_STYLE: LabelStyle = {
	color: [1, 1, 1],
	selectedColor: [1, 0.8, 0],
	hoverColor: [1, 1, 1],
	fontSize: 15,
	xOffset: 33,
	yOffset: 0,

	outlineColor: [0, 0, 0],
	outlineWidth: 0.25
};

export class LabelRenderer {
	private readonly gl: WebGL2RenderingContext;
	private program: WebGLProgram | null = null;
	private batcher: LabelBatcher | null = null;
	private fontTexture: WebGLTexture | null = null;
	private labelBounds: LabelBounds[] = [];

	private isReady = false;
	private pendingRebuild = false;
	private readonly MAX_LABEL_CHARACTERS = 96;

	private style: LabelStyle;

	constructor(gl: WebGL2RenderingContext, options?: Partial<LabelStyle>) {
		this.gl = gl;
		this.style = { ...DEFAULT_STYLE, ...options };
		this.initProgram();
	}

	public setStyle(newStyle: Partial<LabelStyle>) {
		this.style = { ...this.style, ...newStyle };
		this.pendingRebuild = true;
	}

	private initProgram() {
		const gl = this.gl;
		const vert = this.createShader(gl.VERTEX_SHADER, labelVert);
		const frag = this.createShader(gl.FRAGMENT_SHADER, labelFrag);

		this.program = gl.createProgram()!;
		gl.attachShader(this.program, vert);
		gl.attachShader(this.program, frag);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error(
				"Label Program Link Error:",
				gl.getProgramInfoLog(this.program)
			);
		}
	}

	public setAssets(fontData: BMFontJson, fontTexture: WebGLTexture) {
		this.batcher = new LabelBatcher(this.gl, fontData);
		this.fontTexture = fontTexture;
		this.isReady = true;
		this.pendingRebuild = true;
		this.labelBounds = [];
	}

	public updateLabels(tracks: Track[]) {
		if (!this.isReady || !this.batcher) {
			this.pendingRebuild = true;
			return;
		}

		const batcher = this.batcher;
		batcher.begin();
		this.labelBounds = new Array<LabelBounds>(tracks.length);

		const { fontSize, xOffset, yOffset } = this.style;

		for (let i = 0; i < tracks.length; i++) {
			const track = tracks[i];
			const rawName = track.name ?? "";
			const hasCustomName = rawName.trim().length > 0;
			const baseLabel = hasCustomName ? rawName : `Track ${track.id}`;
			const sanitized = baseLabel.split("\r").join("");

			const truncated =
				sanitized.length > this.MAX_LABEL_CHARACTERS
					? `${sanitized.slice(0, this.MAX_LABEL_CHARACTERS - 1)}…`
					: sanitized;

			const bounds = batcher.addLabel(i, truncated, xOffset, yOffset, fontSize);
			this.labelBounds[i] = bounds;
		}

		batcher.end();
		this.pendingRebuild = false;
	}

	public getBoundsForIndex(index: number): LabelBounds | null {
		return this.labelBounds[index] ?? null;
	}

	public render(
		matrix: Float32Array,
		viewportWidth: number,
		viewportHeight: number,
		dataTexture: WebGLTexture,
		dataTextureSize: number,
		selectedID: number,
		hoveredID: number
	) {
		if (!this.isReady || !this.program || !this.batcher || !this.fontTexture)
			return;

		const gl = this.gl;
		const { color, selectedColor, hoverColor, outlineColor, outlineWidth } =
			this.style;

		gl.useProgram(this.program);

		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
		gl.enable(gl.POLYGON_OFFSET_FILL);
		gl.polygonOffset(-1, -1);

		gl.uniformMatrix4fv(
			gl.getUniformLocation(this.program, "u_viewProjection"),
			false,
			matrix
		);
		gl.uniform2f(
			gl.getUniformLocation(this.program, "u_viewportSize"),
			viewportWidth,
			viewportHeight
		);

		gl.uniform3f(
			gl.getUniformLocation(this.program, "u_color"),
			color[0],
			color[1],
			color[2]
		);
		gl.uniform3f(
			gl.getUniformLocation(this.program, "u_colorSelected"),
			selectedColor[0],
			selectedColor[1],
			selectedColor[2]
		);
		gl.uniform3f(
			gl.getUniformLocation(this.program, "u_colorHover"),
			hoverColor[0],
			hoverColor[1],
			hoverColor[2]
		);

		gl.uniform3f(
			gl.getUniformLocation(this.program, "u_outlineColor"),
			outlineColor[0],
			outlineColor[1],
			outlineColor[2]
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_outlineWidth"),
			outlineWidth
		);

		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_selectedID"),
			selectedID
		);
		gl.uniform1f(gl.getUniformLocation(this.program, "u_hoveredID"), hoveredID);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, dataTexture);
		gl.uniform1i(gl.getUniformLocation(this.program, "u_dataTexture"), 0);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_dataTextureSize"),
			dataTextureSize
		);

		gl.activeTexture(gl.TEXTURE1);
		gl.bindTexture(gl.TEXTURE_2D, this.fontTexture);
		gl.uniform1i(gl.getUniformLocation(this.program, "u_fontAtlas"), 1);

		this.batcher.render();

		gl.disable(gl.POLYGON_OFFSET_FILL);
	}

	private createShader(type: number, source: string): WebGLShader {
		const shader = this.gl.createShader(type)!;
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
		if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
			console.error("Shader Compile Error:", this.gl.getShaderInfoLog(shader));
			throw new Error("Label Shader Error");
		}
		return shader;
	}
}
