import type { ProductReadPort } from "../application/read.ts";
import { readProductJson, type ProductHttpConfig } from "./read-json.ts";
import { parseProductSnapshot } from "./validate.ts";

export function createProductHttp(config: ProductHttpConfig): ProductReadPort {
	return {
		async read() {
			const result = await readProductJson(config, "v1");
			if (result.kind !== "available") return result;
			try {
				return {
					kind: "available",
					snapshot: parseProductSnapshot(result.value),
				};
			} catch {
				return { kind: "unavailable" };
			}
		},
	};
}
