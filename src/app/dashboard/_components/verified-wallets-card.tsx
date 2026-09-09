"use client";

import { useState } from "react";
import type { Profile, WalletVerification } from "~/lib/profile";
import {
	connectWallet,
	isWalletAvailable,
	signChallenge,
	WalletNotAvailableError,
} from "~/lib/wallet-verification";
import { api } from "~/trpc/react";

function truncateAddress(address: string): string {
	return address.length > 12
		? `${address.slice(0, 6)}…${address.slice(-4)}`
		: address;
}

function WalletRow({
	profile,
	entry,
}: {
	profile: Profile;
	entry: WalletVerification;
}) {
	const utils = api.useUtils();
	const invalidate = async () => {
		await utils.profile.byId.invalidate({ id: profile.id });
		await utils.profile.list.invalidate();
	};

	const [error, setError] = useState<string | null>(null);
	const [busy, setBusy] = useState(false);

	const check = api.profile.checkWalletVerification.useMutation({
		onSuccess: async (result) => {
			setError(result.verified ? null : (result.reason ?? "Not verified."));
			await invalidate();
		},
	});
	const remove = api.profile.removeWalletVerification.useMutation({
		onSuccess: invalidate,
	});

	async function handleSign() {
		setError(null);
		setBusy(true);
		try {
			const signature = await signChallenge(entry.address, entry.challenge);
			await check.mutateAsync({
				id: profile.id,
				walletVerificationId: entry.id,
				signature,
			});
		} catch (err) {
			setError(
				err instanceof WalletNotAvailableError
					? err.message
					: "Couldn't sign with that wallet. Please try again.",
			);
		} finally {
			setBusy(false);
		}
	}

	return (
		<div
			className="field"
			style={{
				marginTop: "1rem",
				paddingTop: "1rem",
				borderTop: "1px solid var(--line)",
			}}
		>
			<dl className="dash-dl">
				<dt>Address</dt>
				<dd>{truncateAddress(entry.address)}</dd>
				<dt>Status</dt>
				<dd>
					{entry.verified
						? `Verified ${entry.verifiedAt ? new Date(entry.verifiedAt).toLocaleDateString() : ""}`
						: "Not yet verified"}
				</dd>
			</dl>

			{error && <p className="form-error">{error}</p>}

			<div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
				{!entry.verified && (
					<button
						className="btn btn-ghost btn-sm"
						disabled={busy}
						onClick={handleSign}
						type="button"
					>
						{busy ? "Waiting for wallet…" : "Sign to verify"}
					</button>
				)}
				<button
					className="btn btn-danger btn-sm"
					disabled={remove.isPending}
					onClick={() => {
						if (
							window.confirm(
								`Remove ${truncateAddress(entry.address)}? This doesn't affect the wallet itself — only what mixotron remembers.`,
							)
						) {
							remove.mutate({ id: profile.id, walletVerificationId: entry.id });
						}
					}}
					type="button"
				>
					{remove.isPending ? "Removing…" : "Remove"}
				</button>
			</div>
		</div>
	);
}

export function VerifiedWalletsCard({ profile }: { profile: Profile }) {
	const utils = api.useUtils();
	const [connecting, setConnecting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const add = api.profile.addWalletVerification.useMutation({
		onSuccess: async () => {
			setError(null);
			await utils.profile.byId.invalidate({ id: profile.id });
			await utils.profile.list.invalidate();
		},
		onError: (err) => setError(err.message),
	});

	async function handleConnect() {
		setError(null);
		setConnecting(true);
		try {
			const address = await connectWallet();
			await add.mutateAsync({ id: profile.id, address });
		} catch (err) {
			setError(
				err instanceof WalletNotAvailableError
					? err.message
					: "Couldn't connect to a wallet. Please try again.",
			);
		} finally {
			setConnecting(false);
		}
	}

	if (!isWalletAvailable()) {
		return null;
	}

	return (
		<div className="dash-card" style={{ marginTop: "1.5rem" }}>
			<h3>Verified wallets</h3>
			<p className="field-hint" style={{ marginBottom: "0.8rem" }}>
				Prove you control an EVM wallet (e.g. MetaMask) by connecting it and
				signing a one-time message — no transaction, no gas. Verified wallets
				are signed into Content Credentials as a real cawg.crypto_wallet claim —
				not a self-attestation — the next time you author content with this
				profile.
			</p>

			<button
				className="btn btn-ghost btn-sm"
				disabled={connecting}
				onClick={handleConnect}
				type="button"
			>
				{connecting ? "Connecting…" : "Connect wallet"}
			</button>
			{error && <p className="form-error">{error}</p>}

			{profile.walletVerifications.length === 0 ? (
				<span
					className="field-hint"
					style={{ display: "block", marginTop: "0.6rem" }}
				>
					No wallets added yet.
				</span>
			) : (
				profile.walletVerifications.map((entry) => (
					<WalletRow entry={entry} key={entry.id} profile={profile} />
				))
			)}
		</div>
	);
}
