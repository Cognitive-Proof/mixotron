import "server-only";
import type { TrqpAuthorizationResponse } from "c2pa-react-cawg-component";
import { GOVERNORATOR_TRQP_BASE_URL } from "~/lib/trust-registry";

export interface GovernoratorAuthorizationQuery {
	entityId: string;
	authorityId: string;
	resource?: string;
	action?: string;
}

/**
 * Governorator's real TRQP `POST /authorization` (confirmed against
 * ~/Documents/GitHub/trqp/saas's @cognitiveproof/cawg-trqp http_service.js
 * and a live curl this session). Its actual response doesn't quite match
 * c2pa-react-cawg-component's TrqpAuthorizationResponse type — it has no
 * `time_requested` (we supply our own, from just before the call) and
 * carries `reason` instead of `message` — so this reshapes it rather than
 * trusting the response to already be in that shape.
 */
export async function queryGovernoratorAuthorization(
	query: GovernoratorAuthorizationQuery,
): Promise<TrqpAuthorizationResponse> {
	const time_requested = new Date().toISOString();
	// Same defaults the local mock (cawg-trust-registry.tsx) uses for an
	// enrollment that didn't name a specific resource/action.
	const action = query.action ?? "issue";
	const resource = query.resource ?? "cawg.identity";

	const response = await fetch(`${GOVERNORATOR_TRQP_BASE_URL}/authorization`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({
			entity_id: query.entityId,
			authority_id: query.authorityId,
			action,
			resource,
		}),
	});

	if (!response.ok) {
		throw new Error(
			`Governorator's trust registry returned ${response.status} — couldn't check this enrollment.`,
		);
	}

	const body = (await response.json()) as {
		entity_id: string;
		authority_id: string;
		action: string;
		resource: string;
		authorized: boolean;
		time_evaluated: string;
		reason?: string;
	};

	return {
		entity_id: body.entity_id,
		authority_id: body.authority_id,
		action: body.action,
		resource: body.resource,
		authorized: body.authorized,
		time_requested,
		time_evaluated: body.time_evaluated,
		message: body.reason,
	};
}
