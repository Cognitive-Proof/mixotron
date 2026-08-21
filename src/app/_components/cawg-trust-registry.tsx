"use client";

import {
	setTrustRegistryQueryFn,
	type TrqpAuthorizationResponse,
} from "c2pa-react-cawg-component";
import { useEffect } from "react";
import {
	MIXOTRON_ICA_ISSUER_DID,
	MIXOTRON_TRUST_AUTHORITY_ID,
} from "~/lib/trust-registry";

/**
 * There's no real TRQP (Trust Registry Query Protocol) endpoint anywhere in
 * this stack — mixotron doesn't operate one, and there's no public one to
 * point at either. Without *some* queryFn registered, c2pa-react-cawg-
 * component's TrustBadge throws on every render (queryTrustRegistry()'s
 * default implementation always throws). This is a local stand-in that
 * recognizes only mixotron's own self-attestation issuer DID (see
 * ../../server/signing/test-certs/README.md) as "authorized", the same way
 * the package's own dev playground mocks it
 * (c2pa-react-cawg-component/src/dev/App.tsx) — so the badge shows an
 * honest, locally-scoped result instead of erroring out.
 */
export function CawgTrustRegistry() {
	useEffect(() => {
		setTrustRegistryQueryFn(
			async ({
				entityId,
				action = "issue",
				resource = "cawg.identity",
			}): Promise<TrqpAuthorizationResponse> => {
				const time_requested = new Date().toISOString();
				const known = entityId === MIXOTRON_ICA_ISSUER_DID;

				return {
					entity_id: entityId,
					authority_id: known ? MIXOTRON_TRUST_AUTHORITY_ID : "unknown",
					action,
					resource,
					authorized: known,
					time_requested,
					time_evaluated: new Date().toISOString(),
					message: known
						? "Mix-O-Tron's own local test registry — self-attested, not a real TRQP-compliant trust authority."
						: `No local trust registry record for "${entityId}".`,
				};
			},
		);
	}, []);

	return null;
}
