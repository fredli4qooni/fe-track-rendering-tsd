import { BMFontChar, BMFontJson } from "@type/font.types";

export type LabelBounds = {
	width: number;
	height: number;
	centerOffsetX: number;
	centerOffsetY: number;
};

export class LabelBatcher {
	private readonly gl: WebGL2RenderingContext;
	private readonly fontData: BMFontJson;
	private readonly defaultBounds = Object.freeze({
		minX: Number.POSITIVE_INFINITY,
		maxX: Number.NEGATIVE_INFINITY,
		minY: Number.POSITIVE_INFINITY,
		maxY: Number.NEGATIVE_INFINITY
	});

	private geometryBuffer: WebGLBuffer | null = null;
	private instanceBuffer: WebGLBuffer | null = null;

	private instanceData: Float32Array;
	private instanceCount: number = 0;
	private capacity = 1000000;

	private readonly STRIDE_FLOATS = 9;

	private readonly charMap: Map<string, BMFontChar>;

	constructor(gl: WebGL2RenderingContext, fontData: BMFontJson) {
		this.gl = gl;
		this.fontData = fontData;

		this.instanceData = new Float32Array(this.capacity * this.STRIDE_FLOATS);

		this.charMap = new Map<string, BMFontChar>();
		for (const c of fontData.chars) {
			this.charMap.set(String.fromCodePoint(c.id), c);
		}

		this.initBuffers();
	}

	private initBuffers() {
		const gl = this.gl;

		const quadVerts = new Float32Array([0, 1, 0, 0, 1, 1, 1, 0]);

		this.geometryBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

		this.instanceBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			this.instanceData.byteLength,
			gl.DYNAMIC_DRAW
		);
	}

	private ensureCapacity(needed: number) {
		if (needed <= this.capacity) return;

		let newCapacity = this.capacity * 2;
		if (newCapacity < needed) newCapacity = needed + 10000;

		console.log(
			`[LabelBatcher] Resizing buffer from ${this.capacity} to ${newCapacity} chars`
		);

		const oldData = this.instanceData;
		this.instanceData = new Float32Array(newCapacity * this.STRIDE_FLOATS);

		this.instanceData.set(oldData);

		this.capacity = newCapacity;

		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			this.instanceData.byteLength,
			gl.DYNAMIC_DRAW
		);
	}

	public begin() {
		this.instanceCount = 0;
	}

	public end() {
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
		const view = this.instanceData.subarray(
			0,
			this.instanceCount * this.STRIDE_FLOATS
		);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, view);
	}

	private createBoundsAccumulator() {
		return { ...this.defaultBounds };
	}

	private updateBounds(
		acc: { minX: number; maxX: number; minY: number; maxY: number },
		minX: number,
		maxX: number,
		minY: number,
		maxY: number
	) {
		if (minX < acc.minX) {
			acc.minX = minX;
		}
		if (maxX > acc.maxX) {
			acc.maxX = maxX;
		}
		if (minY < acc.minY) {
			acc.minY = minY;
		}
		if (maxY > acc.maxY) {
			acc.maxY = maxY;
		}
	}

	public addLabel(
		entityId: number,
		text: string,
		xOffset: number,
		yOffset: number,
		fontSize: number
	): LabelBounds {
		const formattedText = text.split("?").join("\n");

		this.ensureCapacity(this.instanceCount + formattedText.length);

		const texW = this.fontData.common.scaleW;
		const texH = this.fontData.common.scaleH;

		const fontBaseSize = this.fontData.info.size;
		const fontScale = fontSize / fontBaseSize;

		const lineHeight = this.fontData.common.lineHeight * fontScale * 1.1;

		const newlineMatches = formattedText.match(/\n/g);
		const lineCount = (newlineMatches ? newlineMatches.length : 0) + 1;

		const totalBlockHeight = lineCount * lineHeight;

		let cursorX = 0;
		let cursorY = totalBlockHeight / 2 - lineHeight * 0.85;

		const bounds = this.createBoundsAccumulator();

		for (let i = 0; i < formattedText.length; i++) {
			const charCode = formattedText.codePointAt(i);
			const charStr = formattedText[i];

			if (charCode === 10) {
				cursorX = 0;
				cursorY -= lineHeight;
				continue;
			}

			const glyph = this.charMap.get(charStr) || this.charMap.get("?");
			if (!glyph) {
				continue;
			}

			const u = glyph.x / texW;
			const v = glyph.y / texH;
			const uw = glyph.width / texW;
			const vh = glyph.height / texH;

			const pixelW = glyph.width * fontScale;
			const pixelH = glyph.height * fontScale;

			const xPos = xOffset + cursorX + glyph.xoffset * fontScale;
			const yPos = yOffset + cursorY - glyph.yoffset * fontScale - pixelH;

			const index = this.instanceCount * this.STRIDE_FLOATS;

			if (index + this.STRIDE_FLOATS > this.instanceData.length) {
				break;
			}

			this.instanceData[index + 0] = u;
			this.instanceData[index + 1] = v;
			this.instanceData[index + 2] = uw;
			this.instanceData[index + 3] = vh;

			this.instanceData[index + 4] = entityId;
			this.instanceData[index + 5] = xPos;
			this.instanceData[index + 6] = yPos;

			this.instanceData[index + 7] = pixelW;
			this.instanceData[index + 8] = pixelH;

			this.updateBounds(bounds, xPos, xPos + pixelW, yPos, yPos + pixelH);

			this.instanceCount++;
			cursorX += glyph.xadvance * fontScale;
		}

		if (!Number.isFinite(bounds.minX) || !Number.isFinite(bounds.minY)) {
			const fallbackSize = fontSize * 0.5;
			return {
				width: fallbackSize,
				height: fallbackSize,
				centerOffsetX: xOffset,
				centerOffsetY: yOffset
			};
		}

		return {
			width: Math.max(1, bounds.maxX - bounds.minX),
			height: Math.max(1, bounds.maxY - bounds.minY),
			centerOffsetX: (bounds.minX + bounds.maxX) * 0.5,
			centerOffsetY: (bounds.minY + bounds.maxY) * 0.5
		};
	}

	public render() {
		if (this.instanceCount === 0) return;
		const gl = this.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.instanceBuffer);
		const stride = this.STRIDE_FLOATS * 4;

		gl.enableVertexAttribArray(1);
		gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
		gl.vertexAttribDivisor(1, 1);

		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 1, gl.FLOAT, false, stride, 16);
		gl.vertexAttribDivisor(2, 1);

		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 20);
		gl.vertexAttribDivisor(3, 1);

		gl.enableVertexAttribArray(4);
		gl.vertexAttribPointer(4, 2, gl.FLOAT, false, stride, 28);
		gl.vertexAttribDivisor(4, 1);

		gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.instanceCount);
	}
}
