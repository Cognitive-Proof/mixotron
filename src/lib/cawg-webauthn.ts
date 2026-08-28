"use client";

/**
 * Mix-O-Tron's app config plus a thin wrapper around
 * @cognitiveproof/webauthn-prf-identity, which implements the actual
 * PRF-derived Ed25519 identity + did:jwk logic (previously hand-rolled
 * directly in this file). Re-exports the library's functions under the
 * names/signatures this app already calls them by, partially applied with
 * mixotron's config, so nothing else in the app had to change.
 *
 * `hkdfInfo` below MUST stay exactly "mixotron-cawg-ica-v1" — it's the HKDF
 * domain-separation label baked into every already-registered profile's
 * derived signing key. Changing it would silently derive a *different*
 * Ed25519 seed (and therefore a different DID) for every existing
 * registered credential.
 */

import {
	computeIcaIssuerDidFromPublicKey,
	isWebAuthnSupported,
	deriveSigningSeed as libDeriveSigningSeed,
	registerWebAuthnPrfCredential as libRegisterWebAuthnPrfCredential,
	signIcaToSign as libSignIcaToSign,
	PrfNotSupportedError,
	type WebAuthnPrfCredential,
	type WebAuthnPrfIdentityConfig,
	type WebAuthnRegistrationResult,
} from "@cognitiveproof/webauthn-prf-identity";

export type { WebAuthnPrfCredential, WebAuthnRegistrationResult };
export {
	computeIcaIssuerDidFromPublicKey,
	isWebAuthnSupported,
	PrfNotSupportedError,
};

const CONFIG: WebAuthnPrfIdentityConfig = {
	rpName: "Mix-O-Tron",
	hkdfInfo: "mixotron-cawg-ica-v1",
};

export function registerWebAuthnPrfCredential(
	profileId: string,
	profileDisplayName: string,
): Promise<WebAuthnRegistrationResult> {
	return libRegisterWebAuthnPrfCredential(
		CONFIG,
		profileId,
		profileDisplayName,
	);
}

/**
 * Re-derives the same Ed25519 seed for an already-registered credential —
 * used at actual signing time. Prompts the user for their
 * biometric/PIN/security-key tap; that prompt *is* the user's consent to
 * sign.
 */
export function deriveSigningSeed(
	credential: WebAuthnPrfCredential,
): Promise<Uint8Array> {
	return libDeriveSigningSeed(CONFIG, credential);
}

/**
 * Signs arbitrary bytes with this profile's device-derived Ed25519 key.
 * Prompts the user's authenticator (the same PRF-derivation prompt as
 * deriveSigningSeed) — that prompt is the user's consent to sign. Returns a
 * 64-byte raw (RFC 8032, R‖S) signature.
 */
export function signIcaToSign(
	credential: WebAuthnPrfCredential,
	toSign: Uint8Array,
): Promise<Uint8Array> {
	return libSignIcaToSign(CONFIG, credential, toSign);
}

// ---------------------------------------------------------------------------
// base64url helpers — not part of @cognitiveproof/webauthn-prf-identity's
// public API (it keeps these as a private implementation detail), but
// src/app/dashboard/enroll/page.tsx needs them to decode/encode a JWT it
// never passes through the library itself.
// ---------------------------------------------------------------------------

export function toBase64Url(bytes: Uint8Array): string {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary)
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
}

export function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
	const padded = value.replace(/-/g, "+").replace(/_/g, "/");
	const withPadding = padded + "=".repeat((4 - (padded.length % 4)) % 4);
	const binary = atob(withPadding);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
