import { z } from "zod";

/** CAWG Identity Assertion 1.3 — verifiedIdentities[].type */
export const VERIFIED_IDENTITY_TYPES = [
	"cawg.web_site",
	"cawg.social_media",
	"cawg.affiliation",
	"cawg.crypto_wallet",
	"cawg.document_verification",
] as const;
export type VerifiedIdentityType = (typeof VERIFIED_IDENTITY_TYPES)[number];

export const VERIFIED_IDENTITY_LABELS: Record<VerifiedIdentityType, string> = {
	"cawg.web_site": "Website",
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
	"cawg.web_site": {
		provider: "Provider name",
		value: "URI",
		valueHint: "The website whose domain proves this identity.",
	},
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
			{ use: "notAllowed", constraintInfo: "" } satisfies TrainingPreference,
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

export interface Profile extends ProfileInput {
	id: string;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}
