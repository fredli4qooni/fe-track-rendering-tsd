/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import MapCanvas from "./map-canvas/MapCanvas";
import MapTools from "./map-tools/MapTools";
import TacticalToolbar from "./tactical-toolbar/TacticalToolbar";
import EntityDetailPanel from "./entity-panel/EntityDetailPanel";

const TrackMap = () => {
	return (
		<div className="relative w-screen h-screen overflow-hidden">
			<MapCanvas />
			<MapTools />
			<TacticalToolbar />
			<EntityDetailPanel />
		</div>
	);
};

export default TrackMap;
