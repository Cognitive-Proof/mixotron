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
import { api } from "~/trpc/react";

/**
 * Registers the global default queryFn that c2pa-react-cawg-component's
 * CAWGManifest rendering calls automatically for every trust badge that
 * doesn't get an explicit per-instance queryFn — as of @0.1.14, that
 * includes every credentialSubject.c2paAsset.trust_registry entry it finds
 * (via useTrustRegistrySummary), not just the generic top-level identity
 * badge. Two cases, told apart by authorityId:
 *
 *  - No authorityId, or authorityId is mixotron's own: this is the
 *    generic self-attestation identity badge. Mixotron doesn't operate a
 *    real TRQP endpoint for its own DIDs, so this is answered from a local
 *    stand-in, the same way the package's own dev playground mocks it
 *    (c2pa-react-cawg-component/src/dev/App.tsx) — honest, locally-scoped,
 *    not a real verification.
 *  - A different, real authorityId: a genuine trust_registry claim (see
 *    buildTrustRegistryClaims) — proxied to
 *    manifest.checkTrustRegistryAuthorization, a real live call to
 *    Governorator's TRQP service, so the credential's own built-in
 *    trust-registry display shows real data with no page-specific code.
 */
export function CawgTrustRegistry() {
	const utils = api.useUtils();

	useEffect(() => {
		setTrustRegistryQueryFn(
			async ({
				entityId,
				action = "issue",
				resource = "cawg.identity",
				authorityId,
			}): Promise<TrqpAuthorizationResponse> => {
				if (authorityId && authorityId !== MIXOTRON_TRUST_AUTHORITY_ID) {
					return utils.manifest.checkTrustRegistryAuthorization.fetch({
						entityId,
						authorityId,
						action,
						resource,
					});
				}

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
	}, [utils]);

	return null;
}
