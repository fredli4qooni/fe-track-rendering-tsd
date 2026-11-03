import courseFrag from "./shaders/course.frag";
import courseVert from "./shaders/course.vert";

export class CourseRenderer {
	private gl: WebGL2RenderingContext;
	private program: WebGLProgram | null = null;
	private buffer: WebGLBuffer | null = null;
	private isReady = false;

	private lineLength: number = 40.0;

	constructor(gl: WebGL2RenderingContext) {
		this.gl = gl;
		this.init();
	}

	private init() {
		const gl = this.gl;

		const vert = this.createShader(gl.VERTEX_SHADER, courseVert);
		const frag = this.createShader(gl.FRAGMENT_SHADER, courseFrag);
		this.program = gl.createProgram()!;
		gl.attachShader(this.program, vert);
		gl.attachShader(this.program, frag);
		gl.linkProgram(this.program);

		if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
			console.error(
				"Course Program Error:",
				gl.getProgramInfoLog(this.program)
			);
			return;
		}

		const lineData = new Float32Array([0.0, 1.0]);
		this.buffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.bufferData(gl.ARRAY_BUFFER, lineData, gl.STATIC_DRAW);

		this.isReady = true;
	}

	public render(
		matrix: Float32Array,
		dataTexture: WebGLTexture,
		dataTextureSize: number,
		count: number,
		bearing: number
	) {
		if (!this.isReady || !this.program || !this.buffer || count === 0) return;

		const gl = this.gl;
		gl.useProgram(this.program);

		gl.uniformMatrix4fv(
			gl.getUniformLocation(this.program, "u_viewProjection"),
			false,
			matrix
		);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_length"),
			this.lineLength
		);

		gl.uniform1f(gl.getUniformLocation(this.program, "u_bearing"), bearing);

		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D, dataTexture);
		gl.uniform1i(gl.getUniformLocation(this.program, "u_dataTexture"), 0);
		gl.uniform1f(
			gl.getUniformLocation(this.program, "u_dataTextureSize"),
			dataTextureSize
		);

		gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
		gl.enableVertexAttribArray(0);
		gl.vertexAttribPointer(0, 1, gl.FLOAT, false, 0, 0);

		gl.drawArraysInstanced(gl.LINES, 0, 2, count);
	}

	private createShader(type: number, source: string) {
		const shader = this.gl.createShader(type)!;
		this.gl.shaderSource(shader, source);
		this.gl.compileShader(shader);
		return shader;
	}
}
