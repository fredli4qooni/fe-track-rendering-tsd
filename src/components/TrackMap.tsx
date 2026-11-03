/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import EntityDetailPanel from "./entity-panel/EntityDetailPanel";
import MapCanvas from "./map-canvas/MapCanvas";
import MapTools from "./map-tools/MapTools";
import TacticalToolbar from "./tactical-toolbar/TacticalToolbar";

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
