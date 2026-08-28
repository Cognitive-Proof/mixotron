"use client";

import { useState } from "react";
import { signIcaToSign, toBase64Url } from "~/lib/cawg-webauthn";
import type { Profile } from "~/lib/profile";
import { api } from "~/trpc/react";

/**
 * Shared state/logic behind "pick one of my profiles with a connected
 * device key, sign some bytes with it, get back a copyable base64url
 * signature" — the mechanical part /dashboard/enroll and /dashboard/sign
 * both need. Each page keeps its own domain-specific input handling (JWT
 * decoding vs. plain text) separate — see docs/didsmith-key-linking.md for
 * why those two stay separate pages rather than one branching on input
 * shape.
 */
export function useProfileKeySigner() {
	const { data } = api.profile.list.useQuery();
	const profiles = (data ?? []).filter((p) => p.webauthnCredential);

	const [profileId, setProfileId] = useState("");
	const [signing, setSigning] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [signature, setSignature] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const selectedProfile = profiles.find((p) => p.id === profileId);
	const credential = selectedProfile?.webauthnCredential;

	async function sign(bytes: Uint8Array) {
		if (!credential) return;
		setSigning(true);
		setError(null);
		setSignature(null);
		try {
			// Prompts the user's authenticator — that prompt is their consent
			// to sign.
			const rawSignature = await signIcaToSign(credential, bytes);
			setSignature(toBase64Url(rawSignature));
			setCopied(false);
		} catch (err) {
			console.error("Failed to sign with profile key", err);
			setError(
				err instanceof Error
					? err.message
					: "WebAuthn signing was cancelled or failed.",
			);
		} finally {
			setSigning(false);
		}
	}

	async function copySignature() {
		if (!signature) return;
		await navigator.clipboard.writeText(signature);
		setCopied(true);
	}

	function reset() {
		setSignature(null);
		setError(null);
	}

	return {
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
	};
}

/** Profile <select> limited to profiles with a connected device key, plus
 * the "none available" hint — shared between /enroll and /sign. */
export function ProfileKeySelect({
	profiles,
	profileId,
	onChange,
}: {
	profiles: Profile[];
	profileId: string;
	onChange: (id: string) => void;
}) {
	return (
		<div className="field">
			<label htmlFor="profile">Sign as</label>
			<select
				id="profile"
				onChange={(e) => onChange(e.target.value)}
				value={profileId}
			>
				<option value="">Select a profile…</option>
				{profiles.map((profile) => (
					<option key={profile.id} value={profile.id}>
						{profile.displayName || "Untitled"}
					</option>
				))}
			</select>
			{profiles.length === 0 && (
				<span className="field-hint">
					None of your profiles have a device key connected yet — set one up on
					the Profiles page first.
				</span>
			)}
		</div>
	);
}

/** The signed-result readonly field + Copy button — shared between
 * /enroll and /sign. */
export function SignatureResult({
	signature,
	copied,
	onCopy,
	hint,
}: {
	signature: string;
	copied: boolean;
	onCopy: () => void;
	hint: string;
}) {
	return (
		<div className="field" style={{ marginTop: "1.2rem" }}>
			<span className="field-hint">{hint}</span>
			<div style={{ display: "flex", gap: "0.6rem" }}>
				<input readOnly type="text" value={signature} />
				<button className="btn btn-ghost btn-sm" onClick={onCopy} type="button">
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
}
