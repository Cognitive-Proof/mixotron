import { z } from "zod";

/**
 * CAWG Identity Assertion 1.3 — verifiedIdentities[].type.
 *
 * Deliberately excludes "cawg.web_site": that type used to be a free-text,
 * self-attested entry here (any URI the user typed was accepted as-is).
 * It's now only ever produced by DNS TXT domain verification (see
 * domainVerificationSchema / buildVerifiedDomainIdentities) — a real
 * ownership check replaces the "just type anything" gap instead of living
 * alongside it.
 */
export const VERIFIED_IDENTITY_TYPES = [
	"cawg.social_media",
	"cawg.affiliation",
	"cawg.crypto_wallet",
	"cawg.document_verification",
] as const;
export type VerifiedIdentityType = (typeof VERIFIED_IDENTITY_TYPES)[number];

export const VERIFIED_IDENTITY_LABELS: Record<VerifiedIdentityType, string> = {
	"cawg.social_media": "Social media",
	"cawg.affiliation": "Affiliation",
	"cawg.crypto_wallet": "Crypto wallet",
	"cawg.document_verification": "Document verification",
};

/** What the provider/value fields mean for each verified identity type. */
export const VERIFIED_IDENTITY_FIELD_LABELS: Record<
	VerifiedIdentityType,
	{ provider: string; value: string; valueHint: string }
> = {
	"cawg.social_media": {
		provider: "Platform name",
		value: "Username",
		valueHint: "e.g. Instagram, @handle",
	},
	"cawg.affiliation": {
		provider: "Organization name",
		value: "Organization URI",
		valueHint: "Optional link to the organization.",
	},
	"cawg.crypto_wallet": {
		provider: "Network / provider",
		value: "Wallet address",
		valueHint: "e.g. Ethereum",
	},
	"cawg.document_verification": {
		provider: "Verifying provider",
		value: "Verified legal name",
		valueHint: "The name on the verified government ID.",
	},
};

export const verifiedIdentityTypeSchema = z.enum(VERIFIED_IDENTITY_TYPES);

export const verifiedIdentityEntrySchema = z.object({
	id: z.string(),
	type: verifiedIdentityTypeSchema,
	provider: z.string(),
	value: z.string(),
});
export type VerifiedIdentityEntry = z.infer<typeof verifiedIdentityEntrySchema>;

/** CAWG Identity Assertion 1.3 — signer_payload.role */
export const CREATOR_ROLES = [
	"cawg.creator",
	"cawg.contributor",
	"cawg.editor",
	"cawg.producer",
	"cawg.publisher",
	"cawg.sponsor",
	"cawg.translator",
] as const;
export type CreatorRole = (typeof CREATOR_ROLES)[number];

export const CREATOR_ROLE_LABELS: Record<CreatorRole, string> = {
	"cawg.creator": "Creator",
	"cawg.contributor": "Contributor",
	"cawg.editor": "Editor",
	"cawg.producer": "Producer",
	"cawg.publisher": "Publisher",
	"cawg.sponsor": "Sponsor",
	"cawg.translator": "Translator",
};

export const creatorRoleSchema = z.enum(CREATOR_ROLES);

/** CAWG Training & Data Mining Assertion 1.1 — entries[key].use */
export const TRAINING_USE_VALUES = [
	"allowed",
	"notAllowed",
	"constrained",
] as const;
export type TrainingUse = (typeof TRAINING_USE_VALUES)[number];

export const TRAINING_CATEGORIES = [
	"cawg.data_mining",
	"cawg.ai_inference",
	"cawg.ai_training",
	"cawg.ai_generative_training",
] as const;
export type TrainingCategory = (typeof TRAINING_CATEGORIES)[number];

export const TRAINING_CATEGORY_LABELS: Record<TrainingCategory, string> = {
	"cawg.data_mining": "Data mining",
	"cawg.ai_inference": "AI inference",
	"cawg.ai_training": "AI training",
	"cawg.ai_generative_training": "Generative AI training",
};

export const trainingUseSchema = z.enum(TRAINING_USE_VALUES);

export const trainingPreferenceSchema = z.object({
	use: trainingUseSchema,
	constraintInfo: z.string(),
});
export type TrainingPreference = z.infer<typeof trainingPreferenceSchema>;

export const trainingPreferencesSchema = z.object({
	"cawg.data_mining": trainingPreferenceSchema,
	"cawg.ai_inference": trainingPreferenceSchema,
	"cawg.ai_training": trainingPreferenceSchema,
	"cawg.ai_generative_training": trainingPreferenceSchema,
});
export type TrainingPreferences = z.infer<typeof trainingPreferencesSchema>;

export function defaultTrainingPreferences(): TrainingPreferences {
	return Object.fromEntries(
		TRAINING_CATEGORIES.map((category) => [
			category,
			{ use: "allowed", constraintInfo: "" } satisfies TrainingPreference,
		]),
	) as TrainingPreferences;
}

export const PROFILE_KINDS = ["person", "organization"] as const;
export type ProfileKind = (typeof PROFILE_KINDS)[number];
export const profileKindSchema = z.enum(PROFILE_KINDS);

export const profileInputSchema = z.object({
	kind: profileKindSchema,
	displayName: z.string().min(1),
	akaName: z.string(),
	website: z.string(),
	identifier: z.string(),
	defaultRoles: z.array(creatorRoleSchema),
	verifiedIdentities: z.array(verifiedIdentityEntrySchema),
	training: trainingPreferencesSchema,
});
export type ProfileInput = z.infer<typeof profileInputSchema>;

/**
 * A WebAuthn credential registered for this profile's client-side CAWG
 * identity signing (see src/lib/cawg-webauthn.ts). The Ed25519 private key
 * itself is never stored anywhere — only what's needed to re-derive it from
 * the authenticator (credentialId, prfSalt) and the DID that key derives
 * to. Set only via profile.registerWebAuthnCredential, never through the
 * general create/update profile form, so a routine profile edit can't
 * accidentally clobber it.
 */
export const webauthnCredentialSchema = z.object({
	credentialId: z.string().min(1),
	prfSalt: z.string().min(1),
	issuerDid: z.string().min(1),
	// Base64url-encoded raw Ed25519 public key. Optional because profiles
	// registered before this field existed won't have it stored — they
	// simply can't link a did:web (see profile.linkDidWeb) until they
	// reconnect their device key.
	publicKey: z.string().min(1).optional(),
});
export type WebauthnCredential = z.infer<typeof webauthnCredentialSchema>;

/**
 * A Governorator TRQP enrollment request this profile has signed, kept
 * around after the fact so it's more than a one-off signature (see
 * profile.addTrustRegistryEnrollment). `enabled` controls whether it's
 * embedded as a verified identity the *next* time this profile signs
 * content (see buildTrustRegistryVerifiedIdentities) — turning it off
 * doesn't delete the record, since Governorator's own decision about the
 * enrollment can lag or later change, and the record's `subjectDid` is
 * what's actually being vouched for, not necessarily this profile's
 * current identity.
 */
export const trustRegistryEnrollmentSchema = z.object({
	id: z.string().min(1),
	authorityId: z.string().min(1),
	authorityName: z.string().min(1),
	resource: z.string().optional(),
	action: z.string().optional(),
	// The DID this enrollment actually authorizes (the signed request's
	// `sub`) — not necessarily this profile's *current* identity, e.g.
	// after reconnecting a new device key.
	subjectDid: z.string().min(1),
	requestJwt: z.string().min(1),
	enabled: z.boolean(),
	signedAt: z.string(),
});
export type TrustRegistryEnrollment = z.infer<
	typeof trustRegistryEnrollmentSchema
>;

/**
 * Proof that this profile controls a domain, via a DNS TXT challenge (see
 * profile.addDomainVerification / src/server/trust/verify-domain.ts) —
 * replaces the old free-text "cawg.web_site" verified-identity entry, which
 * accepted any URI the user typed with no check at all. `token` is a
 * server-generated random value the user publishes as
 * `_mixotron-challenge.<domain>` TXT; `verified`/`verifiedAt` record the
 * result of the last successful on-demand check (profile.checkDomainVerification)
 * — there's no background recheck, so a verified domain stays verified even
 * if the TXT record is later removed, same as Google Search Console/ACME
 * DNS-01 treat proof-of-control as a point-in-time fact.
 */
export const domainVerificationSchema = z.object({
	id: z.string().min(1),
	domain: z.string().min(1),
	token: z.string().min(1),
	createdAt: z.string(),
	verified: z.boolean(),
	verifiedAt: z.string().nullable(),
});
export type DomainVerification = z.infer<typeof domainVerificationSchema>;

export interface Profile extends ProfileInput {
	id: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	webauthnCredential: WebauthnCredential | null;
	// did:web identity a Governorator/DIDsmith-style flow has verified this
	// profile's device key is a listed verificationMethod of (see
	// profile.linkDidWeb and src/server/trust/resolve-did-web.ts). When
	// set, content signing prefers it over webauthnCredential.issuerDid's
	// bare did:jwk, since it supports key rotation and the did:jwk doesn't.
	didWeb: string | null;
	trustRegistryEnrollments: TrustRegistryEnrollment[];
	domainVerifications: DomainVerification[];
}
