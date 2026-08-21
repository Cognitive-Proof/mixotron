import { betterAuth } from "better-auth";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { env } from "~/env";
import { mongoClient, mongoDb } from "~/server/db/mongo";

export const auth = betterAuth({
	baseURL: env.BETTER_AUTH_URL,
	trustedOrigins: env.BETTER_AUTH_URL ? [env.BETTER_AUTH_URL] : undefined,
	database: mongodbAdapter(mongoDb, {
		client: mongoClient,
		// Firestore's MongoDB-compatibility endpoint doesn't support
		// multi-document transactions the way a real replica set does.
		transaction: false,
	}),
	emailAndPassword: {
		enabled: true,
	},
});

export type Session = typeof auth.$Infer.Session;
