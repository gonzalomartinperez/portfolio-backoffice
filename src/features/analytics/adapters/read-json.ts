import { readBoundedJson } from "../../../shared/http/bounded-json.ts";

export interface ProductHttpConfig {
	enabled: boolean;
	origin: string | undefined;
	token: string | undefined;
	request?: typeof fetch;
}

export async function readProductJson(
	{ enabled, origin, token, request = fetch }: ProductHttpConfig,
	version: "v1" | "v2",
	search?: URLSearchParams,
): Promise<
	| { kind: "disabled" }
	| { kind: "unavailable" }
	| { kind: "available"; value: unknown }
> {
	if (!enabled) return { kind: "disabled" };
	if (!origin || !token) return { kind: "unavailable" };
	try {
		const url = new URL(origin);
		if (
			!["http:", "https:"].includes(url.protocol) ||
			url.username ||
			url.password ||
			url.pathname !== "/" ||
			url.search ||
			url.hash
		)
			return { kind: "unavailable" };
		url.pathname = `/internal/ops/${version}/product-analytics`;
		if (search) url.search = search.toString();
		const response = await request(url, {
			headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
			cache: "no-store",
			credentials: "omit",
			redirect: "error",
			signal: AbortSignal.timeout(5000),
		});
		if (!response.ok) {
			await response.body?.cancel();
			return { kind: "unavailable" };
		}
		return { kind: "available", value: await readBoundedJson(response) };
	} catch {
		return { kind: "unavailable" };
	}
}
