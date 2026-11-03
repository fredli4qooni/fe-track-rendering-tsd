/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import type { Track } from "@type/track.types";

import DeleteConfirmDialog from "./DeleteConfirmDialog";

const mockTrack: Track = {
	id: 55,
	name: "KRI-PATROL-55",
	lon: 118,
	lat: -2,
	altitude: 0,
	course: 45,
	speed: 15,
	type: 1,
	status: "ACTIVE",
	updatedAt: 1000
};

describe("DeleteConfirmDialog component", () => {
	it("renders nothing when isOpen is false", () => {
		const { container } = render(
			<DeleteConfirmDialog
				track={mockTrack}
				isOpen={false}
				onClose={jest.fn()}
				onConfirm={jest.fn()}
			/>
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders dialog with entity ID when isOpen is true", () => {
		render(
			<DeleteConfirmDialog
				track={mockTrack}
				isOpen={true}
				onClose={jest.fn()}
				onConfirm={jest.fn()}
			/>
		);
		expect(screen.getByText("Konfirmasi Hapus Entity")).toBeInTheDocument();
		expect(screen.getByText("#55")).toBeInTheDocument();
	});

	it("triggers onClose when clicking Batal button", () => {
		const onClose = jest.fn();
		render(
			<DeleteConfirmDialog
				track={mockTrack}
				isOpen={true}
				onClose={onClose}
				onConfirm={jest.fn()}
			/>
		);
		fireEvent.click(screen.getByRole("button", { name: "Batal" }));
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("triggers onConfirm and onClose when clicking Hapus Sekarang button", () => {
		const onConfirm = jest.fn();
		const onClose = jest.fn();
		render(
			<DeleteConfirmDialog
				track={mockTrack}
				isOpen={true}
				onClose={onClose}
				onConfirm={onConfirm}
			/>
		);
		fireEvent.click(screen.getByRole("button", { name: "Hapus Sekarang" }));
		expect(onConfirm).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});
});
