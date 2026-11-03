/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
export type RaycastCandidate = {
	id: number;
	index: number;
	x: number;
	y: number;
	size: number;
};

/**
 * Hit-test a point against an array of RaycastCandidate items and return the nearest candidate
 * whose square bounding area contains the specified point.
 *
 * @param px - X coordinate of the point to test.
 * @param py - Y coordinate of the point to test.
 * @param candidates - Array of RaycastCandidate objects to test against.
 * @returns The nearest RaycastCandidate whose bounding square contains the point, or null if none found.
 */
export function hitTestPoint(
	px: number,
	py: number,
	candidates: RaycastCandidate[]
): RaycastCandidate | null {
	let best: RaycastCandidate | null = null;
	let bestDist = Number.POSITIVE_INFINITY;

	for (const c of candidates) {
		if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) {
			continue;
		}

		if (c.x === -10000 && c.y === -10000) {
			continue;
		}

		const half = c.size * 0.5;
		const left = c.x - half;
		const right = c.x + half;
		const top = c.y - half;
		const bottom = c.y + half;
		if (px >= left && px <= right && py >= top && py <= bottom) {
			const dx = px - c.x;
			const dy = py - c.y;
			const dist = dx * dx + dy * dy;
			if (dist < bestDist) {
				bestDist = dist;
				best = c;
			}
		}
	}

	return best;
}

/**
 * Find the nearest candidate to the specified point using the same hit-test logic.
 *
 * @param px - X coordinate of the point to test.
 * @param py - Y coordinate of the point to test.
 * @param candidates - Array of RaycastCandidate objects to search.
 * @returns The nearest RaycastCandidate whose bounding square contains the point, or null if none found.
 */
export function findNearestCandidate(
	px: number,
	py: number,
	candidates: RaycastCandidate[]
): RaycastCandidate | null {
	return hitTestPoint(px, py, candidates);
}

export type RaycastHandler = (candidate: RaycastCandidate | null) => void;

export interface RaycastProvider {
	id: string;
	getCandidates?: () => RaycastCandidate[];

	getCandidatesAt?: (px: number, py: number) => RaycastCandidate[];
	onClick?: RaycastHandler;
	onHover?: RaycastHandler;
	priority?: number;
}

class RaycastRegistry {
	private readonly providers = new Map<string, RaycastProvider>();
	private lastHover: {
		providerId: string;
		candidate: RaycastCandidate;
	} | null = null;
	private lastClickTime = 0;
	private lastClickX: number | null = null;
	private lastClickY: number | null = null;

	/**
	 * Register a RaycastProvider with the registry.
	 *
	 * @param provider - The RaycastProvider to register.
	 */
	register(provider: RaycastProvider) {
		this.providers.set(provider.id, provider);
	}

	/**
	 * Unregister a RaycastProvider from the registry.
	 *
	 * Removes the provider with the given id from the internal providers map.
	 *
	 * @param id - The identifier of the provider to remove.
	 */
	unregister(id: string) {
		this.providers.delete(id);
	}

	/**
	 * Return an array of registered providers sorted by descending priority.
	 *
	 * Providers without an explicit priority are treated as having priority 0.
	 *
	 * @returns {RaycastProvider[]} Sorted array of RaycastProvider instances.
	 */
	private sortProviders() {
		return Array.from(this.providers.values()).sort(
			(a, b) => (b.priority ?? 0) - (a.priority ?? 0)
		);
	}

	/**
	 * Find the best (nearest) candidate from registered providers for the given point.
	 *
	 * This method queries each registered provider (respecting priority order) for candidates
	 * and returns the nearest candidate whose hit-test contains the point, along with the
	 * provider that supplied it.
	 *
	 * @param px - X coordinate of the point to test.
	 * @param py - Y coordinate of the point to test.
	 * @returns An object with the provider and candidate, or null if none found.
	 */
	public findBestCandidate(
		px: number,
		py: number
	): { provider: RaycastProvider; candidate: RaycastCandidate } | null {
		let best: {
			provider: RaycastProvider;
			candidate: RaycastCandidate;
		} | null = null;
		for (const provider of this.sortProviders()) {
			let candidates: RaycastCandidate[] = [];
			if (provider.getCandidatesAt) {
				candidates = provider.getCandidatesAt(px, py);
			} else if (provider.getCandidates) {
				candidates = provider.getCandidates();
			} else {
				continue;
			}
			const cand = findNearestCandidate(px, py, candidates);
			if (!cand) continue;
			const dist =
				(cand.x - px) * (cand.x - px) + (cand.y - py) * (cand.y - py);
			if (best === null) {
				best = { provider, candidate: cand };
			} else {
				const bestDist =
					(best.candidate.x - px) * (best.candidate.x - px) +
					(best.candidate.y - py) * (best.candidate.y - py);
				if (dist < bestDist) {
					best = { provider, candidate: cand };
				}
			}
		}
		return best;
	}

	/**
	 * Dispatch a hover event for the point (px, py) to the best matching provider.
	 *
	 * Queries registered providers for candidates and calls the matched provider's onHover
	 * handler with the nearest candidate, or clears the previous hover if none found.
	 *
	 * @param px - X coordinate of the hover point.
	 * @param py - Y coordinate of the hover point.
	 * @returns The provider and candidate that received the hover, or null if none.
	 */
	public dispatchHover(px: number, py: number) {
		const best = this.findBestCandidate(px, py);

		if (!best) {
			if (this.lastHover) {
				const prev = this.providers.get(this.lastHover.providerId);
				try {
					prev?.onHover?.(null);
				} catch (err) {
					console.error("Raycast onHover handler threw (clear)", err);
				}
				this.lastHover = null;
			}
			return null;
		}

		if (this.lastHover && this.lastHover.providerId !== best.provider.id) {
			const prev = this.providers.get(this.lastHover.providerId);
			try {
				prev?.onHover?.(null);
			} catch (err) {
				console.error("Raycast onHover handler threw (clear)", err);
			}
			this.lastHover = null;
		}

		if (
			this.lastHover &&
			this.lastHover.providerId === best.provider.id &&
			this.lastHover.candidate.id === best.candidate.id
		) {
			return best;
		}
		try {
			best.provider.onHover?.(best.candidate);
		} catch (err) {
			console.error("Raycast onHover handler threw", err);
		}
		this.lastHover = {
			providerId: best.provider.id,
			candidate: best.candidate
		};
		return best;
	}

	/**
	 * Dispatch a click event at the specified point (px, py) to the best matching provider.
	 *
	 * This queries registered providers for candidates and invokes the matched provider's
	 * onClick handler with the nearest candidate, if any.
	 *
	 * @param px - X coordinate of the click point.
	 * @param py - Y coordinate of the click point.
	 * @returns The provider and candidate that received the click, or null if none found.
	 */
	public dispatchClick(px: number, py: number) {
		const now = Date.now();
		const sameAsLast =
			this.lastClickX === px &&
			this.lastClickY === py &&
			now - this.lastClickTime < 50;
		if (sameAsLast) return null;

		const best = this.findBestCandidate(px, py);
		if (!best) return null;
		try {
			best.provider.onClick?.(best.candidate);
		} catch (err) {
			console.error("Raycast onClick handler threw", err);
		}
		this.lastClickTime = now;
		this.lastClickX = px;
		this.lastClickY = py;
		return best;
	}
}

export const Raycaster = new RaycastRegistry();
