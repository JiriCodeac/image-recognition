/**
 * Simple object check.
 */
export function isObject<T>(item: T): boolean {
	return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Deep merge two objects.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mergeDeep<T>(target: any, ...sources: Array<T>): Record<string, unknown> {
	if (!sources.length) {
		return target;
	}

	const source = sources.shift();

	if (isObject(target) && isObject(source)) {
		for (const key in source) {
			if (isObject(source[key])) {
				if (!target[key]) {
					Object.assign(target, {[key]: {}});
				}
				mergeDeep(target[key], source[key]);
			} else {
				Object.assign(target, {[key]: source[key]});
			}
		}
	}

	return mergeDeep(target, ...sources);
}

export async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	const chunks: Array<any> = [];
	for await (const chunk of stream) {
		chunks.push(chunk);
	}
	return Buffer.concat(chunks);
}

export function sleep(time: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, time));
}

export function formatDate(captured: Date) {
	const month = String(captured.getMonth() + 1).padStart(2, '0');
	const day = String(captured.getDate()).padStart(2, '0');
	return `${captured.getFullYear()}-${month}-${day}`;
}
