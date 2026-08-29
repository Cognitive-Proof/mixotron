"use client";

import {
	CAWGManifest,
	type TrqpAuthorizationResponse,
	TrustBadge,
} from "c2pa-react-cawg-component";
import { C2paManifest } from "c2pa-react-component";
import { type DragEvent, useRef, useState } from "react";
import { CawgTrustRegistry } from "~/app/_components/cawg-trust-registry";
import { fileToBase64 } from "~/lib/client-file";
import type { VerifyForDisplayResult } from "~/lib/manifest";
import { MIXOTRON_TRUST_AUTHORITY_ID } from "~/lib/trust-registry";
import { api } from "~/trpc/react";

interface VerifyItem {
	id: string;
	fileName: string;
	result: "checking" | VerifyForDisplayResult;
}

interface RealAffiliation {
	issuer: string;
	authorityId: string;
	authorityName: string;
}

/**
 * The generic Identity badge c2pa-react-cawg-component renders
 * automatically (see CawgTrustRegistry) has no concept of *which*
 * authority to check — it's inherently a self-attestation check, and
 * stays backed by mixotron's local mock. A `cawg.affiliation` verified
 * identity produced by a connected, enabled Governorator enrollment (see
 * buildTrustRegistryVerifiedIdentities) is different: its `provider.id`
 * names a real external authority, so it's the one case where a genuine
 * live TRQP check is possible — this extracts those specific entries.
 */
function realAffiliationsOf(
	manifest: { assertions?: Record<string, unknown> } | undefined,
): RealAffiliation[] {
	const identity = manifest?.assertions?.["cawg.identity"] as
		| {
				issuer?: string;
				verifiedIdentities?: Array<{
					type?: string;
					provider?: { id?: string; name?: string };
				}>;
		  }
		| undefined;
	const issuer = identity?.issuer;
	if (!issuer) return [];

	return (identity.verifiedIdentities ?? [])
		.filter(
			(entry) =>
				entry.type === "cawg.affiliation" &&
				entry.provider?.id &&
				entry.provider.id !== MIXOTRON_TRUST_AUTHORITY_ID,
		)
		.map((entry) => ({
			issuer,
			// Both narrowed non-nullable by the filter above.
			authorityId: entry.provider?.id as string,
			authorityName: entry.provider?.name ?? (entry.provider?.id as string),
		}));
}

function TrustRegistryChecks({
	affiliations,
}: {
	affiliations: RealAffiliation[];
}) {
	const utils = api.useUtils();
	if (affiliations.length === 0) return null;

	return (
		<div style={{ marginTop: "0.8rem" }}>
			<div className="cawg-section-title">Trust registry</div>
			{affiliations.map((a) => (
				<div
					key={`${a.issuer}:${a.authorityId}`}
					style={{
						display: "flex",
						alignItems: "center",
						gap: "0.5rem",
						marginTop: "0.4rem",
					}}
				>
					<span className="field-hint">{a.authorityName}</span>
					<TrustBadge
						action="issue"
						entityId={a.issuer}
						queryFn={async (): Promise<TrqpAuthorizationResponse> =>
							utils.manifest.checkTrustRegistryAuthorization.fetch({
								entityId: a.issuer,
								authorityId: a.authorityId,
							})
						}
						resource="cawg.identity"
						variant="compact"
					/>
				</div>
			))}
		</div>
	);
}

export default function VerifyPage() {
	const verifyForDisplay = api.manifest.verifyForDisplay.useMutation();
	const [items, setItems] = useState<VerifyItem[]>([]);
	const [active, setActive] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	async function verifyFile(id: string, file: File) {
		try {
			const dataBase64 = await fileToBase64(file);
			const result = await verifyForDisplay.mutateAsync({
				fileName: file.name,
				dataBase64,
			});
			setItems((prev) => prev.map((i) => (i.id === id ? { ...i, result } : i)));
		} catch (error) {
			console.error(`Failed to verify "${file.name}"`, error);
			setItems((prev) =>
				prev.map((i) =>
					i.id === id
						? {
								...i,
								result: {
									supported: false,
									fileName: file.name,
									format: file.name.split(".").pop() ?? "unknown",
								},
							}
						: i,
				),
			);
		}
	}

	function addFiles(files: FileList | File[]) {
		const additions: VerifyItem[] = Array.from(files).map((file) => ({
			id: crypto.randomUUID(),
			fileName: file.name,
			result: "checking" as const,
		}));
		setItems((prev) => [...additions, ...prev]);
		Array.from(files).forEach((file, index) => {
			const addition = additions[index];
			if (addition) void verifyFile(addition.id, file);
		});
	}

	function removeItem(id: string) {
		setItems((prev) => prev.filter((i) => i.id !== id));
	}

	return (
		<>
			<CawgTrustRegistry />
			<div className="dash-header">
				<div className="eyebrow">Verify</div>
				<h1>Verify a Content Credential</h1>
				<p>
					Drop an audio file to check it for an embedded C2PA manifest and
					inspect its full provenance chain.
				</p>
				<p className="verify-honesty-note">
					Identity checks in the main Identity section are Mix-O-Tron's own
					local test infrastructure, not real identity verification. A separate
					&quot;Trust registry&quot; badge appears only when a credential names
					a real, connected authority — that one is a live check against that
					authority's actual TRQP service.
				</p>
			</div>

			<button
				className={`dropzone ${active ? "active" : ""}`}
				onClick={() => inputRef.current?.click()}
				onDragLeave={() => setActive(false)}
				onDragOver={(e: DragEvent) => {
					e.preventDefault();
					setActive(true);
				}}
				onDrop={(e: DragEvent) => {
					e.preventDefault();
					setActive(false);
					if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files);
				}}
				type="button"
			>
				<svg
					fill="none"
					height="28"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="1.6"
					viewBox="0 0 24 24"
					width="28"
				>
					<title>Upload</title>
					<path d="M12 16V4M7 9l5-5 5 5" />
					<path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
				</svg>
				<strong>Drop MP3, WAV, or FLAC files</strong>
				<span>or click to browse — you can drop more than one</span>
			</button>
			<input
				hidden
				id="verify-input"
				multiple
				onChange={(e) => {
					if (e.target.files && e.target.files.length > 0) {
						addFiles(e.target.files);
					}
					e.target.value = "";
				}}
				ref={inputRef}
				type="file"
			/>

			<div className="verify-list">
				{items.map((item) => (
					<div className="verify-item" key={item.id}>
						<div className="verify-item-header">
							<span>{item.fileName}</span>
							<button
								aria-label={`Remove ${item.fileName}`}
								className="btn btn-ghost btn-sm"
								onClick={() => removeItem(item.id)}
								type="button"
							>
								Remove
							</button>
						</div>

						{item.result === "checking" ? (
							<p className="verify-item-status">Verifying…</p>
						) : !item.result.supported ? (
							<p className="verify-item-status verify-item-status--muted">
								Can&apos;t verify this format yet — supported: MP3, WAV, FLAC,
								PDF, JPEG, PNG, SVG, DNG, JSONC, XML, MD.
							</p>
						) : (
							<>
								<C2paManifest
									level={3}
									manifest={item.result.outcome}
									plugin={[CAWGManifest]}
								/>
								<TrustRegistryChecks
									affiliations={realAffiliationsOf(
										item.result.outcome.manifests[0],
									)}
								/>
							</>
						)}
					</div>
				))}
			</div>

			{items.length === 0 && (
				<div className="dash-empty" style={{ marginTop: "1.5rem" }}>
					<p>Nothing verified yet. Drop a file above to get started.</p>
				</div>
			)}
		</>
	);
}
