export class DataTexture {
	private readonly gl: WebGL2RenderingContext;
	private readonly componentsPerEntity: number;
	private texture: WebGLTexture | null = null;
	private size: number;
	private data: Float32Array;
	private lastCount = 0;

	constructor(
		gl: WebGL2RenderingContext,
		entityCount: number,
		componentsPerEntity = 3
	) {
		this.gl = gl;
		this.componentsPerEntity = Math.max(1, Math.min(4, componentsPerEntity));
		this.size = this.computeSize(entityCount);
		this.data = new Float32Array(this.size * this.size * 4);
		this.init();
	}

	private computeSize(entityCount: number) {
		const safeCount = Math.max(1, entityCount);
		const root = Math.ceil(Math.sqrt(safeCount));
		return Math.pow(2, Math.ceil(Math.log2(root)));
	}

	private init() {
		const gl = this.gl;
		if (!gl.getExtension("EXT_color_buffer_float"))
			console.warn("Float texture not supported?");

		this.texture = gl.createTexture();
		this.allocateStorage();
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	}

	private allocateStorage() {
		const gl = this.gl;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA32F,
			this.size,
			this.size,
			0,
			gl.RGBA,
			gl.FLOAT,
			null
		);
	}

	public resize(entityCount: number) {
		const nextSize = this.computeSize(entityCount);
		if (nextSize === this.size) return;
		this.size = nextSize;
		this.data = new Float32Array(this.size * this.size * 4);
		this.lastCount = 0;
		this.allocateStorage();
	}

	public update(entityDynamicData: Float32Array) {
		const gl = this.gl;
		const stride = this.componentsPerEntity;
		const count = Math.floor(entityDynamicData.length / stride);
		for (let i = 0; i < count; i++) {
			const srcI = i * stride;
			const dstI = i * 4;
			this.data[dstI] = entityDynamicData[srcI] ?? 0;
			this.data[dstI + 1] = entityDynamicData[srcI + 1] ?? 0;
			this.data[dstI + 2] = entityDynamicData[srcI + 2] ?? 0;
			this.data[dstI + 3] = entityDynamicData[srcI + 3] ?? 0;
		}
		if (count < this.lastCount) {
			this.data.fill(0, count * 4, this.lastCount * 4);
		}
		this.lastCount = count;
		gl.bindTexture(gl.TEXTURE_2D, this.texture);
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			this.size,
			this.size,
			gl.RGBA,
			gl.FLOAT,
			this.data
		);
	}

	public getTexture() {
		return this.texture;
	}
	public getSize() {
		return this.size;
	}
}
