/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
type HistoryEntry = {
	id: number;
	lon: number;
	lat: number;
	course?: number;
	ts: number;
};

const histories: Map<number, HistoryEntry[]> = new Map();
let maxHistory: number | undefined = undefined;

/**
 * Record entries into the in-memory histories map and enforce maxHistory.
 * @param entries array of HistoryEntry to record
 */
function record(entries: HistoryEntry[] | undefined): void {
	if (!entries || entries.length === 0) return;
	for (const e of entries) {
		const prev = histories.get(e.id) ?? [];
		const merged = prev.concat(e);
		if (typeof maxHistory === "number" && merged.length > maxHistory) {
			histories.set(e.id, merged.slice(merged.length - maxHistory));
		} else {
			histories.set(e.id, merged);
		}
	}
}

type IncomingMessage =
	| { type: "init"; max?: number }
	| { type: "record"; entries?: HistoryEntry[] }
	| { type: "set_max"; max?: number }
	| { type: "get"; id?: number }
	| { type: "clear"; id?: number }
	| { type: "stop" };

/** Handle an incoming message payload. Separated to keep the event listener small. */
/**
 * Handle 'get' messages: reply with either a specific id's entries or a summary.
 * @param data incoming message data
 */
function handleGet(data: Extract<IncomingMessage, { type: "get" }>) {
	if (typeof data.id === "number") {
		postMessage({
			type: "get_response",
			id: data.id,
			entries: histories.get(data.id) ?? []
		});
		return;
	}
	const summary: { id: number; length: number }[] = [];
	for (const [k, v] of histories.entries())
		summary.push({ id: k, length: v.length });
	postMessage({ type: "get_all_summary", summary });
}

/**
 * Handle 'set_max' messages by updating the global max and trimming existing histories.
 * @param data incoming message data
 */
function handleSetMax(data: Extract<IncomingMessage, { type: "set_max" }>) {
	maxHistory = typeof data.max === "number" ? data.max : undefined;
	if (typeof maxHistory === "number") {
		for (const [id, arr] of histories.entries()) {
			if (arr.length > maxHistory)
				histories.set(id, arr.slice(arr.length - maxHistory));
		}
	}
}

/**
 * Handle an incoming message payload. Separated to keep the event listener small.
 * @param data incoming message payload
 */
function handleIncoming(data: IncomingMessage | undefined): void {
	if (!data?.type) return;
	switch (data.type) {
		case "init":
			if (typeof data.max === "number") maxHistory = data.max;
			break;
		case "record":
			record(data.entries);
			break;
		case "set_max":
			handleSetMax(data);
			break;
		case "get":
			handleGet(data);
			break;
		case "clear":
			if (typeof data.id === "number") histories.delete(data.id);
			else histories.clear();
			break;
		case "stop":
			break;
		default:
			break;
	}
}

addEventListener("message", (ev: MessageEvent) => {
	handleIncoming(ev.data as IncomingMessage | undefined);
});
