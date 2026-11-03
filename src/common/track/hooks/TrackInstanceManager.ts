/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export class TrackInstanceManager {
	private readonly gl: WebGL2RenderingContext;
	private count: number;

	private geometryBuffer: WebGLBuffer | null = null;
	private dynamicBuffer: WebGLBuffer | null = null;
	private staticBuffer: WebGLBuffer | null = null;

	public dynamicData: Float32Array;
	public staticData: Float32Array;

	private readonly DYNAMIC_STRIDE = 3 * 4;
	private readonly STATIC_STRIDE = 7 * 4;

	/**
	 * Create a TrackInstanceManager for managing per-instance WebGL buffers.
	 *
	 * @param gl - The WebGL2 rendering context to create buffers on.
	 * @param instanceCount - Initial number of instances to allocate buffers for.
	 */
	constructor(gl: WebGL2RenderingContext, instanceCount: number) {
		this.gl = gl;
		this.count = Math.max(0, instanceCount);

		this.dynamicData = new Float32Array(this.count * 3);
		this.staticData = new Float32Array(this.count * 7);

		this.initBuffers();
	}

	/**
	 * Resize instance buffers to accommodate a different number of instances.
	 *
	 * @param instanceCount - New number of instances to allocate buffers for.
	 */
	public resize(instanceCount: number) {
		if (instanceCount === this.count) return;
		this.count = Math.max(0, instanceCount);
		this.dynamicData = new Float32Array(this.count * 3);
		this.staticData = new Float32Array(this.count * 7);

		const gl = this.gl;
		if (this.dynamicBuffer) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				this.dynamicData.byteLength,
				gl.DYNAMIC_DRAW
			);
		}
		if (this.staticBuffer) {
			gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
			gl.bufferData(
				gl.ARRAY_BUFFER,
				this.staticData.byteLength,
				gl.STATIC_DRAW
			);
		}
	}

	/**
	 * Initialize WebGL buffers for geometry and per-instance data.
	 *
	 * Creates a vertex buffer for a unit quad and allocates the dynamic and static
	 * instance buffers according to the current instance count.
	 *
	 * @private
	 */
	private initBuffers() {
		const gl = this.gl;

		const quadVertices = new Float32Array([
			-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5
		]);
		this.geometryBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, quadVertices, gl.STATIC_DRAW);

		this.dynamicBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
		gl.bufferData(
			gl.ARRAY_BUFFER,
			this.dynamicData.byteLength,
			gl.DYNAMIC_DRAW
		);

		this.staticBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, this.staticData.byteLength, gl.STATIC_DRAW);
	}

	/**
	 * Bind vertex attributes for geometry and per-instance buffers.
	 *
	 * Sets up attribute pointers and divisors for the geometry buffer (location 0)
	 * and the dynamic/static per-instance buffers (locations 1-5).
	 */
	public bindAttributes() {
		const gl = this.gl;

		gl.bindBuffer(gl.ARRAY_BUFFER, this.geometryBuffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
		gl.vertexAttribDivisor(0, 0);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
		gl.enableVertexAttribArray(1);

		gl.vertexAttribPointer(1, 3, gl.FLOAT, false, this.DYNAMIC_STRIDE, 0);
		gl.vertexAttribDivisor(1, 1);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
		gl.enableVertexAttribArray(2);
		gl.vertexAttribPointer(2, 1, gl.FLOAT, false, this.STATIC_STRIDE, 0);
		gl.vertexAttribDivisor(2, 1);

		gl.enableVertexAttribArray(3);
		gl.vertexAttribPointer(3, 4, gl.FLOAT, false, this.STATIC_STRIDE, 1 * 4);
		gl.vertexAttribDivisor(3, 1);

		gl.enableVertexAttribArray(4);
		gl.vertexAttribPointer(4, 1, gl.FLOAT, false, this.STATIC_STRIDE, 5 * 4);
		gl.vertexAttribDivisor(4, 1);

		gl.enableVertexAttribArray(5);
		gl.vertexAttribPointer(5, 1, gl.FLOAT, false, this.STATIC_STRIDE, 6 * 4);
		gl.vertexAttribDivisor(5, 1);
	}

	/**
	 * Update the dynamic per-instance WebGL buffer with the current dynamicData.
	 *
	 * Binds the dynamic buffer and uploads the Float32Array contents starting at offset 0.
	 */
	public updateDynamicBuffer() {
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.dynamicBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.dynamicData);
	}

	/**
	 * Update the static per-instance WebGL buffer with the current staticData.
	 *
	 * Binds the static buffer and uploads the Float32Array contents starting at offset 0.
	 */
	public uploadStaticBuffer() {
		const gl = this.gl;
		gl.bindBuffer(gl.ARRAY_BUFFER, this.staticBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.staticData);
	}

	/**
	 * Returns the current number of instances managed by this TrackInstanceManager.
	 *
	 * @returns The number of allocated instances.
	 */
	public getCount(): number {
		return this.count;
	}
}
