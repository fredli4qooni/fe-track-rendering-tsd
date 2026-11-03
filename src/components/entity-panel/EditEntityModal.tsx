import React, { useEffect, useState } from "react";
import { AiOutlineWarning } from "react-icons/ai";

import { AVAILABLE_TRACK_TYPES, getTrackTypeMeta } from "@type/entity.types";
import { Track } from "@type/track.types";

import {
	validateCourse,
	validateLatitude,
	validateLongitude,
	validateSpeed,
	validateTrackName
} from "@utils/validation";

interface EditEntityModalProps {
	track: Track;
	isOpen: boolean;
	onClose: () => void;
	onSave: (updated: Partial<Track>) => void;
}

/**
 * Modal form component for editing an existing tactical entity's telemetry and metadata.
 * @param props - Component properties
 * @param props.track - Target track object to edit
 * @param props.isOpen - Whether modal is visible
 * @param props.onClose - Close modal callback
 * @param props.onSave - Save callback with updated track properties
 * @returns React functional component rendering the edit modal dialog
 */
export const EditEntityModal: React.FC<EditEntityModalProps> = ({
	track,
	isOpen,
	onClose,
	onSave
}) => {
	const [name, setName] = useState<string>(track.name);
	const [type, setType] = useState<number>(track.type ?? 4);
	const [lat, setLat] = useState<string>(String(track.lat));
	const [lon, setLon] = useState<string>(String(track.lon));
	const [course, setCourse] = useState<string>(String(track.course ?? 0));
	const [speed, setSpeed] = useState<string>(String(track.speed ?? 15));
	const [errors, setErrors] = useState<Record<string, string>>({});

	useEffect(() => {
		if (isOpen) {
			setName(track.name);
			setType(track.type ?? 4);
			setLat(String(Number(track.lat.toFixed(6))));
			setLon(String(Number(track.lon.toFixed(6))));
			setCourse(
				String(
					typeof track.course === "number" ? Number(track.course.toFixed(2)) : 0
				)
			);
			setSpeed(
				String(
					typeof track.speed === "number" ? Number(track.speed.toFixed(1)) : 15
				)
			);
			setErrors({});
		}
	}, [isOpen, track.id]);

	if (!isOpen) return null;

	/**
	 * Validate form inputs and submit updated track properties.
	 * @param e - Form submit event
	 */
	const handleValidateAndSave = (e: React.FormEvent) => {
		e.preventDefault();
		const newErrors: Record<string, string> = {};

		const nameVal = validateTrackName(name);
		if (!nameVal.valid) newErrors.name = nameVal.error!;

		const parsedLat = Number(lat);
		const latVal = validateLatitude(parsedLat);
		if (!latVal.valid) newErrors.lat = latVal.error!;

		const parsedLon = Number(lon);
		const lonVal = validateLongitude(parsedLon);
		if (!lonVal.valid) newErrors.lon = lonVal.error!;

		const parsedCourse = Number(course);
		const courseVal = validateCourse(parsedCourse);
		if (!courseVal.valid) newErrors.course = courseVal.error!;

		const parsedSpeed = Number(speed);
		const speedVal = validateSpeed(parsedSpeed);
		if (!speedVal.valid) newErrors.speed = speedVal.error!;

		if (Object.keys(newErrors).length > 0) {
			setErrors(newErrors);
			return;
		}

		onSave({
			name: name.trim(),
			type,
			lat: parsedLat,
			lon: parsedLon,
			course: parsedCourse,
			speed: parsedSpeed,
			updatedAt: Date.now()
		});
		onClose();
	};

	const currentMeta = getTrackTypeMeta(type);

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-montserrat">
			<div className="relative w-full max-w-md bg-neutral-5 border border-neutral-4 rounded-xl shadow-2xl overflow-hidden text-white">
				{/* Modal Header */}
				<div className="flex items-center justify-between px-5 py-4 border-b border-neutral-4 bg-black/40">
					<div className="flex items-center gap-2">
						<img
							src={currentMeta.iconUrl}
							alt={currentMeta.label}
							className="w-6 h-6 object-contain"
						/>
						<h3 className="font-bold text-sm tracking-wide text-cyan-300">
							Edit Tactical Entity #{track.id}
						</h3>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="text-neutral-3 hover:text-white transition-colors text-lg"
					>
						✕
					</button>
				</div>

				{/* Form Body */}
				<form
					onSubmit={handleValidateAndSave}
					noValidate
					className="p-5 flex flex-col gap-4 text-xs"
				>
					{/* Name Field */}
					<div className="flex flex-col gap-1">
						<div className="flex items-center justify-between">
							<label className="font-medium text-neutral-2">
								Entity Name / Call Sign *
							</label>
							<span className="text-[10px] text-neutral-3">
								Supports multi-line label
							</span>
						</div>
						<textarea
							rows={3}
							value={name}
							onChange={(e) => {
								setName(e.target.value);
								if (errors.name) setErrors((prev) => ({ ...prev, name: "" }));
							}}
							className="w-full bg-black/60 border border-neutral-4 rounded p-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs resize-none"
							placeholder="Example:&#10;BKN-0025&#10;Cargo #25&#10;Type-1"
						/>
						{errors.name && (
							<span className="text-red-400 text-[11px] flex items-center gap-1">
								<AiOutlineWarning size={12} /> {errors.name}
							</span>
						)}
					</div>

					{/* Type / Classification Field */}
					<div className="flex flex-col gap-1">
						<label className="font-medium text-neutral-2">
							Tactical Classification *
						</label>
						<div className="grid grid-cols-2 gap-2">
							{AVAILABLE_TRACK_TYPES.map((tMeta) => (
								<button
									key={tMeta.type}
									type="button"
									onClick={() => setType(tMeta.type)}
									className={`flex items-center gap-2 p-2 rounded border text-left transition-all ${
										type === tMeta.type
											? "bg-cyan-950/70 border-cyan-400 text-cyan-200"
											: "bg-black/40 border-neutral-4/60 text-neutral-3 hover:text-white hover:border-neutral-3"
									}`}
								>
									<img
										src={tMeta.iconUrl}
										alt={tMeta.label}
										className="w-5 h-5 object-contain"
									/>
									<span className="text-[11px] truncate font-medium">
										{tMeta.label}
									</span>
								</button>
							))}
						</div>
					</div>

					{/* Coordinates Row */}
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className="font-medium text-neutral-2">Latitude (°)</label>
							<input
								type="number"
								step="any"
								value={lat}
								onChange={(e) => {
									setLat(e.target.value);
									if (errors.lat) setErrors((prev) => ({ ...prev, lat: "" }));
								}}
								className="w-full bg-black/60 border border-neutral-4 rounded p-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
								placeholder="-90 to 90"
							/>
							{errors.lat && (
								<span className="text-red-400 text-[11px] flex items-center gap-1">
									<AiOutlineWarning size={12} /> {errors.lat}
								</span>
							)}
						</div>

						<div className="flex flex-col gap-1">
							<label className="font-medium text-neutral-2">
								Longitude (°)
							</label>
							<input
								type="number"
								step="any"
								value={lon}
								onChange={(e) => {
									setLon(e.target.value);
									if (errors.lon) setErrors((prev) => ({ ...prev, lon: "" }));
								}}
								className="w-full bg-black/60 border border-neutral-4 rounded p-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
								placeholder="-180 to 180"
							/>
							{errors.lon && (
								<span className="text-red-400 text-[11px] flex items-center gap-1">
									<AiOutlineWarning size={12} /> {errors.lon}
								</span>
							)}
						</div>
					</div>

					{/* Kinematics Row (Course & Speed) */}
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-1">
							<label className="font-medium text-neutral-2">Course (°)</label>
							<input
								type="number"
								step="any"
								min={0}
								max={360}
								value={course}
								onChange={(e) => {
									setCourse(e.target.value);
									if (errors.course)
										setErrors((prev) => ({ ...prev, course: "" }));
								}}
								className="w-full bg-black/60 border border-neutral-4 rounded p-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
								placeholder="0 - 360"
							/>
							{errors.course && (
								<span className="text-red-400 text-[11px] flex items-center gap-1">
									<AiOutlineWarning size={12} /> {errors.course}
								</span>
							)}
						</div>

						<div className="flex flex-col gap-1">
							<label className="font-medium text-neutral-2">
								Speed (Knots)
							</label>
							<input
								type="number"
								step="any"
								min={0}
								max={120}
								value={speed}
								onChange={(e) => {
									setSpeed(e.target.value);
									if (errors.speed)
										setErrors((prev) => ({ ...prev, speed: "" }));
								}}
								className="w-full bg-black/60 border border-neutral-4 rounded p-2 text-white focus:outline-none focus:border-cyan-400 font-mono text-xs"
								placeholder="0 - 120"
							/>
							{errors.speed && (
								<span className="text-red-400 text-[11px] flex items-center gap-1">
									<AiOutlineWarning size={12} /> {errors.speed}
								</span>
							)}
						</div>
					</div>

					{/* Modal Actions */}
					<div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-4/60 mt-2">
						<button
							type="button"
							onClick={onClose}
							className="px-4 py-2 bg-neutral-4 hover:bg-neutral-3 text-white rounded font-medium transition-colors"
						>
							Cancel
						</button>
						<button
							type="submit"
							className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-medium transition-colors shadow-lg"
						>
							Save Changes
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};

export default EditEntityModal;
