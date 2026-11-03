import "maptalks";

declare module "maptalks" {
	export class DistanceTool {
		constructor(options?: any);
		addTo(map: Map): this;
		enable(): this;
		disable(): this;
		clear(): this;
		remove(): this;
	}
}
