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
import {
	DidWebResolutionError,
	didWebListsPublicKey,
	resolveDidWeb,
} from "~/server/trust/resolve-did-web";

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
	didWeb?: string | null;
}

const profiles = () => mongoDb.collection<ProfileDocument>("profiles");

function toProfile(doc: ProfileDocument): Profile {
	const { _id, ...rest } = doc;
	return {
		id: _id.toString(),
		webauthnCredential: null,
		didWeb: null,
		...rest,
	};
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
					// A new device key invalidates any previously-linked did:web —
					// that link was verified against the old key specifically.
					$set: {
						webauthnCredential: input.credential,
						didWeb: null,
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
	 * identity signing, same as a profile that never registered one. Also
	 * clears any linked did:web, since it was only ever meaningful while
	 * anchored to this specific key. */
	unregisterWebAuthnCredential: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const result = await profiles().findOneAndUpdate(
				{ _id: parseObjectId(input.id), userId: ctx.session.user.id },
				{
					$set: {
						webauthnCredential: null,
						didWeb: null,
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

	/**
	 * Links a did:web identity to this profile's device key, after
	 * verifying — server-side, not trusting the client's word for it —
	 * that the did:web's document actually lists this profile's public key
	 * as a verification method. See src/server/trust/resolve-did-web.ts.
	 */
	linkDidWeb: protectedProcedure
		.input(z.object({ id: z.string(), didWeb: z.string().min(1) }))
		.mutation(async ({ ctx, input }) => {
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

			const publicKey = doc.webauthnCredential?.publicKey;
			if (!publicKey) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: doc.webauthnCredential
						? "This profile's device key was connected before did:web linking existed — reconnect it to enable this."
						: "This profile doesn't have a device identity key connected.",
				});
			}

			let document: Awaited<ReturnType<typeof resolveDidWeb>>;
			try {
				document = await resolveDidWeb(input.didWeb);
			} catch (error) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						error instanceof DidWebResolutionError
							? error.message
							: "Couldn't resolve that did:web.",
				});
			}

			if (!didWebListsPublicKey(document, publicKey)) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message:
						"That did:web's document doesn't list this profile's device key as a verification method.",
				});
			}

			const result = await profiles().findOneAndUpdate(
				{ _id: doc._id },
				{ $set: { didWeb: input.didWeb, updatedAt: new Date() } },
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

	/** Unlinks a profile's did:web — future releases fall back to its bare
	 * did:jwk for identity signing. */
	unlinkDidWeb: protectedProcedure
		.input(z.object({ id: z.string() }))
		.mutation(async ({ ctx, input }) => {
			const result = await profiles().findOneAndUpdate(
				{ _id: parseObjectId(input.id), userId: ctx.session.user.id },
				{ $set: { didWeb: null, updatedAt: new Date() } },
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
