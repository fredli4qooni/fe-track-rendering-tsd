import { createStore } from "zustand/vanilla";

import { EntityType } from "../types/entity.types";

export interface SimulationState {
	selectedEntityId: number | null;
	hoveredEntityId: number | null;
	visibleTypes: EntityType[];
}

export interface SimulationActions {
	selectEntity: (id: number | null) => void;
	hoverEntity: (id: number | null) => void;
	toggleTypeVisibility: (type: EntityType) => void;
}

export type SimulationStore = SimulationState & SimulationActions;

export const simulationStore = createStore<SimulationStore>((set) => ({
	selectedEntityId: null,
	hoveredEntityId: null, // Init null
	visibleTypes: [
		EntityType.FRIENDLY,
		EntityType.HOSTILE,
		EntityType.UNKNOWN,
		EntityType.NEUTRAL
	],

	selectEntity: (id) => set({ selectedEntityId: id }),
	hoverEntity: (id) => set({ hoveredEntityId: id }),

	toggleTypeVisibility: (type) =>
		set((state) => {
			const types = state.visibleTypes;
			if (types.includes(type)) {
				return { visibleTypes: types.filter((t) => t !== type) };
			} else {
				return { visibleTypes: [...types, type] };
			}
		})
}));
