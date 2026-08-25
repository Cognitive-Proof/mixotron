import { TRPCError } from "@trpc/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import {
	type Profile,
	type ProfileInput,
	profileInputSchema,
	type WebauthnCredential,
	webauthnCredentialSchema,
} from "~/lib/profile";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";

interface ProfileDocument extends ProfileInput {
	_id: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
	// Optional on the document type (not just the app-level Profile type)
	// because profiles created before this field existed have no such key
	// in Mongo at all — toProfile() below is what guarantees every Profile
	// object handed to the rest of the app has it, defaulted to null.
	webauthnCredential?: WebauthnCredential | null;
}

const profiles = () => mongoDb.collection<ProfileDocument>("profiles");

function toProfile(doc: ProfileDocument): Profile {
	const { _id, ...rest } = doc;
	return { id: _id.toString(), webauthnCredential: null, ...rest };
}

function parseObjectId(id: string): ObjectId {
	try {
		return new ObjectId(id);
	} catch {
		throw new TRPCError({ code: "NOT_FOUND", message: "Profile not found" });
	}
}

export const profileRouter = createTRPCRouter({
	list: protectedProcedure.query(async ({ ctx }) => {
		const docs = await profiles()
			.find({ userId: ctx.session.user.id })
			.sort({ createdAt: 1 })
			.toArray();
		return docs.map(toProfile);
	}),

	byId: protectedProcedure
		.input(z.object({ id: z.string() }))
		.query(async ({ ctx, input }) => {
			const doc = await profiles().findOne({
				_id: parseObjectId(input.id),
				userId: ctx.session.user.id,
			});
			if (!doc) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return toProfile(doc);
		}),

	create: protectedProcedure
		.input(profileInputSchema)
		.mutation(async ({ ctx, input }) => {
			const now = new Date();
			const doc: Omit<ProfileDocument, "_id"> = {
				...input,
				userId: ctx.session.user.id,
				createdAt: now,
				updatedAt: now,
			};
			const result = await profiles().insertOne(doc as ProfileDocument);
			return toProfile({ ...doc, _id: result.insertedId });
		}),

	update: protectedProcedure
		.input(z.object({ id: z.string(), data: profileInputSchema }))
		.mutation(async ({ ctx, input }) => {
			const result = await profiles().findOneAndUpdate(
				{ _id: parseObjectId(input.id), userId: ctx.session.user.id },
				{ $set: { ...input.data, updatedAt: new Date() } },
				{ returnDocument: "after" },
			);
			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return toProfile(result);
		}),

	delete: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			await profiles().deleteOne({
				_id: parseObjectId(input.id),
				userId: ctx.session.user.id,
			});
			return { id: input.id };
		}),

	/**
	 * Stores a WebAuthn PRF credential a profile just registered client-side
	 * (see src/lib/cawg-webauthn.ts) — the private key material itself never
	 * reaches the server; only what's needed to re-derive it later
	 * (credentialId, prfSalt) and the DID it derives to.
	 */
	registerWebAuthnCredential: protectedProcedure
		.input(z.object({ id: z.string(), credential: webauthnCredentialSchema }))
		.mutation(async ({ ctx, input }) => {
			const result = await profiles().findOneAndUpdate(
				{ _id: parseObjectId(input.id), userId: ctx.session.user.id },
				{
					$set: {
						webauthnCredential: input.credential,
						updatedAt: new Date(),
					},
				},
				{ returnDocument: "after" },
			);
			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return toProfile(result);
		}),

	/** Disconnects a profile's WebAuthn identity key — after this, the
	 * profile falls back to mixotron's shared server-side test key for
	 * identity signing, same as a profile that never registered one. */
	unregisterWebAuthnCredential: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const result = await profiles().findOneAndUpdate(
				{ _id: parseObjectId(input.id), userId: ctx.session.user.id },
				{ $set: { webauthnCredential: null, updatedAt: new Date() } },
				{ returnDocument: "after" },
			);
			if (!result) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Profile not found",
				});
			}
			return toProfile(result);
		}),
});
