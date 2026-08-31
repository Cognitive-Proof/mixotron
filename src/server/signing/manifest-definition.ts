import {
	addCawgMetadataAssertion,
	type IcaVerifiedIdentity,
	type TrustRegistryClaim,
} from "c2pa-rs-javascript-library";
import {
	type Profile,
	TRAINING_CATEGORIES,
	type VerifiedIdentityEntry,
} from "~/lib/profile";
import {
	GOVERNORATOR_TRQP_BASE_URL,
	MIXOTRON_TRUST_AUTHORITY_ID,
} from "~/lib/trust-registry";

export interface AiDisclosureInput {
	modelType: string;
	modelName: string;
	modelIdentifier: string;
	humanOversightLevel: string;
}

export interface ManifestDefinitionInput {
	title: string;
	description: string;
	creationOrigin: "created" | "opened";
	digitalSourceType: string;
	actions: string[];
	aiDisclosure: AiDisclosureInput | null;
	/** Null when authoring with "No profile — skip CAWG": every CAWG-specific
	 * assertion (creative-work attribution, training-mining, CAWG metadata,
	 * and — separately, in manifest.ts — cawg.identity) is omitted, leaving
	 * a plain C2PA manifest. */
	profile: Profile | null;
}

const ROLE_TO_SCHEMA_ORG_FIELD: Record<
	Profile["defaultRoles"][number],
	string
> = {
	"cawg.creator": "creator",
	"cawg.contributor": "contributor",
	"cawg.editor": "editor",
	"cawg.producer": "producer",
	"cawg.publisher": "publisher",
	"cawg.sponsor": "sponsor",
	"cawg.translator": "translator",
};

/**
 * stds.schema-org.CreativeWork — a plain assertion c2pa-react-cawg-component
 * renders at its L3 disclosure level. Author/creator come from the selected
 * profile; role fields (producer, editor, etc.) are set for whichever of the
 * profile's CAWG creator roles apply, so the assertion reflects what the
 * creator actually declared rather than a generic "creator" default.
 *
 * `author` is an array of Schema.org Person/Organization objects and
 * `publisher` a single one — not bare strings — because c2pa-react-component's
 * own manifest-detail summary (formatCreativeWork in
 * levels/L3/formatAssertion.ts) specifically reads `author?.[0]?.name` and
 * `publisher?.name`; a plain string there silently fails to match and falls
 * back to the generic "Creative work" label.
 */
function buildCreativeWork(
	title: string,
	description: string,
	profile: Profile,
): Record<string, unknown> {
	const party = {
		"@type": profile.kind === "organization" ? "Organization" : "Person",
		name: profile.displayName,
	};
	const creativeWork: Record<string, unknown> = {
		"@context": "https://schema.org",
		"@type": "MusicRecording",
		name: title,
		author: [party],
		dateCreated: new Date().toISOString(),
	};
	if (description) {
		creativeWork.description = description;
	}
	const roles =
		profile.defaultRoles.length === 0
			? (["cawg.creator"] as const)
			: profile.defaultRoles;
	for (const role of roles) {
		const field = ROLE_TO_SCHEMA_ORG_FIELD[role];
		creativeWork[field] = field === "publisher" ? party : [party];
	}
	return creativeWork;
}

/**
 * cawg.training-mining — reflects the profile's CAWG Training & Data Mining
 * Assertion 1.1 preferences. Always present (defaultTrainingPreferences()
 * guarantees all four categories are set, defaulting to "notAllowed"), so
 * this is never fabricated — it's exactly what the profile declares.
 */
function buildTrainingMiningAssertion(
	profile: Profile,
): Record<string, unknown> {
	const entries: Record<string, { use: string; constraint_info?: string }> = {};
	for (const category of TRAINING_CATEGORIES) {
		const preference = profile.training[category];
		entries[category] = preference.constraintInfo
			? { use: preference.use, constraint_info: preference.constraintInfo }
			: { use: preference.use };
	}
	return { entries };
}

/**
 * Maps a profile's self-declared "verified identities" to the shape
 * c2pa-rs-javascript-library's ICA signing path expects.
 *
 * Important: `IcaVerifiedIdentity.provider` means the aggregator that
 * independently verified the claim — not the platform the identity lives
 * on. Mixotron never verifies anything a user types into the profile form,
 * so `provider` is always mixotron itself (self-attestation), never the
 * user-entered platform/organization name. That name goes into `name` /
 * `username` instead, where it belongs.
 */
export function buildIcaVerifiedIdentities(
	profile: Profile,
	verifiedAt: string,
): IcaVerifiedIdentity[] {
	const provider = {
		id: MIXOTRON_TRUST_AUTHORITY_ID,
		name: "Mix-O-Tron (self-attested, not independently verified)",
	};

	return profile.verifiedIdentities.map(
		(entry: VerifiedIdentityEntry): IcaVerifiedIdentity => {
			const base = { verifiedAt, provider };
			switch (entry.type) {
				case "cawg.social_media":
					return {
						...base,
						type: entry.type,
						name: entry.provider,
						username: entry.value,
					};
				case "cawg.affiliation":
					return {
						...base,
						type: entry.type,
						name: entry.provider,
						uri: entry.value,
					};
				case "cawg.crypto_wallet":
					return {
						...base,
						type: entry.type,
						name: entry.provider,
						address: entry.value,
					};
				case "cawg.document_verification":
					return { ...base, type: entry.type, name: entry.value };
				default: {
					const exhaustive: never = entry.type;
					throw new Error(`Unhandled verified identity type: ${exhaustive}`);
				}
			}
		},
	);
}

/**
 * Maps a profile's *connected and enabled* Governorator trust-registry
 * enrollments (see profile.addTrustRegistryEnrollment) to
 * credentialSubject.c2paAsset.trust_registry claims — c2pa-rs-javascript-
 * library@0.2.6+'s native representation for this, superseding the earlier
 * cawg.affiliation-verified-identity stand-in (which could only carry
 * authority id/name, not the resource/action/registry-endpoint a verifier
 * actually needs to check the claim itself).
 *
 * `trqpAuthorizationUri` is hardcoded to Governorator's own endpoint since
 * every enrollment mixotron currently supports comes from there — this
 * would need to become per-enrollment if a second registry integration is
 * ever added.
 *
 * Only ever called from prepareIcaSigning (manifest.ts) — never from
 * produce()'s shared-test-key identity path, which signs as mixotron's
 * own ICA_ISSUER_DID rather than the profile's own DID, so a profile's
 * enrollment wouldn't actually apply there.
 *
 * The `subjectDid === currentDid` filter is deliberate, not redundant
 * with `enabled`: it guards against a stale enrollment silently claiming
 * authorization for a DID this profile no longer signs as (e.g. after
 * reconnecting a new device key, which already clears didWeb).
 */
export function buildTrustRegistryClaims(
	profile: Profile,
): TrustRegistryClaim[] {
	const currentDid = profile.didWeb ?? profile.webauthnCredential?.issuerDid;
	if (!currentDid) return [];

	return profile.trustRegistryEnrollments
		.filter((entry) => entry.enabled && entry.subjectDid === currentDid)
		.map((entry) => ({
			trqpAuthorizationUri: GOVERNORATOR_TRQP_BASE_URL,
			entityId: currentDid,
			authorityId: entry.authorityId,
			action: entry.action ?? "issue",
			resource: entry.resource ?? "cawg.identity",
		}));
}

/**
 * Maps a profile's DNS-verified domains (see profile.addDomainVerification /
 * src/server/trust/verify-domain.ts) to cawg.web_site verified identities —
 * the only source of that type now that the profile form's old free-text
 * "Website" verified-identity entry has been removed (see
 * VERIFIED_IDENTITY_TYPES in ~/lib/profile). Unlike that removed entry,
 * `provider` here genuinely isn't mixotron self-attesting: mixotron actually
 * checked a TXT record it generated the challenge for.
 *
 * Filters on `verified`, not on the current signing DID — a verified domain
 * isn't scoped to a specific DID the way a trust-registry enrollment's
 * `subjectDid` is (see buildTrustRegistryClaims); it's a fact about the
 * domain, attached to whichever DID this profile happens to sign as.
 *
 * Only ever called from prepareIcaSigning (manifest.ts) — never from
 * produce()'s shared-test-key identity path, for the same reason
 * buildTrustRegistryClaims is: that path signs as mixotron's own
 * ICA_ISSUER_DID, not the profile's own identity.
 */
export function buildVerifiedDomainIdentities(
	profile: Profile,
	verifiedAt: string,
): IcaVerifiedIdentity[] {
	const provider = {
		id: MIXOTRON_TRUST_AUTHORITY_ID,
		name: "Mix-O-Tron (DNS-verified domain ownership)",
	};

	return profile.domainVerifications
		.filter((entry) => entry.verified)
		.map((entry) => ({
			type: "cawg.web_site" as const,
			name: entry.domain,
			uri: `https://${entry.domain}`,
			verifiedAt,
			provider,
		}));
}

/**
 * Builds the manifestDefinition object passed to signAsset /
 * signAssetWithIngredients.
 *
 * Per the C2PA spec, c2pa.opened/c2pa.placed actions must carry a
 * `parameters.ingredients` hashed-URI pointing at the specific ingredient
 * assertion — but that URI only exists after the engine has built the
 * ingredient assertions during signing, so we can't supply it up front.
 * c2pa-rs-javascript-library's own multi-ingredient tests never add those
 * actions manually either — the parentOf/componentOf relationship is
 * established purely through the `ingredients` array passed to
 * signAssetWithIngredients, not through the actions list. So we always lead
 * with c2pa.created; including a manually-added c2pa.opened/c2pa.placed
 * here fails validation with `assertion.action.ingredientMismatch`.
 */
export function buildManifestDefinition(
	input: ManifestDefinitionInput,
): Record<string, unknown> {
	const actions: Record<string, unknown>[] = [
		{
			action: "c2pa.created",
			digitalSourceType:
				input.creationOrigin === "created"
					? input.digitalSourceType
					: "http://cv.iptc.org/newscodes/digitalsourcetype/digitalCreation",
		},
	];

	for (const action of input.actions) {
		actions.push({ action });
	}

	const assertions: Record<string, unknown>[] = [
		{ label: "c2pa.actions", data: { actions } },
	];

	if (input.description) {
		assertions.push({
			label: "org.mixotron.description",
			data: { description: input.description },
		});
	}

	if (input.aiDisclosure) {
		assertions.push({
			label: "c2pa.ai-disclosure",
			data: {
				modelType: input.aiDisclosure.modelType || "unspecified",
				modelName: input.aiDisclosure.modelName || undefined,
				modelIdentifier: input.aiDisclosure.modelIdentifier || undefined,
				contentProfile: {
					humanOversightLevel: input.aiDisclosure.humanOversightLevel,
				},
			},
		});
	}

	if (input.profile) {
		assertions.push({
			label: "stds.schema-org.CreativeWork",
			data: buildCreativeWork(input.title, input.description, input.profile),
		});
		assertions.push({
			label: "cawg.training-mining",
			data: buildTrainingMiningAssertion(input.profile),
		});
	}

	const definition: Record<string, unknown> = {
		claim_generator_info: [{ name: "Mix-O-Tron" }],
		title: input.title,
		assertions,
	};

	if (!input.profile) {
		return definition;
	}

	return addCawgMetadataAssertion(definition, {
		"@context": {
			dc: "http://purl.org/dc/elements/1.1/",
			xmp: "http://ns.adobe.com/xap/1.0/",
		},
		"dc:title": [input.title],
		"dc:creator": [input.profile.displayName],
		"xmp:CreateDate": new Date().toISOString(),
	});
}
