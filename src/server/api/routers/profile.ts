import { TRPCError } from "@trpc/server";
import { ObjectId } from "mongodb";
import { z } from "zod";

import {
	type Profile,
	type ProfileInput,
	profileInputSchema,
} from "~/lib/profile";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { mongoDb } from "~/server/db/mongo";

interface ProfileDocument extends ProfileInput {
	_id: ObjectId;
	userId: string;
	createdAt: Date;
	updatedAt: Date;
}

const profiles = () => mongoDb.collection<ProfileDocument>("profiles");

function toProfile(doc: ProfileDocument): Profile {
	const { _id, ...rest } = doc;
	return { id: _id.toString(), ...rest };
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
});
