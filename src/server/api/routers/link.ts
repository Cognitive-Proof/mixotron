import { TRPCError } from "@trpc/server";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";
import {
	createLinkToken,
	LINK_PRODUCTS,
	type LinkProduct,
} from "~/server/link/link-tokens";
import type { UploadStorageBackend } from "~/server/storage/file-storage";
import { readUploadedFile } from "~/server/storage/file-storage";

interface LinkTokenDocument {
	_id: ObjectId;
	userId: string;
	product: LinkProduct;
	jti: string;
	createdAt: Date;
	expiresAt: Date;
	revokedAt: Date | null;
	lastUsedAt: Date | null;
}

const linkTokens = () => mongoDb.collection<LinkTokenDocument>("linkTokens");

export interface LinkIngredientRef {
	name: string;
	sha256: string;
}

export interface LinkUploadDocument {
	_id: ObjectId;
	userId: string;
	product: LinkProduct;
	name: string;
	fileId: string;
	storage: UploadStorageBackend;
	contentType: string;
	ingredients: LinkIngredientRef[];
	createdAt: Date;
}

const linkUploads = () => mongoDb.collection<LinkUploadDocument>("linkUploads");

/**
 * A hash "resolves" if it's already a known verified/unverified manifest —
 * i.e. someone has run *some* file with this content through
 * manifest.verify before, so mixotron has bytes for it on hand. Reuses the
 * same collection manifest.ts's verify procedure writes to; deliberately
 * not importing from there to avoid coupling two routers' internals over a
 * single read query.
 */
async function isHashKnown(hash: string): Promise<boolean> {
	const doc = await mongoDb
		.collection("verifiedManifests")
		.findOne({ hash }, { projection: { _id: 1 } });
	return doc !== null;
}

export const linkRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const docs = await linkTokens()
			.find({ userId: ctx.session.user.id })
			.sort({ createdAt: -1 })
			.toArray();
		return docs.map((doc) => ({
			id: doc._id.toString(),
			product: doc.product,
			createdAt: doc.createdAt,
			expiresAt: doc.expiresAt,
			revokedAt: doc.revokedAt,
			lastUsedAt: doc.lastUsedAt,
		}));
	}),

	create: protectedProcedure
		.input(z.object({ product: z.enum(LINK_PRODUCTS) }))
		.mutation(async ({ ctx, input }) => {
			const { token, jti, expiresAt } = await createLinkToken(
				ctx.session.user.id,
				input.product,
			);
			const doc: LinkTokenDocument = {
				_id: new ObjectId(),
				userId: ctx.session.user.id,
				product: input.product,
				jti,
				createdAt: new Date(),
				expiresAt,
				revokedAt: null,
				lastUsedAt: null,
			};
			await linkTokens().insertOne(doc);
			return {
				id: doc._id.toString(),
				token,
				product: doc.product,
				createdAt: doc.createdAt,
				expiresAt: doc.expiresAt,
			};
		}),

	revoke: protectedProcedure
		.input(z.object({ id: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
			let objectId: ObjectId;
			try {
				objectId = new ObjectId(input.id);
			} catch {
				throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
			}
			const result = await linkTokens().updateOne(
				{ _id: objectId, userId: ctx.session.user.id, revokedAt: null },
				{ $set: { revokedAt: new Date() } },
			);
			if (result.matchedCount === 0) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Token not found" });
			}
			return { revoked: true };
		}),

	getUpload: protectedProcedure
		.input(z.object({ uploadId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			let objectId: ObjectId;
			try {
				objectId = new ObjectId(input.uploadId);
			} catch {
				return { ok: false as const, reason: "not_found" as const };
			}
			const doc = await linkUploads().findOne({ _id: objectId });
			if (!doc) {
				return { ok: false as const, reason: "not_found" as const };
			}
			if (doc.userId !== ctx.session.user.id) {
				return { ok: false as const, reason: "forbidden" as const };
			}

			const ingredients = await Promise.all(
				doc.ingredients.map(async (ingredient) => ({
					...ingredient,
					resolved: await isHashKnown(ingredient.sha256),
				})),
			);

			return {
				ok: true as const,
				upload: {
					id: doc._id.toString(),
					name: doc.name,
					product: doc.product,
					createdAt: doc.createdAt,
					ingredients,
				},
			};
		}),

	downloadUpload: protectedProcedure
		.input(z.object({ uploadId: z.string().min(1) }))
		.query(async ({ ctx, input }) => {
			let objectId: ObjectId;
			try {
				objectId = new ObjectId(input.uploadId);
			} catch {
				throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
			}
			const doc = await linkUploads().findOne({ _id: objectId });
			if (!doc) {
				throw new TRPCError({ code: "NOT_FOUND", message: "Upload not found" });
			}
			if (doc.userId !== ctx.session.user.id) {
				throw new TRPCError({
					code: "FORBIDDEN",
					message: "This upload doesn't belong to you.",
				});
			}

			const bytes = await readUploadedFile(doc.fileId, doc.storage);
			return {
				name: doc.name,
				fileName: `${doc.name}.wav`,
				contentType: doc.contentType,
				dataBase64: bytes.toString("base64"),
			};
		}),
});
