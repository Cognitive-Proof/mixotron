"use client";

import { useMemo, useState } from "react";
import {
	ProfileDidField,
	ProfileKeySelect,
	SignatureResult,
	useProfileKeySigner,
} from "~/app/dashboard/_components/profile-key-signer";
import { fromBase64Url } from "~/lib/cawg-webauthn";

interface DecodedEnrollmentRequest {
	sub: string;
	exp?: number;
	authorityId?: string;
	authorityName?: string;
	resource?: string;
	action?: string;
}

type DecodeResult =
	| { ok: true; value: DecodedEnrollmentRequest }
	| { ok: false; error: string };

/** Decodes (does not verify — mixotron has no key to verify a Governorator
 * request with) the payload of a Governorator enrollment request JWT, just
 * enough to show its terms in plain language before signing. See
 * docs/governorator-enrollment.md for the full shape.
 *
 * Returns a specific reason on failure rather than just null — the most
 * common real failure isn't a malformed paste, it's pasting the *wrong
 * kind* of request. A Governorator enrollment request and a DIDsmith
 * KeyLinkRequest are both JWT-shaped but structurally different (see
 * docs/didsmith-key-linking.md): Governorator's is a complete, already-signed
 * 3-segment JWS (header.payload.signature); DIDsmith's key-link request is
 * only the 2-segment signing input (header.payload) — it has no signature
 * segment yet because *mix-o-tron* is the one about to produce it. Pasting
 * the latter here will always fail with the generic "wrong shape" error
 * unless we call it out explicitly. */
function decodeEnrollmentJwt(jwt: string): DecodeResult {
	const parts = jwt.trim().split(".");

	if (parts.length === 2) {
		return {
			ok: false,
			error:
				"This is a 2-segment request (header.payload, no signature yet) — that's a DIDsmith key-link request, not a Governorator enrollment request. Use the Sign page instead: it signs arbitrary text with a profile key, which is exactly what DIDsmith's \"Add a key you don't hold\" flow needs.",
		};
	}
	if (parts.length !== 3) {
		return {
			ok: false,
			error: `Expected 3 dot-separated segments (header.payload.signature) — found ${parts.length}. Make sure you copied the entire token, not part of it.`,
		};
	}
	if (!parts[1]) {
		return {
			ok: false,
			error: "The payload segment (the middle part) is empty.",
		};
	}

	let payloadBytes: Uint8Array;
	try {
		payloadBytes = fromBase64Url(parts[1]);
	} catch {
		return {
			ok: false,
			error:
				"The payload segment isn't valid base64url — it may have been truncated or altered when copied.",
		};
	}

	let payload: Record<string, unknown>;
	try {
		payload = JSON.parse(new TextDecoder().decode(payloadBytes)) as Record<
			string,
			unknown
		>;
	} catch {
		return {
			ok: false,
			error: "The payload decodes, but isn't valid JSON once decoded.",
		};
	}

	if (typeof payload.sub !== "string") {
		return {
			ok: false,
			error:
				'The decoded payload has no "sub" field (the DID this request names) — this may not be a Governorator enrollment request.',
		};
	}

	const vc = payload.vc as Record<string, unknown> | undefined;
	const credentialSubject = vc?.credentialSubject as
		| Record<string, unknown>
		| undefined;

	return {
		ok: true,
		value: {
			sub: payload.sub,
			exp: typeof payload.exp === "number" ? payload.exp : undefined,
			authorityId:
				typeof credentialSubject?.authority_id === "string"
					? credentialSubject.authority_id
					: undefined,
			authorityName:
				typeof credentialSubject?.authority_name === "string"
					? credentialSubject.authority_name
					: undefined,
			resource:
				typeof credentialSubject?.resource === "string"
					? credentialSubject.resource
					: undefined,
			action:
				typeof credentialSubject?.action === "string"
					? credentialSubject.action
					: undefined,
		},
	};
}

function formatUnixSeconds(seconds: number): string {
	return new Date(seconds * 1000).toLocaleString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
		hour: "numeric",
		minute: "2-digit",
	});
}

export default function EnrollPage() {
	const {
		profiles,
		profileId,
		setProfileId,
		selectedProfile,
		credential,
		signing,
		error,
		signature,
		copied,
		sign,
		copySignature,
		reset,
	} = useProfileKeySigner();

	const [jwt, setJwt] = useState("");

	function handleJwtChange(value: string) {
		setJwt(value);
		reset();
	}

	const decodeResult = useMemo(
		() => (jwt.trim() ? decodeEnrollmentJwt(jwt) : null),
		[jwt],
	);
	const decoded = decodeResult?.ok ? decodeResult.value : null;
	const decodeError =
		decodeResult && !decodeResult.ok ? decodeResult.error : null;

	const expired = decoded?.exp !== undefined && decoded.exp * 1000 < Date.now();
	// A profile can sign as either its bare did:jwk or a linked did:web (see
	// docs/didsmith-key-linking.md) — an admin might reasonably have issued
	// the request against either identity.
	const didMismatch = Boolean(
		decoded &&
			credential &&
			decoded.sub !== credential.issuerDid &&
			decoded.sub !== selectedProfile?.didWeb,
	);
	const canSign = Boolean(decoded && credential) && !didMismatch && !expired;

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Enroll</div>
				<h1>Sign a Governorator enrollment request</h1>
				<p>
					Paste the request from a Governorator trust registry&apos;s{" "}
					<code>/enroll/[id]</code> page, confirm the terms, and sign it with
					one of your profile&apos;s connected device keys. Governorator never
					sees or touches the private key — only the signature you paste back.
					Looking to link a key into a DIDsmith <code>did:web</code> instead?
					Use the <a href="/dashboard/sign">Sign page</a> — that request is
					shaped differently (see below).
				</p>
			</div>

			<div className="dash-card" style={{ marginBottom: "1.5rem" }}>
				<div className="field">
					<label htmlFor="jwt">Request JWT</label>
					<textarea
						id="jwt"
						onChange={(e) => handleJwtChange(e.target.value)}
						placeholder="eyJhbGciOi..."
						rows={5}
						value={jwt}
					/>
					<span className="field-hint">
						Copy this from the Governorator page that sent you here — the full
						three-part token, not just the payload.
					</span>
				</div>

				{decodeError && <p className="form-error">{decodeError}</p>}

				{decoded && (
					<div className="field">
						<span
							className="field-hint"
							style={{ display: "block", marginBottom: "0.6rem" }}
						>
							{decoded.authorityName ?? decoded.authorityId ?? "An authority"}{" "}
							wants to list you as a trusted entity
							{decoded.resource ? (
								<>
									{" "}
									for <code>{decoded.action ?? "any action"}</code> on{" "}
									<code>{decoded.resource}</code>
								</>
							) : (
								" — not scoped to a specific resource or action"
							)}
							.
						</span>
						{decoded.exp !== undefined && (
							<span
								className="field-hint"
								style={expired ? { color: "var(--amber)" } : undefined}
							>
								{expired ? "This request expired " : "Expires "}
								{formatUnixSeconds(decoded.exp)}.
							</span>
						)}
					</div>
				)}

				<ProfileKeySelect
					onChange={setProfileId}
					profileId={profileId}
					profiles={profiles}
				/>
				{credential && <ProfileDidField did={credential.issuerDid} />}
				{credential && decoded && didMismatch && (
					<p className="form-error">
						This profile&apos;s identity (
						{selectedProfile?.didWeb ?? credential.issuerDid}) doesn&apos;t
						match the DID this request names ({decoded.sub}). Signing with this
						profile would produce a signature Governorator can&apos;t verify —
						pick the profile the admin was given, or ask them to reissue the
						request against this one.
					</p>
				)}

				{error && <p className="form-error">{error}</p>}

				{decoded && !credential && !didMismatch && (
					<span className="field-hint" style={{ display: "block" }}>
						Select a profile above to sign as before you can sign this request.
					</span>
				)}

				<button
					className="btn btn-primary"
					disabled={!canSign || signing}
					onClick={() => sign(new TextEncoder().encode(jwt.trim()))}
					style={{ marginTop: "0.6rem" }}
					type="button"
				>
					{signing ? "Waiting for device…" : "Sign request"}
				</button>

				{signature && (
					<SignatureResult
						copied={copied}
						hint="Paste this back into Governorator's counter-signature box."
						onCopy={copySignature}
						signature={signature}
					/>
				)}
			</div>
		</>
	);
}
