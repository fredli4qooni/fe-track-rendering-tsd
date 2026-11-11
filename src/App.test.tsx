/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import { render, waitFor } from "@testing-library/react";

import useTrackStore from "@store/useTrackStore";

import App from "./App";

jest.mock("@component/TrackMap", () => {
	return function MockTrackMap() {
		return <div data-testid="mock-track-map">Mock Track Map</div>;
	};
});

jest.mock("@hooks/useTrackMover", () => jest.fn());
jest.mock("@hooks/useOwnShipMover", () => jest.fn());

describe("App root component", () => {
	beforeEach(() => {
		useTrackStore.setState({ tracks: [], isBackendOnline: false });
		jest.clearAllMocks();
	});

	it("renders track map and starts with a clean empty map without auto-loading DB tracks", async () => {
		const syncHealthCheckSpy = jest
			.spyOn(useTrackStore.getState(), "syncHealthCheck")
			.mockResolvedValue(true);
		const loadFromBackendSpy = jest
			.spyOn(useTrackStore.getState(), "loadFromBackend")
			.mockResolvedValue();

		const { getByTestId } = render(<App />);
		expect(getByTestId("mock-track-map")).toBeInTheDocument();

		await waitFor(() => {
			expect(syncHealthCheckSpy).toHaveBeenCalledTimes(1);
		});

		// Ensure loadFromBackend is NOT called on mount (starts with 0 tracks)
		expect(loadFromBackendSpy).not.toHaveBeenCalled();
		expect(useTrackStore.getState().tracks).toHaveLength(0);
	});
});
