import React, { useEffect } from "react";

import useTrackStore from "@store/useTrackStore";
import useOwnShipMover from "@hooks/useOwnShipMover";
import useTrackMover from "@hooks/useTrackMover";
import TrackMap from "@component/TrackMap";
import { generateBatchTracks } from "@utils/trackGenerator";

/**
 * Main demo App component
 * @returns JSX.Element
 */
function App() {
	useTrackMover();
	useOwnShipMover();

	useEffect(() => {
		const initialTracks = generateBatchTracks(2000);
		useTrackStore.getState().setTracks(initialTracks);
	}, []);
	return (
		<div className="w-screen h-screen overflow-hidden bg-black">
			<TrackMap />
		</div>
	);
}

export default App;
