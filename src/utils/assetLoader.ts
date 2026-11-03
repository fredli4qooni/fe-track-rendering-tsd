import friendlySuspected from "@assets/icons/friendly-suspected-position.png";
import hostileConfirmed from "@assets/icons/hostile-surface-confirmed.png";
import hostileUnconfirmed from "@assets/icons/hostile-surface-unconfirmed.png";
import supportPoint from "@assets/icons/support-point.png";
import unknownSurface from "@assets/icons/unknown-surface.png";
import waypoint from "@assets/icons/waypoint.png";
import { BMFontJson } from "@type/font.types";

export const ICON_MAP = [
	friendlySuspected,
	hostileConfirmed,
	hostileUnconfirmed,
	supportPoint,
	unknownSurface,
	waypoint
];

export async function loadTextureArray(
	gl: WebGL2RenderingContext,
	urls: string[]
): Promise<WebGLTexture> {
	const texture = gl.createTexture();
	if (!texture) throw new Error("Failed to create texture");

	gl.bindTexture(gl.TEXTURE_2D_ARRAY, texture);

	const images = await Promise.all(
		urls.map((url) => {
			return new Promise<HTMLImageElement>((resolve, reject) => {
				const img = new Image();
				img.src = url;
				img.onload = () => resolve(img);
				img.onerror = reject;
			});
		})
	);

	if (images.length === 0) throw new Error("No images loaded");

	const width = images[0].width;
	const height = images[0].height;
	const depth = images.length;
	const maxDimension = Math.max(width, height);
	const mipLevels = Math.max(1, Math.floor(Math.log2(maxDimension)) + 1);

	gl.texStorage3D(
		gl.TEXTURE_2D_ARRAY,
		mipLevels,
		gl.RGBA8,
		width,
		height,
		depth
	);

	images.forEach((img, i) => {
		gl.texSubImage3D(
			gl.TEXTURE_2D_ARRAY,
			0,
			0,
			0,
			i,
			width,
			height,
			1,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			img
		);
	});

	if (mipLevels > 1) {
		gl.generateMipmap(gl.TEXTURE_2D_ARRAY);
	}

	gl.texParameteri(
		gl.TEXTURE_2D_ARRAY,
		gl.TEXTURE_MIN_FILTER,
		mipLevels > 1 ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR
	);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D_ARRAY, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

	return texture;
}

export async function loadFont(
	gl: WebGL2RenderingContext,
	fontData: BMFontJson,
	imageUrl: string
): Promise<{ data: BMFontJson; texture: WebGLTexture }> {
	const img = await new Promise<HTMLImageElement>((resolve, reject) => {
		const image = new Image();
		image.src = imageUrl;
		image.onload = () => resolve(image);
		image.onerror = reject;
	});

	const texture = gl.createTexture();
	if (!texture) throw new Error("Failed to create font texture");

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

	return { data: fontData, texture };
}
