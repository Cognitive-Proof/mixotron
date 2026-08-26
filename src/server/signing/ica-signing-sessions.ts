import type { PreparedIcaIdentityAssertion } from "c2pa-rs-javascript-library";
import { type Binary, ObjectId } from "mongodb";
import { mongoDb } from "~/server/db/mongo";

const SESSION_TTL_MS = 5 * 60 * 1000;

/**
 * Mongo's on-disk shape for a PreparedIcaIdentityAssertion: the driver
 * round-trips Uint8Array fields as BSON Binary wrappers, not plain
 * Uint8Arrays (confirmed empirically against this app's Firestore-backed
 * Mongo endpoint) — so the stored document type is genuinely different from
 * the app-level PreparedIcaIdentityAssertion type, not just a formality.
 */
interface StoredPreparedIcaIdentityAssertion
	extends Omit<
		PreparedIcaIdentityAssertion,
		"asset" | "signcert" | "pkey" | "vcBytes" | "toSign"
	> {
	asset: Binary;
	signcert: Binary;
	pkey: Binary;
	vcBytes: Binary;
	toSign: Binary;
}

interface IcaSigningSessionDocument {
	_id: ObjectId;
	userId: string;
	profileId: string;
	fileName: string;
	prepared: StoredPreparedIcaIdentityAssertion;
	createdAt: Date;
	expiresAt: Date;
}

const sessions = () =>
	mongoDb.collection<IcaSigningSessionDocument>("icaSigningSessions");

function rehydrate(
	stored: StoredPreparedIcaIdentityAssertion,
): PreparedIcaIdentityAssertion {
	return {
		...stored,
		asset: stored.asset.value(),
		signcert: stored.signcert.value(),
		pkey: stored.pkey.value(),
		vcBytes: stored.vcBytes.value(),
		toSign: stored.toSign.value(),
	};
}

/**
 * Persists a PreparedIcaIdentityAssertion server-side between the prepare
 * and finalize steps of ICA (WebAuthn-signed) identity signing. This object
 * embeds the server's ES256 private key and the full asset bytes — finalize
 * re-runs the entire manifest build+sign — so it must never reach the
 * browser; only `toSign` from the prepare response does. Returns the new
 * session's id.
 */
export async function createIcaSigningSession(input: {
	userId: string;
	profileId: string;
	fileName: string;
	prepared: PreparedIcaIdentityAssertion;
}): Promise<string> {
	const now = new Date();
	const result = await sessions().insertOne({
		userId: input.userId,
		profileId: input.profileId,
		fileName: input.fileName,
		prepared: input.prepared,
		createdAt: now,
		expiresAt: new Date(now.getTime() + SESSION_TTL_MS),
	} as unknown as IcaSigningSessionDocument);
	return result.insertedId.toString();
}

/**
 * Loads a session by id, scoped to the requesting user, treating an expired
 * session as if it didn't exist. There's no DB-level TTL cleanup here — the
 * Firestore MongoDB-compatibility endpoint this app runs on doesn't grant
 * index-management permissions (see db/mongo.ts), so expiry is enforced at
 * the application layer only, same as Link's JWT-based tokens.
 */
export async function getIcaSigningSession(
	userId: string,
	sessionId: string,
): Promise<{
	profileId: string;
	fileName: string;
	prepared: PreparedIcaIdentityAssertion;
} | null> {
	let objectId: ObjectId;
	try {
		objectId = new ObjectId(sessionId);
	} catch {
		return null;
	}
	const doc = await sessions().findOne({ _id: objectId, userId });
	if (!doc) return null;
	if (doc.expiresAt.getTime() < Date.now()) {
		await sessions().deleteOne({ _id: objectId });
		return null;
	}
	return {
		profileId: doc.profileId,
		fileName: doc.fileName,
		prepared: rehydrate(doc.prepared),
	};
}

/** Deletes a signing session — sessions are single-use, so finalize always
 * calls this once it has consumed the prepared state. */
export async function deleteIcaSigningSession(
	sessionId: string,
): Promise<void> {
	try {
		await sessions().deleteOne({ _id: new ObjectId(sessionId) });
	} catch {
		// Invalid id shape — nothing to delete.
	}
}
