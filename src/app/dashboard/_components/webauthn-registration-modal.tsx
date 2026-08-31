"use client";

import { useState } from "react";
import {
	beginWebAuthnPrfRegistration,
	finishWebAuthnPrfRegistration,
	PrfNotSupportedError,
	type WebAuthnRegistrationResult,
} from "~/lib/cawg-webauthn";

type Phase = "intro" | "created";

/**
 * Registering a device key needs two native WebAuthn prompts (create the
 * credential, then evaluate PRF for it — most authenticators can't return
 * a usable PRF secret during creation itself). Firing both back to back
 * with no explanation looks like a bug, so this puts a button-gated step in
 * between each prompt instead of calling the library's all-in-one
 * registerWebAuthnPrfCredential.
 */
export function WebauthnRegistrationModal({
	profileId,
	profileDisplayName,
	onCancel,
	onRegistered,
}: {
	profileId: string;
	profileDisplayName: string;
	onCancel: () => void;
	onRegistered: (result: WebAuthnRegistrationResult) => Promise<void>;
}) {
	const [phase, setPhase] = useState<Phase>("intro");
	const [credentialId, setCredentialId] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleCreate() {
		setBusy(true);
		setError(null);
		try {
			const result = await beginWebAuthnPrfRegistration(
				profileId,
				profileDisplayName,
			);
			setCredentialId(result.credentialId);
			setPhase("created");
		} catch (err) {
			setError(
				err instanceof PrfNotSupportedError
					? err.message
					: "Couldn't create a key. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}

	async function handleFinish() {
		if (!credentialId) return;
		setBusy(true);
		setError(null);
		try {
			const result = await finishWebAuthnPrfRegistration(credentialId);
			await onRegistered(result);
		} catch (err) {
			setError(
				err instanceof PrfNotSupportedError
					? err.message
					: "Couldn't finish registering this key. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="modal-overlay">
			<div className="modal-box">
				{phase === "intro" ? (
					<>
						<h3>Key Registration</h3>
						<p>
							Your browser or device will ask you to create a new key — Touch
							ID, Windows Hello, or a security key. This is the first of two
							prompts; the second one derives your signing key from the first.
						</p>
					</>
				) : (
					<>
						<h3>Key Created</h3>
						<p>
							The key was created. Press the button again to finish registering
							it — your device will ask you to confirm once more.
						</p>
					</>
				)}

				{error && <p className="form-error">{error}</p>}

				<div className="modal-actions">
					<button
						className="btn btn-ghost btn-sm"
						disabled={busy}
						onClick={onCancel}
						type="button"
					>
						Cancel
					</button>
					<button
						className="btn btn-primary btn-sm"
						disabled={busy}
						onClick={phase === "intro" ? handleCreate : handleFinish}
						type="button"
					>
						{busy
							? "Waiting for device…"
							: phase === "intro"
								? "Start"
								: "Register"}
					</button>
				</div>
			</div>
		</div>
	);
}
