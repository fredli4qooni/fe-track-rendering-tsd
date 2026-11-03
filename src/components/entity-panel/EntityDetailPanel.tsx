import React, { useState } from "react";
import {
	AiOutlineAim,
	AiOutlineCheck,
	AiOutlineClose,
	AiOutlineCompass,
	AiOutlineCopy,
	AiOutlineDelete,
	AiOutlineEdit
} from "react-icons/ai";
import { RiSpeedUpLine } from "react-icons/ri";

import { AVAILABLE_TRACK_TYPES, getTrackTypeMeta } from "@type/entity.types";
import * as maptalks from "maptalks";

import useMapStore from "@store/useMapStore";
import useTrackStore from "@store/useTrackStore";

import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { EditEntityModal } from "./EditEntityModal";

/**
 * Tactical Entity Detail Drawer component.
 * Displays real-time kinematic telemetry, callsign, and tactical actions for the selected track.
 * @returns React functional component rendering the inspection drawer
 */
export const EntityDetailPanel: React.FC = () => {
	const selectedTrackId = useTrackStore((state) => state.selectedTrack);
	const track = useTrackStore((state) =>
		state.tracks.find((t) => t.id === selectedTrackId)
	);
	const saveTrackUpdateToBackend = useTrackStore(
		(state) => state.saveTrackUpdateToBackend
	);
	const deleteTrackFromBackend = useTrackStore(
		(state) => state.deleteTrackFromBackend
	);
	const selectTrack = useTrackStore((state) => state.selectTrack);
	const mapInstance = useMapStore((state) => state.map);

	const [isEditOpen, setIsEditOpen] = useState(false);
	const [isDeleteOpen, setIsDeleteOpen] = useState(false);
	const [copied, setCopied] = useState(false);

	if (!track) return null;

	const meta = getTrackTypeMeta(track.type ?? 4);

	/**
	 * Center the MapTalks viewport on the current track coordinates.
	 */
	const handleCenterMap = () => {
		if (mapInstance && typeof mapInstance.setCenter === "function") {
			mapInstance.setCenter(new maptalks.Coordinate(track.lon, track.lat));
		}
	};

	/**
	 * Copy the current latitude and longitude to the system clipboard.
	 */
	const handleCopyCoords = () => {
		void navigator.clipboard.writeText(
			`${track.lat.toFixed(5)}, ${track.lon.toFixed(5)}`
		);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	/**
	 * Update tactical classification type for the selected track.
	 * @param newType - New tactical type index (0..5)
	 */
	const handleTypeChange = (newType: number) => {
		void saveTrackUpdateToBackend(track.id, {
			type: newType,
			updatedAt: Date.now()
		});
	};

	/**
	 * Confirm deletion of the selected track from the store and backend database.
	 */
	const handleDeleteConfirm = () => {
		void deleteTrackFromBackend(track.id);
		selectTrack(undefined);
	};

	return (
		<>
			<div className="absolute top-20 left-4 z-20 w-80 bg-neutral-5/95 backdrop-blur-md border border-neutral-4/70 rounded-xl shadow-2xl overflow-hidden font-montserrat text-white text-xs animate-in fade-in slide-in-from-left-4 duration-200">
				{/* Header */}
				<div className="flex items-center justify-between p-3.5 border-b border-neutral-4/80 bg-black/40">
					<div className="flex items-center gap-2.5">
						<div className="w-8 h-8 rounded-lg bg-black/60 border border-neutral-4/60 flex items-center justify-center p-1">
							<img
								src={meta.iconUrl}
								alt={meta.label}
								className="w-full h-full object-contain"
							/>
						</div>
						<div>
							<div className="font-bold text-sm tracking-wide text-cyan-300">
								Entity #{track.id}
							</div>
							<div className="text-[10px] text-neutral-3">
								Tactical Maritime Track
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={() => selectTrack(undefined)}
						className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-neutral-4 text-neutral-3 hover:text-white transition-colors"
						title="Close panel"
					>
						<AiOutlineClose size={14} />
					</button>
				</div>

				<div className="p-3.5 flex flex-col gap-3">
					{/* Status & Classification */}
					<div className="flex flex-col gap-1.5">
						<span className="text-[10px] uppercase font-semibold text-neutral-3 tracking-wider">
							Tactical Classification
						</span>
						<div className="flex items-center gap-2">
							<select
								value={track.type ?? 4}
								onChange={(e) => handleTypeChange(Number(e.target.value))}
								className="flex-1 bg-black/60 border border-neutral-4 text-white text-xs px-2.5 py-1.5 rounded focus:outline-none focus:border-cyan-400 font-medium cursor-pointer"
							>
								{AVAILABLE_TRACK_TYPES.map((tMeta) => (
									<option key={tMeta.type} value={tMeta.type}>
										{tMeta.label}
									</option>
								))}
							</select>
							<div
								className={`px-2 py-1 rounded text-[10px] font-bold border ${meta.badgeBg}`}
							>
								{meta.category.toUpperCase()}
							</div>
						</div>
						<p className="text-[10px] text-neutral-3 leading-relaxed">
							{meta.description}
						</p>
					</div>

					{/* Unit Name / Callsign Box */}
					<div className="p-2.5 bg-black/40 border border-neutral-4/40 rounded-lg">
						<span className="text-[10px] uppercase font-semibold text-neutral-3 block mb-1">
							Identity & Call Sign
						</span>
						<pre className="font-mono text-[11px] text-neutral-1 whitespace-pre-wrap leading-tight">
							{track.name}
						</pre>
					</div>

					{/* Coordinates Card */}
					<div className="flex flex-col gap-1.5 p-2.5 bg-black/40 border border-neutral-4/40 rounded-lg">
						<div className="flex items-center justify-between">
							<span className="text-[10px] uppercase font-semibold text-neutral-3">
								Geographic Coordinates
							</span>
							<div className="flex items-center gap-1">
								<button
									type="button"
									onClick={handleCopyCoords}
									className="text-[10px] text-neutral-3 hover:text-cyan-400 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-4/40"
									title="Copy coordinates"
								>
									{copied ? (
										<AiOutlineCheck className="text-green-400" />
									) : (
										<AiOutlineCopy />
									)}
									<span>{copied ? "Copied" : "Copy"}</span>
								</button>
								<button
									type="button"
									onClick={handleCenterMap}
									className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 px-1.5 py-0.5 rounded hover:bg-neutral-4/40"
									title="Center map on track"
								>
									<AiOutlineAim />
									<span>Center</span>
								</button>
							</div>
						</div>

						<div className="grid grid-cols-2 gap-2 mt-1 font-mono text-[11px]">
							<div className="bg-neutral-5/60 p-1.5 rounded border border-neutral-4/30">
								<div className="text-[9px] text-neutral-3">LAT</div>
								<div className="text-white font-medium">
									{track.lat.toFixed(5)}°
								</div>
							</div>
							<div className="bg-neutral-5/60 p-1.5 rounded border border-neutral-4/30">
								<div className="text-[9px] text-neutral-3">LON</div>
								<div className="text-white font-medium">
									{track.lon.toFixed(5)}°
								</div>
							</div>
						</div>
					</div>

					{/* Kinematics (Heading & Speed) */}
					<div className="grid grid-cols-2 gap-2">
						<div className="flex items-center gap-2 p-2 bg-black/40 border border-neutral-4/40 rounded-lg">
							<div className="p-1.5 bg-neutral-4/40 rounded text-cyan-400">
								<AiOutlineCompass
									size={18}
									style={{ transform: `rotate(${track.course ?? 0}deg)` }}
								/>
							</div>
							<div>
								<div className="text-[9px] text-neutral-3 uppercase font-semibold">
									Course
								</div>
								<div className="font-mono text-[11px] font-bold text-white">
									{Math.round(track.course ?? 0)}°
								</div>
							</div>
						</div>

						<div className="flex items-center gap-2 p-2 bg-black/40 border border-neutral-4/40 rounded-lg">
							<div className="p-1.5 bg-neutral-4/40 rounded text-amber-400">
								<RiSpeedUpLine size={18} />
							</div>
							<div>
								<div className="text-[9px] text-neutral-3 uppercase font-semibold">
									Speed
								</div>
								<div className="font-mono text-[11px] font-bold text-white">
									{track.speed ?? 18} kts
								</div>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex items-center gap-2 pt-2 border-t border-neutral-4/60 mt-1">
						<button
							type="button"
							onClick={() => setIsEditOpen(true)}
							className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-cyan-700/80 hover:bg-cyan-600 text-white rounded transition-colors font-medium shadow"
						>
							<AiOutlineEdit size={14} />
							<span>Edit Entity</span>
						</button>

						<button
							type="button"
							onClick={() => setIsDeleteOpen(true)}
							className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-900/60 hover:bg-red-800 text-red-200 rounded transition-colors"
							title="Delete this entity"
						>
							<AiOutlineDelete size={14} />
							<span>Delete</span>
						</button>
					</div>
				</div>
			</div>

			{/* Edit Entity Modal */}
			<EditEntityModal
				track={track}
				isOpen={isEditOpen}
				onClose={() => setIsEditOpen(false)}
				onSave={(updated) => void saveTrackUpdateToBackend(track.id, updated)}
			/>

			{/* Delete Confirm Dialog */}
			<DeleteConfirmDialog
				track={track}
				isOpen={isDeleteOpen}
				onClose={() => setIsDeleteOpen(false)}
				onConfirm={handleDeleteConfirm}
			/>
		</>
	);
};

export default EntityDetailPanel;
