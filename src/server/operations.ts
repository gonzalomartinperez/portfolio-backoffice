import "server-only";
import { createFeedbackHttp } from "../features/operations/adapters/feedback-http";
import { readFeedback } from "../features/operations/application/read-feedback";
import { readOperations } from "../features/operations/application/read";
import { createOperationsHttp } from "../features/operations/adapters/http";
import { validateGrafanaDestination } from "../features/operations/adapters/grafana-link";
export function loadGrafanaDestination() {
	return validateGrafanaDestination(process.env.OPERATIONS_GRAFANA_URL);
}
export function loadOperations() {
	return readOperations(
		createOperationsHttp({
			origin: process.env.OPERATIONS_API_ORIGIN,
			token: process.env.OPERATIONS_READ_TOKEN,
		}),
	);
}

export function loadFeedback() {
	return readFeedback(
		createFeedbackHttp({
			enabled: process.env.FEEDBACK_OVERVIEW_ENABLED === "true",
			origin: process.env.OPERATIONS_API_ORIGIN,
			token: process.env.OPERATIONS_READ_TOKEN,
		}),
	);
}
