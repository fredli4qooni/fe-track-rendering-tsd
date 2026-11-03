/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
import { create } from "zustand";

export interface OwnShipState {
	position: [number, number];
	speed: number;
	heading: number;
	isFollowing: boolean;
	isFreeDrag: boolean;

	setPosition: (pos: [number, number]) => void;
	setSpeed: (speed: number) => void;
	setHeading: (heading: number) => void;
	setIsFollowing: (v: boolean) => void;
	setIsFreeDrag: (v: boolean) => void;
	updateOwnShip: (
		updates: Partial<
			Omit<
				OwnShipState,
				| "setPosition"
				| "setSpeed"
				| "setHeading"
				| "setIsFollowing"
				| "setIsFreeDrag"
				| "updateOwnShip"
				| "reset"
			>
		>
	) => void;
	reset: () => void;
}

const DEFAULT_CENTER: [number, number] = [118, -2];

const initialState = {
	position: DEFAULT_CENTER,
	speed: 0,
	heading: 0,
	isFollowing: true,
	isFreeDrag: true
};

const useOwnShipStore = create<OwnShipState>((set) => ({
	...initialState,
	setPosition: (position) => set({ position }),
	setSpeed: (speed) => set({ speed }),
	setHeading: (heading) => set({ heading }),
	setIsFollowing: (isFollowing) => set({ isFollowing }),
	setIsFreeDrag: (isFreeDrag) => set({ isFreeDrag }),
	updateOwnShip: (updates) => set((state) => ({ ...state, ...updates })),
	reset: () => set(initialState)
}));

export default useOwnShipStore;
