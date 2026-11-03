/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import React, { useEffect, useState } from "react";
import {
	AiOutlineClear,
	AiOutlineDatabase,
	AiOutlinePlus,
	AiOutlineReload,
	AiOutlineThunderbolt
} from "react-icons/ai";
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
 * Also provides real-time Go backend database synchronization controls.
 * @returns React functional component rendering the top tactical action bar
 */
export const TacticalToolbar: React.FC = () => {
	const tracks = useTrackStore((state) => state.tracks);
	const setTracks = useTrackStore((state) => state.setTracks);
	const isBackendOnline = useTrackStore((state) => state.isBackendOnline);
	const isSyncing = useTrackStore((state) => state.isSyncing);
	const syncError = useTrackStore((state) => state.syncError);
	const loadFromBackend = useTrackStore((state) => state.loadFromBackend);
	const saveNewTrackToBackend = useTrackStore(
		(state) => state.saveNewTrackToBackend
	);
	const syncHealthCheck = useTrackStore((state) => state.syncHealthCheck);
	const ownShipPos = useOwnShipStore((state) => state.position);

	const [selectedPreset, setSelectedPreset] = useState<number>(2000);
	const [customCount, setCustomCount] = useState<string>("");
	const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isSpawning, setIsSpawning] = useState<boolean>(false);

	// Check backend health periodically
	useEffect(() => {
		void syncHealthCheck();
		const timer = setInterval(() => {
			void syncHealthCheck();
		}, 10000);
		return () => clearInterval(timer);
	}, [syncHealthCheck]);

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
	 * Quickly add a single new tactical entity near own ship and persist to backend if online.
	 */
	const handleQuickAdd = () => {
		const nextId =
			tracks.length > 0 ? Math.max(...tracks.map((t) => t.id)) + 1 : 1;
		const rawTrack = generateSingleTrack(nextId, ownShipPos[0], ownShipPos[1]);
		void saveNewTrackToBackend(rawTrack);
	};

	/**
	 * Load tactical entities persisted in the Go SQLite backend.
	 */
	const handleLoadBackend = () => {
		setError(null);
		useTrackHistoryStore.getState().clearHistory();
		void loadFromBackend();
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

				{/* Backend Connection Badge */}
				<div
					className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] ${
						isBackendOnline
							? "bg-emerald-950/70 border-emerald-500/50 text-emerald-300"
							: "bg-amber-950/70 border-amber-500/50 text-amber-300"
					}`}
					title={
						isBackendOnline
							? "Connected to Go Backend REST API (SQLite)"
							: "Backend offline — running local in-memory simulation"
					}
				>
					<span
						className={`w-2 h-2 rounded-full ${
							isBackendOnline ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
						}`}
					/>
					<span>{isBackendOnline ? "DB: Online" : "DB: Standalone"}</span>
				</div>

				{/* Load from Backend Button */}
				<button
					type="button"
					onClick={handleLoadBackend}
					disabled={isSyncing}
					className="flex items-center gap-1 px-2.5 py-1 bg-neutral-4/60 hover:bg-neutral-4/90 disabled:opacity-50 text-neutral-1 font-medium rounded transition-colors"
					title="Ambil dan sinkronisasikan entity resmi dari database backend Go (SQLite)"
				>
					<AiOutlineDatabase
						className={isSyncing ? "animate-spin" : ""}
						size={13}
					/>
					<span>{isSyncing ? "Loading DB..." : "Load DB"}</span>
				</button>

				{/* Operational Quick Action Buttons (Database Synced) */}
				<div className="flex items-center gap-1 pl-2 border-l border-neutral-4/70">
					<button
						type="button"
						onClick={handleQuickAdd}
						disabled={!isBackendOnline || isSyncing}
						className="flex items-center gap-1 px-2 py-1 bg-primary-20 hover:bg-primary-20/80 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded transition-colors"
						title={
							isBackendOnline
								? "Tambah 1 entity baru di dekat kapal sendiri (tersimpan ke database SQLite)"
								: "Backend Go Offline — Jalankan backend (go run ./cmd/server/main.go) untuk menambah entitas resmi"
						}
					>
						<AiOutlinePlus size={13} />
						<span>+1 Track</span>
					</button>

					<button
						type="button"
						onClick={handleClearAll}
						disabled={tracks.length === 0}
						className="flex items-center gap-1 px-2 py-1 bg-red-900/60 hover:bg-red-800 disabled:opacity-30 text-red-200 rounded transition-colors"
						title="Bersihkan semua entity dari tampilan peta"
					>
						<AiOutlineClear size={13} />
						<span>Clear</span>
					</button>
				</div>

				{/* WebGL Hardware Benchmark / Stress-Test Section (In-Memory GPU Simulation Only) */}
				<div
					className="flex items-center gap-1.5 pl-2.5 ml-1 border-l-2 border-amber-500/40 bg-amber-950/20 px-2 py-0.5 rounded border border-amber-500/20"
					title="Mode Benchmark Hardware WebGL: Uji beban rendering ribuan entitas di GPU lokal (in-memory simulation, tidak disimpan ke database)"
				>
					<div className="flex items-center gap-1 text-amber-300 font-semibold text-[11px] whitespace-nowrap">
						<AiOutlineThunderbolt size={13} className="text-amber-400" />
						<span>⚡ Benchmark:</span>
					</div>

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
							className="bg-black/60 border border-neutral-4 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-400 cursor-pointer"
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
								className="w-24 bg-black/60 border border-neutral-4 text-white text-xs px-2 py-1 rounded focus:outline-none focus:border-amber-400"
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
						className="flex items-center gap-1 px-2.5 py-1 bg-amber-700/80 hover:bg-amber-600 disabled:opacity-50 text-white font-medium rounded transition-colors shadow-sm"
						title="Spawn tracks secara lokal untuk benchmark rendering WebGL di GPU"
					>
						<AiOutlineReload
							className={isSpawning ? "animate-spin" : ""}
							size={13}
						/>
						<span>{isSpawning ? "Spawning..." : "Generate"}</span>
					</button>
				</div>
			</div>

			{/* Inline Error Toast if any */}
			{(error || syncError) && (
				<div className="px-3 py-1.5 bg-red-950/90 border border-red-500/80 text-red-200 text-xs rounded shadow-lg animate-pulse">
					⚠ {error || syncError}
				</div>
			)}
		</div>
	);
};

export default TacticalToolbar;
