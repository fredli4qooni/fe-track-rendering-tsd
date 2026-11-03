/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export type Track = {
	id: number;
	name: string;
	lon: number;
	lat: number;
	altitude?: number;
	course?: number;
	type?: number;
	selected?: boolean;
	speed?: number;
	status?: "ACTIVE" | "STANDBY" | "ENGAGED" | "INACTIVE";
	updatedAt?: number;
};
