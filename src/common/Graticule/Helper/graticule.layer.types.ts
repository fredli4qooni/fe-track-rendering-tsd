export interface GraticuleLine {
	coordinates: [number, number][];
	isMajor: boolean;
}

export interface GraticuleLabel {
	coordinate: [number, number];
	text: string;
	isLatitude: boolean;
}

export interface GraticuleLayerConfig {
	lineStyle?: Partial<import("./graticule.types").GraticuleLineStyle>;
	labelStyle?: Partial<import("./graticule.types").GraticuleLabelStyle>;
	showLabels?: boolean;
	forceRenderOnMoving?: boolean;
}
