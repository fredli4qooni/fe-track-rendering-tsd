/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import { act, fireEvent, render, screen } from "@testing-library/react";
import type { Track } from "@type/track.types";

import useOwnShipStore from "@store/useOwnShipStore";
import useTrackStore from "@store/useTrackStore";

import TacticalToolbar from "./TacticalToolbar";

const mockTrack: Track = {
	id: 1,
	name: "KRI-0001",
	lon: 118,
	lat: -2,
	altitude: 0,
	course: 90,
	speed: 20,
	type: 1,
	status: "ACTIVE",
	updatedAt: 1000
};

describe("TacticalToolbar component", () => {
	beforeEach(() => {
		useTrackStore.setState({ tracks: [], selectedTrack: undefined });
		useOwnShipStore.setState({ position: [118, -2], heading: 0, speed: 0 });
		jest.clearAllMocks();
	});

	it("renders title badge and displays initial 0 active tracks", () => {
		render(<TacticalToolbar />);
		expect(screen.getByText("TSD SIMULATOR")).toBeInTheDocument();
		expect(screen.getByText("Active Tracks:")).toBeInTheDocument();
		expect(screen.getByText("0")).toBeInTheDocument();
	});

	it("adds a single track when clicking '+1 Track' button and backend is online", () => {
		useTrackStore.setState({ isBackendOnline: true });
		jest
			.spyOn(useTrackStore.getState(), "saveNewTrackToBackend")
			.mockImplementation(async () => {
				useTrackStore.setState({ tracks: [mockTrack] });
				return mockTrack;
			});

		render(<TacticalToolbar />);
		const addBtn = screen.getByText("+1 Track").closest("button");
		expect(addBtn).not.toBeDisabled();

		if (addBtn) fireEvent.click(addBtn);

		const tracks = useTrackStore.getState().tracks;
		expect(tracks).toHaveLength(1);
		expect(tracks[0].id).toBe(1);
		expect(screen.getByText("1")).toBeInTheDocument();
	});

	it("disables '+1 Track' button when backend is offline", () => {
		useTrackStore.setState({ isBackendOnline: false });
		render(<TacticalToolbar />);
		const addBtn = screen.getByText("+1 Track").closest("button");
		expect(addBtn).toBeDisabled();
	});

	it("spawns batch tracks when clicking Generate button", () => {
		jest.useFakeTimers();
		render(<TacticalToolbar />);

		const benchmarkBtn = screen.getByRole("button", { name: /benchmark/i });
		fireEvent.click(benchmarkBtn);

		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "50" } });

		const generateBtn = screen.getByRole("button", { name: /generate/i });
		fireEvent.click(generateBtn);

		act(() => {
			jest.advanceTimersByTime(100);
		});

		const tracks = useTrackStore.getState().tracks;
		expect(tracks).toHaveLength(50);
		jest.useRealTimers();
	});

	it("displays error message when custom count is invalid", () => {
		render(<TacticalToolbar />);

		const benchmarkBtn = screen.getByRole("button", { name: /benchmark/i });
		fireEvent.click(benchmarkBtn);

		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "custom" } });

		const input = screen.getByPlaceholderText("50 - 10000");
		fireEvent.change(input, { target: { value: "10" } }); // Less than 50

		const generateBtn = screen.getByRole("button", { name: /generate/i });
		fireEvent.click(generateBtn);

		expect(
			screen.getByText(/Jumlah minimal spawn adalah 50 track/i)
		).toBeInTheDocument();
	});

	it("dismisses error notification when clicking close button", () => {
		useTrackStore.setState({ syncError: "Backend offline error" });
		render(<TacticalToolbar />);

		expect(screen.getByText("Backend offline error")).toBeInTheDocument();
		const closeBtn = screen.getByTitle("Tutup pesan peringatan ini");
		fireEvent.click(closeBtn);

		expect(useTrackStore.getState().syncError).toBeNull();
	});

	it("clears all tracks when confirming clear all dialog", () => {
		useTrackStore.setState({ tracks: [mockTrack] });
		const confirmSpy = jest.spyOn(window, "confirm").mockReturnValue(true);

		render(<TacticalToolbar />);
		const clearBtn = screen.getByText("Clear");
		fireEvent.click(clearBtn);

		expect(confirmSpy).toHaveBeenCalled();
		expect(useTrackStore.getState().tracks).toHaveLength(0);
		confirmSpy.mockRestore();
	});

	it("renders backend connection badge and handles Load DB click", () => {
		useTrackStore.setState({ isBackendOnline: true });
		const loadSpy = jest
			.spyOn(useTrackStore.getState(), "loadFromBackend")
			.mockResolvedValue();

		render(<TacticalToolbar />);
		expect(screen.getByText("DB: Online")).toBeInTheDocument();

		const loadBtn = screen.getByText("Load DB");
		fireEvent.click(loadBtn);
		expect(loadSpy).toHaveBeenCalled();
	});
});
