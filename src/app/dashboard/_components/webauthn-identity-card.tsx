"use client";

import { useState } from "react";
import {
	isWebAuthnSupported,
	PrfNotSupportedError,
	registerWebAuthnPrfCredential,
} from "~/lib/cawg-webauthn";
import type { Profile } from "~/lib/profile";
import { api } from "~/trpc/react";

function truncateDid(did: string): string {
	return did.length > 40 ? `${did.slice(0, 24)}…${did.slice(-10)}` : did;
}

export function WebauthnIdentityCard({ profile }: { profile: Profile }) {
	const utils = api.useUtils();
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [didWebInput, setDidWebInput] = useState("");
	const [linkError, setLinkError] = useState<string | null>(null);

	const invalidate = async () => {
		await utils.profile.byId.invalidate({ id: profile.id });
		await utils.profile.list.invalidate();
	};

	const register = api.profile.registerWebAuthnCredential.useMutation({
		onSuccess: invalidate,
	});
	const unregister = api.profile.unregisterWebAuthnCredential.useMutation({
		onSuccess: invalidate,
	});
	const linkDidWeb = api.profile.linkDidWeb.useMutation({
		onSuccess: async () => {
			setDidWebInput("");
			setLinkError(null);
			await invalidate();
		},
		onError: (err) => setLinkError(err.message),
	});
	const unlinkDidWeb = api.profile.unlinkDidWeb.useMutation({
		onSuccess: invalidate,
	});

	async function handleConnect() {
		setError(null);
		setBusy(true);
		try {
			const result = await registerWebAuthnPrfCredential(
				profile.id,
				profile.displayName,
			);
			await register.mutateAsync({
				id: profile.id,
				credential: result,
			});
		} catch (err) {
			setError(
				err instanceof PrfNotSupportedError
					? err.message
					: "Couldn't register a device key. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}

	if (!isWebAuthnSupported()) {
		return null;
	}

	return (
		<div className="dash-card" style={{ marginTop: "1.5rem" }}>
			<h3>Device identity key</h3>
			<p className="field-hint" style={{ marginBottom: "0.8rem" }}>
				Optional. Sign this profile's identity claims with a key derived from
				your device (Touch ID, Windows Hello, or a security key) instead of
				Mix-O-Tron's shared test key — the private key never leaves your device
				or reaches our servers. Requires a device or browser that supports the
				WebAuthn PRF extension.
			</p>

			{profile.webauthnCredential ? (
				<>
					<dl className="dash-dl">
						<dt>Identity DID</dt>
						<dd>{truncateDid(profile.webauthnCredential.issuerDid)}</dd>
					</dl>
					<button
						className="btn btn-danger btn-sm"
						disabled={unregister.isPending}
						onClick={() => {
							if (
								window.confirm(
									"Disconnect this device key? Future releases signed with this profile will fall back to Mix-O-Tron's shared test key until you connect a new one. Any linked did:web will be unlinked too.",
								)
							) {
								unregister.mutate({ id: profile.id });
							}
						}}
						type="button"
					>
						{unregister.isPending ? "Disconnecting…" : "Disconnect"}
					</button>

					<div
						className="field"
						style={{
							marginTop: "1.2rem",
							paddingTop: "1.2rem",
							borderTop: "1px solid var(--line)",
						}}
					>
						<label htmlFor="didWeb">Linked did:web</label>
						{profile.didWeb ? (
							<>
								<dl className="dash-dl">
									<dt>did:web</dt>
									<dd>{truncateDid(profile.didWeb)}</dd>
								</dl>
								<span className="field-hint">
									Releases now sign as this identity instead of the bare did:jwk
									above — it supports key rotation, which the did:jwk doesn't.
								</span>
								<button
									className="btn btn-ghost btn-sm"
									disabled={unlinkDidWeb.isPending}
									onClick={() => unlinkDidWeb.mutate({ id: profile.id })}
									style={{ marginTop: "0.6rem" }}
									type="button"
								>
									{unlinkDidWeb.isPending ? "Unlinking…" : "Unlink"}
								</button>
							</>
						) : profile.webauthnCredential.publicKey ? (
							<>
								<span className="field-hint">
									Link a <code>did:web</code> (e.g. from{" "}
									<a
										href="https://didsmith.com"
										rel="noreferrer"
										target="_blank"
									>
										DIDsmith
									</a>
									) that already lists this key — see{" "}
									<code>docs/didsmith-key-linking.md</code>. Sign that service's
									request on the <a href="/dashboard/sign">Sign</a> page first.
								</span>
								<div style={{ display: "flex", gap: "0.6rem" }}>
									<input
										id="didWeb"
										onChange={(e) => setDidWebInput(e.target.value)}
										placeholder="did:web:..."
										type="text"
										value={didWebInput}
									/>
									<button
										className="btn btn-ghost btn-sm"
										disabled={!didWebInput.trim() || linkDidWeb.isPending}
										onClick={() =>
											linkDidWeb.mutate({
												id: profile.id,
												didWeb: didWebInput.trim(),
											})
										}
										type="button"
									>
										{linkDidWeb.isPending ? "Linking…" : "Link"}
									</button>
								</div>
								{linkError && <p className="form-error">{linkError}</p>}
							</>
						) : (
							<span className="field-hint">
								This device key was connected before did:web linking existed —
								disconnect and reconnect it to enable this.
							</span>
						)}
					</div>
				</>
			) : (
				<button
					className="btn btn-primary btn-sm"
					disabled={busy}
					onClick={handleConnect}
					type="button"
				>
					{busy ? "Connecting…" : "Connect a device key"}
				</button>
			)}

			{error && (
				<p className="form-error" style={{ marginTop: "0.6rem" }}>
					{error}
				</p>
			)}
		</div>
	);
}
