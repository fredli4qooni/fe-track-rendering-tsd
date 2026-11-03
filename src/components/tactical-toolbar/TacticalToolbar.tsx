import React, { useState } from "react";
import { AiOutlineClear, AiOutlinePlus, AiOutlineReload } from "react-icons/ai";
import { RiRadarLine } from "react-icons/ri";

import useOwnShipStore from "@store/useOwnShipStore";
import useTrackHistoryStore from "@store/useTrackHistoryStore";
import useTrackStore from "@store/useTrackStore";

import {
	generateBatchTracks,
	generateSingleTrack
} from "@utils/trackGenerator";
import { validateSpawnCount } from "@utils/validation";

const SPAWN_PRESETS = [50, 100, 500, 1000, 2000, 5000, 10000];

/**
 * Tactical Toolbar component for spawning batches, quick adding entities, and clearing the map.
 * @returns React functional component rendering the top tactical action bar
 */
export const TacticalToolbar: React.FC = () => {
	const tracks = useTrackStore((state) => state.tracks);
	const setTracks = useTrackStore((state) => state.setTracks);
	const addOrUpdateTrack = useTrackStore((state) => state.addOrUpdateTrack);
	const ownShipPos = useOwnShipStore((state) => state.position);

	const [selectedPreset, setSelectedPreset] = useState<number>(2000);
	const [customCount, setCustomCount] = useState<string>("");
	const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isSpawning, setIsSpawning] = useState<boolean>(false);

	/**
	 * Spawn a batch of tactical entities based on selected preset or custom input count.
	 */
	const handleSpawn = () => {
		setError(null);
		const count = isCustomMode ? Number(customCount) : selectedPreset;
		const valResult = validateSpawnCount(count);

		if (!valResult.valid) {
			setError(valResult.error ?? "Jumlah tidak valid");
			return;
		}

		setIsSpawning(true);
		useTrackHistoryStore.getState().clearHistory();
		setTimeout(() => {
			const newTracks = generateBatchTracks(
				count,
				ownShipPos[0],
				ownShipPos[1]
			);
			setTracks(newTracks);
			setIsSpawning(false);
		}, 50);
	};

	/**
	 * Quickly add a single new tactical entity near own ship.
	 */
	const handleQuickAdd = () => {
		const nextId =
			tracks.length > 0 ? Math.max(...tracks.map((t) => t.id)) + 1 : 1;
		const newTrack = generateSingleTrack(nextId, ownShipPos[0], ownShipPos[1]);
		addOrUpdateTrack(newTrack);
	};

	/**
	 * Clear all tactical entities and their history breadcrumbs from the map.
	 */
	const handleClearAll = () => {
		if (tracks.length === 0) return;
		if (
			window.confirm(
				`Bersihkan semua (${tracks.length.toLocaleString()}) entity dari peta?`
			)
		) {
			setTracks([]);
			useTrackStore.getState().selectTrack(undefined);
			useTrackHistoryStore.getState().clearHistory();
		}
	};

	return (
		<div className="absolute top-4 left-4 z-20 flex flex-col gap-2 font-montserrat">
			{/* Main Tactical Glassmorphic Bar */}
			<div className="flex items-center gap-3 px-3 py-2 bg-neutral-5/90 backdrop-blur-md border border-neutral-4/60 rounded-lg shadow-xl text-white text-xs">
				{/* Title Badge */}
				<div className="flex items-center gap-2 pr-3 border-r border-neutral-4/70">
					<RiRadarLine className="text-cyan-400" size={18} />
					<div>
						<div className="font-bold text-[13px] tracking-wide text-cyan-300">
							TSD SIMULATOR
						</div>
						<div className="text-[10px] text-neutral-3">
							Track Rendering Engine
						</div>
					</div>
				</div>

				{/* Active Counter Badge */}
				<div className="flex items-center gap-1.5 px-2.5 py-1 bg-black/50 border border-neutral-4/50 rounded">
					<span className="text-neutral-3">Active Tracks:</span>
					<span className="font-mono font-bold text-cyan-400">
						{tracks.length.toLocaleString()}
					</span>
				</div>

				{/* Spawner Selector */}
				<div className="flex items-center gap-1.5 pl-1">
					<span className="text-neutral-3">Spawn:</span>
					{!isCustomMode ? (
						<select
							value={selectedPreset}
							onChange={(e) => {
								if (e.target.value === "custom") {
									setIsCustomMode(true);
								} else {
									setSelectedPreset(Number(e.target.value));
								}
							}}
							className="bg-black/60 border border-neutral-4 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-cyan-400 cursor-pointer"
						>
							{SPAWN_PRESETS.map((cnt) => (
								<option key={cnt} value={cnt}>
									{cnt.toLocaleString()} tracks
								</option>
							))}
							<option value="custom">Custom...</option>
						</select>
					) : (
						<div className="flex items-center gap-1">
							<input
								type="number"
								placeholder="50 - 10000"
								value={customCount}
								onChange={(e) => {
									setCustomCount(e.target.value);
									setError(null);
								}}
								className="w-24 bg-black/60 border border-neutral-4 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-cyan-400"
								min={50}
								max={10000}
							/>
							<button
								type="button"
								onClick={() => setIsCustomMode(false)}
								className="text-[11px] text-neutral-3 hover:text-white px-1"
								title="Batal custom"
							>
								✕
							</button>
						</div>
					)}

					<button
						type="button"
						onClick={handleSpawn}
						disabled={isSpawning}
						className="flex items-center gap-1 px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 disabled:opacity-50 text-white font-medium rounded transition-colors shadow-sm"
						title="Spawn tracks secara massal"
					>
						<AiOutlineReload
							className={isSpawning ? "animate-spin" : ""}
							size={13}
						/>
						<span>{isSpawning ? "Spawning..." : "Generate"}</span>
					</button>
				</div>

				{/* Quick Action Buttons */}
				<div className="flex items-center gap-1 pl-2 border-l border-neutral-4/70">
					<button
						type="button"
						onClick={handleQuickAdd}
						className="flex items-center gap-1 px-2 py-1 bg-primary-20 hover:bg-primary-20/80 text-white rounded transition-colors"
						title="Tambah 1 entity baru di dekat kapal sendiri"
					>
						<AiOutlinePlus size={13} />
						<span>+1 Track</span>
					</button>

					<button
						type="button"
						onClick={handleClearAll}
						disabled={tracks.length === 0}
						className="flex items-center gap-1 px-2 py-1 bg-red-900/60 hover:bg-red-800 disabled:opacity-30 text-red-200 rounded transition-colors"
						title="Bersihkan semua entity dari peta"
					>
						<AiOutlineClear size={13} />
						<span>Clear</span>
					</button>
				</div>
			</div>

			{/* Inline Error Toast if any */}
			{error && (
				<div className="px-3 py-1.5 bg-red-950/90 border border-red-500/80 text-red-200 text-xs rounded shadow-lg animate-pulse">
					⚠ {error}
				</div>
			)}
		</div>
	);
};

export default TacticalToolbar;
