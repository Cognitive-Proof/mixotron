"use client";

import { useMemo, useState } from "react";
import {
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

/** Decodes (does not verify — mixotron has no key to verify a Governorator
 * request with) the payload of a Governorator enrollment request JWT, just
 * enough to show its terms in plain language before signing. See
 * docs/governorator-enrollment.md for the full shape. */
function decodeEnrollmentJwt(jwt: string): DecodedEnrollmentRequest | null {
	const parts = jwt.trim().split(".");
	if (parts.length !== 3 || !parts[1]) return null;
	try {
		const payload = JSON.parse(
			new TextDecoder().decode(fromBase64Url(parts[1])),
		) as Record<string, unknown>;
		if (typeof payload.sub !== "string") return null;

		const vc = payload.vc as Record<string, unknown> | undefined;
		const credentialSubject = vc?.credentialSubject as
			| Record<string, unknown>
			| undefined;

		return {
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
		};
	} catch {
		return null;
	}
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

	const decoded = useMemo(
		() => (jwt.trim() ? decodeEnrollmentJwt(jwt) : null),
		[jwt],
	);

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

				{jwt.trim() && !decoded && (
					<p className="form-error">
						That doesn&apos;t look like a complete request JWT — paste the whole
						token.
					</p>
				)}

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

				<button
					className="btn btn-primary"
					disabled={!canSign || signing}
					onClick={() => sign(new TextEncoder().encode(jwt.trim()))}
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
