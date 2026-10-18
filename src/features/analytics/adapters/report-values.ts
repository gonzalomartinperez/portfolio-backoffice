export function object(
	value: unknown,
	keys: readonly string[],
): Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value))
		throw new Error("Invalid aggregate object");
	const result: Record<string, unknown> = Object.fromEntries(
		Object.entries(value),
	);
	if (
		Object.keys(result).length !== keys.length ||
		keys.some((key) => !Object.hasOwn(result, key))
	)
		throw new Error("Invalid aggregate fields");
	return result;
}
export function member<T extends string>(
	values: readonly T[],
	value: unknown,
): T {
	for (const candidate of values) if (candidate === value) return candidate;
	throw new Error("Invalid aggregate dimension");
}
export function integer(value: unknown, minimum = 0, maximum = 310000): number {
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value < minimum ||
		value > maximum
	)
		throw new Error("Invalid aggregate count");
	return value;
}
export function rows(value: unknown, maximum: number): unknown[] {
	if (!Array.isArray(value) || value.length > maximum)
		throw new Error("Invalid aggregate rows");
	return value;
}
export function day(value: unknown): string {
	if (
		typeof value !== "string" ||
		!/^\d{4}-\d{2}-\d{2}$/.test(value) ||
		!Number.isFinite(Date.parse(value)) ||
		new Date(value).toISOString().slice(0, 10) !== value
	)
		throw new Error("Invalid aggregate date");
	return value;
}
export function timestamp(value: unknown): string | null {
	if (value === null) return null;
	if (
		typeof value !== "string" ||
		value.length > 40 ||
		!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/.test(
			value,
		) ||
		!Number.isFinite(Date.parse(value))
	)
		throw new Error("Invalid aggregate timestamp");
	day(value.slice(0, 10));
	if (
		Number(value.slice(11, 13)) > 23 ||
		Number(value.slice(14, 16)) > 59 ||
		Number(value.slice(17, 19)) > 59
	)
		throw new Error("Invalid aggregate timestamp");
	return value;
}
export function unique<T>(values: T[], key: (value: T) => string): T[] {
	const seen = new Set<string>();
	for (const value of values) {
		const identity = key(value);
		if (seen.has(identity)) throw new Error("Duplicate aggregate bucket");
		seen.add(identity);
	}
	return values;
}
