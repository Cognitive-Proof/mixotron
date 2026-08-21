import type { Collection, Db } from "mongodb";
import { MongoClient } from "mongodb";
import { env } from "~/env";

const globalForMongo = globalThis as unknown as {
	mongoClient?: MongoClient;
};

export const mongoClient =
	globalForMongo.mongoClient ?? new MongoClient(env.MIX_O_TRON_MONGODB_URI);

if (env.NODE_ENV !== "production") {
	globalForMongo.mongoClient = mongoClient;
}

/**
 * The Firestore MongoDB-compatibility endpoint we're using doesn't grant
 * this service account `datastore.indexes.create`, so better-auth's
 * automatic index creation (e.g. a unique index on email) fails. Rather than
 * let that reject every write, swallow index-creation errors and log a
 * warning — uniqueness just won't be enforced at the database layer until
 * the service account is granted index-admin permissions in GCP.
 */
function withIndexCreationFallback(db: Db): Db {
	return new Proxy(db, {
		get(target, prop, receiver) {
			if (prop !== "collection") return Reflect.get(target, prop, receiver);

			return (...args: Parameters<Db["collection"]>) => {
				const collection = target.collection(...args);
				return new Proxy(collection, {
					get(collTarget, collProp, collReceiver) {
						if (collProp !== "createIndex") {
							return Reflect.get(collTarget, collProp, collReceiver);
						}

						return async (
							...indexArgs: Parameters<Collection["createIndex"]>
						) => {
							try {
								return await collTarget.createIndex(...indexArgs);
							} catch (error) {
								console.warn(
									`[mongo] Skipping index creation on "${collTarget.collectionName}" — the database user lacks index-management permissions.`,
									error,
								);
								return null;
							}
						};
					},
				});
			};
		},
	});
}

export const mongoDb = withIndexCreationFallback(mongoClient.db());
