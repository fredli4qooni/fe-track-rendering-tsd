/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { useEffect } from "react";

import useTrackStore from "@store/useTrackStore";

import useOwnShipMover from "@hooks/useOwnShipMover";
import useTrackMover from "@hooks/useTrackMover";

import TrackMap from "@component/TrackMap";

/**
 * Main tactical application root component.
 * Performs backend health check on startup and initializes with a clean tactical map view.
 * Database contacts can be synchronized on demand via the "Load DB" action.
 * @returns JSX.Element
 */
function App() {
	useTrackMover();
	useOwnShipMover();

	useEffect(() => {
		/**
		 * Initializes app state on mount by checking backend health and setting a clean map view.
		 * @returns Promise that resolves once health check completes
		 */
		const initData = async (): Promise<void> => {
			// Perform health check to detect Go PostGIS backend connection status
			await useTrackStore.getState().syncHealthCheck();
			// Always start with a clean map view (0 tracks) on initial mount / page refresh
			useTrackStore.getState().setTracks([]);
		};
		void initData();
	}, []);

	return (
		<div className="w-screen h-screen overflow-hidden bg-black">
			<TrackMap />
		</div>
	);
}

export default App;
