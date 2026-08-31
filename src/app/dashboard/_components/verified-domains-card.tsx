"use client";

import { useState } from "react";
import type { DomainVerification, Profile } from "~/lib/profile";
import { api } from "~/trpc/react";

const CHALLENGE_SUBDOMAIN = "_mixotron-challenge";

function DomainRow({
	profile,
	entry,
}: {
	profile: Profile;
	entry: DomainVerification;
}) {
	const utils = api.useUtils();
	const invalidate = async () => {
		await utils.profile.byId.invalidate({ id: profile.id });
		await utils.profile.list.invalidate();
	};

	const [lastReason, setLastReason] = useState<string | null>(null);

	const check = api.profile.checkDomainVerification.useMutation({
		onSuccess: async (result) => {
			setLastReason(result.check.reason ?? null);
			await invalidate();
		},
	});
	const remove = api.profile.removeDomainVerification.useMutation({
		onSuccess: invalidate,
	});

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
				<dt>Domain</dt>
				<dd>{entry.domain}</dd>
				<dt>Status</dt>
				<dd>
					{entry.verified
						? `Verified ${entry.verifiedAt ? new Date(entry.verifiedAt).toLocaleDateString() : ""}`
						: "Not yet verified"}
				</dd>
			</dl>

			{!entry.verified && (
				<div className="field-note" style={{ marginBottom: "0.6rem" }}>
					<p>Publish a DNS TXT record, then check it:</p>
					<dl className="dash-dl">
						<dt>Name</dt>
						<dd>
							<code>
								{CHALLENGE_SUBDOMAIN}.{entry.domain}
							</code>
						</dd>
						<dt>Value</dt>
						<dd>
							<code>{entry.token}</code>
						</dd>
					</dl>
				</div>
			)}

			{lastReason && !entry.verified && (
				<p className="field-hint">{lastReason}</p>
			)}

			<div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
				{!entry.verified && (
					<button
						className="btn btn-ghost btn-sm"
						disabled={check.isPending}
						onClick={() =>
							check.mutate({
								id: profile.id,
								domainVerificationId: entry.id,
							})
						}
						type="button"
					>
						{check.isPending ? "Checking…" : "Check now"}
					</button>
				)}
				<button
					className="btn btn-danger btn-sm"
					disabled={remove.isPending}
					onClick={() => {
						if (
							window.confirm(
								`Remove ${entry.domain}? This doesn't affect your DNS records — only what mixotron remembers.`,
							)
						) {
							remove.mutate({
								id: profile.id,
								domainVerificationId: entry.id,
							});
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

export function VerifiedDomainsCard({ profile }: { profile: Profile }) {
	const utils = api.useUtils();
	const [domain, setDomain] = useState("");
	const [error, setError] = useState<string | null>(null);

	const add = api.profile.addDomainVerification.useMutation({
		onSuccess: async () => {
			setDomain("");
			setError(null);
			await utils.profile.byId.invalidate({ id: profile.id });
			await utils.profile.list.invalidate();
		},
		onError: (err) => setError(err.message),
	});

	return (
		<div className="dash-card" style={{ marginTop: "1.5rem" }}>
			<h3>Verified domains</h3>
			<p className="field-hint" style={{ marginBottom: "0.8rem" }}>
				Prove you control a domain by publishing a DNS TXT record mixotron
				generates for you. Verified domains are signed into Content Credentials
				as a real cawg.web_site claim — not a self-attestation — the next time
				you author content with this profile.
			</p>

			<form
				onSubmit={(event) => {
					event.preventDefault();
					if (!domain.trim()) return;
					add.mutate({ id: profile.id, domain: domain.trim() });
				}}
				style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}
			>
				<input
					aria-label="Domain"
					onChange={(e) => setDomain(e.target.value)}
					placeholder="example.com"
					type="text"
					value={domain}
				/>
				<button
					className="btn btn-ghost btn-sm"
					disabled={add.isPending || !domain.trim()}
					type="submit"
				>
					{add.isPending ? "Adding…" : "Add domain"}
				</button>
			</form>
			{error && <p className="field-hint">{error}</p>}

			{profile.domainVerifications.length === 0 ? (
				<span className="field-hint">No domains added yet.</span>
			) : (
				profile.domainVerifications.map((entry) => (
					<DomainRow entry={entry} key={entry.id} profile={profile} />
				))
			)}
		</div>
	);
}
