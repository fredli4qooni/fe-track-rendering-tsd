/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React from "react";

import { fireEvent, render, screen } from "@testing-library/react";
import type { Track } from "@type/track.types";

import EditEntityModal from "./EditEntityModal";

const mockTrack: Track = {
	id: 77,
	name: "KRI-FRIGATE-77",
	lon: 118.5,
	lat: -2.5,
	altitude: 0,
	course: 90,
	speed: 18,
	type: 0,
	status: "ACTIVE",
	updatedAt: 1000
};

describe("EditEntityModal component", () => {
	it("renders nothing when isOpen is false", () => {
		const { container } = render(
			<EditEntityModal
				track={mockTrack}
				isOpen={false}
				onClose={jest.fn()}
				onSave={jest.fn()}
			/>
		);
		expect(container.firstChild).toBeNull();
	});

	it("renders form populated with track properties when isOpen is true", () => {
		render(
			<EditEntityModal
				track={mockTrack}
				isOpen={true}
				onClose={jest.fn()}
				onSave={jest.fn()}
			/>
		);

		expect(screen.getByText("Edit Tactical Entity #77")).toBeInTheDocument();
		expect(screen.getByDisplayValue("KRI-FRIGATE-77")).toBeInTheDocument();
		expect(screen.getByDisplayValue("-2.5")).toBeInTheDocument();
		expect(screen.getByDisplayValue("118.5")).toBeInTheDocument();
		expect(screen.getByDisplayValue("90")).toBeInTheDocument();
		expect(screen.getByDisplayValue("18")).toBeInTheDocument();
	});

	it("shows validation error and prevents saving when name is emptied", () => {
		const onSave = jest.fn();
		render(
			<EditEntityModal
				track={mockTrack}
				isOpen={true}
				onClose={jest.fn()}
				onSave={onSave}
			/>
		);

		const nameInput = screen.getByDisplayValue("KRI-FRIGATE-77");
		fireEvent.change(nameInput, { target: { value: "" } });

		const saveBtn = screen.getByRole("button", { name: "Simpan Perubahan" });
		fireEvent.click(saveBtn);

		expect(
			screen.getByText(/Nama entity tidak boleh kosong/i)
		).toBeInTheDocument();
		expect(onSave).not.toHaveBeenCalled();
	});

	it("saves valid updated telemetry and triggers onClose", () => {
		const onSave = jest.fn();
		const onClose = jest.fn();
		render(
			<EditEntityModal
				track={mockTrack}
				isOpen={true}
				onClose={onClose}
				onSave={onSave}
			/>
		);

		const speedInput = screen.getByDisplayValue("18");
		fireEvent.change(speedInput, { target: { value: "32.5" } });

		const saveBtn = screen.getByRole("button", { name: "Simpan Perubahan" });
		fireEvent.click(saveBtn);

		expect(onSave).toHaveBeenCalledWith(
			expect.objectContaining({
				speed: 32.5,
				name: "KRI-FRIGATE-77"
			})
		);
		expect(onClose).toHaveBeenCalled();
	});
});
