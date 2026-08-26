"use client";

/**
 * Derives a per-profile Ed25519 identity key from a WebAuthn credential's
 * PRF (pseudo-random function) extension output, and computes the
 * did:jwk issuer identifier c2pa-rs-javascript-library's ICA
 * (Identity Claims Aggregation) signing path expects.
 *
 * The raw Ed25519 seed never leaves the browser and is never persisted —
 * it's re-derived fresh from the authenticator (PRF output for a given
 * credential + salt is deterministic) each time a profile needs to sign
 * something. Only the credential id, the (non-secret) salt, and the
 * resulting DID are ever sent to the server.
 */

import { ed25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";

/** Domain-separation label for the HKDF step between the raw PRF output
 * and the Ed25519 seed — cheap hygiene against reusing the PRF secret
 * verbatim as key material, in case some other feature ever also asks
 * this same credential+salt pair for PRF output. */
const HKDF_INFO = new TextEncoder().encode("mixotron-cawg-ica-v1");

export interface WebAuthnPrfCredential {
	/** base64url-encoded WebAuthn credential id — needed to target this
	 * exact credential in future navigator.credentials.get() calls. */
	credentialId: string;
	/** Random 32 bytes, base64url-encoded. Not secret — PRF security comes
	 * from the authenticator-bound secret, not salt confidentiality — but
	 * must stay fixed for this profile, since a different salt input
	 * deterministically produces a different (unrelated) seed. */
	prfSalt: string;
}

export interface WebAuthnRegistrationResult extends WebAuthnPrfCredential {
	issuerDid: string;
}

function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
	const binary = atob(withPadding);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
	const bytes = new Uint8Array(length);
	crypto.getRandomValues(bytes);
	return bytes;
}

/**
 * did:jwk encoding for an Ed25519 public key — must byte-for-byte match
 * c2pa-rs-javascript-library's computeIcaIssuerDid() (crate/src/lib.rs),
 * which serializes {"kty":"OKP","crv":"Ed25519","x":"<pubkey>"} with no
 * whitespace, that exact key order, then base64url-nopad encodes it.
 * Reimplemented in plain JS here (rather than loading the WASM library
 * client-side) to avoid depending on that package's browser bundle
 * loading correctly under Next.js's client bundler.
 */
export function computeIcaIssuerDidFromPublicKey(
	publicKey: Uint8Array,
): string {
	const jwk = `{"kty":"OKP","crv":"Ed25519","x":"${toBase64Url(publicKey)}"}`;
	return `did:jwk:${toBase64Url(new TextEncoder().encode(jwk))}`;
}

function deriveEd25519Seed(prfOutput: ArrayBuffer): Uint8Array {
	return hkdf(sha256, new Uint8Array(prfOutput), undefined, HKDF_INFO, 32);
}

/** True only if the browser exposes the WebAuthn API at all. Whether the
 * specific authenticator supports the PRF extension can only be known
 * after actually attempting registration — see registerWebAuthnPrfCredential. */
export function isWebAuthnSupported(): boolean {
	return (
		typeof window !== "undefined" &&
		typeof window.PublicKeyCredential !== "undefined" &&
		typeof navigator.credentials !== "undefined"
	);
}

/**
 * Registers a new WebAuthn credential for this profile and immediately
 * derives its Ed25519 identity key to compute the resulting DID.
 *
 * Throws PrfNotSupportedError if the authenticator/browser combination
 * doesn't support the PRF extension — the profile then has no path to
 * client-side identity signing on this device and should fall back to
 * mixotron's shared server-side test key (existing behavior, unchanged).
 */
export class PrfNotSupportedError extends Error {
	constructor() {
		super(
			"This device or browser doesn't support the WebAuthn PRF extension needed for identity signing.",
		);
		this.name = "PrfNotSupportedError";
	}
}

export async function registerWebAuthnPrfCredential(
	profileId: string,
	profileDisplayName: string,
): Promise<WebAuthnRegistrationResult> {
	if (!isWebAuthnSupported()) {
		throw new PrfNotSupportedError();
	}

	const challenge = randomBytes(32);
	const userId = new TextEncoder().encode(profileId);

	const credential = (await navigator.credentials.create({
		publicKey: {
			challenge,
			rp: { name: "Mix-O-Tron" },
			user: {
				id: userId,
				name: profileDisplayName || profileId,
				displayName: profileDisplayName || profileId,
			},
			// The credential's own signing algorithm is irrelevant here — it's
			// never used to sign anything. It's purely a PRF secret-derivation
			// oracle, so any of these standard algs is fine.
			pubKeyCredParams: [
				{ type: "public-key", alg: -7 }, // ES256
				{ type: "public-key", alg: -257 }, // RS256
			],
			authenticatorSelection: {
				residentKey: "preferred",
				userVerification: "preferred",
			},
			extensions: { prf: {} },
		},
	})) as PublicKeyCredential | null;

	if (!credential) {
		throw new Error("WebAuthn registration was cancelled or failed.");
	}

	const clientExtensionResults = credential.getClientExtensionResults();
	if (!clientExtensionResults.prf?.enabled) {
		throw new PrfNotSupportedError();
	}

	const credentialId = toBase64Url(new Uint8Array(credential.rawId));
	const prfSalt = randomBytes(32);

	const prfResult = await evaluatePrf(credentialId, prfSalt);
	const seed = deriveEd25519Seed(prfResult);
	const publicKey = ed25519.getPublicKey(seed);
	const issuerDid = computeIcaIssuerDidFromPublicKey(publicKey);

	return {
		credentialId,
		prfSalt: toBase64Url(prfSalt),
		issuerDid,
	};
}

/**
 * Re-derives the same Ed25519 seed for an already-registered credential —
 * used at actual signing time. Prompts the user for their
 * biometric/PIN/security-key tap; that prompt *is* the user's consent to
 * sign.
 */
export async function deriveSigningSeed(
	credential: WebAuthnPrfCredential,
): Promise<Uint8Array> {
	const prfResult = await evaluatePrf(
		credential.credentialId,
		fromBase64Url(credential.prfSalt),
	);
	return deriveEd25519Seed(prfResult);
}

/**
 * Signs the `toSign` bytes from manifest.prepareIcaSigning with this
 * profile's device-derived Ed25519 key. Prompts the user's authenticator
 * (the same PRF-derivation prompt as deriveSigningSeed) — that prompt is the
 * user's consent to sign. Returns a 64-byte raw (RFC 8032, R||S) signature,
 * exactly what manifest.finalizeIcaSigning expects.
 */
export async function signIcaToSign(
	credential: WebAuthnPrfCredential,
	toSign: Uint8Array,
): Promise<Uint8Array> {
	const seed = await deriveSigningSeed(credential);
	return ed25519.sign(toSign, seed);
}

async function evaluatePrf(
	credentialId: string,
	salt: Uint8Array<ArrayBuffer>,
): Promise<ArrayBuffer> {
	const challenge = randomBytes(32);

	const assertion = (await navigator.credentials.get({
		publicKey: {
			challenge,
			allowCredentials: [
				{ type: "public-key", id: fromBase64Url(credentialId) },
			],
			userVerification: "preferred",
			extensions: { prf: { eval: { first: salt } } },
		},
	})) as PublicKeyCredential | null;

	if (!assertion) {
		throw new Error("WebAuthn signing prompt was cancelled or failed.");
	}

	const results = assertion.getClientExtensionResults();
	const prfOutput = results.prf?.results?.first;
	if (!prfOutput) {
		throw new PrfNotSupportedError();
	}
	return prfOutput as ArrayBuffer;
}
