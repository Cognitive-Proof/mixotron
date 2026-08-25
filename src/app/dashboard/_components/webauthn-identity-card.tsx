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

	const register = api.profile.registerWebAuthnCredential.useMutation({
		onSuccess: async () => {
			await utils.profile.byId.invalidate({ id: profile.id });
			await utils.profile.list.invalidate();
		},
	});
	const unregister = api.profile.unregisterWebAuthnCredential.useMutation({
		onSuccess: async () => {
			await utils.profile.byId.invalidate({ id: profile.id });
			await utils.profile.list.invalidate();
		},
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
									"Disconnect this device key? Future releases signed with this profile will fall back to Mix-O-Tron's shared test key until you connect a new one.",
								)
							) {
								unregister.mutate({ id: profile.id });
							}
						}}
						type="button"
					>
						{unregister.isPending ? "Disconnecting…" : "Disconnect"}
					</button>
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
