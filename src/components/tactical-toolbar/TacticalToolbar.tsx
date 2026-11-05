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
	AiOutlineThunderbolt,
	AiOutlineWarning
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
	const clearSyncError = useTrackStore((state) => state.clearSyncError);
	const loadFromBackend = useTrackStore((state) => state.loadFromBackend);
	const saveNewTrackToBackend = useTrackStore(
		(state) => state.saveNewTrackToBackend
	);
	const syncHealthCheck = useTrackStore((state) => state.syncHealthCheck);
	const ownShipPos = useOwnShipStore((state) => state.position);

	const [showBenchmark, setShowBenchmark] = useState<boolean>(false);
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
			setError(valResult.error ?? "Invalid quantity");
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
	 * Load tactical entities persisted in the Go PostgreSQL + PostGIS backend.
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
				`Clear all (${tracks.length.toLocaleString()}) entities from the map?`
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
							? "Connected to Go Backend REST API (PostgreSQL + PostGIS)"
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
					title="Fetch and synchronize entities from Go backend database (PostgreSQL + PostGIS)"
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
								? "Add 1 new tactical entity near own ship (persisted to PostgreSQL + PostGIS database)"
								: "Backend Offline — Start backend service (go run ./cmd/server/main.go) to add entities"
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
						title="Clear all entities from current map view (retains database records)"
					>
						<AiOutlineClear size={13} />
						<span>Clear</span>
					</button>
				</div>

				{/* Toggle WebGL Benchmark Button */}
				<div className="flex items-center pl-2 ml-1 border-l border-neutral-4/70">
					<button
						type="button"
						onClick={() => setShowBenchmark((prev) => !prev)}
						className={`flex items-center gap-1.5 px-2.5 py-1 rounded transition-all text-[11px] font-medium border ${
							showBenchmark
								? "bg-amber-600/90 border-amber-400 text-white shadow-md shadow-amber-950/60"
								: "bg-amber-950/30 hover:bg-amber-900/50 border-amber-500/40 text-amber-300"
						}`}
						title="Open WebGL GPU benchmark panel"
					>
						<AiOutlineThunderbolt size={13} className="text-amber-400" />
						<span>Benchmark</span>
					</button>
				</div>
			</div>

			{/* WebGL Benchmark Infobox & Controls Panel */}
			{showBenchmark && (
				<div className="w-[450px] p-3.5 bg-neutral-5/95 backdrop-blur-md border border-amber-500/50 rounded-xl shadow-2xl text-white text-xs flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-150">
					{/* Header */}
					<div className="flex items-center justify-between pb-2 border-b border-neutral-4/70">
						<div className="flex items-center gap-2">
							<AiOutlineThunderbolt className="text-amber-400" size={16} />
							<span className="font-bold text-amber-300 text-[12px] tracking-wide">
								WebGL Hardware Benchmark (GPU Stress-Test)
							</span>
						</div>
						<button
							type="button"
							onClick={() => setShowBenchmark(false)}
							className="text-neutral-3 hover:text-white px-1.5 py-0.5 rounded text-xs hover:bg-neutral-4 transition-colors"
							title="Close benchmark panel"
						>
							✕
						</button>
					</div>

					{/* Infobox Explanation */}
					<div className="p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-lg text-amber-200/90 text-[11px] leading-relaxed">
						<p className="font-semibold text-amber-300 mb-1">
							Purpose of WebGL Benchmark:
						</p>
						<p>
							This feature is designed specifically to test WebGL2 GPU
							instancing rendering throughput on your hardware display with 50
							to 10,000 tactical contacts.
						</p>
						<p className="mt-1.5 text-[10px] text-amber-400/90 bg-black/40 p-1.5 rounded border border-amber-500/20">
							<strong>Notice (In-Memory Simulation Only):</strong> All benchmark
							entities are generated purely in local GPU memory and are NOT
							persisted to the PostgreSQL + PostGIS backend database, preserving
							operational data integrity.
						</p>
					</div>

					{/* Controls */}
					<div className="flex items-center justify-between pt-1">
						<div className="flex items-center gap-2">
							<span className="text-neutral-3 text-[11px]">Entity Load:</span>
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
									className="bg-black/60 border border-neutral-4 text-white text-xs px-2.5 py-1 rounded focus:outline-none focus:border-amber-400 cursor-pointer"
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
										title="Cancel custom"
									>
										✕
									</button>
								</div>
							)}
						</div>

						<button
							type="button"
							onClick={handleSpawn}
							disabled={isSpawning}
							className="flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium rounded transition-colors shadow-md text-xs"
							title="Spawn tracks to GPU for WebGL performance testing"
						>
							<AiOutlineReload
								className={isSpawning ? "animate-spin" : ""}
								size={13}
							/>
							<span>{isSpawning ? "Rendering..." : "Generate to GPU"}</span>
						</button>
					</div>
				</div>
			)}

			{/* Detailed Error / Status Notification Banner */}
			{(error || syncError) && (
				<div className="w-[450px] p-3 bg-red-950/95 backdrop-blur-md border border-red-500/80 text-red-200 text-xs rounded-xl shadow-2xl flex flex-col gap-2 animate-in fade-in slide-in-from-top-1 duration-150">
					<div className="flex items-start justify-between border-b border-red-800/60 pb-1.5">
						<div className="flex items-center gap-2 text-red-300 font-semibold text-[12px]">
							<AiOutlineWarning size={15} className="text-red-400" />
							<span>
								{syncError
									? "Backend Service Disconnected"
									: "Input Validation Failed"}
							</span>
						</div>
						<button
							type="button"
							onClick={() => {
								setError(null);
								clearSyncError();
							}}
							className="text-red-300 hover:text-white px-1.5 py-0.5 rounded text-xs hover:bg-red-900/60 transition-colors"
							title="Dismiss alert"
						>
							✕
						</button>
					</div>

					<div className="text-[11px] text-red-200 leading-relaxed">
						<p>{error || syncError}</p>

						{syncError && (
							<div className="mt-2 p-2.5 bg-black/50 border border-red-500/30 rounded-lg text-[10px] text-neutral-2">
								<div className="text-amber-300 font-semibold mb-1 flex items-center gap-1">
									<span>Troubleshooting Guide:</span>
								</div>
								<ol className="list-decimal list-inside space-y-1 text-neutral-3 font-mono">
									<li>
										Open a new terminal in the backend directory:
										<div className="text-cyan-300 pl-4 py-0.5 select-all font-sans">
											cd
											C:\Users\fredl\PROJECTS\leniot-intern\be-explore-maptalks
										</div>
									</li>
									<li>
										Run the API server:
										<div className="text-emerald-300 font-bold pl-4 py-0.5 select-all">
											go run ./cmd/server/main.go
										</div>
									</li>
									<li>
										After server is active on port{" "}
										<span className="text-white">:8080</span>, click{" "}
										<strong>&quot;Retry Connection&quot;</strong> below.
									</li>
								</ol>
							</div>
						)}
					</div>

					{syncError && (
						<div className="flex justify-end pt-1">
							<button
								type="button"
								onClick={() => {
									void syncHealthCheck().then((online) => {
										if (online) {
											void loadFromBackend();
										}
									});
								}}
								disabled={isSyncing}
								className="px-3 py-1 bg-red-800 hover:bg-red-700 disabled:opacity-50 text-white rounded text-[11px] transition-colors flex items-center gap-1.5 font-medium shadow-sm"
							>
								<AiOutlineReload
									className={isSyncing ? "animate-spin" : ""}
									size={12}
								/>
								<span>{isSyncing ? "Connecting..." : "Retry Connection"}</span>
							</button>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default TacticalToolbar;
