export interface BMFontChar {
	id: number;
	index: number;
	char: string;
	width: number;
	height: number;
	xoffset: number;
	yoffset: number;
	xadvance: number;
	chnl: number;
	x: number;
	y: number;
	page: number;
}

export interface BMFontCommon {
	lineHeight: number;
	base: number;
	scaleW: number;
	scaleH: number;
	pages: number;
	packed: number;
	alphaChnl: number;
	redChnl: number;
	greenChnl: number;
	blueChnl: number;
}

export interface BMFontInfo {
	face: string;
	size: number;
	bold: number;
	italic: number;
	charset: string[];
	unicode: number;
	stretchH: number;
	smooth: number;
	aa: number;
	padding: number[];
	spacing: number[];
}

export interface BMFontJson {
	pages: string[];
	chars: BMFontChar[];
	info: BMFontInfo;
	common: BMFontCommon;
}
