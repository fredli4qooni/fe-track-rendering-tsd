/**
 * Tactical Situation Display (TSD)
 * Author: Fredli Fourqoni
 */
/**
 * Waits for a promise to settle (resolve or reject). If it settles within `timeoutMs`,
 * the result will be delayed to make sure it takes at least `timeoutMs`.
 * If it does not settle within that time, it rejects with a timeout error.
 *
 * @template T - Promise result type.
 * @param promise - The promise to wrap.
 * @param timeoutMs - Maximum wait time in ms (default: 300ms).
 * @returns Promise<T>
 */
export const withTimeout = <T>(
	promise: Promise<T>,
	timeoutMs = 300
): Promise<T> => {
	const start = Date.now();

	return new Promise<T>((resolve, reject) => {
		let settled = false;

		// Handle resolve
		promise
			.then((value) => {
				if (settled) return;
				settled = true;

				const elapsed = Date.now() - start;
				const remaining = timeoutMs - elapsed;

				if (remaining > 0) {
					setTimeout(() => resolve(value), remaining);
				} else {
					resolve(value);
				}
			})
			.catch((error) => {
				if (settled) return;
				settled = true;

				const normalized =
					error instanceof Error ? error : new Error(String(error));
				const elapsed = Date.now() - start;
				const remaining = timeoutMs - elapsed;

				if (remaining > 0) {
					setTimeout(() => reject(normalized), remaining);
				} else {
					reject(normalized);
				}
			});

		// Timeout enforcement
		setTimeout(() => {
			if (!settled) {
				settled = true;
				reject(new Error("Timeout"));
			}
		}, timeoutMs);
	});
};
