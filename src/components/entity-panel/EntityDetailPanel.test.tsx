/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import type { Track } from "@type/track.types";

import useMapStore from "@store/useMapStore";
import useTrackStore from "@store/useTrackStore";

import EntityDetailPanel from "./EntityDetailPanel";

const mockTrack: Track = {
	id: 101,
	name: "KRI-FRIGATE-101\nFrigate #101\nType-0",
	lon: 118.123456,
	lat: -2.654321,
	altitude: 0,
	course: 145,
	speed: 24,
	type: 0,
	status: "ACTIVE",
	updatedAt: 1000
};

describe("EntityDetailPanel component", () => {
	beforeEach(() => {
		useTrackStore.setState({ tracks: [mockTrack], selectedTrack: undefined });
		Object.assign(navigator, {
			clipboard: {
				writeText: jest.fn().mockImplementation(() => Promise.resolve())
			}
		});
	});

	it("renders nothing when no track is selected", () => {
		const { container } = render(<EntityDetailPanel />);
		expect(container.firstChild).toBeNull();
	});

	it("renders telemetry details when a track is selected", () => {
		useTrackStore.setState({ selectedTrack: 101 });
		render(<EntityDetailPanel />);

		expect(screen.getByText("Entity #101")).toBeInTheDocument();
		expect(screen.getByText(/KRI-FRIGATE-101/)).toBeInTheDocument();
		expect(screen.getByText("-2.65432°")).toBeInTheDocument();
		expect(screen.getByText("118.12346°")).toBeInTheDocument();
		expect(screen.getByText("145°")).toBeInTheDocument();
		expect(screen.getByText("24 kts")).toBeInTheDocument();
	});

	it("updates classification when changing the select dropdown", () => {
		useTrackStore.setState({ selectedTrack: 101 });
		render(<EntityDetailPanel />);

		const select = screen.getByRole("combobox");
		fireEvent.change(select, { target: { value: "3" } });

		const updatedTrack = useTrackStore
			.getState()
			.tracks.find((t) => t.id === 101);
		expect(updatedTrack?.type).toBe(3);
	});

	it("copies coordinates to clipboard when clicking copy button", () => {
		useTrackStore.setState({ selectedTrack: 101 });
		render(<EntityDetailPanel />);

		const copyBtn = screen.getByTitle("Salin koordinat");
		fireEvent.click(copyBtn);

		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
			"-2.65432, 118.12346"
		);
		expect(screen.getByText("Tersalin")).toBeInTheDocument();
	});

	it("deselects track when clicking close button", () => {
		useTrackStore.setState({ selectedTrack: 101 });
		render(<EntityDetailPanel />);

		const closeBtn = screen.getByTitle("Tutup panel");
		fireEvent.click(closeBtn);

		expect(useTrackStore.getState().selectedTrack).toBeUndefined();
	});

	it("calls setCenter on map when clicking Pusatkan button", () => {
		const mockSetCenter = jest.fn();
		useMapStore.setState({
			map: { setCenter: mockSetCenter } as unknown as import("maptalks").Map
		});
		useTrackStore.setState({ selectedTrack: 101 });

		render(<EntityDetailPanel />);
		const centerBtn = screen.getByTitle("Pusatkan peta ke track");
		fireEvent.click(centerBtn);

		expect(mockSetCenter).toHaveBeenCalled();
	});

	it("opens delete confirm dialog and removes entity on confirm", () => {
		useTrackStore.setState({ selectedTrack: 101 });
		render(<EntityDetailPanel />);

		const deleteBtn = screen.getByTitle("Hapus entity ini");
		fireEvent.click(deleteBtn);

		// Modal should show
		expect(screen.getByText("Konfirmasi Hapus Entity")).toBeInTheDocument();

		// Click confirm button inside dialog
		const confirmDeleteBtn = screen.getByRole("button", {
			name: /Hapus Sekarang/i
		});
		fireEvent.click(confirmDeleteBtn);

		expect(useTrackStore.getState().tracks).toHaveLength(0);
		expect(useTrackStore.getState().selectedTrack).toBeUndefined();
	});
});
