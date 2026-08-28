"use client";

import { useState } from "react";
import {
	ProfileDidField,
	ProfileKeySelect,
	SignatureResult,
	useProfileKeySigner,
} from "~/app/dashboard/_components/profile-key-signer";

export default function SignPage() {
	const {
		profiles,
		profileId,
		setProfileId,
		credential,
		signing,
		error,
		signature,
		copied,
		sign,
		reset,
		copySignature,
	} = useProfileKeySigner();

	const [text, setText] = useState("");

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Sign</div>
				<h1>Sign text with a profile key</h1>
				<p>
					A generic primitive: paste any text, pick a profile with a connected
					device key, and sign it — a raw Ed25519 signature over exactly the
					text as UTF-8 bytes, base64url-encoded. This is what linking a
					mix-o-tron key into a DIDsmith <code>did:web</code> uses (see{" "}
					<code>docs/didsmith-key-linking.md</code>), and works for any other
					&ldquo;sign this exact text with one of my keys&rdquo; need.
				</p>
			</div>

			<div className="dash-card" style={{ marginBottom: "1.5rem" }}>
				<div className="field">
					<label htmlFor="text">Text to sign</label>
					<textarea
						id="text"
						onChange={(e) => {
							setText(e.target.value);
							reset();
						}}
						placeholder="Paste text…"
						rows={5}
						value={text}
					/>
					<span className="field-hint">
						Signed exactly as displayed, as UTF-8 bytes — no parsing or
						reformatting.
					</span>
				</div>

				<ProfileKeySelect
					onChange={setProfileId}
					profileId={profileId}
					profiles={profiles}
				/>
				{credential && <ProfileDidField did={credential.issuerDid} />}

				{error && <p className="form-error">{error}</p>}

				<button
					className="btn btn-primary"
					disabled={!credential || !text.trim() || signing}
					onClick={() => sign(new TextEncoder().encode(text))}
					type="button"
				>
					{signing ? "Waiting for device…" : "Sign"}
				</button>

				{signature && (
					<SignatureResult
						copied={copied}
						hint="Copy this wherever the signature is being requested."
						onCopy={copySignature}
						signature={signature}
					/>
				)}
			</div>
		</>
	);
}
