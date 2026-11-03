/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { create } from "zustand";

const initialState = {
	isMeasuring: false,
	showOwnShip: true
};

type UIState = typeof initialState & {
	setIsMeasuring: (measuring: boolean) => void;
	toggleMeasuring: () => void;
	reset: () => void;
	setShowOwnShip: (visible: boolean) => void;
};

const useUIStore = create<UIState>((set) => ({
	...initialState,
	setIsMeasuring: (measuring) => set({ isMeasuring: measuring }),
	toggleMeasuring: () => set((state) => ({ isMeasuring: !state.isMeasuring })),
	setShowOwnShip: (visible) => set({ showOwnShip: visible }),
	reset: () => set(initialState)
}));

export default useUIStore;
