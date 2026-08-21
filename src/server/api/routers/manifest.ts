import { createHash } from "node:crypto";
import { TRPCError } from "@trpc/server";
import {
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
import type { Profile, ProfileInput } from "~/lib/profile";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";
import {
	buildIcaVerifiedIdentities,
	buildManifestDefinition,
} from "~/server/signing/manifest-definition";
import { signContentCredential } from "~/server/signing/sign";
import {
	mergeIdentityAssertions,
	toDisplayOutcome,
} from "~/server/signing/to-display-outcome";
import { TRUSTED_CERTIFICATES } from "~/server/signing/trusted-certificates";

interface ProfileDocument extends ProfileInput {
	_id: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
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
	return { id: _id.toString(), ...rest };
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
				const outcome = await verifyAsset(format, bytes, TRUSTED_CERTIFICATES);
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
				const outcome = await verifyAsset(format, bytes, TRUSTED_CERTIFICATES);

				// verifyAsset() alone doesn't surface cawg.identity — it needs
				// this separate call. An asset with no identity assertion at all
				// is expected (most are), so a failure here just means "no
				// identity data to merge in", not a verification failure.
				const identityOutcome = await verifyIdentityAssertions(
					format,
					bytes,
					TRUSTED_CERTIFICATES,
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
				profileId: z.string().min(1),
				title: z.string().min(1),
				description: z.string(),
				creationOrigin: z.enum(["created", "opened"]),
				digitalSourceType: z.string(),
				actions: z.array(z.string()),
				aiDisclosure: z
					.object({
						modelType: z.string(),
						modelName: z.string(),
						modelIdentifier: z.string(),
						humanOversightLevel: z.string(),
					})
					.nullable(),
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

			const profile = await getOwnedProfile(
				ctx.session.user.id,
				input.profileId,
			);

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

			const roles =
				profile.defaultRoles.length > 0
					? profile.defaultRoles
					: (["cawg.creator"] as const);
			const verifiedAt = new Date().toISOString();

			const result = await signContentCredential({
				format,
				asset: Buffer.from(input.dataBase64, "base64"),
				manifestDefinition,
				ingredients: includedIngredients,
				identity: {
					roles: [...roles],
					verifiedIdentities: buildIcaVerifiedIdentities(profile, verifiedAt),
				},
			});

			let manifestId: string | null = null;
			try {
				const outcome = await verifyAsset(
					format,
					result.signedAsset,
					TRUSTED_CERTIFICATES,
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
});
