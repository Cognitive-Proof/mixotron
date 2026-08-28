import type { WebauthnCredential } from "~/lib/profile";

/**
 * Registry of the request kinds mix-o-tron knows how to sign. This is the
 * extension point for a future third kind: add one more
 * RecognizedRequestType here and export it in REQUEST_TYPES — nothing in
 * page.tsx needs to change, since it never branches on a specific kind,
 * only on whatever this registry reports.
 *
 * There is deliberately no generic/fallback signing path. If nothing here
 * recognizes a pasted request, page.tsx says so and refuses to sign it —
 * mix-o-tron never signs a request type it doesn't know about.
 */

export interface ProfileIdentity {
	/** Guaranteed present — evaluate() only ever runs once a profile with
	 * a device key is selected. */
	credential: WebauthnCredential;
	didWeb: string | null;
}

export interface RequestEvaluation {
	signable: boolean;
	/** Human-readable lines describing the request, rendered generically
	 * by the page once a type matches — the page doesn't know or care
	 * what they say. */
	summary: string[];
	/** Present when !signable: why this specific request/profile pairing
	 * can't be signed (identity mismatch, missing key data, etc). */
	reason?: string;
}

export interface RecognizedRequestType {
	id: string;
	/** Shown in messages, e.g. "Governorator enrollment request". */
	label: string;
	/** The vc.type value identifying this kind. */
	vcType: string;
	/** Segment count this kind is always issued with — 2 for an unsigned
	 * challenge (header.payload) mix-o-tron is completing into a JWS, 3
	 * for an already-complete JWT being counter-signed as a separate
	 * artifact. */
	expectedSegments: 2 | 3;
	/** What to actually sign, given the raw pasted text (trimmed). */
	textToSign: (rawText: string) => string;
	/** Where the resulting signature goes, shown after signing. */
	postSignHint: string;
	/** Type-specific identity/eligibility check plus the human summary.
	 * Expiry is handled generically by page.tsx before this ever runs, so
	 * implementations don't each need to remember it. */
	evaluate: (
		payload: Record<string, unknown>,
		profile: ProfileIdentity,
	) => RequestEvaluation;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function credentialSubjectOf(
	payload: Record<string, unknown>,
): Record<string, unknown> | undefined {
	const vc = isRecord(payload.vc) ? payload.vc : undefined;
	return isRecord(vc?.credentialSubject) ? vc.credentialSubject : undefined;
}

/**
 * Governorator's enrollment counter-signing (docs referenced this session:
 * cawg-trqp-registry-admin's jwtVc.ts). The request is already a complete,
 * Governorator-signed 3-segment JWT; mix-o-tron produces a *separate*
 * counter-signature over the whole string, proving control of the DID
 * named as `sub`.
 */
const governoratorEnrollmentType: RecognizedRequestType = {
	id: "governorator-enrollment",
	label: "Governorator enrollment request",
	vcType: "TrqpEnrollmentRequest",
	expectedSegments: 3,
	textToSign: (rawText) => rawText.trim(),
	postSignHint: "Paste this back into Governorator's counter-signature box.",
	evaluate: (payload, profile) => {
		const sub = typeof payload.sub === "string" ? payload.sub : undefined;
		if (!sub) {
			return {
				signable: false,
				summary: [],
				reason: 'This request has no "sub" field (the DID being enrolled).',
			};
		}

		const credentialSubject = credentialSubjectOf(payload);
		const authorityName =
			typeof credentialSubject?.authority_name === "string"
				? credentialSubject.authority_name
				: undefined;
		const authorityId =
			typeof credentialSubject?.authority_id === "string"
				? credentialSubject.authority_id
				: undefined;
		const resource =
			typeof credentialSubject?.resource === "string"
				? credentialSubject.resource
				: undefined;
		const action =
			typeof credentialSubject?.action === "string"
				? credentialSubject.action
				: undefined;

		const summary = [
			`${authorityName ?? authorityId ?? "An authority"} wants to list you as a trusted entity${
				resource
					? ` for ${action ?? "any action"} on ${resource}`
					: " — not scoped to a specific resource or action"
			}.`,
		];

		const profileIdentity = profile.didWeb ?? profile.credential.issuerDid;
		if (sub !== profile.credential.issuerDid && sub !== profile.didWeb) {
			return {
				signable: false,
				summary,
				reason: `This profile's identity (${profileIdentity}) doesn't match the DID this request names (${sub}). Signing with this profile would produce a signature Governorator can't verify — pick the profile the admin was given, or ask them to reissue the request against this one.`,
			};
		}

		return { signable: true, summary };
	},
};

/**
 * DIDsmith's "link a key you don't hold" flow (confirmed against
 * @cognitiveproof/didsmith-key-request-jwt and the DIDsmith backend this
 * session). The request is the unsigned 2-segment signing input; mix-o-tron
 * produces the missing signature to complete it into a JWS.
 *
 * `sub` here is DIDsmith's own did:web account identity, not the profile's
 * — irrelevant for matching. What must match the selected profile is the
 * key actually being requested, credentialSubject.publicKeyJwk.
 */
const didsmithKeyLinkType: RecognizedRequestType = {
	id: "didsmith-keylink",
	label: "DIDsmith key-link request",
	vcType: "KeyLinkRequest",
	expectedSegments: 2,
	textToSign: (rawText) => rawText.trim(),
	postSignHint: "Copy this back into DIDsmith's signature box.",
	evaluate: (payload, profile) => {
		const credentialSubject = credentialSubjectOf(payload);
		const sub = typeof payload.sub === "string" ? payload.sub : undefined;
		const publicKeyJwk = isRecord(credentialSubject?.publicKeyJwk)
			? credentialSubject.publicKeyJwk
			: undefined;
		const requestedKey =
			typeof publicKeyJwk?.x === "string" ? publicKeyJwk.x : undefined;

		const summary = [
			`A request to add a key to ${sub ?? "a DIDsmith account"}.`,
		];

		if (!requestedKey) {
			return {
				signable: false,
				summary,
				reason:
					"This request doesn't name a key (credentialSubject.publicKeyJwk) — it may not be a valid key-link request.",
			};
		}

		if (!profile.credential.publicKey) {
			return {
				signable: false,
				summary,
				reason:
					"This profile's device key was connected before did:web linking existed — reconnect it to enable this.",
			};
		}

		if (profile.credential.publicKey !== requestedKey) {
			return {
				signable: false,
				summary,
				reason:
					"This profile's key doesn't match the key this request names — pick the profile whose did:jwk you pasted into DIDsmith.",
			};
		}

		return { signable: true, summary };
	},
};

export const REQUEST_TYPES: RecognizedRequestType[] = [
	governoratorEnrollmentType,
	didsmithKeyLinkType,
];
