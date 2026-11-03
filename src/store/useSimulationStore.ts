import { useStore } from "zustand";

import { SimulationStore, simulationStore } from "./simulation.store";

// Custom hook selector pattern
export function useSimulationStore<T>(
	selector: (state: SimulationStore) => T
): T {
	return useStore(simulationStore, selector);
}
