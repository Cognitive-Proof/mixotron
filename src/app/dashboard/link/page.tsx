"use client";

import { useState } from "react";
import { LINK_PRODUCT_LABELS } from "~/lib/link-products";
import { api } from "~/trpc/react";
import type { LinkProduct } from "~/server/link/link-tokens";

function formatDate(date: Date | string): string {
	return new Date(date).toLocaleDateString(undefined, {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
}

export default function LinkPage() {
	const utils = api.useUtils();
	const { data, isPending } = api.link.list.useQuery();
	const tokens = data ?? [];
	const isReady = !isPending;

	const [product, setProduct] = useState<LinkProduct>("audacity");
	const [justCreated, setJustCreated] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);
	const [urlCopied, setUrlCopied] = useState(false);

	const createToken = api.link.create.useMutation({
		onSuccess: async (result) => {
			setJustCreated(result.token);
			setCopied(false);
			setUrlCopied(false);
			await utils.link.list.invalidate();
		},
	});
	const revokeToken = api.link.revoke.useMutation({
		onSuccess: () => utils.link.list.invalidate(),
	});

	return (
		<>
			<div className="dash-header">
				<div className="eyebrow">Link</div>
				<h1>Link tokens</h1>
				<p>
					Connect other tools to Mix-O-Tron. A linked tool uploads a mix here
					and you finish authoring its Content Credential yourself.
				</p>
			</div>

			<div className="dash-card" style={{ marginBottom: "1.5rem" }}>
				<h3>New token</h3>
				<div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
					<select
						aria-label="Product"
						onChange={(e) => setProduct(e.target.value as LinkProduct)}
						value={product}
					>
						{Object.entries(LINK_PRODUCT_LABELS).map(([value, label]) => (
							<option key={value} value={value}>
								{label}
							</option>
						))}
					</select>
					<button
						className="btn btn-primary"
						disabled={createToken.isPending}
						onClick={() => createToken.mutate({ product })}
						type="button"
					>
						{createToken.isPending ? "Creating…" : "Create token"}
					</button>
				</div>

				{justCreated && (
					<div className="field" style={{ marginTop: "1rem" }}>
						<span className="field-hint">
							Endpoint URL — paste this into{" "}
							{LINK_PRODUCT_LABELS[product]}&apos;s Mix-O-Tron export
							settings, alongside the token below.
						</span>
						<div style={{ display: "flex", gap: "0.6rem" }}>
							<input readOnly type="text" value={window.location.origin} />
							<button
								className="btn btn-ghost btn-sm"
								onClick={async () => {
									await navigator.clipboard.writeText(
										window.location.origin,
									);
									setUrlCopied(true);
								}}
								type="button"
							>
								{urlCopied ? "Copied" : "Copy"}
							</button>
						</div>

						<span
							className="field-hint"
							style={{ marginTop: "0.8rem", display: "block" }}
						>
							Copy this token now — you won&apos;t be able to see it again.
						</span>
						<div style={{ display: "flex", gap: "0.6rem" }}>
							<input readOnly type="text" value={justCreated} />
							<button
								className="btn btn-ghost btn-sm"
								onClick={async () => {
									await navigator.clipboard.writeText(justCreated);
									setCopied(true);
								}}
								type="button"
							>
								{copied ? "Copied" : "Copy"}
							</button>
						</div>
					</div>
				)}
			</div>

			{isReady && tokens.length === 0 && (
				<div className="dash-empty">
					<p>No Link tokens yet. Create one above to get started.</p>
				</div>
			)}

			<div className="dash-list">
				{tokens.map((token) => {
					const revoked = token.revokedAt !== null;
					const expired = new Date(token.expiresAt) < new Date();
					return (
						<div className="dash-card" key={token.id}>
							<span className="badge">
								{LINK_PRODUCT_LABELS[token.product] ?? token.product}
							</span>
							<dl className="dash-dl">
								<dt>Created</dt>
								<dd>{formatDate(token.createdAt)}</dd>
								<dt>Expires</dt>
								<dd>{formatDate(token.expiresAt)}</dd>
								{token.lastUsedAt && (
									<>
										<dt>Last used</dt>
										<dd>{formatDate(token.lastUsedAt)}</dd>
									</>
								)}
								<dt>Status</dt>
								<dd>{revoked ? "Revoked" : expired ? "Expired" : "Active"}</dd>
							</dl>
							{!revoked && (
								<div className="dash-card-actions">
									<button
										className="btn btn-danger btn-sm"
										onClick={() => {
											if (window.confirm("Revoke this token?")) {
												revokeToken.mutate({ id: token.id });
											}
										}}
										type="button"
									>
										Revoke
									</button>
								</div>
							)}
						</div>
					);
				})}
			</div>
		</>
	);
}
