import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
	finalizeIcaIdentityAssertion,
	prepareIcaIdentityAssertion,
	verifyAsset,
	verifyIdentityAssertions,
} from "c2pa-rs-javascript-library";
import { ObjectId } from "mongodb";
import { z } from "zod";

import {
	detectVerifyFormat,
	type ManifestIngredientRef,
	type ManifestVerificationResult,
	type VerifyForDisplayResult,
	type VerifyInput,
	verifyInputSchema,
} from "~/lib/manifest";
import {
	type Profile,
	type ProfileInput,
	profileInputSchema,
	type ServerManagedKey,
	type TrustRegistryEnrollment,
	type WebauthnCredential,
} from "~/lib/profile";
import {
	createTRPCRouter,
	protectedProcedure,
	publicProcedure,
} from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";
import { toDdexMessage } from "~/server/ddex/convert";
import {
	createIcaSigningSession,
	deleteIcaSigningSession,
	getIcaSigningSession,
} from "~/server/signing/ica-signing-sessions";
import {
	buildIcaVerifiedIdentities,
	buildManifestDefinition,
	buildTrustRegistryClaims,
} from "~/server/signing/manifest-definition";
import {
	generateServerManagedKey,
	loadServerManagedKeySeed,
} from "~/server/signing/profile-key";
import {
	loadTestSigningCerts,
	signContentCredential,
} from "~/server/signing/sign";
import {
	mergeIdentityAssertions,
	toDisplayOutcome,
} from "~/server/signing/to-display-outcome";
import { getTrustedCertificates } from "~/server/signing/trusted-certificates";
import { queryGovernoratorAuthorization } from "~/server/trust/query-governorator";

const aiDisclosureInputSchema = z
	.object({
		modelType: z.string(),
		modelName: z.string(),
		modelIdentifier: z.string(),
		humanOversightLevel: z.string(),
	})
	.nullable();

/** Mirrors DdexReleaseInput (src/server/ddex/convert.ts) minus `title`,
 * which the walkthrough's produceWalkthrough input already carries
 * separately, plus `artistName` since DDEX needs one even when no CAWG
 * profile is being created alongside it. */
const ddexInputSchema = z
	.object({
		artistName: z.string(),
		isrc: z.string(),
		releaseIdentifierType: z.string(),
		releaseIdentifierValue: z.string(),
		label: z.string(),
		genre: z.string(),
		parentalWarning: z.string(),
		pLine: z.string(),
		cLine: z.string(),
		territory: z.string(),
		commercialModelType: z.string(),
		useType: z.string(),
		price: z.string(),
		currency: z.string(),
		dealStartDate: z.string(),
	})
	.nullable();

interface ProfileDocument extends ProfileInput {
	_id: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	// See the identical comment on profile.ts's ProfileDocument — optional
	// here because profiles created before this field existed have no such
	// key in Mongo; defaulted below.
	webauthnCredential?: WebauthnCredential | null;
	didWeb?: string | null;
	trustRegistryEnrollments?: TrustRegistryEnrollment[];
	// Full shape, including the encrypted seed — never returned to the
	// client. getOwnedProfile() strips it down to just the issuerDid; use
	// getOwnedProfileSigningKey() when the actual seed is needed for signing.
	serverManagedKey?: ServerManagedKey | null;
}

async function findOwnedProfileDoc(
	userId: string,
	id: string,
): Promise<ProfileDocument> {
	let objectId: ObjectId;
	try {
		objectId = new ObjectId(id);
	} catch {
		throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
	}
	const doc = await mongoDb
		.collection<ProfileDocument>("profiles")
		.findOne({ _id: objectId, userId });
	if (!doc) {
		throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
	}
	return doc;
}

async function getOwnedProfile(userId: string, id: string): Promise<Profile> {
	const doc = await findOwnedProfileDoc(userId, id);
	const { _id, serverManagedKey, ...rest } = doc;
	return {
		id: _id.toString(),
		webauthnCredential: null,
		didWeb: null,
		trustRegistryEnrollments: [],
		...rest,
		serverManagedKey: serverManagedKey
			? { issuerDid: serverManagedKey.issuerDid }
			: null,
	};
}

interface VerifiedManifestDocument {
	hash: string;
	format: string;
	fileName: string;
	fileSize: number;
	hasManifest: boolean;
	manifestId: string | null;
	title: string | null;
	claimGenerator: string | null;
	ingredients: ManifestIngredientRef[];
	createdAt: Date;
}

const manifests = () =>
	mongoDb.collection<VerifiedManifestDocument>("verifiedManifests");

function toResult(
	doc: VerifiedManifestDocument,
	id: string,
	cached: boolean,
): ManifestVerificationResult {
	return {
		status: doc.hasManifest ? "verified" : "unverified",
		cached,
		hash: doc.hash,
		fileName: doc.fileName,
		format: doc.format,
		id,
		name: doc.title ?? doc.fileName,
		manifestId: doc.manifestId,
		claimGenerator: doc.claimGenerator,
		ingredients: doc.ingredients,
	};
}

/**
 * Shared by verifyForDisplay and verifyPublic — both reshape the same
 * verifyAsset()/verifyIdentityAssertions() outcome for c2pa-react-component,
 * differing only in whether a session is required to call them.
 */
async function runVerifyForDisplay(
	input: VerifyInput,
): Promise<VerifyForDisplayResult> {
	const format = detectVerifyFormat(input.fileName);
	if (!format) {
		return {
			supported: false,
			fileName: input.fileName,
			format: input.fileName.split(".").pop() ?? "unknown",
		};
	}

	const bytes = Buffer.from(input.dataBase64, "base64");

	let outcome: Awaited<ReturnType<typeof verifyAsset>>;
	try {
		outcome = await verifyAsset(format, bytes, getTrustedCertificates());
	} catch (error) {
		// Same as manifestRouter.verify: verifyAsset() throws when the asset
		// carries no C2PA manifest at all, not just on a genuine read
		// failure — so an asset of a supported format is "no manifest
		// present", not "unsupported".
		console.warn(
			`[manifest] verifyAsset found no manifest for "${input.fileName}" — treating as no manifest present.`,
			error,
		);
		return {
			supported: true,
			fileName: input.fileName,
			format,
			hasManifest: false,
			outcome: toDisplayOutcome({
				state: false,
				manifests: [],
				manifestStore: undefined,
			}),
		};
	}

	// verifyAsset() alone doesn't surface cawg.identity — it needs this
	// separate call. An asset with no identity assertion at all is
	// expected (most are), so a failure here just means "no identity data
	// to merge in", not a verification failure.
	const identityOutcome = await verifyIdentityAssertions(
		format,
		bytes,
		getTrustedCertificates(),
	).catch(() => null);

	return {
		supported: true,
		fileName: input.fileName,
		format,
		hasManifest: outcome.manifests.length > 0,
		outcome: toDisplayOutcome(
			mergeIdentityAssertions(outcome, identityOutcome),
		),
	};
}

export const manifestRouter = createTRPCRouter({
	verify: protectedProcedure
		.input(verifyInputSchema)
		.mutation(async ({ input }): Promise<ManifestVerificationResult> => {
			const bytes = Buffer.from(input.dataBase64, "base64");
			const hash = createHash("sha256").update(bytes).digest("hex");

			const existing = await manifests().findOne({ hash });
			if (existing) {
				return toResult(existing, hash, true);
			}

			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				return {
					status: "unsupported",
					cached: false,
					hash,
					fileName: input.fileName,
					format: input.fileName.split(".").pop() ?? "unknown",
					id: null,
					name: input.fileName,
					manifestId: null,
					claimGenerator: null,
					ingredients: [],
				};
			}

			let hasManifest = false;
			let manifestId: string | null = null;
			let title: string | null = null;
			let claimGenerator: string | null = null;
			let ingredients: ManifestIngredientRef[] = [];

			try {
				const outcome = await verifyAsset(
					format,
					bytes,
					getTrustedCertificates(),
				);
				const manifest = outcome.manifests[0];
				if (manifest) {
					hasManifest = true;
					manifestId = manifest.id;
					title = manifest.title ?? null;
					claimGenerator = manifest.claimGenerator ?? null;
					ingredients = manifest.ingredients.map((i) => ({
						title: i.title ?? null,
						manifestId: i.manifestId ?? null,
					}));
				}
			} catch (error) {
				console.warn(
					`[manifest] verifyAsset failed for "${input.fileName}" — treating as no manifest present.`,
					error,
				);
			}

			const doc: VerifiedManifestDocument = {
				hash,
				format,
				fileName: input.fileName,
				fileSize: bytes.byteLength,
				hasManifest,
				manifestId,
				title,
				claimGenerator,
				ingredients,
				createdAt: new Date(),
			};
			await manifests().insertOne(doc);

			return toResult(doc, hash, false);
		}),

	/**
	 * Verifies a file and returns the full outcome reshaped for
	 * c2pa-react-component, for the dedicated Verify page. Unlike `verify`,
	 * this always re-runs verifyAsset rather than reading the lean cached
	 * summary — the display components need the full assertion/thumbnail/
	 * signature data that isn't kept in the verifiedManifests cache.
	 */
	verifyForDisplay: protectedProcedure
		.input(verifyInputSchema)
		.mutation(
			async ({ input }): Promise<VerifyForDisplayResult> =>
				runVerifyForDisplay(input),
		),

	/**
	 * Same as verifyForDisplay, but public — backs the no-login walkthrough
	 * pages (e.g. /walkthrough/verify/[claim]), which need real verification
	 * without asking a first-time visitor to create an account.
	 */
	verifyPublic: publicProcedure
		.input(verifyInputSchema)
		.mutation(
			async ({ input }): Promise<VerifyForDisplayResult> =>
				runVerifyForDisplay(input),
		),

	/**
	 * Live TRQP authorization check for one trust_registry entry — called
	 * by CawgTrustRegistry's global queryFn (see
	 * src/app/_components/cawg-trust-registry.tsx), which c2pa-react-cawg-
	 * component's own CAWGManifest rendering invokes automatically for
	 * every credentialSubject.c2paAsset.trust_registry entry it finds, so
	 * the Verify page's built-in trust-registry display shows real data
	 * without any page-specific code. Not scoped to a stored enrollment —
	 * this can check a claim embedded in *any* file someone drops on
	 * Verify, naming whatever entityId/authorityId that file's own
	 * cawg.identity assertion declares.
	 *
	 * Always queries Governorator's real, fixed endpoint regardless of
	 * what trqpAuthorizationUri a manifest claims — trusting an
	 * attacker-suppliable URL as a server-side fetch target would be an
	 * SSRF opening, and Governorator is the only registry mixotron
	 * integrates with today anyway.
	 */
	checkTrustRegistryAuthorization: publicProcedure
		.input(
			z.object({
				entityId: z.string().min(1),
				authorityId: z.string().min(1),
				resource: z.string().optional(),
				action: z.string().optional(),
			}),
		)
		.query(async ({ input }) => {
			return queryGovernoratorAuthorization(input);
		}),

	produce: protectedProcedure
		.input(
			z.object({
				fileName: z.string().min(1),
				dataBase64: z.string().min(1),
				// Null selects "No profile — skip CAWG": every CAWG-specific
				// assertion (attribution, training-mining, identity) is omitted,
				// leaving a plain C2PA manifest.
				profileId: z.string().min(1).nullable(),
				title: z.string().min(1),
				description: z.string(),
				creationOrigin: z.enum(["created", "opened"]),
				digitalSourceType: z.string(),
				actions: z.array(z.string()),
				aiDisclosure: aiDisclosureInputSchema,
				ingredients: z.array(
					z.object({
						fileName: z.string().min(1),
						dataBase64: z.string().min(1),
						relationship: z.enum(["parentOf", "componentOf", "inputTo"]),
					}),
				),
				// Ingredients with no known C2PA manifest — e.g. sample hashes a DAW
				// sent that don't match anything in the verified-manifest store. See
				// HashOnlyIngredientInput.
				hashOnlyIngredients: z.array(
					z.object({
						name: z.string().min(1),
						format: z.string().min(1),
						relationship: z.enum(["parentOf", "componentOf", "inputTo"]),
					}),
				),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `"${input.fileName}" isn't a format the signing library supports yet.`,
				});
			}

			const profile = input.profileId
				? await getOwnedProfile(ctx.session.user.id, input.profileId)
				: null;

			const includedIngredients: {
				format: typeof format;
				asset: Buffer;
				title: string;
				relationship: "parentOf" | "componentOf" | "inputTo";
			}[] = [];
			const skippedIngredients: string[] = [];
			for (const ingredient of input.ingredients) {
				const ingredientFormat = detectVerifyFormat(ingredient.fileName);
				if (!ingredientFormat) {
					skippedIngredients.push(ingredient.fileName);
					continue;
				}
				includedIngredients.push({
					format: ingredientFormat,
					asset: Buffer.from(ingredient.dataBase64, "base64"),
					title: ingredient.fileName,
					relationship: ingredient.relationship,
				});
			}

			const manifestDefinition = buildManifestDefinition({
				title: input.title,
				description: input.description,
				creationOrigin: input.creationOrigin,
				digitalSourceType: input.digitalSourceType,
				actions: input.actions,
				aiDisclosure: input.aiDisclosure,
				profile,
				hashOnlyIngredients: input.hashOnlyIngredients,
				ddex: null,
			});

			const verifiedAt = new Date().toISOString();

			const result = await signContentCredential({
				format,
				asset: Buffer.from(input.dataBase64, "base64"),
				manifestDefinition,
				ingredients: includedIngredients,
				identity: profile
					? {
							roles: [
								...(profile.defaultRoles.length > 0
									? profile.defaultRoles
									: (["cawg.creator"] as const)),
							],
							verifiedIdentities: buildIcaVerifiedIdentities(
								profile,
								verifiedAt,
							),
						}
					: null,
			});

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					format,
					result.signedAsset,
					getTrustedCertificates(),
				);
				manifestId = outcome.manifests[0]?.id ?? null;
			} catch (error) {
				console.warn(
					"[manifest] Could not re-verify freshly signed asset",
					error,
				);
			}

			return {
				signedAssetBase64: Buffer.from(result.signedAsset).toString("base64"),
				fileName: `signed-${input.fileName}`,
				manifestId,
				skippedIngredients,
			};
		}),

	/**
	 * The walkthrough's single-file signing point
	 * (/walkthrough/rights-holder/addManifest) — no ingredients, always
	 * c2pa.created, and two things `produce` doesn't do:
	 *
	 * - Refuses to sign a file that already carries a C2PA manifest, since
	 *   this endpoint exists to produce a *first* Content Credential, not
	 *   add another one.
	 * - `cawgProfile`, if provided, is fresh ProfileInput fields to create a
	 *   brand new profile with a server-managed signing key (see
	 *   profile-key.ts) rather than referencing an existing profileId — the
	 *   walkthrough's CAWG section always authors a new identity inline,
	 *   the same way the real Profile form does, but without a WebAuthn
	 *   ceremony.
	 */
	produceWalkthrough: protectedProcedure
		.input(
			z.object({
				fileName: z.string().min(1),
				dataBase64: z.string().min(1),
				title: z.string().min(1),
				description: z.string(),
				digitalSourceTypes: z.array(z.string()).min(1),
				actions: z.array(z.string()),
				aiDisclosure: aiDisclosureInputSchema,
				ddex: ddexInputSchema,
				cawgProfile: profileInputSchema.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `"${input.fileName}" isn't a format the signing library supports yet.`,
				});
			}

			const bytes = Buffer.from(input.dataBase64, "base64");

			// verifyAsset() throwing means no manifest was found (see the
			// identical logic and comment on runVerifyForDisplay above) — that's
			// the success case here. Finding one means we refuse to proceed.
			try {
				const existing = await verifyAsset(
					format,
					bytes,
					getTrustedCertificates(),
				);
				if (existing.manifests.length > 0) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: `"${input.fileName}" already contains a C2PA manifest — this signs a first Content Credential onto a clean file only.`,
					});
				}
			} catch (error) {
				if (error instanceof TRPCError) throw error;
			}

			// c2pa.created only ever carries one digitalSourceType — the
			// walkthrough's picker allows multiple selections for teaching
			// purposes, so the first one picked is the one that's actually
			// signed.
			const digitalSourceType = input.digitalSourceTypes[0];
			if (!digitalSourceType) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Select at least one digital source type.",
				});
			}

			let profile: Profile | null = null;
			let signingKey: ServerManagedKey | null = null;
			if (input.cawgProfile) {
				const now = new Date();
				signingKey = generateServerManagedKey();
				const doc: Omit<ProfileDocument, "_id"> = {
					...input.cawgProfile,
					userId: ctx.session.user.id,
					createdAt: now,
					updatedAt: now,
					serverManagedKey: signingKey,
				};
				const inserted = await mongoDb
					.collection<ProfileDocument>("profiles")
					.insertOne(doc as ProfileDocument);
				profile = {
					id: inserted.insertedId.toString(),
					webauthnCredential: null,
					didWeb: null,
					trustRegistryEnrollments: [],
					...input.cawgProfile,
					userId: ctx.session.user.id,
					createdAt: now,
					updatedAt: now,
					serverManagedKey: { issuerDid: signingKey.issuerDid },
				};
			}

			const ddexAssertion = input.ddex
				? toDdexMessage({
						title: input.title,
						artistName: input.ddex.artistName || profile?.displayName || "",
						isrc: input.ddex.isrc,
						releaseIdentifierType: input.ddex.releaseIdentifierType,
						releaseIdentifierValue: input.ddex.releaseIdentifierValue,
						label: input.ddex.label,
						genre: input.ddex.genre,
						parentalWarning: input.ddex.parentalWarning,
						pLine: input.ddex.pLine,
						cLine: input.ddex.cLine,
						territory: input.ddex.territory,
						commercialModelType: input.ddex.commercialModelType,
						useType: input.ddex.useType,
						price: input.ddex.price,
						currency: input.ddex.currency,
						dealStartDate: input.ddex.dealStartDate,
					})
				: null;

			const manifestDefinition = buildManifestDefinition({
				title: input.title,
				description: input.description,
				creationOrigin: "created",
				digitalSourceType,
				actions: input.actions,
				aiDisclosure: input.aiDisclosure,
				profile,
				hashOnlyIngredients: [],
				ddex: ddexAssertion as unknown as Record<string, unknown> | null,
			});

			const verifiedAt = new Date().toISOString();

			const result = await signContentCredential({
				format,
				asset: bytes,
				manifestDefinition,
				ingredients: [],
				identity:
					profile && signingKey
						? {
								roles: [
									...(profile.defaultRoles.length > 0
										? profile.defaultRoles
										: (["cawg.creator"] as const)),
								],
								verifiedIdentities: buildIcaVerifiedIdentities(
									profile,
									verifiedAt,
								),
								issuer: {
									did: signingKey.issuerDid,
									privateKey: loadServerManagedKeySeed(signingKey),
								},
							}
						: null,
			});

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					format,
					result.signedAsset,
					getTrustedCertificates(),
				);
				manifestId = outcome.manifests[0]?.id ?? null;
			} catch (error) {
				console.warn(
					"[manifest] Could not re-verify freshly signed asset",
					error,
				);
			}

			return {
				signedAssetBase64: Buffer.from(result.signedAsset).toString("base64"),
				fileName: `signed-${input.fileName}`,
				manifestId,
				profileId: profile?.id ?? null,
			};
		}),

	/**
	 * The walkthrough's update-an-existing-manifest signing point
	 * (/walkthrough/rights-holder/updateManifest) — the mirror image of
	 * produceWalkthrough above:
	 *
	 * - Refuses to sign a file that does *not* already carry a C2PA
	 *   manifest, since this endpoint exists to update one, not produce a
	 *   first one.
	 * - Always signs with creationOrigin "opened" — the uploaded file
	 *   (already-manifested bytes) is embedded as its own sole ingredient
	 *   with relationship "parentOf", so the new manifest's provenance
	 *   chain records the previous manifest as its parent. Same pattern
	 *   c2pa-rs-javascript-library's own ingredient tests use: sign once,
	 *   then re-sign those same signed bytes as both the asset being signed
	 *   and the ingredient recording what it was signed from.
	 * - Like produceWalkthrough, no digital source type picker — "opened"
	 *   always forces digitalSourceType to digitalCreation (see
	 *   buildManifestDefinition), so nothing meaningful would be picked.
	 * - Because ingredients are present, `identity` is passed through for
	 *   parity with produceWalkthrough but c2pa-rs-javascript-library's
	 *   signAssetWithIngredients doesn't accept ICA options at all (see the
	 *   comment on SignRequest.identity in sign.ts) — a cawg.identity
	 *   assertion never gets embedded here, same limitation as `produce`'s
	 *   ingredient path. The CreativeWork/training-mining/XMP assertions a
	 *   profile adds via buildManifestDefinition still apply regardless.
	 */
	produceUpdateWalkthrough: protectedProcedure
		.input(
			z.object({
				fileName: z.string().min(1),
				dataBase64: z.string().min(1),
				title: z.string().min(1),
				description: z.string(),
				actions: z.array(z.string()),
				aiDisclosure: aiDisclosureInputSchema,
				ddex: ddexInputSchema,
				cawgProfile: profileInputSchema.nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `"${input.fileName}" isn't a format the signing library supports yet.`,
				});
			}

			const bytes = Buffer.from(input.dataBase64, "base64");

			const noExistingManifestError = new TRPCError({
				code: "BAD_REQUEST",
				message: `"${input.fileName}" doesn't contain a C2PA manifest yet — use Add a Manifest to sign a first Content Credential onto it.`,
			});

			// verifyAsset() throwing means no manifest was found (see the
			// identical logic and comment on runVerifyForDisplay above) — that's
			// the failure case here, inverted from produceWalkthrough. Finding
			// one is what lets us proceed.
			try {
				const existing = await verifyAsset(
					format,
					bytes,
					getTrustedCertificates(),
				);
				if (existing.manifests.length === 0) {
					throw noExistingManifestError;
				}
			} catch (error) {
				if (error instanceof TRPCError) throw error;
				throw noExistingManifestError;
			}

			let profile: Profile | null = null;
			let signingKey: ServerManagedKey | null = null;
			if (input.cawgProfile) {
				const now = new Date();
				signingKey = generateServerManagedKey();
				const doc: Omit<ProfileDocument, "_id"> = {
					...input.cawgProfile,
					userId: ctx.session.user.id,
					createdAt: now,
					updatedAt: now,
					serverManagedKey: signingKey,
				};
				const inserted = await mongoDb
					.collection<ProfileDocument>("profiles")
					.insertOne(doc as ProfileDocument);
				profile = {
					id: inserted.insertedId.toString(),
					webauthnCredential: null,
					didWeb: null,
					trustRegistryEnrollments: [],
					...input.cawgProfile,
					userId: ctx.session.user.id,
					createdAt: now,
					updatedAt: now,
					serverManagedKey: { issuerDid: signingKey.issuerDid },
				};
			}

			const ddexAssertion = input.ddex
				? toDdexMessage({
						title: input.title,
						artistName: input.ddex.artistName || profile?.displayName || "",
						isrc: input.ddex.isrc,
						releaseIdentifierType: input.ddex.releaseIdentifierType,
						releaseIdentifierValue: input.ddex.releaseIdentifierValue,
						label: input.ddex.label,
						genre: input.ddex.genre,
						parentalWarning: input.ddex.parentalWarning,
						pLine: input.ddex.pLine,
						cLine: input.ddex.cLine,
						territory: input.ddex.territory,
						commercialModelType: input.ddex.commercialModelType,
						useType: input.ddex.useType,
						price: input.ddex.price,
						currency: input.ddex.currency,
						dealStartDate: input.ddex.dealStartDate,
					})
				: null;

			const manifestDefinition = buildManifestDefinition({
				title: input.title,
				description: input.description,
				creationOrigin: "opened",
				digitalSourceType: "",
				actions: input.actions,
				aiDisclosure: input.aiDisclosure,
				profile,
				hashOnlyIngredients: [],
				ddex: ddexAssertion as unknown as Record<string, unknown> | null,
			});

			const verifiedAt = new Date().toISOString();

			const result = await signContentCredential({
				format,
				asset: bytes,
				manifestDefinition,
				ingredients: [
					{
						format,
						asset: bytes,
						title: input.fileName,
						relationship: "parentOf",
					},
				],
				identity:
					profile && signingKey
						? {
								roles: [
									...(profile.defaultRoles.length > 0
										? profile.defaultRoles
										: (["cawg.creator"] as const)),
								],
								verifiedIdentities: buildIcaVerifiedIdentities(
									profile,
									verifiedAt,
								),
								issuer: {
									did: signingKey.issuerDid,
									privateKey: loadServerManagedKeySeed(signingKey),
								},
							}
						: null,
			});

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					format,
					result.signedAsset,
					getTrustedCertificates(),
				);
				manifestId = outcome.manifests[0]?.id ?? null;
			} catch (error) {
				console.warn(
					"[manifest] Could not re-verify freshly signed asset",
					error,
				);
			}

			return {
				signedAssetBase64: Buffer.from(result.signedAsset).toString("base64"),
				fileName: `updated-${input.fileName}`,
				manifestId,
				profileId: profile?.id ?? null,
			};
		}),

	/**
	 * Two-step ICA (WebAuthn device key) identity signing — prepare phase.
	 *
	 * Builds the manifest and signs the outer C2PA claim with the shared
	 * ES256 test key (same as `produce`), but leaves the cawg.identity
	 * credential unsigned. The returned `toSign` bytes must be signed with
	 * the profile's device-derived Ed25519 key in the browser; the rest of
	 * the prepared state (which embeds the ES256 private key and full asset
	 * bytes) is kept server-side in `icaSigningSessions` and is never
	 * returned here. No ingredients: prepareIcaIdentityAssertion doesn't
	 * accept them, matching the existing produce()/signAsset limitation.
	 */
	prepareIcaSigning: protectedProcedure
		.input(
			z.object({
				fileName: z.string().min(1),
				dataBase64: z.string().min(1),
				profileId: z.string().min(1),
				title: z.string().min(1),
				description: z.string(),
				creationOrigin: z.enum(["created", "opened"]),
				digitalSourceType: z.string(),
				actions: z.array(z.string()),
				aiDisclosure: aiDisclosureInputSchema,
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `"${input.fileName}" isn't a format the signing library supports yet.`,
				});
			}

			const profile = await getOwnedProfile(
				ctx.session.user.id,
				input.profileId,
			);
			if (!profile.webauthnCredential) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "This profile doesn't have a device identity key connected.",
				});
			}

			const manifestDefinition = buildManifestDefinition({
				title: input.title,
				description: input.description,
				creationOrigin: input.creationOrigin,
				digitalSourceType: input.digitalSourceType,
				actions: input.actions,
				aiDisclosure: input.aiDisclosure,
				profile,
				// The ICA path can't carry ingredients at all (see SignRequest.identity's
				// doc comment) — file-based or hash-only, both are always empty here.
				hashOnlyIngredients: [],
				ddex: null,
			});

			const roles =
				profile.defaultRoles.length > 0
					? profile.defaultRoles
					: (["cawg.creator"] as const);
			const verifiedAt = new Date().toISOString();
			const { signcert, pkey } = loadTestSigningCerts();

			const prepared = await prepareIcaIdentityAssertion({
				format,
				asset: Buffer.from(input.dataBase64, "base64"),
				manifestDefinition,
				signcert,
				pkey,
				alg: "es256",
				// A linked did:web (see profile.linkDidWeb) supports key rotation;
				// the bare did:jwk doesn't, so prefer it whenever one is set.
				issuerDid: profile.didWeb ?? profile.webauthnCredential.issuerDid,
				verifiedIdentities: buildIcaVerifiedIdentities(profile, verifiedAt),
				icaOptions: {
					sigType: "cawg.identity_claims_aggregation",
					reserveSize: 8192,
					roles: [...roles],
					trustRegistry: buildTrustRegistryClaims(profile),
				},
			});

			const sessionId = await createIcaSigningSession({
				userId: ctx.session.user.id,
				profileId: profile.id,
				fileName: input.fileName,
				prepared,
			});

			return {
				sessionId,
				toSignBase64: Buffer.from(prepared.toSign).toString("base64"),
				issuerDid: prepared.issuerDid,
			};
		}),

	/**
	 * Two-step ICA (WebAuthn device key) identity signing — finalize phase.
	 * Takes the 64-byte raw Ed25519 signature produced client-side over the
	 * `toSign` bytes from prepareIcaSigning, and rebuilds+re-signs the full
	 * manifest with the real signature embedded.
	 */
	finalizeIcaSigning: protectedProcedure
		.input(
			z.object({
				sessionId: z.string().min(1),
				signatureBase64: z.string().min(1),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const session = await getIcaSigningSession(
				ctx.session.user.id,
				input.sessionId,
			);
			if (!session) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Signing session not found or expired — start again.",
				});
			}

			const signature = Buffer.from(input.signatureBase64, "base64");
			if (signature.byteLength !== 64) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Expected a 64-byte raw Ed25519 signature.",
				});
			}

			const result = await finalizeIcaIdentityAssertion(
				session.prepared,
				signature,
			);
			await deleteIcaSigningSession(input.sessionId);

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					session.prepared.format,
					result.signedAsset,
					getTrustedCertificates(),
				);
				manifestId = outcome.manifests[0]?.id ?? null;
			} catch (error) {
				console.warn(
					"[manifest] Could not re-verify freshly ICA-signed asset",
					error,
				);
			}

			return {
				signedAssetBase64: Buffer.from(result.signedAsset).toString("base64"),
				fileName: `signed-${session.fileName}`,
				manifestId,
			};
		}),
});
