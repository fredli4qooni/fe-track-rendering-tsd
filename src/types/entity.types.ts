import friendlySuspected from "@assets/icons/friendly-suspected-position.png";
import hostileConfirmed from "@assets/icons/hostile-surface-confirmed.png";
import hostileUnconfirmed from "@assets/icons/hostile-surface-unconfirmed.png";
import supportPoint from "@assets/icons/support-point.png";
import unknownSurface from "@assets/icons/unknown-surface.png";
import waypoint from "@assets/icons/waypoint.png";

export enum EntityType {
	FRIENDLY = 0,
	HOSTILE = 1,
	UNKNOWN = 2,
	NEUTRAL = 3
}

export enum EntityStatus {
	ACTIVE = "active",
	INACTIVE = "inactive",
	DESTROYED = "destroyed"
}

export interface TacticalEntity {
	id: number;
	callsign: string;
	type: EntityType;
	status: EntityStatus;
}

export type TacticalCategory = "friendly" | "hostile" | "neutral" | "unknown" | "nav";

export interface TrackTypeMeta {
	type: number;
	label: string;
	category: TacticalCategory;
	color: string;
	badgeBg: string;
	iconUrl: string;
	description: string;
}

export const TRACK_TYPE_META: Record<number, TrackTypeMeta> = {
	0: {
		type: 0,
		label: "Friendly Suspected",
		category: "friendly",
		color: "#00E5FF",
		badgeBg: "bg-cyan-900/60 text-cyan-300 border-cyan-500/50",
		iconUrl: friendlySuspected,
		description: "Presumed allied vessel or sensor awaiting positive IFF confirmation."
	},
	1: {
		type: 1,
		label: "Hostile Confirmed",
		category: "hostile",
		color: "#FF1744",
		badgeBg: "bg-red-900/60 text-red-300 border-red-500/50",
		iconUrl: hostileConfirmed,
		description: "Positively identified threat / adversary surface target."
	},
	2: {
		type: 2,
		label: "Hostile Unconfirmed",
		category: "hostile",
		color: "#FF9100",
		badgeBg: "bg-amber-900/60 text-amber-300 border-amber-500/50",
		iconUrl: hostileUnconfirmed,
		description: "Suspected hostile contact exhibiting aggressive or uncooperative profile."
	},
	3: {
		type: 3,
		label: "Support Point",
		category: "neutral",
		color: "#00E676",
		badgeBg: "bg-emerald-900/60 text-emerald-300 border-emerald-500/50",
		iconUrl: supportPoint,
		description: "Forward operating base, supply vessel, or tactical staging point."
	},
	4: {
		type: 4,
		label: "Unknown Surface",
		category: "unknown",
		color: "#FFEA00",
		badgeBg: "bg-yellow-900/60 text-yellow-300 border-yellow-500/50",
		iconUrl: unknownSurface,
		description: "Unidentified radar or AIS blip pending visual/electronic recognition."
	},
	5: {
		type: 5,
		label: "Waypoint",
		category: "nav",
		color: "#B0BEC5",
		badgeBg: "bg-slate-800/60 text-slate-300 border-slate-500/50",
		iconUrl: waypoint,
		description: "Tactical navigational reference waypoint or patrol checkpoint."
	}
};

export const getTrackTypeMeta = (type: number = 4): TrackTypeMeta => {
	return TRACK_TYPE_META[type] ?? TRACK_TYPE_META[4];
};

export const AVAILABLE_TRACK_TYPES = Object.values(TRACK_TYPE_META);
