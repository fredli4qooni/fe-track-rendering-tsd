/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export const DISTANCE_TOOL_CONFIG = {
	symbol: {
		lineColor: "#1bbc9b",
		lineWidth: 3,
		lineOpacity: 1
	},
	vertexSymbol: {
		markerType: "ellipse",
		markerFill: "#fff",
		markerLineColor: "#1bbc9b",
		markerLineWidth: 3,
		markerWidth: 10,
		markerHeight: 10
	},
	labelOptions: {
		textSymbol: {
			textFaceName: "monospace",
			textFill: "#fff",
			textLineSpacing: 1,
			textHorizontalAlignment: "right",
			textDx: 15,
			markerLineColor: "#b4b3b3",
			markerFill: "#000"
		},
		boxStyle: {
			padding: [6, 2],
			symbol: {
				markerType: "square",
				markerFill: "#000",
				markerFillOpacity: 0.9,
				markerLineColor: "#b4b3b3"
			}
		}
	},
	clearButtonSymbol: [
		{
			markerType: "square",
			markerFill: "#000",
			markerLineColor: "#b4b3b3",
			markerLineWidth: 2,
			markerWidth: 15,
			markerHeight: 15,
			markerDx: 20
		},
		{
			markerType: "x",
			markerWidth: 10,
			markerHeight: 10,
			markerLineColor: "#fff",
			markerDx: 20
		}
	],
	language: "en-US",
	formatLabel: (lengthInMeters: number) => {
		if (lengthInMeters < 1000) {
			return `${lengthInMeters.toFixed(0)} m`;
		}
		const lengthInKm = lengthInMeters / 1000;
		return `${lengthInKm.toFixed(2)} km`;
	}
};
