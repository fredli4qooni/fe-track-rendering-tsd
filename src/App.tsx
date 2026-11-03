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
 * Automatically synchronizes with the Go backend database if online on startup,
 * or defaults to a clean standalone state if the backend is offline.
 * @returns JSX.Element
 */
function App() {
	useTrackMover();
	useOwnShipMover();

	useEffect(() => {
		const initData = async () => {
			const isOnline = await useTrackStore.getState().syncHealthCheck();
			if (isOnline) {
				await useTrackStore.getState().loadFromBackend();
			} else {
				useTrackStore.getState().setTracks([]);
			}
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
