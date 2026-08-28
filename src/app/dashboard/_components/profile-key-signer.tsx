"use client";

import { useRef, useState } from "react";
import QRCode from "react-qr-code";
import { signIcaToSign, toBase64Url } from "~/lib/cawg-webauthn";
import type { Profile } from "~/lib/profile";
import { api } from "~/trpc/react";

/**
 * Shared state/logic behind "pick one of my profiles with a connected
 * device key, sign some bytes with it, get back a copyable base64url
 * signature" — the mechanical part /dashboard/enroll and /dashboard/sign
 * both need. Each page keeps its own domain-specific input handling (JWT
 * decoding vs. a DIDsmith-specific check) separate, rather than one page
 * branching on input shape.
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

function CopyableIdRow({
	id,
	label,
	value,
	hint,
}: {
	id: string;
	label: string;
	value: string;
	hint: string;
}) {
	const [copied, setCopied] = useState(false);
	return (
		<div className="field">
			<label htmlFor={id}>{label}</label>
			<span className="field-hint">{hint}</span>
			<div style={{ display: "flex", gap: "0.6rem" }}>
				<input id={id} readOnly type="text" value={value} />
				<button
					className="btn btn-ghost btn-sm"
					onClick={async () => {
						await navigator.clipboard.writeText(value);
						setCopied(true);
					}}
					type="button"
				>
					{copied ? "Copied" : "Copy"}
				</button>
			</div>
		</div>
	);
}

/** A profile's did:jwk with a Copy button, shown once a profile with a
 * device key is selected — e.g. to paste into DIDsmith's "Add a key you
 * don't hold" → "Target key's did:jwk" box, or to hand to a registry admin
 * ahead of a Governorator enrollment. When the profile has a linked
 * did:web (see webauthn-identity-card.tsx), it's shown right below,
 * also copyable — the more useful identity to hand out when a
 * rotation-capable one is preferred over the bare did:jwk. */
export function ProfileDidField({
	did,
	didWeb,
}: {
	did: string;
	didWeb?: string | null;
}) {
	return (
		<>
			<CopyableIdRow
				hint="Paste this wherever a did:jwk is being requested — e.g. DIDsmith’s “Target key’s did:jwk” box."
				id="profileDid"
				label="Profile did:jwk"
				value={did}
			/>
			{didWeb && (
				<CopyableIdRow
					hint="This profile’s linked did:web — hand this out instead of the did:jwk above wherever a rotation-capable identity is preferred."
					id="profileDidWeb"
					label="Profile did:web"
					value={didWeb}
				/>
			)}
		</>
	);
}

/** The signed-result readonly field + Copy button, plus an optional QR
 * code of the same signature — shared between /enroll and /sign. The QR
 * code is a second way to move the signature (e.g. scanning it with
 * another device) alongside copy/paste, not a replacement for it. It can
 * be opened full-size in its own tab for easier scanning off a screen. */
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
	const [showQr, setShowQr] = useState(false);
	const qrRef = useRef<HTMLDivElement>(null);

	function openQrInNewTab() {
		const svg = qrRef.current?.querySelector("svg");
		if (!svg) return;
		const markup = new XMLSerializer().serializeToString(svg);
		const url = URL.createObjectURL(
			new Blob([markup], { type: "image/svg+xml" }),
		);
		window.open(url, "_blank");
	}

	return (
		<div className="field" style={{ marginTop: "1.2rem" }}>
			<span className="field-hint">{hint}</span>
			<div style={{ display: "flex", gap: "0.6rem" }}>
				<input readOnly type="text" value={signature} />
				<button className="btn btn-ghost btn-sm" onClick={onCopy} type="button">
					{copied ? "Copied" : "Copy"}
				</button>
				<button
					className="btn btn-ghost btn-sm"
					onClick={() => setShowQr((v) => !v)}
					type="button"
				>
					{showQr ? "Hide QR" : "Show QR"}
				</button>
			</div>

			{showQr && (
				<div style={{ marginTop: "0.8rem" }}>
					<div
						ref={qrRef}
						style={{
							display: "inline-block",
							padding: "1rem",
							background: "#fff",
							borderRadius: "8px",
						}}
					>
						<QRCode size={180} value={signature} />
					</div>
					<div style={{ marginTop: "0.5rem" }}>
						<button
							className="btn btn-ghost btn-sm"
							onClick={openQrInNewTab}
							type="button"
						>
							Open full-size in a new tab
						</button>
					</div>
					<span
						className="field-hint"
						style={{ display: "block", marginTop: "0.4rem" }}
					>
						Scan this from another device instead of copying and pasting the
						signature by hand.
					</span>
				</div>
			)}
		</div>
	);
}
