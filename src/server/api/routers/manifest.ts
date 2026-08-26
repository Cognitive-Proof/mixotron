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
	verifyInputSchema,
} from "~/lib/manifest";
import type { Profile, ProfileInput, WebauthnCredential } from "~/lib/profile";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";
import {
	createIcaSigningSession,
	deleteIcaSigningSession,
	getIcaSigningSession,
} from "~/server/signing/ica-signing-sessions";
import {
	buildIcaVerifiedIdentities,
	buildManifestDefinition,
} from "~/server/signing/manifest-definition";
import {
	loadTestSigningCerts,
	signContentCredential,
} from "~/server/signing/sign";
import {
	mergeIdentityAssertions,
	toDisplayOutcome,
} from "~/server/signing/to-display-outcome";
import { getTrustedCertificates } from "~/server/signing/trusted-certificates";

const aiDisclosureInputSchema = z
	.object({
		modelType: z.string(),
		modelName: z.string(),
		modelIdentifier: z.string(),
		humanOversightLevel: z.string(),
	})
	.nullable();

interface ProfileDocument extends ProfileInput {
	_id: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	// See the identical comment on profile.ts's ProfileDocument — optional
	// here because profiles created before this field existed have no such
	// key in Mongo; defaulted to null below.
	webauthnCredential?: WebauthnCredential | null;
}

async function getOwnedProfile(userId: string, id: string): Promise<Profile> {
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
	const { _id, ...rest } = doc;
	return { id: _id.toString(), webauthnCredential: null, ...rest };
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
		.mutation(async ({ input }): Promise<VerifyForDisplayResult> => {
			const format = detectVerifyFormat(input.fileName);
			if (!format) {
				return {
					supported: false,
					fileName: input.fileName,
					format: input.fileName.split(".").pop() ?? "unknown",
				};
			}

			const bytes = Buffer.from(input.dataBase64, "base64");
			try {
				const outcome = await verifyAsset(
					format,
					bytes,
					getTrustedCertificates(),
				);

				// verifyAsset() alone doesn't surface cawg.identity — it needs
				// this separate call. An asset with no identity assertion at all
				// is expected (most are), so a failure here just means "no
				// identity data to merge in", not a verification failure.
				const identityOutcome = await verifyIdentityAssertions(
					format,
					bytes,
					getTrustedCertificates(),
				).catch(() => null);

				return {
					supported: true,
					fileName: input.fileName,
					format,
					outcome: toDisplayOutcome(
						mergeIdentityAssertions(outcome, identityOutcome),
					),
				};
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: `Couldn't read "${input.fileName}" as ${format}.`,
					cause: error,
				});
			}
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
				issuerDid: profile.webauthnCredential.issuerDid,
				verifiedIdentities: buildIcaVerifiedIdentities(profile, verifiedAt),
				icaOptions: {
					sigType: "cawg.identity_claims_aggregation",
					reserveSize: 8192,
					roles: [...roles],
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
