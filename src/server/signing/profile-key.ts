import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import { computeIcaIssuerDid } from "c2pa-rs-javascript-library";
import { env } from "~/env";
import type { ServerManagedKey } from "~/lib/profile";

/**
 * Generation, encryption, and decryption for a "server-managed" profile's
 * signing key — see the ServerManagedKey doc comment in ~/lib/profile for
 * the security tradeoff this represents relative to a WebAuthn credential.
 */

function getEncryptionKey(): Buffer {
	if (!env.PROFILE_KEY_ENCRYPTION_SECRET) {
		throw new Error(
			"PROFILE_KEY_ENCRYPTION_SECRET is not set — required to create or use a server-managed profile key.",
		);
	}
	// AES-256-GCM needs a 32-byte key; the env secret is an arbitrary string,
	// so derive a fixed-length key from it the same way getSecretKey() in
	// link-tokens.ts turns LINK_TOKEN_SECRET into signing key material.
	return createHash("sha256")
		.update(env.PROFILE_KEY_ENCRYPTION_SECRET)
		.digest();
}

function encryptSeed(seed: Uint8Array): string {
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
	const ciphertext = Buffer.concat([cipher.update(seed), cipher.final()]);
	const authTag = cipher.getAuthTag();
	return [iv, authTag, ciphertext]
		.map((buf) => buf.toString("base64"))
		.join(".");
}

function decryptSeed(encryptedSeed: string): Uint8Array {
	const [ivB64, authTagB64, ciphertextB64] = encryptedSeed.split(".");
	if (!ivB64 || !authTagB64 || !ciphertextB64) {
		throw new Error("Malformed encrypted profile key.");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		getEncryptionKey(),
		Buffer.from(ivB64, "base64"),
	);
	decipher.setAuthTag(Buffer.from(authTagB64, "base64"));
	return Buffer.concat([
		decipher.update(Buffer.from(ciphertextB64, "base64")),
		decipher.final(),
	]);
}

/** Generates a fresh server-managed key for a new profile. */
export function generateServerManagedKey(): ServerManagedKey {
	const seed = randomBytes(32);
	return {
		issuerDid: computeIcaIssuerDid(seed),
		encryptedSeed: encryptSeed(seed),
	};
}

/** Decrypts a server-managed profile's seed for use in a signing call. */
export function loadServerManagedKeySeed(key: ServerManagedKey): Uint8Array {
	return decryptSeed(key.encryptedSeed);
}
