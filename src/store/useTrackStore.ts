/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { useStore } from "zustand";
import { trackStore, TrackState } from "./track.store";

export type { Track } from "@type/track.types";
export type { TrackState } from "./track.store";

/**
 * React adapter hook for the tactical track store.
 * Supports selector pattern and direct store API access (getState, setState, subscribe).
 * @param selector - Optional state selector function
 * @returns Selected slice of track state
 */
export function useTrackStore<T = TrackState>(
	selector?: (state: TrackState) => T
): T {
	return useStore(
		trackStore,
		selector ?? ((s) => s as unknown as T)
	);
}

useTrackStore.getState = trackStore.getState;
useTrackStore.setState = trackStore.setState;
useTrackStore.subscribe = trackStore.subscribe;

export default useTrackStore;
